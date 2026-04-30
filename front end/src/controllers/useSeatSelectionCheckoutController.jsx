import { useEffect, useMemo, useRef, useState } from "react";
import {
  createBooking,
  deleteSavedCard as deleteSavedCardRequest,
  fetchReservedSeats,
  fetchSavedCards,
  getMeaningfulErrorMessage,
  isAPICallError,
  savePaymentCard,
  updateSavedCard as updateSavedCardRequest
} from "@/services";
import { fetchShowroomById } from "@/services/showroomsApi";
import { validatePromoCode } from "@/services/promoCodesApi";
import { sendEmailOtp, verifyEmailOtp, lockSeat, unlockSeat, getOrCreateGuestSessionId } from "@/services/bookingApi";
import { tokenManager } from "@/services/tokenManager";
import {
  BOOKING_SEAT_COLS,
  BOOKING_SEAT_ROWS,
  MAX_TICKETS_PER_BOOKING,
  formatSeatIdLabel,
  formatSeatLabel,
  getTotalTickets
} from "@/models/booking-model";

function buildEmptySelections(items) {
  return Object.fromEntries((Array.isArray(items) ? items : []).map((item) => [item.id, []]));
}

function createEmptyCardForm() {
  return {
    cardholderName: "",
    cardNumber: "",
    cvv: "",
    expMonth: "",
    expYear: ""
  };
}

function createEmptyCardFieldErrors() {
  return {
    cardholderName: "",
    cardNumber: "",
    cvv: "",
    expMonth: "",
    expYear: ""
  };
}

function createEmptyEditCardForm() {
  return {
    cardholderName: "",
    expMonth: "",
    expYear: ""
  };
}

