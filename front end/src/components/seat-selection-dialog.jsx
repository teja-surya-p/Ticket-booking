"use client";

import { Armchair, Loader2, MonitorPlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import "./seat-selection-dialog.module.css";

export function SeatSelectionDialog({
  isOpen,
  currentItem,
  currentIndex,
  totalSteps,
  reservedSeats,
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
  showPaymentStep,
  canCheckoutWithPayment,
  ROWS,
  COLS,
  isLoadingSeats,
  isSubmitting,
  loadError,
  selectionError,
  formatSeatLabel,
  onSelectCard,
  onCardFieldChange,
  onToggleAddCard,
  onSaveCard,
  onClose,
  onToggleSeat,
  onContinue,
  onBack
}) {
  const selectedCount = selectedSeatIds.length;
  const selectedSeatLabels = selectedSeatIds.map((seatId) => formatSeatLabel(...seatId.split("-").map(Number)));
  const isSelectionComplete = totalTickets > 0 && remainingSeats === 0 && !isLoadingSeats && !loadError;
  const actionLabel = showPaymentStep ? "Confirm Checkout" : currentIndex === totalSteps - 1 ? "Confirm" : "Continue";
  const actionDescription = showPaymentStep
    ? canCheckoutWithPayment
      ? "Card selected. Confirm checkout to finish."
      : "Select a saved card or add one to continue."
    : remainingSeats === 0
      ? currentIndex === totalSteps - 1
        ? "All required seats selected. Click Confirm to continue."
        : "All required seats selected. Click Continue for the next movie."
      : `Choose ${remainingSeats} more seat${remainingSeats === 1 ? "" : "s"} to continue.`;
  const isPrimaryDisabled = showPaymentStep
    ? isSubmitting || !canCheckoutWithPayment
    : !isSelectionComplete || isSubmitting;
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
          "seat-dialog-class-23",
          isReserved ? "seat-dialog-class-24" : isSelected ? "seat-dialog-class-25" : "seat-dialog-class-26"
        ].join(" ")}
        aria-label={`Seat ${formatSeatLabel(row, col)}`}
        title={formatSeatLabel(row, col)}
      >
        <Armchair className={"seat-dialog-class-27"} />
        <span className={"seat-dialog-class-28"}>{formatSeatLabel(row, col)}</span>
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
      <DialogContent className={"seat-dialog-class-1"}>
        <DialogHeader className={"seat-dialog-class-2"}>
          <div className={"seat-dialog-class-3"}>
            <div>
              <DialogTitle>{showPaymentStep ? "Select Payment Card" : "Select Your Seats"}</DialogTitle>
              {currentItem && <p className={"seat-dialog-class-4"}>
                  {currentItem.movie.title} - {currentItem.showtime}
                </p>}
            </div>
          </div>
          <DialogDescription className={"seat-dialog-class-5"}>
            {showPaymentStep
              ? "Choose a saved card or add a new card to finish checkout."
              : `Choose ${totalTickets} seat${totalTickets === 1 ? "" : "s"} to match your tickets before checkout.`}
          </DialogDescription>
        </DialogHeader>

        {currentItem && (
          <div className={"seat-dialog-class-6"}>
            {!showPaymentStep && <>
                <div className={"seat-dialog-class-7"}>
                  <div className={"seat-dialog-class-8"}>
                    <span className={"seat-dialog-class-9"}>
                      {selectedCount} of {totalTickets} seats selected
                    </span>
                    <span className={remainingSeats === 0 ? "seat-dialog-class-10 seat-dialog-class-11" : "seat-dialog-class-10"}>
                      {remainingSeats} seat{remainingSeats === 1 ? "" : "s"} remaining
                    </span>
                  </div>

                  <div className={"seat-dialog-class-12"}>
                    <span className={"seat-dialog-class-13"}>
                      <span className={"seat-dialog-class-14 seat-dialog-class-26"} />
                      Available
                    </span>
                    <span className={"seat-dialog-class-13"}>
                      <span className={"seat-dialog-class-14 seat-dialog-class-25"} />
                      Selected
                    </span>
                    <span className={"seat-dialog-class-13"}>
                      <span className={"seat-dialog-class-14 seat-dialog-class-24"} />
                      Unavailable
                    </span>
                  </div>
                </div>

                <section className={"seat-dialog-class-15"}>
                  <div className={"seat-dialog-class-16"}>
                    <div className={"seat-dialog-class-17"} />
                    <div className={"seat-dialog-class-18"}>
                      <MonitorPlay className={"seat-dialog-class-19"} />
                      <span>Screen This Way</span>
                    </div>
                  </div>

                  {isLoadingSeats ? (
                    <div className={"seat-dialog-class-20"}>
                      <Loader2 className={"seat-dialog-class-21"} />
                      Loading seats...
                    </div>
                  ) : (
                    <div className={"seat-dialog-class-22"}>
                      <div className={"seat-dialog-class-29"}>
                        <span className={"seat-dialog-class-30"} aria-hidden="true" />
                        <div className={"seat-dialog-class-31"}>
                          {leftColumns.map((col) => <span key={`header-left-${col}`} className={"seat-dialog-class-32"}>
                              {col + 1}
                            </span>)}
                          <span className={"seat-dialog-class-33"} aria-hidden="true" />
                          {rightColumns.map((col) => <span key={`header-right-${col}`} className={"seat-dialog-class-32"}>
                              {col + 1}
                            </span>)}
                        </div>
                      </div>

                      {Array.from({ length: ROWS }, (_, row) => <div key={row} className={"seat-dialog-class-29"}>
                          <span className={"seat-dialog-class-30"}>{String.fromCharCode(65 + row)}</span>
                          <div className={"seat-dialog-class-31"}>
                            {leftColumns.map((col) => renderSeat(row, col))}
                            <span className={"seat-dialog-class-33"} aria-hidden="true" />
                            {rightColumns.map((col) => renderSeat(row, col))}
                          </div>
                        </div>)}
                    </div>
                  )}
                </section>
              </>}

            <div className={"seat-dialog-class-34"}>
              <p className={"seat-dialog-class-35"}>Selected Seats</p>
              <div className={"seat-dialog-class-36"}>
                {selectedSeatLabels.length > 0 ? selectedSeatLabels.map((seatLabel) => <span key={seatLabel} className={"seat-dialog-class-37"}>
                    {seatLabel}
                  </span>) : <span className={"seat-dialog-class-38"}>No seats selected yet</span>}
              </div>
            </div>

            {showPaymentStep && <div className={"seat-dialog-class-43"}>
                <div className={"seat-dialog-class-44"}>
                  <p className={"seat-dialog-class-35"}>Payment Card</p>
                  {selectedCardId ? <span className={"seat-dialog-class-45"}>
                      Card selected
                    </span> : <span className={"seat-dialog-class-38"}>
                      Select a saved card or add one.
                    </span>}
                </div>

                <div className={"seat-dialog-class-46"}>
                  <p className={"seat-dialog-class-38"}>
                    Select one of your saved cards or add a new card.
                  </p>
                </div>

                <div className={"seat-dialog-class-48"}>
                  {isCheckingCards ? <p className={"seat-dialog-class-38"}>Loading saved cards...</p> : savedCards.length === 0 ? <p className={"seat-dialog-class-38"}>No saved cards found for this email.</p> : <div className={"seat-dialog-class-53"}>
                      {savedCards.map((card) => <button key={card.cardId} type="button" onClick={() => onSelectCard(card.cardId)} className={["seat-dialog-class-54", selectedCardId === card.cardId ? "seat-dialog-class-55" : ""].join(" ")}>
                          <span className={"seat-dialog-class-56"}>
                            <span className={"seat-dialog-class-57"}>
                              {card.brand || "Card"} •••• {card.last4}
                            </span>
                            <span className={"seat-dialog-class-38"}>
                              Expires {String(card.expMonth).padStart(2, "0")}/{card.expYear}
                            </span>
                          </span>
                          <span className={"seat-dialog-class-58"}>
                            {selectedCardId === card.cardId ? "Selected" : "Select"}
                          </span>
                        </button>)}
                    </div>}
                </div>

                <div className={"seat-dialog-class-59"}>
                  <Button type="button" variant="outline" onClick={() => onToggleAddCard(!showCardForm)} disabled={isSubmitting || !canAddMoreCards}>
                    {showCardForm ? "Cancel Add Card" : "Add Card"}
                  </Button>
                  <span className={"seat-dialog-class-38"}>
                    {savedCards.length}/{maxCardsAllowed} cards saved
                  </span>
                </div>

                {showCardForm && <div className={"seat-dialog-class-50"}>
                    <div className={"seat-dialog-class-47"}>
                      <Label htmlFor="checkout-cardholder">Card Holder Name</Label>
                      <Input id="checkout-cardholder" value={cardForm.cardholderName} onChange={(event) => onCardFieldChange("cardholderName", event.target.value)} placeholder="Name on card" autoComplete="cc-name" />
                    </div>

                    <div className={"seat-dialog-class-47"}>
                      <Label htmlFor="checkout-card-number">Card Number</Label>
                      <Input id="checkout-card-number" value={cardForm.cardNumber} onChange={(event) => onCardFieldChange("cardNumber", event.target.value)} placeholder="4242 4242 4242 4242" autoComplete="cc-number" inputMode="numeric" />
                    </div>

                    <div className={"seat-dialog-class-51"}>
                      <div className={"seat-dialog-class-47"}>
                        <Label htmlFor="checkout-exp-month">Expiry Month</Label>
                        <Input id="checkout-exp-month" value={cardForm.expMonth} onChange={(event) => onCardFieldChange("expMonth", event.target.value)} placeholder="MM" autoComplete="cc-exp-month" inputMode="numeric" />
                      </div>
                      <div className={"seat-dialog-class-47"}>
                        <Label htmlFor="checkout-cvv">CVV</Label>
                        <Input id="checkout-cvv" value={cardForm.cvv} onChange={(event) => onCardFieldChange("cvv", event.target.value)} placeholder="123" autoComplete="cc-csc" inputMode="numeric" />
                      </div>
                      <div className={"seat-dialog-class-47"}>
                        <Label htmlFor="checkout-exp-year">Expiry Year</Label>
                        <Input id="checkout-exp-year" value={cardForm.expYear} onChange={(event) => onCardFieldChange("expYear", event.target.value)} placeholder="YYYY" autoComplete="cc-exp-year" inputMode="numeric" />
                      </div>
                    </div>

                    <Button type="button" onClick={onSaveCard} disabled={isSavingCard || isSubmitting}>
                      {isSavingCard ? "Saving..." : "Save Card"}
                    </Button>
                  </div>}
              </div>}

            {!showPaymentStep && (loadError || selectionError) && <p className={"seat-dialog-class-39"}>
                {loadError || selectionError}
              </p>}
            {showPaymentStep && paymentError && <p className={"seat-dialog-class-39"}>{paymentError}</p>}
            {showPaymentStep && paymentInfo && <p className={"seat-dialog-class-52"}>{paymentInfo}</p>}
          </div>
        )}

        <div className={"seat-dialog-class-40"}>
          <p className={"seat-dialog-class-41"}>{actionDescription}</p>
          <div className={"seat-dialog-class-42"}>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            {(currentIndex > 0 || showPaymentStep) && <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
                Back
              </Button>}
            <Button type="button" onClick={onContinue} disabled={isPrimaryDisabled}>
              {isSubmitting ? "Confirming..." : actionLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
