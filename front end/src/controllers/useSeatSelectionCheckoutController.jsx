import { useEffect, useMemo, useState } from "react";
import { createBooking, fetchReservedSeats, getMeaningfulErrorMessage } from "@/services";
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

export function useSeatSelectionCheckoutController({ items, onCheckout }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [seatSelections, setSeatSelections] = useState({});
  const [reservedSeats, setReservedSeats] = useState(new Set());
  const [isLoadingSeats, setIsLoadingSeats] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [selectionError, setSelectionError] = useState(null);

  const currentItem = isOpen ? items[currentIndex] ?? null : null;
  const totalSteps = items.length;

  const selectedSeatIds = useMemo(
    () => (currentItem ? [...(seatSelections[currentItem.id] ?? [])].sort() : []),
    [currentItem, seatSelections]
  );
  const totalTickets = currentItem ? getTotalTickets(currentItem.tickets) : 0;
  const remainingSeats = Math.max(totalTickets - selectedSeatIds.length, 0);

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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void loadReservedSeatsForItem(currentItem);
  }, [currentItem, isOpen]);

  const closeDialog = () => {
    setIsOpen(false);
    setCurrentIndex(0);
    setSeatSelections({});
    setReservedSeats(new Set());
    setIsLoadingSeats(false);
    setIsSubmitting(false);
    setLoadError(null);
    setSelectionError(null);
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
        setSelectionError(`Maximum seats for ${totalTickets} ticket${totalTickets === 1 ? "" : "s"} are already selected.`);
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
    setSelectionError(null);
    setLoadError(null);
    setCurrentIndex((previous) => Math.max(0, previous - 1));
  };

  const submitCheckout = async () => {
    const confirmedBookings = [];
    let warning = null;

    setIsSubmitting(true);
    setSelectionError(null);

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const itemSeatIds = [...(seatSelections[item.id] ?? [])].sort();
      const itemTicketCount = getTotalTickets(item.tickets);

      if (itemSeatIds.length !== itemTicketCount) {
        setCurrentIndex(index);
        setSelectionError(`Select ${itemTicketCount - itemSeatIds.length} more seat${itemTicketCount - itemSeatIds.length === 1 ? "" : "s"} to continue.`);
        setIsSubmitting(false);
        return;
      }

      try {
        const booking = await createBooking({
          movieId: item.movie.id,
          showtime: item.showtime,
          seatIds: itemSeatIds,
          tickets: item.tickets
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
    if (loadError) {
      setSelectionError("Load available seats before continuing.");
      return;
    }

    if (remainingSeats > 0) {
      setSelectionError(`Select ${remainingSeats} more seat${remainingSeats === 1 ? "" : "s"} to continue.`);
      return;
    }

    if (currentIndex < totalSteps - 1) {
      setSelectionError(null);
      setLoadError(null);
      setCurrentIndex((previous) => previous + 1);
      return;
    }

    await submitCheckout();
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
    ROWS: BOOKING_SEAT_ROWS,
    COLS: BOOKING_SEAT_COLS,
    formatSeatLabel,
    openDialog,
    closeDialog,
    toggleSeat,
    continueCheckout,
    goToPreviousItem
  };
}