function createEmptyEditCardFieldErrors() {
  return {
    cardholderName: "",
    expMonth: "",
    expYear: ""
  };
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function toMaxCardsAllowed(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3;
}

function getCustomerNameFromUser(user) {
  if (typeof user?.displayName === "string" && user.displayName.trim().length > 0) {
    return user.displayName.trim();
  }

  if (typeof user?.email === "string" && user.email.includes("@")) {
    return user.email.split("@")[0];
  }

  return "";
}

function getPromoErrorMessage(error) {
  if (!isAPICallError(error)) {
    return "Could not apply promo code. Please try again.";
  }
  // Always prefer a specific server message when it's available
  const serverMessage = typeof error?.message === "string" ? error.message.trim() : "";
  if (serverMessage.length > 0) {
    return serverMessage;
  }
  // Fall back to promo-specific status messages
  if (error.status === 404) return "Promo code not found. Please check the code and try again.";
  if (error.status === 400 || error.status === 422) return "This promo code is invalid or has expired.";
  if (error.status === 409) return "This promo code has already been used.";
  if (error.status === 429) return "Too many attempts. Please wait a moment and try again.";
  return "Could not apply promo code. Please try again.";
}

function getPaymentErrorMessage(error) {
  if (isAPICallError(error)) {
    const serverMessage = typeof error?.message === "string" ? error.message.trim() : "";
    if (serverMessage.length > 0) {
      if (
        /cardnumber|card number/i.test(serverMessage) &&
        /invalid|not valid|failed/i.test(serverMessage)
      ) {
        return "Invalid card number.";
      }
      return serverMessage;
    }
  }

  return getMeaningfulErrorMessage(error, "user");
}

function mapPaymentMessageToField(message) {
  const normalizedMessage = typeof message === "string" ? message.trim() : "";
  const lowerMessage = normalizedMessage.toLowerCase();

  if (!normalizedMessage) {
    return null;
  }

  if (lowerMessage.includes("cardnumber") || lowerMessage.includes("card number")) {
    return "cardNumber";
  }

  if (
    lowerMessage.includes("cardholdername") ||
    lowerMessage.includes("card holder") ||
    lowerMessage.includes("cardholder")
  ) {
    return "cardholderName";
  }

  if (lowerMessage.includes("cvv")) {
    return "cvv";
  }

  if (
    lowerMessage.includes("expmonth") ||
    lowerMessage.includes("expiry month") ||
    lowerMessage.includes("expiration month")
  ) {
    return "expMonth";
  }

  if (
    lowerMessage.includes("expyear") ||
    lowerMessage.includes("expiry year") ||
    lowerMessage.includes("expiration year") ||
    lowerMessage.includes("expiry date") ||
    lowerMessage.includes("expiration date")
  ) {
    return "expYear";
  }

  return null;
}

export function useSeatSelectionCheckoutController({ items, onCheckout, currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [seatSelections, setSeatSelections] = useState({});
  const [reservedSeats, setReservedSeats] = useState(new Set());
  const [lockedSeats, setLockedSeats] = useState(new Map()); // seatId → { lockedBy, lockExpiresAt, isGuest }
  const [lockCountdown, setLockCountdown] = useState(null); // "4:32" or null
  const [selfId, setSelfId] = useState(null);
  const lockingRef = useRef(new Set()); // prevents concurrent lock ops on same seat
  const [isLoadingSeats, setIsLoadingSeats] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [selectionError, setSelectionError] = useState(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [savedCards, setSavedCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [cardForm, setCardForm] = useState(createEmptyCardForm());
  const [showCardForm, setShowCardForm] = useState(false);
  const [isCheckingCards, setIsCheckingCards] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [isDeletingCard, setIsDeletingCard] = useState(false);
  const [cardFieldErrors, setCardFieldErrors] = useState(createEmptyCardFieldErrors());
  const [paymentError, setPaymentError] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [maxCardsAllowed, setMaxCardsAllowed] = useState(3);
  const [isPaymentStep, setIsPaymentStep] = useState(false);
  const [isOrderSummaryStep, setIsOrderSummaryStep] = useState(false);
  const [editingCardId, setEditingCardId] = useState("");
  const [editCardForm, setEditCardForm] = useState(createEmptyEditCardForm());
  const [editCardFieldErrors, setEditCardFieldErrors] = useState(createEmptyEditCardFieldErrors());
  const [isUpdatingCard, setIsUpdatingCard] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [saveCard, setSaveCard] = useState(true);
  const [seatRows, setSeatRows] = useState(BOOKING_SEAT_ROWS);
  const [seatCols, setSeatCols] = useState(BOOKING_SEAT_COLS);
  const [showroomNameMap, setShowroomNameMap] = useState({});
  const [itemShowroomMap, setItemShowroomMap] = useState({});
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState(null);

  const currentItem = isOpen ? items[currentIndex] ?? null : null;
  const totalSteps = items.length;
  const customerUid =
    typeof currentUser?.uid === "string" && currentUser.uid.trim().length > 0
      ? currentUser.uid.trim()
      : "";
  const resolvedUserEmail = normalizeEmail(currentUser?.email ?? "");
  const resolvedUserName = getCustomerNameFromUser(currentUser);

  const getAuthToken = () => {
    const t = tokenManager.getAccessToken();
    if (!t) {
      throw new Error("Please sign in to continue checkout.");
    }
    return t;
  };

  const selectedSeatIds = useMemo(
    () => (currentItem ? [...(seatSelections[currentItem.id] ?? [])].sort() : []),
    [currentItem, seatSelections]
  );
  const totalTickets = currentItem ? getTotalTickets(currentItem.tickets) : 0;
  const remainingSeats = Math.max(totalTickets - selectedSeatIds.length, 0);
  const normalizedCustomerEmail = normalizeEmail(customerEmail);
  const customerEmailFormatError =
    normalizedCustomerEmail.length > 0 &&
    normalizedCustomerEmail !== resolvedUserEmail &&
    !isValidEmail(normalizedCustomerEmail)
      ? "Please enter a valid email address."
      : null;

  // OTP required when the user typed a valid email different from their login email
  // and hasn't verified it yet.
  const needsEmailVerification =
    normalizedCustomerEmail.length > 0 &&
    normalizedCustomerEmail !== resolvedUserEmail &&
    isValidEmail(normalizedCustomerEmail) &&
    !otpVerified;

  const selectedCard = useMemo(
    () => savedCards.find((card) => card.cardId === selectedCardId) ?? null,
    [savedCards, selectedCardId]
  );
  const canAddMoreCards = savedCards.length < maxCardsAllowed;
  const canCheckoutWithPayment = Boolean(
    selectedCardId && selectedCard && isValidEmail(normalizedCustomerEmail)
  );

  useEffect(() => {
    setCustomerEmail(resolvedUserEmail);
    setCustomerName(resolvedUserName);
  }, [resolvedUserEmail, resolvedUserName]);

  const activeShowroomId =
    (currentItem && itemShowroomMap[currentItem.id]?.showroomId) ||
    currentItem?.movie?.showroomId ||
    null;

  useEffect(() => {
    if (!activeShowroomId) {
      setSeatRows(BOOKING_SEAT_ROWS);
      setSeatCols(BOOKING_SEAT_COLS);
      return;
    }

    fetchShowroomById(activeShowroomId)
      .then((data) => {
        if (data?.layout?.rows && data?.layout?.cols) {
          setSeatRows(data.layout.rows);
          setSeatCols(data.layout.cols);
        }
        if (data?.name) {
          setShowroomNameMap((prev) => ({ ...prev, [activeShowroomId]: data.name }));
        }
      })
      .catch(() => {
        setSeatRows(BOOKING_SEAT_ROWS);
        setSeatCols(BOOKING_SEAT_COLS);
      });
  }, [activeShowroomId]);

  const loadReservedSeatsForItem = async (item) => {
    if (!item) {
      setReservedSeats(new Set());
      return;
    }

    setIsLoadingSeats(true);
    setLoadError(null);

    try {
      const data = await fetchReservedSeats(item.movie.id, item.showtime);
      setReservedSeats(new Set(data.reservedSeats));
      setLockedSeats(new Map(Object.entries(data.lockedSeats ?? {})));
      // Use the showtime-specific hall returned by the server so the seat
      // grid and hall label always reflect the actual scheduled hall.
      if (data?.showroomId) {
        setItemShowroomMap((prev) => ({
          ...prev,
          [item.id]: { showroomId: data.showroomId, showroomName: data.showroomName ?? null }
        }));
        if (data.showroomName) {
          setShowroomNameMap((prev) => ({ ...prev, [data.showroomId]: data.showroomName }));
        }
        // Apply hall dimensions directly from the response so we don't need
        // a separate fetchShowroomById call, and layout always matches the
        // actual hall (even if admin changed rows/cols since last load).
        if (data.rows && data.cols) {
          setSeatRows(data.rows);
          setSeatCols(data.cols);
        }
      }
    } catch (error) {
      setLoadError(getMeaningfulErrorMessage(error, "user"));
      setReservedSeats(new Set());
    } finally {
      setIsLoadingSeats(false);
    }
  };

  const applySavedCardsPayload = (response) => {
    const cards = Array.isArray(response?.cards) ? response.cards : [];
    const maxAllowed = toMaxCardsAllowed(response?.maxCardsAllowed);
    setSavedCards(cards);
    setMaxCardsAllowed(maxAllowed);
    setCardFieldErrors(createEmptyCardFieldErrors());
    setEditingCardId("");
    setEditCardForm(createEmptyEditCardForm());
    setEditCardFieldErrors(createEmptyEditCardFieldErrors());
    setIsUpdatingCard(false);
    setSelectedCardId((previous) => {
      if (cards.some((card) => card.cardId === previous)) {
        return previous;
      }

      return cards[0]?.cardId ?? "";
    });
    setShowCardForm(cards.length === 0);
    setPaymentInfo(
      cards.length === 0
        ? "No saved cards found. Add a card to continue."
        : null
    );
  };

  const fetchCardsForEmail = async (email, options = {}) => {
    const { silent = false } = options;
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setSavedCards([]);
      setSelectedCardId("");
      setMaxCardsAllowed(3);
      setShowCardForm(false);
      setCardFieldErrors(createEmptyCardFieldErrors());
      setEditingCardId("");
      setEditCardForm(createEmptyEditCardForm());
      setEditCardFieldErrors(createEmptyEditCardFieldErrors());
      setIsUpdatingCard(false);
      if (!silent) {
        setPaymentError(
          "Please sign in to load your saved cards."
        );
      }
      return;
    }

    setIsCheckingCards(true);
    setPaymentError(null);
    if (!silent) {
      setPaymentInfo(null);
    }

    try {
      const response = await fetchSavedCards(
        normalizedEmail,
        customerUid || undefined
      );
      applySavedCardsPayload(response);
    } catch (error) {
      setSavedCards([]);
      setSelectedCardId("");
      setShowCardForm(false);
      setCardFieldErrors(createEmptyCardFieldErrors());
      setEditingCardId("");
      setEditCardForm(createEmptyEditCardForm());
      setEditCardFieldErrors(createEmptyEditCardFieldErrors());
      setIsUpdatingCard(false);
      // If auth token is unavailable the user is not signed in — show login prompt
      if (typeof currentUser?.getIdToken !== "function") {
        setNeedsLogin(true);
      } else {
        setPaymentError(getPaymentErrorMessage(error));
      }
    } finally {
      setIsCheckingCards(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void loadReservedSeatsForItem(currentItem);
  }, [currentItem, isOpen]);

  useEffect(() => {
    if (!isOpen || !isPaymentStep) {
      return;
    }

    const normalizedEmail = normalizeEmail(customerEmail);
    if (!isValidEmail(normalizedEmail)) {
      setSavedCards([]);
      setSelectedCardId("");
      setMaxCardsAllowed(3);
      setShowCardForm(false);
      setCardFieldErrors(createEmptyCardFieldErrors());
      setEditingCardId("");
      setEditCardForm(createEmptyEditCardForm());
      setEditCardFieldErrors(createEmptyEditCardFieldErrors());
      setIsUpdatingCard(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      void fetchCardsForEmail(normalizedEmail, { silent: true });
    }, 350);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [customerEmail, isOpen, isPaymentStep, customerUid]);

  const closeDialog = () => {
    setIsOpen(false);
    setCurrentIndex(0);
    setSeatSelections({});
    setReservedSeats(new Set());
    setIsLoadingSeats(false);
    setIsSubmitting(false);
    setLoadError(null);
    setSelectionError(null);
    setCustomerEmail(resolvedUserEmail);
    setCustomerName(resolvedUserName);
    setSavedCards([]);
    setSelectedCardId("");
    setCardForm(createEmptyCardForm());
    setShowCardForm(false);
    setIsCheckingCards(false);
    setIsSavingCard(false);
    setIsDeletingCard(false);
    setCardFieldErrors(createEmptyCardFieldErrors());
    setPaymentError(null);
    setPaymentInfo(null);
    setMaxCardsAllowed(3);
    setIsPaymentStep(false);
    setIsOrderSummaryStep(false);
    setEditingCardId("");
    setEditCardForm(createEmptyEditCardForm());
    setEditCardFieldErrors(createEmptyEditCardFieldErrors());
    setIsUpdatingCard(false);
    setPromoCodeInput("");
    setAppliedPromo(null);
    setPromoError(null);
    setIsApplyingPromo(false);
    setOtpSent(false);
    setOtpCode("");
    setOtpVerified(false);
    setOtpError(null);
  };

  const openDialog = (resumeState = null) => {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }

    const invalidItem = items.find((item) => getTotalTickets(item.tickets) > MAX_TICKETS_PER_BOOKING);
    if (invalidItem) {
      setLoadError(`A booking cannot exceed ${MAX_TICKETS_PER_BOOKING} tickets.`);
      return;
    }

    const restoredSelections =
      resumeState?.seatSelections && typeof resumeState.seatSelections === "object"
        ? resumeState.seatSelections
        : buildEmptySelections(items);

    setSeatSelections(restoredSelections);
    setCurrentIndex(0);
    setLoadError(null);
    setSelectionError(null);
    setCustomerEmail(resolvedUserEmail);
    setCustomerName(resolvedUserName);
    setSavedCards([]);
    setSelectedCardId("");
    setCardForm(createEmptyCardForm());
    setShowCardForm(false);
    setIsCheckingCards(false);
    setIsSavingCard(false);
    setIsDeletingCard(false);
    setCardFieldErrors(createEmptyCardFieldErrors());
    setPaymentError(null);
    setPaymentInfo(null);
    setMaxCardsAllowed(3);
    setIsPaymentStep(false);
    setIsOrderSummaryStep(resumeState?.step === "order_summary");
    setEditingCardId("");
    setEditCardForm(createEmptyEditCardForm());
    setEditCardFieldErrors(createEmptyEditCardFieldErrors());
    setIsUpdatingCard(false);
    setPromoCodeInput("");
    setAppliedPromo(null);
    setPromoError(null);
    setIsApplyingPromo(false);
    setOtpSent(false);
    setOtpCode("");
    setOtpVerified(false);
    setOtpError(null);
    setIsOpen(true);
  };

  // Resolve selfId whenever auth state changes
  useEffect(() => {
    const id = currentUser?.uid ?? getOrCreateGuestSessionId();
    setSelfId(id);
  }, [currentUser?.uid]);

  // Poll seat availability every 30 seconds while the dialog is open
  useEffect(() => {
    if (!isOpen || !currentItem) return;
    const id = setInterval(() => {
      void loadReservedSeatsForItem(currentItem).catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, [isOpen, currentItem?.id]);

  // Countdown ticker for self-locked seats
  useEffect(() => {
    const id = setInterval(() => {
      if (!selfId) {
        setLockCountdown(null);
        return;
      }
      const currentSeatIds = new Set(
        Array.isArray(seatSelections[currentItem?.id]) ? seatSelections[currentItem.id] : []
      );
      let earliest = null;
      for (const [seatId, info] of lockedSeats) {
        if (info.lockedBy === selfId && currentSeatIds.has(seatId)) {
          const exp = new Date(info.lockExpiresAt).getTime();
          if (earliest === null || exp < earliest) earliest = exp;
        }
      }
      if (earliest === null) {
        setLockCountdown(null);
      } else {
        const remaining = earliest - Date.now();
        if (remaining <= 0) {
          setLockCountdown("0:00");
        } else {
          const totalSec = Math.ceil(remaining / 1000);
          const m = Math.floor(totalSec / 60);
          const s = totalSec % 60;
          setLockCountdown(`${m}:${String(s).padStart(2, "0")}`);
        }
      }
    }, 1_000);
    return () => clearInterval(id);
  }, [lockedSeats, seatSelections, currentItem?.id, selfId]);

  const toggleSeat = async (seatId) => {
    if (!currentItem || loadError || reservedSeats.has(seatId)) {
      return;
    }

    // Block if locked by someone else
    const lockInfo = lockedSeats.get(seatId);
    if (lockInfo && lockInfo.lockedBy !== selfId) {
      return;
    }

    // Prevent concurrent lock operations on the same seat
    if (lockingRef.current.has(seatId)) {
      return;
    }

    setSelectionError(null);

    const currentSelection = new Set(seatSelections[currentItem.id] ?? []);

    if (currentSelection.has(seatId)) {
      // Deselect: update state immediately, fire unlock best-effort
      setSeatSelections((previous) => {
        const nextSelection = new Set(previous[currentItem.id] ?? []);
        nextSelection.delete(seatId);
        return { ...previous, [currentItem.id]: Array.from(nextSelection).sort() };
      });

      if (selfId) {
        lockingRef.current.add(seatId);
        unlockSeat({ movieId: currentItem.movie.id, showtime: currentItem.showtime, seatId, lockedBy: selfId }).catch(() => {
          // Best-effort; lock expires naturally
        }).finally(() => {
          lockingRef.current.delete(seatId);
        });
      }
      return;
    }

    if (currentSelection.size >= totalTickets) {
      setSelectionError(
        `Maximum seats for ${totalTickets} ticket${totalTickets === 1 ? "" : "s"} are already selected.`
      );
      return;
    }

    if (!selfId) return;

    // Acquire lock before adding to selection
    lockingRef.current.add(seatId);
    try {
      const isGuest = !currentUser;
      const result = await lockSeat({
        movieId: currentItem.movie.id,
        showtime: currentItem.showtime,
        seatId,
        lockedBy: selfId,
        isGuest
      });

      setLockedSeats((previous) => {
        const next = new Map(previous);
        next.set(seatId, { lockedBy: selfId, lockExpiresAt: result.lockExpiresAt, isGuest });
        return next;
      });

      setSeatSelections((previous) => {
        const nextSelection = new Set(previous[currentItem.id] ?? []);
        nextSelection.add(seatId);
        return { ...previous, [currentItem.id]: Array.from(nextSelection).sort() };
      });
    } catch (error) {
      // Seat was just taken — refresh and show the error
      await loadReservedSeatsForItem(currentItem).catch(() => {});
      setSelectionError(getMeaningfulErrorMessage(error, "user"));
    } finally {
      lockingRef.current.delete(seatId);
    }
  };

  const goToPreviousItem = () => {
    if (isPaymentStep) {
      setIsPaymentStep(false);
      setIsOrderSummaryStep(true);
      setCardFieldErrors(createEmptyCardFieldErrors());
      setEditCardFieldErrors(createEmptyEditCardFieldErrors());
      setEditingCardId("");
      setEditCardForm(createEmptyEditCardForm());
      setPaymentError(null);
      return;
    }

    if (isOrderSummaryStep) {
      setIsOrderSummaryStep(false);
      setPaymentError(null);
      return;
    }

    setSelectionError(null);
    setLoadError(null);
    setCurrentIndex((previous) => Math.max(0, previous - 1));
  };

  const handleSelectCard = (cardId) => {
    setSelectedCardId(cardId);
    setCardFieldErrors(createEmptyCardFieldErrors());
    setEditCardFieldErrors(createEmptyEditCardFieldErrors());
    setPaymentError(null);
  };

  const handleCardFieldChange = (field, value) => {
    const nextValue = typeof value === "string" ? value : "";
    setCardFieldErrors((previous) => ({
      ...previous,
      [field]: ""
    }));
    setPaymentError(null);

    setCardForm((previous) => {
      if (field === "cardNumber") {
        return {
          ...previous,
          cardNumber: nextValue.replace(/[^\d\s]/g, "").slice(0, 23)
        };
      }

      if (field === "expMonth") {
        return {
          ...previous,
          expMonth: nextValue.replace(/\D/g, "").slice(0, 2)
        };
      }

      if (field === "cvv") {
        return {
          ...previous,
          cvv: nextValue.replace(/\D/g, "").slice(0, 4)
        };
      }

      if (field === "expYear") {
        return {
          ...previous,
          expYear: nextValue.replace(/\D/g, "").slice(0, 4)
        };
      }

      return {
        ...previous,
        [field]: nextValue
      };
    });
  };

  const saveCardForEmail = async () => {
    const nextFieldErrors = createEmptyCardFieldErrors();
    setCardFieldErrors(createEmptyCardFieldErrors());

    if (!isValidEmail(normalizedCustomerEmail)) {
      setPaymentError(
        "Please enter a valid email address."
      );
      return;
    }

    if (!canAddMoreCards) {
      setPaymentError(`You can save up to ${maxCardsAllowed} cards only.`);
      return;
    }

    const cardholderName = cardForm.cardholderName.trim() || customerName.trim();
    if (cardholderName.length === 0) {
      nextFieldErrors.cardholderName = "Cardholder name is required.";
    } else if (!/^[a-zA-Z\s'\-]+$/.test(cardholderName)) {
      nextFieldErrors.cardholderName = "Name can only contain letters, spaces, hyphens, or apostrophes.";
    } else if (cardholderName.length > 100) {
      nextFieldErrors.cardholderName = "Name must be 100 characters or fewer.";
    }

    if (!cardForm.cardNumber) {
      nextFieldErrors.cardNumber = "Card number is required.";
    } else {
      const digits = cardForm.cardNumber.replace(/\s/g, "");
      if (!/^\d+$/.test(digits)) {
        nextFieldErrors.cardNumber = "Card number must contain digits only.";
      } else if (digits.length < 13 || digits.length > 19) {
        nextFieldErrors.cardNumber = "Card number must be between 13 and 19 digits.";
      }
    }

    if (!cardForm.cvv) {
      nextFieldErrors.cvv = "CVV is required.";
    } else if (!/^\d{3,4}$/.test(cardForm.cvv)) {
      nextFieldErrors.cvv = "CVV must be 3 or 4 digits.";
    }

    if (!cardForm.expMonth) {
      nextFieldErrors.expMonth = "Expiry month is required.";
    } else {
      const month = Number(cardForm.expMonth);
      if (!Number.isInteger(month) || month < 1 || month > 12) {
        nextFieldErrors.expMonth = "Month must be between 01 and 12.";
      }
    }

    if (!cardForm.expYear) {
      nextFieldErrors.expYear = "Expiry year is required.";
    } else {
      const year = Number(cardForm.expYear);
      const currentYear = new Date().getFullYear();
      if (!Number.isInteger(year) || year < currentYear || year > currentYear + 20) {
        nextFieldErrors.expYear = `Year must be between ${currentYear} and ${currentYear + 20}.`;
      }
    }

    if (!nextFieldErrors.expMonth && !nextFieldErrors.expYear && cardForm.expMonth && cardForm.expYear) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const month = Number(cardForm.expMonth);
      const year = Number(cardForm.expYear);
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        nextFieldErrors.expYear = "This card has expired.";
      }
    }

    if (Object.values(nextFieldErrors).some(Boolean)) {
      setCardFieldErrors(nextFieldErrors);
      return;
    }

    setIsSavingCard(true);
    setEditingCardId("");
    setEditCardForm(createEmptyEditCardForm());
    setEditCardFieldErrors(createEmptyEditCardFieldErrors());
    setPaymentError(null);
    setPaymentInfo(null);

    try {
      const response = await savePaymentCard({
        customerUid: customerUid || undefined,
        customerEmail: normalizedCustomerEmail,
        cardholderName,
        cardNumber: cardForm.cardNumber,
        cvv: cardForm.cvv,
        expMonth: Number(cardForm.expMonth),
        expYear: Number(cardForm.expYear)
      });

      const cards = Array.isArray(response?.cards) ? response.cards : [];
      setSavedCards(cards);
      setMaxCardsAllowed(toMaxCardsAllowed(response?.maxCardsAllowed));
      setSelectedCardId(
        typeof response?.savedCardId === "string" && response.savedCardId.length > 0
          ? response.savedCardId
          : cards[0]?.cardId ?? ""
      );
      setCardFieldErrors(createEmptyCardFieldErrors());
      setCustomerName(cardholderName);
      setShowCardForm(false);
      setCardForm(createEmptyCardForm());
      setPaymentInfo("Card saved successfully.");
    } catch (error) {
      const message = getPaymentErrorMessage(error);
      const field = mapPaymentMessageToField(message);

      if (field) {
        setCardFieldErrors({
          ...createEmptyCardFieldErrors(),
          [field]: message
        });
        setPaymentError(null);
      } else {
        setCardFieldErrors(createEmptyCardFieldErrors());
        setPaymentError(message);
      }
    } finally {
      setIsSavingCard(false);
    }
  };

  const deleteSavedCardById = async (cardId) => {
    if (typeof cardId !== "string" || cardId.trim().length === 0) {
      setPaymentError("Select a valid card to delete.");
      return;
    }

    setIsDeletingCard(true);
    setPaymentError(null);
    setPaymentInfo(null);

    try {
      const response = await deleteSavedCardRequest(cardId.trim());
      const cards = Array.isArray(response?.cards) ? response.cards : [];
      const maxAllowed = toMaxCardsAllowed(response?.maxCardsAllowed);

      setSavedCards(cards);
      setMaxCardsAllowed(maxAllowed);
      setCardFieldErrors(createEmptyCardFieldErrors());
      setSelectedCardId((previous) => {
        if (previous && previous !== cardId.trim() && cards.some((card) => card.cardId === previous)) {
          return previous;
        }

        return cards[0]?.cardId ?? "";
      });
      setEditingCardId((previous) =>
        previous && cards.some((card) => card.cardId === previous) ? previous : ""
      );
      setEditCardForm(createEmptyEditCardForm());
      setEditCardFieldErrors(createEmptyEditCardFieldErrors());
      setShowCardForm(cards.length === 0);
      setPaymentInfo(
        cards.length === 0
          ? "Card deleted. No saved cards found."
          : "Card deleted successfully."
      );
    } catch (error) {
      setPaymentError(getPaymentErrorMessage(error));
    } finally {
      setIsDeletingCard(false);
    }
  };

  const startEditingCard = (card) => {
    if (!card || typeof card.cardId !== "string" || card.cardId.trim().length === 0) {
      return;
    }

    setShowCardForm(false);
    setEditingCardId(card.cardId);
    setEditCardFieldErrors(createEmptyEditCardFieldErrors());
    setCardFieldErrors(createEmptyCardFieldErrors());
    setPaymentError(null);
    setPaymentInfo(null);
    setEditCardForm({
      cardholderName:
        typeof card.cardholderName === "string" ? card.cardholderName.trim() : "",
      expMonth:
        Number.isFinite(Number(card.expMonth)) && Number(card.expMonth) > 0
          ? String(card.expMonth)
          : "",
      expYear:
        Number.isFinite(Number(card.expYear)) && Number(card.expYear) > 0
          ? String(card.expYear)
          : ""
    });
  };

  const cancelEditingCard = () => {
    setEditingCardId("");
    setEditCardForm(createEmptyEditCardForm());
    setEditCardFieldErrors(createEmptyEditCardFieldErrors());
    setPaymentError(null);
  };

  const handleEditCardFieldChange = (field, value) => {
    const nextValue = typeof value === "string" ? value : "";
    setEditCardFieldErrors((previous) => ({
      ...previous,
      [field]: ""
    }));
    setPaymentError(null);

    setEditCardForm((previous) => {
      if (field === "expMonth") {
        return {
          ...previous,
          expMonth: nextValue.replace(/\D/g, "").slice(0, 2)
        };
      }

      if (field === "expYear") {
        return {
          ...previous,
          expYear: nextValue.replace(/\D/g, "").slice(0, 4)
        };
      }

      return {
        ...previous,
        [field]: nextValue
      };
    });
  };

  const updateSavedCardById = async () => {
    const normalizedCardId = typeof editingCardId === "string" ? editingCardId.trim() : "";
    if (normalizedCardId.length === 0) {
      setPaymentError("Select a valid card to update.");
      return;
    }

    const nextFieldErrors = createEmptyEditCardFieldErrors();
    const cardholderName = editCardForm.cardholderName.trim();
    const expMonthValue = editCardForm.expMonth.trim();
    const expYearValue = editCardForm.expYear.trim();

    if (cardholderName.length === 0) {
      nextFieldErrors.cardholderName = "Cardholder name is required.";
    } else if (!/^[a-zA-Z\s'\-]+$/.test(cardholderName)) {
      nextFieldErrors.cardholderName = "Name can only contain letters, spaces, hyphens, or apostrophes.";
    } else if (cardholderName.length > 100) {
      nextFieldErrors.cardholderName = "Name must be 100 characters or fewer.";
    }

    if (expMonthValue.length === 0) {
      nextFieldErrors.expMonth = "Expiry month is required.";
    } else {
      const month = Number(expMonthValue);
      if (!Number.isInteger(month) || month < 1 || month > 12) {
        nextFieldErrors.expMonth = "Month must be between 01 and 12.";
      }
    }

    if (expYearValue.length === 0) {
      nextFieldErrors.expYear = "Expiry year is required.";
    } else {
      const year = Number(expYearValue);
      const currentYear = new Date().getFullYear();
      if (!Number.isInteger(year) || year < currentYear || year > currentYear + 20) {
        nextFieldErrors.expYear = `Year must be between ${currentYear} and ${currentYear + 20}.`;
      }
    }

    if (!nextFieldErrors.expMonth && !nextFieldErrors.expYear && expMonthValue && expYearValue) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const month = Number(expMonthValue);
      const year = Number(expYearValue);
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        nextFieldErrors.expYear = "This card has expired.";
      }
    }

    if (Object.values(nextFieldErrors).some(Boolean)) {
      setEditCardFieldErrors(nextFieldErrors);
      return;
    }

    setIsUpdatingCard(true);
    setPaymentError(null);
    setPaymentInfo(null);

    try {
      const response = await updateSavedCardRequest(
        normalizedCardId,
        {
          cardholderName,
          expMonth: Number(expMonthValue),
          expYear: Number(expYearValue)
        }
      );

      const cards = Array.isArray(response?.cards) ? response.cards : [];
      setSavedCards(cards);
      setMaxCardsAllowed(toMaxCardsAllowed(response?.maxCardsAllowed));
      setSelectedCardId((previous) => {
        if (cards.some((card) => card.cardId === previous)) {
          return previous;
        }

        return cards[0]?.cardId ?? "";
      });
      setEditingCardId("");
      setEditCardForm(createEmptyEditCardForm());
      setEditCardFieldErrors(createEmptyEditCardFieldErrors());
      setPaymentInfo("Card updated successfully.");
    } catch (error) {
      const message = getPaymentErrorMessage(error);
      const field = mapPaymentMessageToField(message);

      if (field && Object.prototype.hasOwnProperty.call(createEmptyEditCardFieldErrors(), field)) {
        setEditCardFieldErrors({
          ...createEmptyEditCardFieldErrors(),
          [field]: message
        });
        setPaymentError(null);
      } else {
        setEditCardFieldErrors(createEmptyEditCardFieldErrors());
        setPaymentError(message);
      }
    } finally {
      setIsUpdatingCard(false);
    }
  };

  const submitCheckout = async () => {
    const confirmedBookings = [];
    let warning = null;

    if (!currentUser) {
      setNeedsLogin(true);
      return;
    }

    // If no saved card selected and the card form has data, temporarily save it
    let tempCardId = null;
    if (!selectedCardId && showCardForm) {
      const cardholderName = cardForm.cardholderName.trim() || customerName.trim();
      if (!cardholderName || !cardForm.cardNumber || !cardForm.cvv || !cardForm.expMonth || !cardForm.expYear) {
        setPaymentError("Please fill in all card details before confirming checkout.");
        return;
      }

      try {
        setIsSubmitting(true);
        const response = await savePaymentCard({
          customerUid: customerUid || undefined,
          customerEmail: normalizedCustomerEmail,
          cardholderName,
          cardNumber: cardForm.cardNumber,
          cvv: cardForm.cvv,
          expMonth: Number(cardForm.expMonth),
          expYear: Number(cardForm.expYear)
        });
        tempCardId = response?.savedCardId ?? (Array.isArray(response?.cards) ? response.cards[0]?.cardId : null);
        if (!tempCardId) {
          setPaymentError("Could not process card. Please try again.");
          setIsSubmitting(false);
          return;
        }
      } catch (error) {
        setPaymentError(getPaymentErrorMessage(error));
        setIsSubmitting(false);
        return;
      }
    }

    const effectiveCardId = selectedCardId || tempCardId;

    if (!effectiveCardId) {
      setPaymentError("Select a saved card or enter card details to continue.");
      return;
    }

    setIsSubmitting(true);
    setSelectionError(null);
    setPaymentError(null);
    try {
      getAuthToken(); // validates user is signed in before proceeding
    } catch (error) {
      setPaymentError(getPaymentErrorMessage(error));
      setIsSubmitting(false);
      return;
    }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const itemSeatIds = [...(seatSelections[item.id] ?? [])].sort();
      const itemTicketCount = getTotalTickets(item.tickets);

      if (itemSeatIds.length !== itemTicketCount) {
        setCurrentIndex(index);
        setIsPaymentStep(false);
        setSelectionError(
          `Select ${itemTicketCount - itemSeatIds.length} more seat${itemTicketCount - itemSeatIds.length === 1 ? "" : "s"} to continue.`
        );
        setIsSubmitting(false);
        return;
      }

      try {
        // Pass guestSessionId so the backend can verify locks acquired before login
        const guestSessionId = !currentUser ? selfId : undefined;
        const booking = await createBooking({
          customerUid: customerUid || undefined,
          movieId: item.movie.id,
          showtime: item.showtime,
          seatIds: itemSeatIds,
          tickets: item.tickets,
          customerEmail: normalizedCustomerEmail,
          customerName: customerName.trim() || selectedCard?.cardholderName,
          paymentCardId: effectiveCardId,
          ...(appliedPromo?.code ? { promoCode: appliedPromo.code } : {}),
          ...(guestSessionId ? { guestSessionId } : {})
        });

        confirmedBookings.push({
          itemId: item.id,
          bookingId: booking.bookingId,
          total: booking.total,
          movieTitle: item.movie.title,
          showtime: item.showtime,
          seatLabels: itemSeatIds.map((seatId) => formatSeatIdLabel(seatId))
        });
      } catch (error) {
        const message = getMeaningfulErrorMessage(error, "user");

        if (confirmedBookings.length === 0) {
          setCurrentIndex(index);
          setIsPaymentStep(false);
          setSelectionError(message);
          await loadReservedSeatsForItem(item);
          setIsSubmitting(false);
          return;
        }

        warning = `${message} Remaining items are still in your cart.`;
        break;
      }
    }

    setIsSubmitting(false);

    if (confirmedBookings.length === 0) {
      return;
    }

    // Clean up the temporarily saved card if user chose not to save it
    if (tempCardId && !saveCard) {
      try {
        await deleteSavedCardRequest(tempCardId);
      } catch {
        // Non-fatal: card cleanup failure doesn't affect the booking
      }
    }

    onCheckout({
      confirmedBookings,
      total: confirmedBookings.reduce((sum, booking) => sum + booking.total, 0),
      completedItemIds: confirmedBookings.map((booking) => booking.itemId),
      warning
    });
    closeDialog();
  };

  const applyPromoCode = async () => {
    const trimmedCode = promoCodeInput.trim();
    if (!trimmedCode) return;

    setIsApplyingPromo(true);
    setPromoError(null);
    setAppliedPromo(null);

    try {
      const result = await validatePromoCode({ code: trimmedCode, userId: customerUid || undefined });
      setAppliedPromo({ code: trimmedCode, discountPercent: result.discountPercent });
    } catch (error) {
      setPromoError(getPromoErrorMessage(error));
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleCustomerEmailChange = (value) => {
    setCustomerEmail(value);
    // Reset OTP state whenever the email field is edited
    setOtpSent(false);
    setOtpCode("");
    setOtpVerified(false);
    setOtpError(null);
  };

  const handleSendOtp = async () => {
    setIsSendingOtp(true);
    setOtpError(null);
    try {
      await sendEmailOtp(normalizedCustomerEmail);
      setOtpSent(true);
      setOtpCode("");
    } catch (err) {
      setOtpError(err?.message ?? "Failed to send verification code. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setIsVerifyingOtp(true);
    setOtpError(null);
    try {
      await verifyEmailOtp(normalizedCustomerEmail, otpCode.trim());
      setOtpVerified(true);
      setOtpSent(false);
      setOtpError(null);
    } catch (err) {
      setOtpError(err?.message ?? "Invalid code. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const continueCheckout = async () => {
    if (isPaymentStep) {
      if (!canCheckoutWithPayment) {
        setPaymentError("Select a saved card before confirming checkout.");
        return;
      }

      await submitCheckout();
      return;
    }

    if (isOrderSummaryStep) {
      if (!isValidEmail(normalizeEmail(customerEmail))) {
        setPaymentError("Please enter a valid email address to continue.");
        return;
      }

      if (needsEmailVerification) {
        setPaymentError("Please verify your email address before continuing.");
        return;
      }

      if (!currentUser) {
        setNeedsLogin(true);
        return;
      }

      setIsOrderSummaryStep(false);
      setPaymentError(null);
      setIsPaymentStep(true);
      return;
    }

    if (loadError) {
      setSelectionError("Load available seats before continuing.");
      return;
    }

    if (remainingSeats > 0) {
      setSelectionError(
        `Select ${remainingSeats} more seat${remainingSeats === 1 ? "" : "s"} to continue.`
      );
      return;
    }

    if (currentIndex < totalSteps - 1) {
      setSelectionError(null);
      setLoadError(null);
      setIsPaymentStep(false);
      setCurrentIndex((previous) => previous + 1);
      return;
    }

    setSelectionError(null);
    setPaymentError(null);
    setIsOrderSummaryStep(true);
  };

  return {
    isOpen,
    currentItem,
    currentIndex,
    totalSteps,
    reservedSeats,
    lockedSeats,
    lockCountdown,
    selfId,
    isLoadingSeats,
    isSubmitting,
    loadError,
    selectionError,
    selectedSeatIds,
    totalTickets,
    remainingSeats,
    savedCards,
    selectedCardId,
    cardForm,
    showCardForm,
    isCheckingCards,
    isSavingCard,
    isDeletingCard,
    isUpdatingCard,
    cardFieldErrors,
    editingCardId,
    editCardForm,
    editCardFieldErrors,
    paymentError,
    paymentInfo,
    canAddMoreCards,
    maxCardsAllowed,
    showPaymentStep: isPaymentStep,
    showOrderSummaryStep: isOrderSummaryStep,
    canCheckoutWithPayment,
    customerEmail,
    customerEmailFormatError,
    setCustomerEmail,
    handleCustomerEmailChange,
    needsEmailVerification,
    otpSent,
    otpCode,
    setOtpCode,
    otpVerified,
    isSendingOtp,
    isVerifyingOtp,
    otpError,
    handleSendOtp,
    handleVerifyOtp,
    seatSelections,
    needsLogin,
    clearNeedsLogin: () => setNeedsLogin(false),
    saveCard,
    setSaveCard,
    ROWS: seatRows,
    COLS: seatCols,
    formatSeatLabel,
    handleSelectCard,
    handleCardFieldChange,
    startEditingCard,
    cancelEditingCard,
    handleEditCardFieldChange,
    setShowCardForm,
    saveCardForEmail,
    updateSavedCardById,
    deleteSavedCardById,
    openDialog,
    closeDialog,
    toggleSeat,
    continueCheckout,
    goToPreviousItem,
    promoCodeInput,
    setPromoCodeInput,
    appliedPromo,
    setAppliedPromo,
    promoError,
    setPromoError,
    isApplyingPromo,
    applyPromoCode,
    showroomNameMap,
    itemShowroomMap,
    activeShowroomId,
    activeShowroomName: activeShowroomId ? showroomNameMap[activeShowroomId] ?? null : null
  };
}
