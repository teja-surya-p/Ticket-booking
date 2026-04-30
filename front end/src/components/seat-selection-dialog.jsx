"use client";

import { useMemo, useState } from "react";
import { buildSeatId, formatSeatIdLabel } from "@/models/booking-model";

function formatShowtime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!isNaN(date.getTime()) && value.includes("T")) {
    const datePart = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
    const timePart = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" });
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
  lockedSeats,
  selfId,
  lockCountdown,
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
  customerEmailFormatError,
  onCustomerEmailChange,
  needsEmailVerification,
  otpSent,
  otpCode,
  onOtpCodeChange,
  otpVerified,
  isSendingOtp,
  isVerifyingOtp,
  otpError,
  onSendOtp,
  onVerifyOtp,
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
  showroomNameMap,
  itemShowroomMap,
  activeShowroomId,
  activeShowroomName
}) {
  const [deleteTargetCardId, setDeleteTargetCardId] = useState("");
  const selectedCount = selectedSeatIds.length;
  const selectedSeatLabels = selectedSeatIds.map((seatId) => formatSeatIdLabel(seatId));
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
  const dynamicGridTemplate = `var(--label-width) repeat(${leftColumns.length}, var(--seat-size)) var(--aisle-width) repeat(${rightColumns.length}, var(--seat-size))`;
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
    const seatId = buildSeatId(row, col);
    const isReserved = reservedSeats.has(seatId);
    const lockInfo = lockedSeats instanceof Map ? lockedSeats.get(seatId) : undefined;
    const isLockedByOther = !isReserved && lockInfo && lockInfo.lockedBy !== selfId;
    const isUnavailable = isReserved || isLockedByOther;
    const isSelected = selectedSeatIds.includes(seatId);

    let ariaLabel = `Seat ${formatSeatLabel(row, col)}`;
    let title = formatSeatLabel(row, col);
    if (isReserved) {
      ariaLabel = `Seat ${formatSeatLabel(row, col)} reserved`;
      title = `${formatSeatLabel(row, col)} — Reserved`;
    } else if (isLockedByOther) {
      ariaLabel = `Seat ${formatSeatLabel(row, col)} temporarily held`;
      title = `${formatSeatLabel(row, col)} — Temporarily held`;
    }

    return (
      <button
        key={seatId}
        type="button"
        disabled={isUnavailable}
        onClick={() => onToggleSeat(seatId)}
        className={[
          styles["seat-dialog-class-23"],
          isUnavailable
            ? styles["seat-dialog-class-24"]
            : isSelected
              ? styles["seat-dialog-class-25"]
              : styles["seat-dialog-class-26"]
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={ariaLabel}
        title={title}
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
              {showPaymentStep && Array.isArray(allItems) && allItems.length > 1 ? (
                <p className={styles["seat-dialog-class-4"]}>
                  {allItems.map((item) => item.movie.title).join(", ")}
                </p>
              ) : currentItem ? (
                <p className={styles["seat-dialog-class-4"]}>
                  {currentItem.movie.title} - {formatShowtime(currentItem.showtime)}
                  {(() => {
                    const perItem = itemShowroomMap?.[currentItem.id];
                    const hallName =
                      perItem?.showroomName ||
                      (perItem?.showroomId && showroomNameMap?.[perItem.showroomId]) ||
                      activeShowroomName ||
                      (activeShowroomId && showroomNameMap?.[activeShowroomId]) ||
                      null;
                    return hallName ? ` · ${hallName}` : "";
                  })()}
                </p>
              ) : null}
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

                  {lockCountdown && (
                    <p style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
                      Your selection expires in <strong>{lockCountdown}</strong>
                    </p>
                  )}
                </div>

                <section className={styles["seat-dialog-class-15"]}>
                  {(() => {
                    const perItem = itemShowroomMap?.[currentItem?.id];
                    const hallName =
                      perItem?.showroomName ||
                      (perItem?.showroomId && showroomNameMap?.[perItem.showroomId]) ||
                      activeShowroomName ||
                      (activeShowroomId && showroomNameMap?.[activeShowroomId]) ||
                      null;
                    return hallName ? (
                      <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.25rem 0.75rem",
                          borderRadius: "999px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          background: "color-mix(in srgb, var(--color-primary, #e05a7a) 12%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--color-primary, #e05a7a) 35%, transparent)",
                          color: "var(--color-primary, #e05a7a)"
                        }}>
                          <MonitorPlay size={12} />
                          {hallName} &nbsp;·&nbsp; {ROWS} rows × {COLS} seats
                        </span>
                      </div>
                    ) : null;
                  })()}
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
                      <div className={styles["seat-dialog-class-29"]} style={{ gridTemplateColumns: dynamicGridTemplate }}>
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
                        <div key={row} className={styles["seat-dialog-class-29"]} style={{ gridTemplateColumns: dynamicGridTemplate }}>
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

            {!showOrderSummaryStep && (
              showPaymentStep && Array.isArray(allItems) && allItems.length > 0 ? (
                <div className={styles["seat-dialog-class-34"]}>
                  <p className={styles["seat-dialog-class-35"]}>Selected Seats</p>
                  {allItems.map((item) => {
                    const itemSeatLabels = ((allSeatSelections ?? {})[item.id] ?? []).map((seatId) => formatSeatIdLabel(seatId));
                    return (
                      <div key={item.id} style={{ marginBottom: "0.5rem" }}>
                        <p style={{ fontSize: "0.8rem", fontWeight: 500, margin: "0 0 0.2rem", color: "var(--foreground)" }}>
                          {item.movie.title}
                        </p>
                        <div className={styles["seat-dialog-class-36"]}>
                          {itemSeatLabels.length > 0 ? (
                            itemSeatLabels.map((label) => (
                              <span key={label} className={styles["seat-dialog-class-37"]}>{label}</span>
                            ))
                          ) : (
                            <span className={styles["seat-dialog-class-38"]}>—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles["seat-dialog-class-34"]}>
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
                </div>
              )
            )}

            {showOrderSummaryStep && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {(Array.isArray(allItems) ? allItems : []).map((item) => {
                  const itemSeats = (allSeatSelections ?? {})[item.id] ?? [];
                  const seatLabels = itemSeats.map((seatId) => formatSeatIdLabel(seatId));
                  const prices = ticketPriceMap ?? { adult: 12.99, child: 8.99, senior: 9.99 };
                  const adultCount = item.tickets?.adult ?? 0;
                  const childCount = item.tickets?.child ?? 0;
                  const seniorCount = item.tickets?.senior ?? 0;
                  const itemTotal = adultCount * prices.adult + childCount * prices.child + seniorCount * prices.senior;
                  return (
                    <div key={item.id} style={{ border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <p style={{ fontWeight: 600, fontSize: "1rem", margin: 0 }}>{item.movie?.title}</p>
                      <p style={{ fontSize: "0.875rem", opacity: 0.7, margin: 0 }}>{formatShowtime(item.showtime)}</p>
                      {(() => {
                        const perItem = itemShowroomMap?.[item.id];
                        const hallId = perItem?.showroomId || item.movie?.showroomId || null;
                        const hallName =
                          perItem?.showroomName ||
                          (hallId && showroomNameMap?.[hallId]) ||
                          hallId ||
                          null;
                        return hallName ? (
                          <p style={{ fontSize: "0.875rem", margin: 0 }}>
                            <span style={{ fontWeight: 500 }}>Show Room: </span>
                            {hallName}
                          </p>
                        ) : null;
                      })()}
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
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <Input
                      id="order-summary-email"
                      type="email"
                      value={customerEmail ?? ""}
                      onChange={(event) => onCustomerEmailChange?.(event.target.value)}
                      placeholder="your@email.com"
                      autoComplete="email"
                      style={customerEmailFormatError ? { borderColor: "var(--destructive)" } : undefined}
                    />
                    {otpVerified && (
                      <span style={{ color: "var(--primary)", fontWeight: 600, whiteSpace: "nowrap", fontSize: "0.85rem" }}>
                        ✓ Verified
                      </span>
                    )}
                    {needsEmailVerification && !otpSent && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onSendOtp?.()}
                        disabled={isSendingOtp}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        {isSendingOtp ? "Sending..." : "Send Code"}
                      </Button>
                    )}
                  </div>

                  {customerEmailFormatError ? (
                    <p style={{ fontSize: "0.75rem", color: "var(--destructive)", marginTop: "0.25rem" }}>
                      {customerEmailFormatError}
                    </p>
                  ) : otpVerified ? (
                    <p style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "0.25rem" }}>
                      Booking confirmation will be sent to this address.
                    </p>
                  ) : needsEmailVerification ? (
                    <p style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "0.25rem" }}>
                      This email differs from your login email — verification required.
                    </p>
                  ) : (
                    <p style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "0.25rem" }}>
                      Booking confirmation will be sent to this address.
                    </p>
                  )}

                  {otpSent && (
                    <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <Label htmlFor="otp-input">Enter 6-digit verification code</Label>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <Input
                          id="otp-input"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={otpCode ?? ""}
                          onChange={(event) => onOtpCodeChange?.(event.target.value.replace(/\D/g, ""))}
                          placeholder="123456"
                          style={{ width: "9rem", letterSpacing: "0.2em", fontWeight: 600 }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onVerifyOtp?.()}
                          disabled={isVerifyingOtp || (otpCode ?? "").trim().length < 6}
                        >
                          {isVerifyingOtp ? "Verifying..." : "Verify"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => onSendOtp?.()}
                          disabled={isSendingOtp}
                        >
                          {isSendingOtp ? "Sending..." : "Resend"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {otpError && (
                    <p style={{ fontSize: "0.75rem", color: "var(--destructive)", marginTop: "0.25rem" }}>
                      {otpError}
                    </p>
                  )}
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
