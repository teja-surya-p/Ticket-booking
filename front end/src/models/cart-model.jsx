import { MAX_TICKETS_PER_BOOKING } from "@/models/booking-model";

export function addMovieToCart(cartItems, movie, showtime) {
  const items = Array.isArray(cartItems) ? cartItems : [];
  const existing = items.find((item) => item.movie.id === movie.id && item.showtime === showtime);

  if (existing) {
    return items.map((item) =>
      item.id === existing.id
        ? (() => {
            const totalTickets = item.tickets.adult + item.tickets.child + item.tickets.senior;
            if (totalTickets >= MAX_TICKETS_PER_BOOKING) {
              return item;
            }

            return {
              ...item,
              tickets: {
                ...item.tickets,
                adult: item.tickets.adult + 1
              }
            };
          })()
        : item
    );
  }

  return [
    ...items,
    {
      id: `${movie.id}-${showtime}`,
      movie,
      showtime,
      tickets: {
        adult: 1,
        child: 0,
        senior: 0
      }
    }
  ];
}

export function updateCartTickets(cartItems, itemId, type, delta) {
  return (Array.isArray(cartItems) ? cartItems : [])
    .map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      const currentTotalTickets = item.tickets.adult + item.tickets.child + item.tickets.senior;
      if (delta > 0 && currentTotalTickets >= MAX_TICKETS_PER_BOOKING) {
        return item;
      }

      return {
        ...item,
        tickets: {
          ...item.tickets,
          [type]: Math.max(0, item.tickets[type] + delta)
        }
      };
    })
    .filter((item) => {
      const totalTickets = item.tickets.adult + item.tickets.child + item.tickets.senior;
      return totalTickets > 0;
    });
}

export function removeCartItem(cartItems, itemId) {
  return (Array.isArray(cartItems) ? cartItems : []).filter((item) => item.id !== itemId);
}

export function removeMovieFromCart(cartItems, movieId) {
  return (Array.isArray(cartItems) ? cartItems : []).filter((item) => item.movie.id !== movieId);
}

export function getCartCount(cartItems) {
  return (Array.isArray(cartItems) ? cartItems : []).reduce(
    (sum, item) => sum + item.tickets.adult + item.tickets.child + item.tickets.senior,
    0
  );
}

export function getCartTotal(cartItems, pricing) {
  return (Array.isArray(cartItems) ? cartItems : []).reduce(
    (sum, item) =>
      sum +
      item.tickets.adult * pricing.adult +
      item.tickets.child * pricing.child +
      item.tickets.senior * pricing.senior,
    0
  );
}
