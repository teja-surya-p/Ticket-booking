import { useEffect, useMemo, useState } from "react";
import {
  createBooking,
  fetchReservedSeats,
  fetchSavedCards,
  getMeaningfulErrorMessage,
  savePaymentCard
} from "@/services";
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

const DEFAULT_CHECKOUT_CUSTOMER_EMAIL = normalizeEmail(
  process.env.NEXT_PUBLIC_CHECKOUT_CUSTOMER_EMAIL ?? ""
);
const DEFAULT_CHECKOUT_CUSTOMER_NAME =
  typeof process.env.NEXT_PUBLIC_CHECKOUT_CUSTOMER_NAME === "string"
    ? process.env.NEXT_PUBLIC_CHECKOUT_CUSTOMER_NAME.trim()
    : "";

export function useSeatSelectionCheckoutController({ items, onCheckout }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [seatSelections, setSeatSelections] = useState({});
  const [reservedSeats, setReservedSeats] = useState(new Set());
  const [isLoadingSeats, setIsLoadingSeats] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [selectionError, setSelectionError] = useState(null);
  const [customerEmail, setCustomerEmail] = useState(DEFAULT_CHECKOUT_CUSTOMER_EMAIL);
  const [customerName, setCustomerName] = useState(DEFAULT_CHECKOUT_CUSTOMER_NAME);
  const [savedCards, setSavedCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [cardForm, setCardForm] = useState(createEmptyCardForm());
  const [showCardForm, setShowCardForm] = useState(false);
  const [isCheckingCards, setIsCheckingCards] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [maxCardsAllowed, setMaxCardsAllowed] = useState(3);
  const [isPaymentStep, setIsPaymentStep] = useState(false);

  const currentItem = isOpen ? items[currentIndex] ?? null : null;
  const totalSteps = items.length;

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
        : `Found ${cards.length} saved card${cards.length === 1 ? "" : "s"}.`
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
      if (!silent) {
        setPaymentError(
          "Checkout email is not configured. Set NEXT_PUBLIC_CHECKOUT_CUSTOMER_EMAIL in front end/.env."
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
      const response = await fetchSavedCards(normalizedEmail);
      applySavedCardsPayload(response);
    } catch (error) {
      setSavedCards([]);
      setSelectedCardId("");
      setShowCardForm(false);
      setPaymentError(getMeaningfulErrorMessage(error, "user"));
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
      return;
    }

    const timeoutId = setTimeout(() => {
      void fetchCardsForEmail(normalizedEmail, { silent: true });
    }, 350);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [customerEmail, isOpen, isPaymentStep]);

  const closeDialog = () => {
    setIsOpen(false);
    setCurrentIndex(0);
    setSeatSelections({});
    setReservedSeats(new Set());
    setIsLoadingSeats(false);
    setIsSubmitting(false);
    setLoadError(null);
    setSelectionError(null);
    setCustomerEmail(DEFAULT_CHECKOUT_CUSTOMER_EMAIL);
    setCustomerName(DEFAULT_CHECKOUT_CUSTOMER_NAME);
    setSavedCards([]);
    setSelectedCardId("");
    setCardForm(createEmptyCardForm());
    setShowCardForm(false);
    setIsCheckingCards(false);
    setIsSavingCard(false);
    setPaymentError(null);
    setPaymentInfo(null);
    setMaxCardsAllowed(3);
    setIsPaymentStep(false);
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
    setCustomerEmail(DEFAULT_CHECKOUT_CUSTOMER_EMAIL);
    setCustomerName(DEFAULT_CHECKOUT_CUSTOMER_NAME);
    setSavedCards([]);
    setSelectedCardId("");
    setCardForm(createEmptyCardForm());
    setShowCardForm(false);
    setIsCheckingCards(false);
    setIsSavingCard(false);
    setPaymentError(null);
    setPaymentInfo(null);
    setMaxCardsAllowed(3);
    setIsPaymentStep(false);
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
      setPaymentError(null);
      return;
    }

    setSelectionError(null);
    setLoadError(null);
    setCurrentIndex((previous) => Math.max(0, previous - 1));
  };

  const handleSelectCard = (cardId) => {
    setSelectedCardId(cardId);
    setPaymentError(null);
  };

  const handleCardFieldChange = (field, value) => {
    const nextValue = typeof value === "string" ? value : "";
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
    if (!isValidEmail(normalizedCustomerEmail)) {
      setPaymentError(
        "Checkout email is not configured. Set NEXT_PUBLIC_CHECKOUT_CUSTOMER_EMAIL in front end/.env."
      );
      return;
    }

    if (!canAddMoreCards) {
      setPaymentError(`You can save up to ${maxCardsAllowed} cards only.`);
      return;
    }

    const cardholderName = cardForm.cardholderName.trim() || customerName.trim();
    if (cardholderName.length === 0) {
      setPaymentError("Card holder name is required.");
      return;
    }

    if (!cardForm.cardNumber || !cardForm.cvv || !cardForm.expMonth || !cardForm.expYear) {
      setPaymentError("Card number, CVV, expiry month, and expiry year are required.");
      return;
    }

    setIsSavingCard(true);
    setPaymentError(null);
    setPaymentInfo(null);

    try {
      const response = await savePaymentCard({
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
      setCustomerName(cardholderName);
      setShowCardForm(false);
      setCardForm(createEmptyCardForm());
      setPaymentInfo("Card saved successfully.");
    } catch (error) {
      setPaymentError(getMeaningfulErrorMessage(error, "user"));
    } finally {
      setIsSavingCard(false);
    }
  };

  const submitCheckout = async () => {
    const confirmedBookings = [];
    let warning = null;

    if (!canCheckoutWithPayment) {
      setPaymentError("Select a saved card before checkout.");
      return;
    }

    setIsSubmitting(true);
    setSelectionError(null);
    setPaymentError(null);

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
          movieId: item.movie.id,
          showtime: item.showtime,
          seatIds: itemSeatIds,
          tickets: item.tickets,
          customerEmail: normalizedCustomerEmail,
          customerName: customerName.trim() || selectedCard?.cardholderName,
          paymentCardId: selectedCardId
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

    onCheckout({
      confirmedBookings,
      total: confirmedBookings.reduce((sum, booking) => sum + booking.total, 0),
      completedItemIds: confirmedBookings.map((booking) => booking.itemId),
      warning
    });
    closeDialog();
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

    if (!isValidEmail(normalizedCustomerEmail)) {
      setPaymentError(
        "Checkout email is not configured. Set NEXT_PUBLIC_CHECKOUT_CUSTOMER_EMAIL in front end/.env."
      );
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
    setIsPaymentStep(true);
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
    paymentError,
    paymentInfo,
    canAddMoreCards,
    maxCardsAllowed,
    showPaymentStep: isPaymentStep,
    canCheckoutWithPayment,
    ROWS: BOOKING_SEAT_ROWS,
    COLS: BOOKING_SEAT_COLS,
    formatSeatLabel,
    handleSelectCard,
    handleCardFieldChange,
    setShowCardForm,
    saveCardForEmail,
    openDialog,
    closeDialog,
    toggleSeat,
    continueCheckout,
    goToPreviousItem
  };
}
