"use client";

import { useMemo, useState } from "react";

function formatShowtime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!isNaN(date.getTime()) && value.includes("T")) {
    const datePart = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const timePart = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${datePart} · ${timePart}`;
  }
  return value;
}
import { Armchair, Loader2, LogIn, MonitorPlay, PencilLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
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
  savedCards,
  selectedCardId,
  cardForm,
  showCardForm,
  isCheckingCards,
  isSavingCard,
  isDeletingCard,
  isUpdatingCard,
  cardFieldErrors,
  editingCardId,
  editCardForm,
  editCardFieldErrors,
  paymentError,
  paymentInfo,
  canAddMoreCards,
  maxCardsAllowed,
  showPaymentStep,
  showOrderSummaryStep,
  canCheckoutWithPayment,
  needsLogin,
  clearNeedsLogin,
  saveCard,
  onSaveCardChange,
  onLogin,
  ROWS,
  COLS,
  isLoadingSeats,
  isSubmitting,
  loadError,
  selectionError,
  formatSeatLabel,
  allItems,
  allSeatSelections,
  customerEmail,
  onCustomerEmailChange,
  ticketPriceMap,
  onSelectCard,
  onCardFieldChange,
  onStartEditCard,
  onCancelEditCard,
  onEditCardFieldChange,
  onToggleAddCard,
  onSaveCard,
  onUpdateCard,
  onDeleteCard,
  onClose,
  onToggleSeat,
  onContinue,
  onBack,
  promoCodeInput,
  onPromoCodeInputChange,
  appliedPromo,
  promoError,
  isApplyingPromo,
  onApplyPromoCode,
  showroomNameMap
}) {
  const [deleteTargetCardId, setDeleteTargetCardId] = useState("");
  const selectedCount = selectedSeatIds.length;
  const selectedSeatLabels = selectedSeatIds.map((seatId) =>
    formatSeatLabel(...seatId.split("-").map(Number))
  );
  const deleteTargetCard = useMemo(
    () => savedCards.find((card) => card.cardId === deleteTargetCardId) ?? null,
    [savedCards, deleteTargetCardId]
  );
  const isSelectionComplete = totalTickets > 0 && remainingSeats === 0 && !isLoadingSeats && !loadError;
  const actionLabel = showPaymentStep
    ? "Confirm Checkout"
    : showOrderSummaryStep
      ? "Proceed to Payment"
      : currentIndex === totalSteps - 1
        ? "Confirm"
        : "Continue";
  const actionDescription = showPaymentStep
    ? canCheckoutWithPayment
      ? "Confirm checkout to finish."
      : "Select a saved card or add one to continue."
    : showOrderSummaryStep
      ? "Review your order and confirm your email, then proceed to payment."
      : remainingSeats === 0
        ? currentIndex === totalSteps - 1
          ? "All required seats selected. Click Confirm to continue."
          : "All required seats selected. Click Continue for the next movie."
        : `Choose ${remainingSeats} more seat${remainingSeats === 1 ? "" : "s"} to continue.`;
  const isPrimaryDisabled = showPaymentStep
    ? isSubmitting || !canCheckoutWithPayment
    : showOrderSummaryStep
      ? isSubmitting
      : !isSelectionComplete || isSubmitting;
  const leftColumns = Array.from({ length: Math.ceil(COLS / 2) }, (_, index) => index);
  const rightColumns = Array.from(
    { length: COLS - leftColumns.length },
    (_, index) => index + leftColumns.length
  );
  const inlineCardErrors = cardFieldErrors ?? {};
  const inlineEditErrors = editCardFieldErrors ?? {};
  const getCardholderFirstName = (value) => {
    if (typeof value !== "string") {
      return "Cardholder";
    }

    const [firstName = ""] = value.trim().split(/\s+/);
    return firstName.length > 0 ? firstName : "Cardholder";
  };
  const hasInlineCardErrors =
    showPaymentStep &&
    showCardForm &&
    Object.values(inlineCardErrors).some(
      (value) => typeof value === "string" && value.trim().length > 0
    );
  const hasInlineEditErrors =
    showPaymentStep &&
    typeof editingCardId === "string" &&
    editingCardId.length > 0 &&
    Object.values(inlineEditErrors).some(
      (value) => typeof value === "string" && value.trim().length > 0
    );
  const visibleError = showPaymentStep
    ? hasInlineCardErrors || hasInlineEditErrors
      ? null
      : paymentError
    : showOrderSummaryStep
      ? paymentError
      : loadError || selectionError;

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
          isReserved
            ? styles["seat-dialog-class-24"]
            : isSelected
              ? styles["seat-dialog-class-25"]
              : styles["seat-dialog-class-26"]
        ]
          .filter(Boolean)
          .join(" ")}
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
          setDeleteTargetCardId("");
          onClose();
        }
      }}
    >
      <DialogContent className={styles["seat-dialog-class-1"]}>
        <DialogHeader className={styles["seat-dialog-class-2"]}>
          <div className={styles["seat-dialog-class-3"]}>
            <div>
              <DialogTitle>{showPaymentStep ? "Select Payment Card" : showOrderSummaryStep ? "Order Summary" : "Select Your Seats"}</DialogTitle>
              {currentItem && (
                <p className={styles["seat-dialog-class-4"]}>
                  {currentItem.movie.title} - {formatShowtime(currentItem.showtime)}
                </p>
              )}
            </div>
          </div>
          <DialogDescription className={styles["seat-dialog-class-5"]}>
            {showPaymentStep
              ? "Choose a saved card or add a new card to finish checkout."
              : showOrderSummaryStep
                ? "Confirm your order details and email address before payment."
                : `Choose ${totalTickets} seat${totalTickets === 1 ? "" : "s"} to match your tickets before checkout.`}
          </DialogDescription>
        </DialogHeader>

        {currentItem && (
          <div className={styles["seat-dialog-class-6"]}>
            {visibleError && (
              <p className={styles["seat-dialog-class-39"]}>{visibleError}</p>
            )}

            {needsLogin && (
              <div className={styles["seat-dialog-class-39"]} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                <span>Please sign in to complete your booking.</span>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    clearNeedsLogin();
                    onLogin?.();
                  }}
                >
                  <LogIn className="mr-1 h-4 w-4" />
                  Sign In
                </Button>
              </div>
            )}

            {!showPaymentStep && !showOrderSummaryStep && (
              <>
                <div className={styles["seat-dialog-class-7"]}>
                  <div className={styles["seat-dialog-class-8"]}>
                    <span className={styles["seat-dialog-class-9"]}>
                      {selectedCount} of {totalTickets} seats selected
                    </span>
                    <span
                      className={
                        remainingSeats === 0
                          ? [styles["seat-dialog-class-10"], styles["seat-dialog-class-11"]]
                              .filter(Boolean)
                              .join(" ")
                          : styles["seat-dialog-class-10"]
                      }
                    >
                      {remainingSeats} seat{remainingSeats === 1 ? "" : "s"} remaining
                    </span>
                  </div>

                  <div className={styles["seat-dialog-class-12"]}>
                    <span className={styles["seat-dialog-class-13"]}>
                      <span
                        className={[
                          styles["seat-dialog-class-14"],
                          styles["seat-dialog-class-26"]
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      />
                      Available
                    </span>
                    <span className={styles["seat-dialog-class-13"]}>
                      <span
                        className={[
                          styles["seat-dialog-class-14"],
                          styles["seat-dialog-class-25"]
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      />
                      Selected
                    </span>
                    <span className={styles["seat-dialog-class-13"]}>
                      <span
                        className={[
                          styles["seat-dialog-class-14"],
                          styles["seat-dialog-class-24"]
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      />
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
                          {leftColumns.map((col) => (
                            <span
                              key={`header-left-${col}`}
                              className={styles["seat-dialog-class-32"]}
                            >
                              {col + 1}
                            </span>
                          ))}
                          <span className={styles["seat-dialog-class-33"]} aria-hidden="true" />
                          {rightColumns.map((col) => (
                            <span
                              key={`header-right-${col}`}
                              className={styles["seat-dialog-class-32"]}
                            >
                              {col + 1}
                            </span>
                          ))}
                        </div>
                      </div>

                      {Array.from({ length: ROWS }, (_, row) => (
                        <div key={row} className={styles["seat-dialog-class-29"]}>
                          <span className={styles["seat-dialog-class-30"]}>
                            {String.fromCharCode(65 + row)}
                          </span>
                          <div className={styles["seat-dialog-class-31"]}>
                            {leftColumns.map((col) => renderSeat(row, col))}
                            <span className={styles["seat-dialog-class-33"]} aria-hidden="true" />
                            {rightColumns.map((col) => renderSeat(row, col))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

            {!showOrderSummaryStep && <div className={styles["seat-dialog-class-34"]}>
              <p className={styles["seat-dialog-class-35"]}>Selected Seats</p>
              <div className={styles["seat-dialog-class-36"]}>
                {selectedSeatLabels.length > 0 ? (
                  selectedSeatLabels.map((seatLabel) => (
                    <span key={seatLabel} className={styles["seat-dialog-class-37"]}>
                      {seatLabel}
                    </span>
                  ))
                ) : (
                  <span className={styles["seat-dialog-class-38"]}>No seats selected yet</span>
                )}
              </div>
            </div>}

            {showOrderSummaryStep && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {(Array.isArray(allItems) ? allItems : []).map((item) => {
                  const itemSeats = (allSeatSelections ?? {})[item.id] ?? [];
                  const seatLabels = itemSeats.map((seatId) => formatSeatLabel(...seatId.split("-").map(Number)));
                  const prices = ticketPriceMap ?? { adult: 12.99, child: 8.99, senior: 9.99 };
                  const adultCount = item.tickets?.adult ?? 0;
                  const childCount = item.tickets?.child ?? 0;
                  const seniorCount = item.tickets?.senior ?? 0;
                  const itemTotal = adultCount * prices.adult + childCount * prices.child + seniorCount * prices.senior;
                  return (
                    <div key={item.id} style={{ border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <p style={{ fontWeight: 600, fontSize: "1rem", margin: 0 }}>{item.movie?.title}</p>
                      <p style={{ fontSize: "0.875rem", opacity: 0.7, margin: 0 }}>{formatShowtime(item.showtime)}</p>
                      {item.movie?.showroomId && (showroomNameMap?.[item.movie.showroomId] ?? item.movie.showroomId) && (
                        <p style={{ fontSize: "0.875rem", margin: 0 }}>
                          <span style={{ fontWeight: 500 }}>Show Room: </span>
                          {showroomNameMap?.[item.movie.showroomId] ?? item.movie.showroomId}
                        </p>
                      )}
                      {seatLabels.length > 0 && (
                        <p style={{ fontSize: "0.875rem", margin: 0 }}>
                          <span style={{ fontWeight: 500 }}>Seats: </span>{seatLabels.join(", ")}
                        </p>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.25rem" }}>
                        {adultCount > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                            <span>Adult × {adultCount}</span>
                            <span>${(adultCount * prices.adult).toFixed(2)} (${prices.adult.toFixed(2)}/ticket)</span>
                          </div>
                        )}
                        {childCount > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                            <span>Child × {childCount}</span>
                            <span>${(childCount * prices.child).toFixed(2)} (${prices.child.toFixed(2)}/ticket)</span>
                          </div>
                        )}
                        {seniorCount > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                            <span>Senior × {seniorCount}</span>
                            <span>${(seniorCount * prices.senior).toFixed(2)} (${prices.senior.toFixed(2)}/ticket)</span>
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", fontWeight: 600, borderTop: "1px solid var(--border)", paddingTop: "0.25rem", marginTop: "0.25rem" }}>
                          <span>Subtotal (before tax)</span>
                          <span>${itemTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {(Array.isArray(allItems) ? allItems : []).length > 1 && (() => {
                  const prices = ticketPriceMap ?? { adult: 12.99, child: 8.99, senior: 9.99 };
                  const grandTotal = (allItems ?? []).reduce((sum, item) => {
                    return sum + (item.tickets?.adult ?? 0) * prices.adult + (item.tickets?.child ?? 0) * prices.child + (item.tickets?.senior ?? 0) * prices.senior;
                  }, 0);
                  return (
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "1rem", padding: "0.5rem 0", borderTop: "2px solid var(--border)" }}>
                      <span>Total (before tax)</span>
                      <span>${grandTotal.toFixed(2)}</span>
                    </div>
                  );
                })()}

                <div className={styles["seat-dialog-class-47"]}>
                  <Label htmlFor="order-summary-email">Confirm Email Address</Label>
                  <Input
                    id="order-summary-email"
                    type="email"
                    value={customerEmail ?? ""}
                    onChange={(event) => onCustomerEmailChange?.(event.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                  />
                  <p style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "0.25rem" }}>
                    Booking confirmation will be sent to this address.
                  </p>
                </div>
              </div>
            )}

            {showPaymentStep && (
              <div className={styles["seat-dialog-class-47"]} style={{ marginBottom: "0.75rem" }}>
                <Label htmlFor="checkout-promo-code">Promo Code</Label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Input
                    id="checkout-promo-code"
                    value={promoCodeInput ?? ""}
                    onChange={(event) => onPromoCodeInputChange?.(event.target.value)}
                    placeholder="Enter promo code"
                    disabled={isApplyingPromo || !!appliedPromo}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onApplyPromoCode?.()}
                    disabled={isApplyingPromo || !promoCodeInput?.trim() || !!appliedPromo}
                  >
                    {isApplyingPromo ? "Applying..." : "Apply"}
                  </Button>
                </div>
                {appliedPromo && (
                  <p style={{ fontSize: "0.875rem", color: "var(--color-success, green)", marginTop: "0.25rem" }}>
                    {appliedPromo.discountPercent}% discount applied!
                  </p>
                )}
                {promoError && (
                  <p className={styles["seat-dialog-class-60"]} style={{ marginTop: "0.25rem" }}>
                    {promoError}
                  </p>
                )}
              </div>
            )}

            {showPaymentStep && (
              <div className={styles["seat-dialog-class-43"]}>
                <div className={styles["seat-dialog-class-44"]}>
                  <p className={styles["seat-dialog-class-35"]}>Payment Card</p>
                  {selectedCardId ? null : (
                    <span className={styles["seat-dialog-class-38"]}>
                      Select a saved card or add one.
                    </span>
                  )}
                </div>

                <div className={styles["seat-dialog-class-46"]}>
                  <p className={styles["seat-dialog-class-38"]}>
                    Select one of your saved cards or add a new card.
                  </p>
                </div>

                <div className={styles["seat-dialog-class-48"]}>
                  {isCheckingCards ? (
                    <p className={styles["seat-dialog-class-38"]}>Loading saved cards...</p>
                  ) : savedCards.length === 0 ? (
                    <p className={styles["seat-dialog-class-38"]}>
                      No saved cards found for this account.
                    </p>
                  ) : (
                    <div className={styles["seat-dialog-class-53"]}>
                      {savedCards.map((card) => (
                        <div
                          key={card.cardId}
                          className={[
                            styles["seat-dialog-class-54"],
                            selectedCardId === card.cardId ? styles["seat-dialog-class-55"] : ""
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <div className={styles["seat-dialog-class-69"]}>
                            <button
                              type="button"
                              onClick={() => onSelectCard(card.cardId)}
                              className={styles["seat-dialog-class-61"]}
                              disabled={isSubmitting || isDeletingCard || isUpdatingCard}
                            >
                              <span className={styles["seat-dialog-class-56"]}>
                                <span className={styles["seat-dialog-class-57"]}>
                                  {card.brand || "Card"} •••• {card.last4}
                                </span>
                                <span className={styles["seat-dialog-class-38"]}>
                                  Expires {String(card.expMonth).padStart(2, "0")}/{card.expYear}
                                </span>
                              </span>
                            </button>
                            <div className={styles["seat-dialog-class-62"]}>
                              <span className={styles["seat-dialog-class-65"]}>
                                {getCardholderFirstName(card.cardholderName)}
                              </span>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                className={styles["seat-dialog-class-63"]}
                                onClick={() => onStartEditCard(card)}
                                aria-label={`Edit saved card ending ${card.last4}`}
                                disabled={isSubmitting || isSavingCard || isDeletingCard || isUpdatingCard}
                              >
                                <PencilLine className={styles["seat-dialog-class-64"]} />
                              </Button>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                className={styles["seat-dialog-class-63"]}
                                onClick={() => setDeleteTargetCardId(card.cardId)}
                                aria-label={`Delete saved card ending ${card.last4}`}
                                disabled={isSubmitting || isSavingCard || isDeletingCard}
                              >
                                <Trash2 className={styles["seat-dialog-class-64"]} />
                              </Button>
                            </div>
                          </div>
                          {editingCardId === card.cardId && (
                            <div className={styles["seat-dialog-class-66"]}>
                              <div className={styles["seat-dialog-class-47"]}>
                                <Label htmlFor={`checkout-edit-cardholder-${card.cardId}`}>
                                  Card Holder Name
                                </Label>
                                <Input
                                  id={`checkout-edit-cardholder-${card.cardId}`}
                                  value={editCardForm.cardholderName}
                                  onChange={(event) =>
                                    onEditCardFieldChange("cardholderName", event.target.value)
                                  }
                                  placeholder="Name on card"
                                  autoComplete="cc-name"
                                />
                                {inlineEditErrors.cardholderName ? (
                                  <p className={styles["seat-dialog-class-60"]}>
                                    {inlineEditErrors.cardholderName}
                                  </p>
                                ) : null}
                              </div>

                              <div className={styles["seat-dialog-class-67"]}>
                                <div className={styles["seat-dialog-class-47"]}>
                                  <Label htmlFor={`checkout-edit-exp-month-${card.cardId}`}>
                                    Expiry Month
                                  </Label>
                                  <Input
                                    id={`checkout-edit-exp-month-${card.cardId}`}
                                    value={editCardForm.expMonth}
                                    onChange={(event) =>
                                      onEditCardFieldChange("expMonth", event.target.value)
                                    }
                                    placeholder="MM"
                                    autoComplete="cc-exp-month"
                                    inputMode="numeric"
                                  />
                                  {inlineEditErrors.expMonth ? (
                                    <p className={styles["seat-dialog-class-60"]}>
                                      {inlineEditErrors.expMonth}
                                    </p>
                                  ) : null}
                                </div>
                                <div className={styles["seat-dialog-class-47"]}>
                                  <Label htmlFor={`checkout-edit-exp-year-${card.cardId}`}>
                                    Expiry Year
                                  </Label>
                                  <Input
                                    id={`checkout-edit-exp-year-${card.cardId}`}
                                    value={editCardForm.expYear}
                                    onChange={(event) =>
                                      onEditCardFieldChange("expYear", event.target.value)
                                    }
                                    placeholder="YYYY"
                                    autoComplete="cc-exp-year"
                                    inputMode="numeric"
                                  />
                                  {inlineEditErrors.expYear ? (
                                    <p className={styles["seat-dialog-class-60"]}>
                                      {inlineEditErrors.expYear}
                                    </p>
                                  ) : null}
                                </div>
                              </div>

                              <div className={styles["seat-dialog-class-68"]}>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    void onUpdateCard();
                                  }}
                                  disabled={isUpdatingCard || isSubmitting || isDeletingCard}
                                >
                                  {isUpdatingCard ? "Updating..." : "Update Card"}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={onCancelEditCard}
                                  disabled={isUpdatingCard || isSubmitting || isDeletingCard}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles["seat-dialog-class-59"]}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (editingCardId) {
                        onCancelEditCard();
                      }
                      onToggleAddCard(!showCardForm);
                    }}
                    disabled={isSubmitting || isUpdatingCard || !canAddMoreCards}
                  >
                    {showCardForm ? "Cancel Add Card" : "Add Card"}
                  </Button>
                  <span className={styles["seat-dialog-class-38"]}>
                    {savedCards.length}/{maxCardsAllowed} cards saved
                  </span>
                </div>

                {showCardForm && (
                  <div className={styles["seat-dialog-class-50"]}>
                    <div className={styles["seat-dialog-class-47"]}>
                      <Label htmlFor="checkout-cardholder">Card Holder Name</Label>
                      <Input
                        id="checkout-cardholder"
                        value={cardForm.cardholderName}
                        onChange={(event) =>
                          onCardFieldChange("cardholderName", event.target.value)
                        }
                        placeholder="Name on card"
                        autoComplete="cc-name"
                      />
                      {inlineCardErrors.cardholderName ? (
                        <p className={styles["seat-dialog-class-60"]}>{inlineCardErrors.cardholderName}</p>
                      ) : null}
                    </div>

                    <div className={styles["seat-dialog-class-47"]}>
                      <Label htmlFor="checkout-card-number">Card Number</Label>
                      <Input
                        id="checkout-card-number"
                        value={cardForm.cardNumber}
                        onChange={(event) =>
                          onCardFieldChange("cardNumber", event.target.value)
                        }
                        placeholder="4242 4242 4242 4242"
                        autoComplete="cc-number"
                        inputMode="numeric"
                      />
                      {inlineCardErrors.cardNumber ? (
                        <p className={styles["seat-dialog-class-60"]}>{inlineCardErrors.cardNumber}</p>
                      ) : null}
                    </div>

                    <div className={styles["seat-dialog-class-51"]}>
                      <div className={styles["seat-dialog-class-47"]}>
                        <Label htmlFor="checkout-exp-month">Expiry Month</Label>
                        <Input
                          id="checkout-exp-month"
                          value={cardForm.expMonth}
                          onChange={(event) => onCardFieldChange("expMonth", event.target.value)}
                          placeholder="MM"
                          autoComplete="cc-exp-month"
                          inputMode="numeric"
                        />
                        {inlineCardErrors.expMonth ? (
                          <p className={styles["seat-dialog-class-60"]}>{inlineCardErrors.expMonth}</p>
                        ) : null}
                      </div>
                      <div className={styles["seat-dialog-class-47"]}>
                        <Label htmlFor="checkout-cvv">CVV</Label>
                        <Input
                          id="checkout-cvv"
                          value={cardForm.cvv}
                          onChange={(event) => onCardFieldChange("cvv", event.target.value)}
                          placeholder="123"
                          autoComplete="cc-csc"
                          inputMode="numeric"
                        />
                        {inlineCardErrors.cvv ? (
                          <p className={styles["seat-dialog-class-60"]}>{inlineCardErrors.cvv}</p>
                        ) : null}
                      </div>
                      <div className={styles["seat-dialog-class-47"]}>
                        <Label htmlFor="checkout-exp-year">Expiry Year</Label>
                        <Input
                          id="checkout-exp-year"
                          value={cardForm.expYear}
                          onChange={(event) => onCardFieldChange("expYear", event.target.value)}
                          placeholder="YYYY"
                          autoComplete="cc-exp-year"
                          inputMode="numeric"
                        />
                        {inlineCardErrors.expYear ? (
                          <p className={styles["seat-dialog-class-60"]}>{inlineCardErrors.expYear}</p>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Checkbox
                        id="checkout-save-card"
                        checked={saveCard}
                        onCheckedChange={(checked) => onSaveCardChange(!!checked)}
                        disabled={isSavingCard || isSubmitting}
                      />
                      <Label htmlFor="checkout-save-card" style={{ cursor: "pointer", fontSize: "0.875rem" }}>
                        Save this card for future payments
                      </Label>
                    </div>

                    <Button type="button" onClick={onSaveCard} disabled={isSavingCard || isSubmitting}>
                      {isSavingCard ? "Saving..." : saveCard ? "Save Card" : "Use Card"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {showPaymentStep && paymentInfo && (
              <p className={styles["seat-dialog-class-52"]}>{paymentInfo}</p>
            )}
          </div>
        )}

        <AlertDialog
          open={deleteTargetCardId.length > 0}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTargetCardId("");
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Saved Card</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTargetCard
                  ? `Are you sure you want to delete ${deleteTargetCard.brand || "Card"} ending in ${deleteTargetCard.last4}?`
                  : "Are you sure you want to delete this saved card?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingCard}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeletingCard}
                onClick={() => {
                  const cardId = deleteTargetCardId;
                  setDeleteTargetCardId("");
                  if (cardId) {
                    void onDeleteCard(cardId);
                  }
                }}
              >
                {isDeletingCard ? "Deleting..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className={styles["seat-dialog-class-40"]}>
          <p className={styles["seat-dialog-class-41"]}>{actionDescription}</p>
          <div className={styles["seat-dialog-class-42"]}>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            {(currentIndex > 0 || showPaymentStep || showOrderSummaryStep) && (
              <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
                Back
              </Button>
            )}
            <Button type="button" onClick={onContinue} disabled={isPrimaryDisabled}>
              {isSubmitting ? "Confirming..." : actionLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
