"use client";

import { ArrowLeft, Loader2, Minus, Plus, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildSeatId, parseSeatId } from "@/models/booking-model";
import { useBookingPageController } from "@/controllers/useBookingPageController";
import styles from "./booking-page.module.css";

function formatShowtime(value) {
  if (!value) return "";
  // If it looks like an ISO timestamp, format it as "Mon, Apr 15 · 2:00 PM"
  const date = new Date(value);
  if (!isNaN(date.getTime()) && value.includes("T")) {
    const datePart = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const timePart = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${datePart} · ${timePart}`;
  }
  return value;
}
export function BookingPage({
  movie,
  showtime,
  onBack
}) {
  const {
    ROWS,
    COLS,
    ticketTypes,
    reservedSeats,
    selectedSeats,
    tickets,
    pricing,
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
  } = useBookingPageController({
    movie,
    showtime
  });

  return <div className={styles["booking-page-class-1"]}>
      <Button variant="ghost" size="sm" onClick={onBack} className={styles["booking-page-class-2"]}>
        <ArrowLeft className={styles["booking-page-class-3"]} />
        Back to Movie
      </Button>

      <div className={styles["booking-page-class-4"]}>
        <h1 className={styles["booking-page-class-5"]}>
          Book Tickets
        </h1>
        <p className={styles["booking-page-class-6"]}>
          {movie.title} &middot; {formatShowtime(showtime)}
        </p>
      </div>

      {loadError && <div className={styles["booking-page-class-7"]}>
          {loadError}
        </div>}

      <div className={styles["booking-page-class-8"]}>
        <div className={styles["booking-page-class-9"]}>
          <div className={styles["booking-page-class-10"]}>
            <div className={styles["booking-page-class-11"]}>
              <div className={styles["booking-page-class-12"]} />
            </div>
            <p className={styles["booking-page-class-13"]}>
              Screen
            </p>

            {isLoadingContext ? <div className={styles["booking-page-class-14"]}>
                <Loader2 className={styles["booking-page-class-15"]} />
                Loading seats...
              </div> : <div className={styles["booking-page-class-16"]}>
                <div className={styles["booking-page-class-17"]} style={{
              minWidth: "fit-content"
            }}>
                  {Array.from({
                length: ROWS
              }, (_, row) => <div key={row} className={styles["booking-page-class-18"]}>
                      <span className={styles["booking-page-class-19"]}>
                        {String.fromCharCode(65 + row)}
                      </span>
                      {Array.from({
                  length: COLS
                }, (_, col) => {
                  const seatId = buildSeatId(row, col);
                  const isReserved = reservedSeats.has(seatId);
                  const isSelected = selectedSeats.has(seatId);
                  return <button key={seatId} disabled={isReserved} onClick={() => toggleSeat(seatId)} className={[styles["booking-page-class-20"], isReserved ? styles["booking-page-class-21"] : isSelected ? styles["booking-page-class-22"] : styles["booking-page-class-23"]].filter(Boolean).join(" ")} title={isReserved ? `Seat ${seatLabel(row, col)} - Reserved` : `Seat ${seatLabel(row, col)}`} aria-label={isReserved ? `Seat ${seatLabel(row, col)} reserved` : isSelected ? `Seat ${seatLabel(row, col)} selected` : `Select seat ${seatLabel(row, col)}`}>
                            {col + 1}
                          </button>;
                })}
                    </div>)}
                </div>
              </div>}

            <div className={styles["booking-page-class-24"]}>
              <div className={styles["booking-page-class-25"]}>
                <div className={styles["booking-page-class-26"]} />
                Available
              </div>
              <div className={styles["booking-page-class-25"]}>
                <div className={styles["booking-page-class-27"]} />
                Selected
              </div>
              <div className={styles["booking-page-class-25"]}>
                <div className={styles["booking-page-class-28"]} />
                Reserved
              </div>
            </div>
          </div>
        </div>

        <div className={styles["booking-page-class-29"]}>
          <div className={styles["booking-page-class-10"]}>
            <div className={styles["booking-page-class-30"]}>
              <Ticket className={styles["booking-page-class-31"]} />
              <h2 className={styles["booking-page-class-32"]}>Order Summary</h2>
            </div>

            <div className={styles["booking-page-class-33"]}>
              <p className={styles["booking-page-class-34"]}>{movie.title}</p>
              <p>Showtime: {formatShowtime(showtime)}</p>
              {selectedSeats.size > 0 && <p>
                  Seats:{" "}
                  {selectedSeatIds.map(s => {
                const parsedSeat = parseSeatId(s);
                return parsedSeat ? seatLabel(parsedSeat.row, parsedSeat.col) : s;
              }).join(", ")}
                </p>}
            </div>

            <div className={styles["booking-page-class-35"]} />

            <h3 className={styles["booking-page-class-36"]}>
              Tickets
            </h3>

            {ticketTypes.map(type => <div key={type} className={styles["booking-page-class-37"]}>
                <div>
                  <p className={styles["booking-page-class-38"]}>
                    {type}
                  </p>
                  <p className={styles["booking-page-class-39"]}>
                    ${pricing[type].toFixed(2)}
                  </p>
                </div>
                <div className={styles["booking-page-class-40"]}>
                  <Button variant="outline" size="icon-sm" onClick={() => updateTicket(type, -1)} aria-label={`Decrease ${type} tickets`}>
                    <Minus className={styles["booking-page-class-41"]} />
                  </Button>
                  <span className={styles["booking-page-class-42"]}>
                    {tickets[type]}
                  </span>
                  <Button variant="outline" size="icon-sm" onClick={() => updateTicket(type, 1)} aria-label={`Increase ${type} tickets`}>
                    <Plus className={styles["booking-page-class-41"]} />
                  </Button>
                </div>
              </div>)}

            <div className={styles["booking-page-class-35"]} />

            <div className={styles["booking-page-class-43"]}>
              <span className={styles["booking-page-class-44"]}>
                Subtotal
              </span>
              <span className={styles["booking-page-class-45"]}>
                ${subtotal.toFixed(2)}
              </span>
            </div>

            <div className={styles["booking-page-class-46"]}>
              <span>Service fee</span>
              <span>${serviceFee.toFixed(2)}</span>
            </div>

            <div className={styles["booking-page-class-47"]}>
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>

            <div className={styles["booking-page-class-48"]}>
              <span>Total tickets: {totalTickets}</span>
              <span>Seats selected: {selectedSeats.size}</span>
            </div>

            {quoteError && <p className={styles["booking-page-class-49"]}>{quoteError}</p>}
            {checkoutError && <p className={styles["booking-page-class-49"]}>{checkoutError}</p>}
            {checkoutSuccess && <p className={styles["booking-page-class-50"]}>{checkoutSuccess}</p>}

            <Button className={styles["booking-page-class-51"]} onClick={handleCheckout} disabled={isSubmitting || isLoadingContext || totalTickets <= 0 || selectedSeatIds.length !== totalTickets}>
              {isSubmitting ? <>
                  <Loader2 className={styles["booking-page-class-15"]} />
                  Confirming...
                </> : isLoadingQuote ? <>
                  <Loader2 className={styles["booking-page-class-15"]} />
                  Calculating...
                </> : "Proceed to Checkout"}
            </Button>

            <p className={styles["booking-page-class-52"]}>
              Select tickets and matching seats to complete booking.
            </p>
          </div>
        </div>
      </div>
    </div>;
}

export default function BookingPageRoute() {
  return (
    <BookingPage
      movie={{ id: "demo-movie", title: "Demo Movie" }}
      showtime={"2:00 PM"}
      onBack={() => {}}
    />
  );
}
