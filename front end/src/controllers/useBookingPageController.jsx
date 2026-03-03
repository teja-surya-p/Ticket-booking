import { useEffect, useMemo, useState } from "react";
import {
  createBooking,
  fetchBookingQuote,
  fetchReservedSeats,
  fetchTicketPricing,
  getMeaningfulErrorMessage
} from "@/services";
import {
  BOOKING_SEAT_COLS,
  BOOKING_SEAT_ROWS,
  BOOKING_TICKET_TYPES,
  DEFAULT_PRICING,
  INITIAL_TICKETS,
  MAX_TICKETS_PER_BOOKING,
  calculateBookingSubtotal,
  formatSeatLabel,
  getTotalTickets
} from "@/models/booking-model";

export function useBookingPageController({ movie, showtime }) {
  const [reservedSeats, setReservedSeats] = useState(new Set());
  const [selectedSeats, setSelectedSeats] = useState(new Set());
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [pricing, setPricing] = useState(DEFAULT_PRICING);
  const [quote, setQuote] = useState(null);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [quoteError, setQuoteError] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(null);

  const totalTickets = useMemo(() => getTotalTickets(tickets), [tickets]);
  const selectedSeatIds = useMemo(() => Array.from(selectedSeats).sort(), [selectedSeats]);

  const localSubtotal = useMemo(() => calculateBookingSubtotal(tickets, pricing), [tickets, pricing]);
  const subtotal = quote?.subtotal ?? localSubtotal;
  const serviceFee = quote?.serviceFee ?? 0;
  const total = quote?.total ?? localSubtotal;

  const seatLabel = (row, col) => formatSeatLabel(row, col);

  const refreshReservedSeats = async () => {
    const data = await fetchReservedSeats(movie.id, showtime);
    const reserved = new Set(data.reservedSeats);
    setReservedSeats(reserved);

    setSelectedSeats((previous) => {
      const next = new Set(previous);
      Array.from(next).forEach((seatId) => {
        if (reserved.has(seatId)) {
          next.delete(seatId);
        }
      });
      return next;
    });
  };

  useEffect(() => {
    let active = true;

    const loadContext = async () => {
      setIsLoadingContext(true);
      setLoadError(null);

      try {
        const [reservedSeatsData, pricingData] = await Promise.all([
          fetchReservedSeats(movie.id, showtime),
          fetchTicketPricing()
        ]);

        if (!active) {
          return;
        }

        setReservedSeats(new Set(reservedSeatsData.reservedSeats));
        setPricing(pricingData);
      } catch (error) {
        if (!active) {
          return;
        }
        setLoadError(getMeaningfulErrorMessage(error, "user"));
      } finally {
        if (active) {
          setIsLoadingContext(false);
        }
      }
    };

    void loadContext();

    return () => {
      active = false;
    };
  }, [movie.id, showtime]);

  useEffect(() => {
    let active = true;

    const getQuote = async () => {
      setQuoteError(null);

      if (totalTickets <= 0 || selectedSeatIds.length !== totalTickets) {
        setQuote(null);
        return;
      }

      try {
        setIsLoadingQuote(true);

        const data = await fetchBookingQuote({
          movieId: movie.id,
          showtime,
          seatIds: selectedSeatIds,
          tickets
        });

        if (!active) {
          return;
        }

        setQuote(data);
      } catch (error) {
        if (!active) {
          return;
        }
        setQuote(null);
        setQuoteError(getMeaningfulErrorMessage(error, "user"));
      } finally {
        if (active) {
          setIsLoadingQuote(false);
        }
      }
    };

    void getQuote();

    return () => {
      active = false;
    };
  }, [movie.id, selectedSeatIds, showtime, tickets, totalTickets]);

  const toggleSeat = (seatId) => {
    if (reservedSeats.has(seatId)) {
      return;
    }

    setCheckoutError(null);
    setCheckoutSuccess(null);

    setSelectedSeats((previous) => {
      const next = new Set(previous);

      if (next.has(seatId)) {
        next.delete(seatId);
        return next;
      }

      if (next.size >= totalTickets) {
        setCheckoutError("Selected seats cannot exceed total tickets. Increase tickets or unselect a seat.");
        return next;
      }

      next.add(seatId);
      return next;
    });
  };

  const updateTicket = (type, delta) => {
    setCheckoutError(null);
    setCheckoutSuccess(null);

    setTickets((previous) => {
      const nextValue = Math.max(0, previous[type] + delta);
      const nextTickets = {
        ...previous,
        [type]: nextValue
      };

      if (getTotalTickets(nextTickets) > MAX_TICKETS_PER_BOOKING) {
        setCheckoutError(`A booking cannot exceed ${MAX_TICKETS_PER_BOOKING} tickets.`);
        return previous;
      }

      return nextTickets;
    });
  };

  const handleCheckout = async () => {
    setCheckoutError(null);
    setCheckoutSuccess(null);

    if (totalTickets <= 0) {
      setCheckoutError("Please select at least one ticket.");
      return;
    }

    if (totalTickets > MAX_TICKETS_PER_BOOKING) {
      setCheckoutError(`A booking cannot exceed ${MAX_TICKETS_PER_BOOKING} tickets.`);
      return;
    }

    if (selectedSeatIds.length !== totalTickets) {
      setCheckoutError("The number of selected seats must exactly match the number of tickets.");
      return;
    }

    try {
      setIsSubmitting(true);

      const booking = await createBooking({
        movieId: movie.id,
        showtime,
        seatIds: selectedSeatIds,
        tickets
      });

      setCheckoutSuccess(`Booking confirmed. Reference: ${booking.bookingId}`);
      setSelectedSeats(new Set());
      setTickets(INITIAL_TICKETS);
      setQuote(null);
      await refreshReservedSeats();
    } catch (error) {
      setCheckoutError(getMeaningfulErrorMessage(error, "user"));
      await refreshReservedSeats();
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    ROWS: BOOKING_SEAT_ROWS,
    COLS: BOOKING_SEAT_COLS,
    ticketTypes: BOOKING_TICKET_TYPES,
    reservedSeats,
    selectedSeats,
    tickets,
    pricing,
    quote,
    isLoadingContext,
    isLoadingQuote,
    isSubmitting,
    loadError,
    quoteError,
    checkoutError,
    checkoutSuccess,
    totalTickets,
    selectedSeatIds,
    subtotal,
    serviceFee,
    total,
    seatLabel,
    toggleSeat,
    updateTicket,
    handleCheckout
  };
}
