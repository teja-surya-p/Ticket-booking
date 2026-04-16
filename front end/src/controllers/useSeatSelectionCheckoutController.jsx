import { useEffect, useMemo, useState } from "react";
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
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const currentItem = isOpen ? items[currentIndex] ?? null : null;
  const totalSteps = items.length;
  const customerUid =
    typeof currentUser?.uid === "string" && currentUser.uid.trim().length > 0
      ? currentUser.uid.trim()
      : "";
  const resolvedUserEmail = normalizeEmail(currentUser?.email ?? "");
  const resolvedUserName = getCustomerNameFromUser(currentUser);

  const getAuthToken = async () => {
    if (typeof currentUser?.getIdToken !== "function") {
      throw new Error("Please sign in to continue checkout.");
    }

    return await currentUser.getIdToken();
  };

  const selectedSeatIds = useMemo(
    () => (currentItem ? [...(seatSelections[currentItem.id] ?? [])].sort() : []),
    [currentItem, seatSelections]
  );
  const totalTickets = currentItem ? getTotalTickets(currentItem.tickets) : 0;
  const remainingSeats = Math.max(totalTickets - selectedSeatIds.length, 0);
  const normalizedCustomerEmail = normalizeEmail(customerEmail);
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

  useEffect(() => {
    const showroomId = currentItem?.movie?.showroomId;
    if (!showroomId) {
      setSeatRows(BOOKING_SEAT_ROWS);
      setSeatCols(BOOKING_SEAT_COLS);
      return;
    }

    fetchShowroomById(showroomId)
      .then((data) => {
        if (data?.layout?.rows && data?.layout?.cols) {
          setSeatRows(data.layout.rows);
          setSeatCols(data.layout.cols);
        }
        if (data?.name && showroomId) {
          setShowroomNameMap((prev) => ({ ...prev, [showroomId]: data.name }));
        }
      })
      .catch(() => {
        setSeatRows(BOOKING_SEAT_ROWS);
        setSeatCols(BOOKING_SEAT_COLS);
      });
  }, [currentItem?.movie?.showroomId]);

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
      const token = await getAuthToken();
      const response = await fetchSavedCards(
        normalizedEmail,
        customerUid || undefined,
        token
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
      setPaymentError(getPaymentErrorMessage(error));
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
  };

  const openDialog = () => {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }

    const invalidItem = items.find((item) => getTotalTickets(item.tickets) > MAX_TICKETS_PER_BOOKING);
    if (invalidItem) {
      setLoadError(`A booking cannot exceed ${MAX_TICKETS_PER_BOOKING} tickets.`);
      return;
    }

    setSeatSelections(buildEmptySelections(items));
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
    setIsOrderSummaryStep(false);
    setEditingCardId("");
    setEditCardForm(createEmptyEditCardForm());
    setEditCardFieldErrors(createEmptyEditCardFieldErrors());
    setIsUpdatingCard(false);
    setPromoCodeInput("");
    setAppliedPromo(null);
    setPromoError(null);
    setIsApplyingPromo(false);
    setIsOpen(true);
  };

  const toggleSeat = (seatId) => {
    if (!currentItem || loadError || reservedSeats.has(seatId)) {
      return;
    }

    setSelectionError(null);

    setSeatSelections((previous) => {
      const nextSelection = new Set(previous[currentItem.id] ?? []);

      if (nextSelection.has(seatId)) {
        nextSelection.delete(seatId);
        return {
          ...previous,
          [currentItem.id]: Array.from(nextSelection).sort()
        };
      }

      if (nextSelection.size >= totalTickets) {
        setSelectionError(
          `Maximum seats for ${totalTickets} ticket${totalTickets === 1 ? "" : "s"} are already selected.`
        );
        return previous;
      }

      nextSelection.add(seatId);
      return {
        ...previous,
        [currentItem.id]: Array.from(nextSelection).sort()
      };
    });
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
        "Please sign in to save a card."
      );
      return;
    }

    if (!canAddMoreCards) {
      setPaymentError(`You can save up to ${maxCardsAllowed} cards only.`);
      return;
    }

    const cardholderName = cardForm.cardholderName.trim() || customerName.trim();
    if (cardholderName.length === 0) {
      nextFieldErrors.cardholderName = "Card holder name is required.";
    }

    if (!cardForm.cardNumber) {
      nextFieldErrors.cardNumber = "Card number is required.";
    }
    if (!cardForm.cvv) {
      nextFieldErrors.cvv = "CVV is required.";
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
      const token = await getAuthToken();
      const response = await savePaymentCard({
        customerUid: customerUid || undefined,
        customerEmail: normalizedCustomerEmail,
        cardholderName,
        cardNumber: cardForm.cardNumber,
        cvv: cardForm.cvv,
        expMonth: Number(cardForm.expMonth),
        expYear: Number(cardForm.expYear)
      }, token);

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
      const token = await getAuthToken();
      const response = await deleteSavedCardRequest(cardId.trim(), token);
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
      nextFieldErrors.cardholderName = "Card holder name is required.";
    }

    if (expMonthValue.length === 0) {
      nextFieldErrors.expMonth = "Expiry month is required.";
    }

    if (expYearValue.length === 0) {
      nextFieldErrors.expYear = "Expiry year is required.";
    }

    if (Object.values(nextFieldErrors).some(Boolean)) {
      setEditCardFieldErrors(nextFieldErrors);
      return;
    }

    setIsUpdatingCard(true);
    setPaymentError(null);
    setPaymentInfo(null);

    try {
      const token = await getAuthToken();
      const response = await updateSavedCardRequest(
        normalizedCardId,
        {
          cardholderName,
          expMonth: Number(expMonthValue),
          expYear: Number(expYearValue)
        },
        token
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
        const authToken = await getAuthToken();
        const response = await savePaymentCard({
          customerUid: customerUid || undefined,
          customerEmail: normalizedCustomerEmail,
          cardholderName,
          cardNumber: cardForm.cardNumber,
          cvv: cardForm.cvv,
          expMonth: Number(cardForm.expMonth),
          expYear: Number(cardForm.expYear)
        }, authToken);
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
    let authToken = "";

    try {
      authToken = await getAuthToken();
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
        const booking = await createBooking({
          customerUid: customerUid || undefined,
          movieId: item.movie.id,
          showtime: item.showtime,
          seatIds: itemSeatIds,
          tickets: item.tickets,
          customerEmail: normalizedCustomerEmail,
          customerName: customerName.trim() || selectedCard?.cardholderName,
          paymentCardId: effectiveCardId,
          ...(appliedPromo?.code ? { promoCode: appliedPromo.code } : {})
        }, authToken);

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
        const cleanupToken = await getAuthToken();
        await deleteSavedCardRequest(tempCardId, cleanupToken);
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
      setPromoError(getMeaningfulErrorMessage(error, "user"));
    } finally {
      setIsApplyingPromo(false);
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

      setIsOrderSummaryStep(false);
      setPaymentError(null);
      setIsPaymentStep(true);
      return;
    }

    if (!currentUser) {
      setNeedsLogin(true);
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
    setCustomerEmail,
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
    promoError,
    isApplyingPromo,
    applyPromoCode,
    showroomNameMap
  };
}
