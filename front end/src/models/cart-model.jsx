import { MAX_TICKETS_PER_BOOKING } from "@/models/booking-model";

export function addMovieToCart(cartItems, movie, showtime, tickets = { adult: 1, child: 0, senior: 0 }) {
  const items = Array.isArray(cartItems) ? cartItems : [];
  const safeTickets = {
    adult: Math.max(0, Number(tickets?.adult) || 0),
    child: Math.max(0, Number(tickets?.child) || 0),
    senior: Math.max(0, Number(tickets?.senior) || 0)
  };
  const existing = items.find((item) => item.movie.id === movie.id && item.showtime === showtime);

  if (existing) {
    return items.map((item) => {
      if (item.id !== existing.id) return item;
      const newAdult = item.tickets.adult + safeTickets.adult;
      const newChild = item.tickets.child + safeTickets.child;
      const newSenior = item.tickets.senior + safeTickets.senior;
      const total = newAdult + newChild + newSenior;
      if (total > MAX_TICKETS_PER_BOOKING) return item;
      return { ...item, tickets: { adult: newAdult, child: newChild, senior: newSenior } };
    });
  }

  if (safeTickets.adult + safeTickets.child + safeTickets.senior === 0) return items;

  return [
    ...items,
    {
      id: `${movie.id}-${showtime}`,
      movie,
      showtime,
      tickets: safeTickets
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
