export const BOOKING_SEAT_ROWS = 8;
export const BOOKING_SEAT_COLS = 10;
export const MAX_TICKETS_PER_BOOKING = 6;

export const DEFAULT_PRICING = {
  adult: 12.99,
  child: 8.99,
  senior: 9.99
};

export const INITIAL_TICKETS = {
  adult: 1,
  child: 0,
  senior: 0
};

export const BOOKING_TICKET_TYPES = ["adult", "child", "senior"];

export function getTotalTickets(tickets) {
  const value = tickets || INITIAL_TICKETS;
  return Number(value.adult || 0) + Number(value.child || 0) + Number(value.senior || 0);
}

export function calculateBookingSubtotal(tickets, pricing) {
  const safeTickets = tickets || INITIAL_TICKETS;
  const safePricing = pricing || DEFAULT_PRICING;

  return (
    Number(safeTickets.adult || 0) * Number(safePricing.adult || 0) +
    Number(safeTickets.child || 0) * Number(safePricing.child || 0) +
    Number(safeTickets.senior || 0) * Number(safePricing.senior || 0)
  );
}

export function buildSeatId(row, col) {
  return `${Number(row) + 1}-${Number(col) + 1}`;
}

export function parseSeatId(seatId) {
  const [rowValue, colValue] = String(seatId).split("-").map(Number);
  if (!Number.isInteger(rowValue) || !Number.isInteger(colValue) || rowValue <= 0 || colValue <= 0) {
    return null;
  }

  return {
    row: rowValue - 1,
    col: colValue - 1
  };
}

export function formatSeatLabel(row, col) {
  return `${String.fromCharCode(65 + row)}${col + 1}`;
}

export function formatSeatIdLabel(seatId) {
  const parsedSeat = parseSeatId(seatId);
  if (!parsedSeat) {
    return seatId;
  }

  return formatSeatLabel(parsedSeat.row, parsedSeat.col);
}
