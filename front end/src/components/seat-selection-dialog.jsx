"use client";

import { Armchair, Loader2, MonitorPlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import styles from "./seat-selection-dialog.module.css";

export function SeatSelectionDialog({
  isOpen,
  currentItem,
  currentIndex,
  totalSteps,
  reservedSeats,
  selectedSeatIds,
  totalTickets,
  remainingSeats,
  ROWS,
  COLS,
  isLoadingSeats,
  isSubmitting,
  loadError,
  selectionError,
  formatSeatLabel,
  onClose,
  onToggleSeat,
  onContinue,
  onBack
}) {
  const selectedCount = selectedSeatIds.length;
  const selectedSeatLabels = selectedSeatIds.map((seatId) => formatSeatLabel(...seatId.split("-").map(Number)));
  const isSelectionComplete = totalTickets > 0 && remainingSeats === 0 && !isLoadingSeats && !loadError;
  const actionLabel = currentIndex === totalSteps - 1 ? "Confirm Checkout" : "Continue";
  const leftColumns = Array.from({ length: Math.ceil(COLS / 2) }, (_, index) => index);
  const rightColumns = Array.from({ length: COLS - leftColumns.length }, (_, index) => index + leftColumns.length);

  const renderSeat = (row, col) => {
    const seatId = `${row}-${col}`;
    const isReserved = reservedSeats.has(seatId);
    const isSelected = selectedSeatIds.includes(seatId);

    return (
      <button
        key={seatId}
        type="button"
        disabled={isReserved}
        onClick={() => onToggleSeat(seatId)}
        className={[
          styles["seat-dialog-class-23"],
          isReserved ? styles["seat-dialog-class-24"] : isSelected ? styles["seat-dialog-class-25"] : styles["seat-dialog-class-26"]
        ].join(" ")}
        aria-label={`Seat ${formatSeatLabel(row, col)}`}
        title={formatSeatLabel(row, col)}
      >
        <Armchair className={styles["seat-dialog-class-27"]} />
        <span className={styles["seat-dialog-class-28"]}>{formatSeatLabel(row, col)}</span>
      </button>
    );
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className={styles["seat-dialog-class-1"]}>
        <DialogHeader className={styles["seat-dialog-class-2"]}>
          <div className={styles["seat-dialog-class-3"]}>
            <div>
              <DialogTitle>Select Your Seats</DialogTitle>
              {currentItem && <p className={styles["seat-dialog-class-4"]}>
                  {currentItem.movie.title} - {currentItem.showtime}
                </p>}
            </div>
          </div>
          <DialogDescription className={styles["seat-dialog-class-5"]}>
            Choose {totalTickets} seat{totalTickets === 1 ? "" : "s"} to match your tickets before checkout.
          </DialogDescription>
        </DialogHeader>

        {currentItem && (
          <div className={styles["seat-dialog-class-6"]}>
            <div className={styles["seat-dialog-class-7"]}>
              <div className={styles["seat-dialog-class-8"]}>
                <span className={styles["seat-dialog-class-9"]}>
                  {selectedCount} of {totalTickets} seats selected
                </span>
                <span className={remainingSeats === 0 ? [styles["seat-dialog-class-10"], styles["seat-dialog-class-11"]].filter(Boolean).join(" ") : styles["seat-dialog-class-10"]}>
                  {remainingSeats} seat{remainingSeats === 1 ? "" : "s"} remaining
                </span>
              </div>

              <div className={styles["seat-dialog-class-12"]}>
                <span className={styles["seat-dialog-class-13"]}>
                  <span className={[styles["seat-dialog-class-14"], styles["seat-dialog-class-26"]].filter(Boolean).join(" ")} />
                  Available
                </span>
                <span className={styles["seat-dialog-class-13"]}>
                  <span className={[styles["seat-dialog-class-14"], styles["seat-dialog-class-25"]].filter(Boolean).join(" ")} />
                  Selected
                </span>
                <span className={styles["seat-dialog-class-13"]}>
                  <span className={[styles["seat-dialog-class-14"], styles["seat-dialog-class-24"]].filter(Boolean).join(" ")} />
                  Unavailable
                </span>
              </div>
            </div>

            <section className={styles["seat-dialog-class-15"]}>
              <div className={styles["seat-dialog-class-16"]}>
                <div className={styles["seat-dialog-class-17"]} />
                <div className={styles["seat-dialog-class-18"]}>
                  <MonitorPlay className={styles["seat-dialog-class-19"]} />
                  <span>Screen This Way</span>
                </div>
              </div>

              {isLoadingSeats ? (
                <div className={styles["seat-dialog-class-20"]}>
                  <Loader2 className={styles["seat-dialog-class-21"]} />
                  Loading seats...
                </div>
              ) : (
                <div className={styles["seat-dialog-class-22"]}>
                  <div className={styles["seat-dialog-class-29"]}>
                    <span className={styles["seat-dialog-class-30"]} aria-hidden="true" />
                    <div className={styles["seat-dialog-class-31"]}>
                      {leftColumns.map((col) => <span key={`header-left-${col}`} className={styles["seat-dialog-class-32"]}>
                          {col + 1}
                        </span>)}
                      <span className={styles["seat-dialog-class-33"]} aria-hidden="true" />
                      {rightColumns.map((col) => <span key={`header-right-${col}`} className={styles["seat-dialog-class-32"]}>
                          {col + 1}
                        </span>)}
                    </div>
                  </div>

                  {Array.from({ length: ROWS }, (_, row) => <div key={row} className={styles["seat-dialog-class-29"]}>
                      <span className={styles["seat-dialog-class-30"]}>{String.fromCharCode(65 + row)}</span>
                      <div className={styles["seat-dialog-class-31"]}>
                        {leftColumns.map((col) => renderSeat(row, col))}
                        <span className={styles["seat-dialog-class-33"]} aria-hidden="true" />
                        {rightColumns.map((col) => renderSeat(row, col))}
                      </div>
                    </div>)}
                </div>
              )}
            </section>

            <div className={styles["seat-dialog-class-34"]}>
              <p className={styles["seat-dialog-class-35"]}>Selected Seats</p>
              <div className={styles["seat-dialog-class-36"]}>
                {selectedSeatLabels.length > 0 ? selectedSeatLabels.map((seatLabel) => <span key={seatLabel} className={styles["seat-dialog-class-37"]}>
                    {seatLabel}
                  </span>) : <span className={styles["seat-dialog-class-38"]}>No seats selected yet</span>}
              </div>
            </div>

            {(loadError || selectionError) && <p className={styles["seat-dialog-class-39"]}>
                {loadError || selectionError}
              </p>}
          </div>
        )}

        <div className={styles["seat-dialog-class-40"]}>
          <p className={styles["seat-dialog-class-41"]}>
            {remainingSeats === 0
              ? "All required seats selected. You can confirm checkout."
              : `Choose ${remainingSeats} more seat${remainingSeats === 1 ? "" : "s"} to continue.`}
          </p>
          <div className={styles["seat-dialog-class-42"]}>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            {currentIndex > 0 && <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
                Back
              </Button>}
            <Button type="button" onClick={onContinue} disabled={!isSelectionComplete || isSubmitting}>
              {isSubmitting ? "Confirming..." : actionLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
