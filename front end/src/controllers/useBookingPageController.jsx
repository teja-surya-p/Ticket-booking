import { useEffect, useMemo, useRef, useState } from "react";
import {
  createBooking,
  fetchBookingQuote,
  fetchReservedSeats,
  fetchTicketPricing,
  getMeaningfulErrorMessage
} from "@/services";
import { fetchShowroomById } from "@/services/showroomsApi";
import { lockSeat, unlockSeat, getOrCreateGuestSessionId } from "@/services/bookingApi";
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

/** Formats milliseconds remaining into "M:SS" */
function formatCountdown(ms) {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function useBookingPageController({ movie, showtime, currentUser }) {
  const [reservedSeats, setReservedSeats] = useState(new Set());
  const [selectedSeats, setSelectedSeats] = useState(new Set());
  const [lockedSeats, setLockedSeats] = useState(new Map()); // seatId → { lockedBy, lockExpiresAt, isGuest }
  const [lockCountdown, setLockCountdown] = useState(null); // "4:32" or null
  const [selfId, setSelfId] = useState(null);
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

  // Track pending lock operations so we don't double-fire on rapid clicks
  const lockingRef = useRef(new Set());

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

  // Resolve selfId once on mount / when auth state changes
  useEffect(() => {
    const id = currentUser?.uid ?? getOrCreateGuestSessionId();
    setSelfId(id);
  }, [currentUser?.uid]);

  const refreshReservedSeats = async () => {
    const data = await fetchReservedSeats(movie.id, showtime);
    const reserved = new Set(data.reservedSeats);
    setReservedSeats(reserved);

    // Parse the new lockedSeats map from the API response
    const lockMap = new Map(Object.entries(data.lockedSeats ?? {}));
    setLockedSeats(lockMap);

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

  // Initial data load
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
        setLockedSeats(new Map(Object.entries(reservedSeatsData.lockedSeats ?? {})));
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

  // Poll reserved/locked seats every 30 seconds so the grid stays current
  useEffect(() => {
    const id = setInterval(() => {
      void refreshReservedSeats().catch(() => {
        // Best-effort; don't surface polling errors to the user
      });
    }, 30_000);
    return () => clearInterval(id);
  }, [movie.id, showtime]);

  // Countdown timer: tick every second, derived from earliest self-locked seat expiry
  useEffect(() => {
    const id = setInterval(() => {
      if (!selfId) {
        setLockCountdown(null);
        return;
      }

      // Find the earliest expiry among seats locked by self that are still selected
      let earliest = null;
      for (const [seatId, info] of lockedSeats) {
        if (info.lockedBy === selfId && selectedSeats.has(seatId)) {
          const exp = new Date(info.lockExpiresAt).getTime();
          if (earliest === null || exp < earliest) {
            earliest = exp;
          }
        }
      }

      if (earliest === null) {
        setLockCountdown(null);
      } else {
        const remaining = earliest - Date.now();
        setLockCountdown(remaining > 0 ? formatCountdown(remaining) : "0:00");
      }
    }, 1_000);

    return () => clearInterval(id);
  }, [lockedSeats, selectedSeats, selfId]);

  // Quote fetch
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

  const toggleSeat = async (seatId) => {
    // Block if reserved (confirmed booking)
    if (reservedSeats.has(seatId)) {
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

    setCheckoutError(null);
    setCheckoutSuccess(null);

    if (selectedSeats.has(seatId)) {
      // Deselect: remove from state immediately, then fire unlock (best-effort)
      setSelectedSeats((previous) => {
        const next = new Set(previous);
        next.delete(seatId);
        return next;
      });

      if (selfId) {
        lockingRef.current.add(seatId);
        unlockSeat({ movieId: movie.id, showtime, seatId, lockedBy: selfId }).catch(() => {
          // Unlock is best-effort; the lock will expire naturally
        }).finally(() => {
          lockingRef.current.delete(seatId);
        });
      }
      return;
    }

    // Adding a seat: enforce ticket count limit first
    if (selectedSeats.size >= totalTickets) {
      setCheckoutError("Selected seats cannot exceed total tickets. Increase tickets or unselect a seat.");
      return;
    }

    if (!selfId) {
      // selfId not yet resolved — skip (should be rare)
      return;
    }

    // Acquire the lock
    lockingRef.current.add(seatId);
    try {
      const isGuest = !currentUser;
      const result = await lockSeat({
        movieId: movie.id,
        showtime,
        seatId,
        lockedBy: selfId,
        isGuest
      });

      // Update locked seats map with the fresh expiry
      setLockedSeats((previous) => {
        const next = new Map(previous);
        next.set(seatId, { lockedBy: selfId, lockExpiresAt: result.lockExpiresAt, isGuest });
        return next;
      });

      setSelectedSeats((previous) => {
        const next = new Set(previous);
        next.add(seatId);
        return next;
      });
    } catch (error) {
      // If 409 the seat was just taken by someone else — refresh to show current state
      await refreshReservedSeats().catch(() => {});
      setCheckoutError(getMeaningfulErrorMessage(error, "user"));
    } finally {
      lockingRef.current.delete(seatId);
    }
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

      // Pass guestSessionId so the backend can verify locks acquired as a guest
      const guestSessionId = !currentUser ? selfId : undefined;

      const booking = await createBooking({
        movieId: movie.id,
        showtime,
        seatIds: selectedSeatIds,
        tickets,
        ...(guestSessionId ? { guestSessionId } : {})
      });

      setCheckoutSuccess(`Booking confirmed. Reference: ${booking.bookingId}`);
      setSelectedSeats(new Set());
      setLockedSeats(new Map());
      setLockCountdown(null);
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
    lockedSeats,
    lockCountdown,
    selfId,
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
