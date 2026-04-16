import { useEffect, useMemo, useState } from "react";
import {
  createBooking,
  fetchBookingQuote,
  fetchReservedSeats,
  fetchTicketPricing,
  getMeaningfulErrorMessage
} from "@/services";
import { fetchShowroomById } from "@/services/showroomsApi";
import {
  BOOKING_SEAT_COLS,
  BOOKING_SEAT_ROWS,
  BOOKING_TICKET_TYPES,
  DEFAULT_PRICING,
  INITIAL_TICKETS,
  MAX_TICKETS_PER_BOOKING,
  buildSeatId,
  calculateBookingSubtotal,
  formatSeatLabel,
  getTotalTickets
} from "@/models/booking-model";

export function useBookingPageController({ movie, showtime, currentUser }) {
  const [reservedSeats, setReservedSeats] = useState(new Set());
  const [selectedSeats, setSelectedSeats] = useState(new Set());
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [pricing, setPricing] = useState(DEFAULT_PRICING);
  const [quote, setQuote] = useState(null);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [seatRows, setSeatRows] = useState(BOOKING_SEAT_ROWS);
  const [seatCols, setSeatCols] = useState(BOOKING_SEAT_COLS);
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
  const resetSeatLayout = () => {
    setSeatRows(BOOKING_SEAT_ROWS);
    setSeatCols(BOOKING_SEAT_COLS);
  };

  const applySeatLayout = (rows, cols) => {
    setSeatRows(rows);
    setSeatCols(cols);

    const validSeatIds = new Set(
      Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => buildSeatId(row, col))
      ).flat()
    );

    setSelectedSeats((previous) => {
      const next = new Set();
      previous.forEach((seatId) => {
        if (validSeatIds.has(seatId)) {
          next.add(seatId);
        }
      });
      return next;
    });
  };

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
        const fetchList = [
          fetchReservedSeats(movie.id, showtime),
          fetchTicketPricing()
        ];
        if (movie.showroomId) {
          fetchList.push(fetchShowroomById(movie.showroomId));
        }

        const [reservedSeatsData, pricingData, showroomData] = await Promise.all(fetchList);

        if (!active) {
          return;
        }

        setReservedSeats(new Set(reservedSeatsData.reservedSeats));
        setPricing(pricingData);

        if (showroomData?.layout?.rows && showroomData?.layout?.cols) {
          applySeatLayout(showroomData.layout.rows, showroomData.layout.cols);
        } else {
          resetSeatLayout();
        }
      } catch (error) {
        if (!active) {
          return;
        }
        resetSeatLayout();
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
  }, [movie.id, movie.showroomId, showtime]);

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

    if (!currentUser) {
      setNeedsLogin(true);
      return;
    }

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
    ROWS: seatRows,
    COLS: seatCols,
    needsLogin,
    clearNeedsLogin: () => setNeedsLogin(false),
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
