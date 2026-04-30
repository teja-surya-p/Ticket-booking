"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { ArrowLeft, Minus, Plus, ShoppingCart, Tag, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SeatSelectionDialog } from "@/components/seat-selection-dialog";
import { useSeatSelectionCheckoutController } from "@/controllers/useSeatSelectionCheckoutController";
import { ticketPrices } from "@/lib/ticket-prices";
import { MAX_TICKETS_PER_BOOKING } from "@/models/booking-model";
import { getMoviePosterUrl } from "@/models/movie-media";
import { getMovieGenreLabel } from "@/models/movie-model";
import styles from "./cart-page.module.css";
export function CartPage({
  items,
  onBack,
  onUpdateTickets,
  onRemoveItem,
  onCheckout,
  currentUser
}) {
  const router = useRouter();
  const {
    isOpen,
    currentItem,
    currentIndex,
    totalSteps,
    reservedSeats,
    lockedSeats,
    lockCountdown,
    selfId,
    isLoadingSeats,
    isSubmitting,
    loadError,
    selectionError,
    selectedSeatIds,
    totalTickets: seatSelectionTicketCount,
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
    canCheckoutWithPayment,
    ROWS,
    COLS,
    formatSeatLabel,
    handleSelectCard,
    handleCardFieldChange,
    startEditingCard,
    cancelEditingCard,
    handleEditCardFieldChange,
    setShowCardForm,
    saveCardForEmail,
    updateSavedCardById,
    deleteSavedCardById,
    needsLogin,
    clearNeedsLogin,
    saveCard,
    setSaveCard,
    openDialog,
    closeDialog,
    toggleSeat,
    continueCheckout,
    goToPreviousItem,
    promoCodeInput,
    setPromoCodeInput,
    appliedPromo,
    setAppliedPromo,
    promoError,
    setPromoError,
    isApplyingPromo,
    applyPromoCode,
    showOrderSummaryStep,
    customerEmail,
    customerEmailFormatError,
    setCustomerEmail,
    handleCustomerEmailChange,
    needsEmailVerification,
    otpSent,
    otpCode,
    setOtpCode,
    otpVerified,
    isSendingOtp,
    isVerifyingOtp,
    otpError,
    handleSendOtp,
    handleVerifyOtp,
    seatSelections,
    showroomNameMap,
    itemShowroomMap,
    activeShowroomId,
    activeShowroomName
  } = useSeatSelectionCheckoutController({
    items,
    onCheckout,
    currentUser
  });
  const isAuthenticatedForCheckout =
    typeof currentUser?.uid === "string" && currentUser.uid.trim().length > 0;

  // After a login redirect, reopen the checkout dialog if the user had been mid-checkout.
  const didResumeRef = useRef(false);
  useEffect(() => {
    if (didResumeRef.current) return;
    if (!isAuthenticatedForCheckout) return;
    if (items.length === 0) return;
    const flagRaw = sessionStorage.getItem("cinebook:resumeCheckout");
    if (flagRaw) {
      didResumeRef.current = true;
      sessionStorage.removeItem("cinebook:resumeCheckout");
      try {
        const resumeState = JSON.parse(flagRaw);
        openDialog(resumeState);
      } catch {
        openDialog();
      }
    }
  }, [isAuthenticatedForCheckout, items.length, openDialog]);

  const handleCheckoutClick = () => {
    openDialog();
  };
  const cartTotal = items.reduce((sum, item) => {
    return sum + item.tickets.adult * ticketPrices.adult + item.tickets.child * ticketPrices.child + item.tickets.senior * ticketPrices.senior;
  }, 0);
  const totalTickets = items.reduce((sum, item) => sum + item.tickets.adult + item.tickets.child + item.tickets.senior, 0);
  const discountAmount = appliedPromo ? +(cartTotal * appliedPromo.discountPercent / 100).toFixed(2) : 0;
  const discountedTotal = +(cartTotal - discountAmount).toFixed(2);
  return <div className={styles["cart-page-class-1"]}>
      <Button variant="ghost" size="sm" onClick={onBack} className={styles["cart-page-class-2"]}>
        <ArrowLeft className={styles["cart-page-class-3"]} />
        Continue Browsing
      </Button>

      <div className={styles["cart-page-class-4"]}>
        <ShoppingCart className={styles["cart-page-class-5"]} />
        <h1 className={styles["cart-page-class-6"]}>
          Your Cart
        </h1>
      </div>

      {items.length === 0 ? <div className={styles["cart-page-class-7"]}>
          <p className={styles["cart-page-class-8"]}>Your cart is empty</p>
          <p className={styles["cart-page-class-9"]}>
            Add movies with showtimes to continue to checkout.
          </p>
        </div> : <div className={styles["cart-page-class-10"]}>
          <div className={styles["cart-page-class-11"]}>
            {items.map(item => {
          const itemTotal = item.tickets.adult * ticketPrices.adult + item.tickets.child * ticketPrices.child + item.tickets.senior * ticketPrices.senior;
          const posterUrl = getMoviePosterUrl(item.movie);
          return <div key={item.id} className={styles["cart-page-class-12"]}>
                  <div className={styles["cart-page-class-13"]}>
                    <img src={posterUrl} alt={item.movie.title} className={styles["cart-page-class-14"]} />
                    <div className={styles["cart-page-class-15"]}>
                      <p className={styles["cart-page-class-16"]}>
                        {item.movie.title}
                      </p>
                      <p className={styles["cart-page-class-17"]}>
                        {(() => {
                          const d = new Date(item.showtime);
                          if (Number.isNaN(d.getTime())) return `Showtime: ${item.showtime}`;
                          const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
                          const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" });
                          return `Showtime: ${date} · ${time}`;
                        })()}
                      </p>
                      <p className={styles["cart-page-class-18"]}>
                        Genre: {getMovieGenreLabel(item.movie)}
                      </p>
                      <p className={styles["cart-page-class-17"]}>
                        Max {MAX_TICKETS_PER_BOOKING} tickets per booking
                      </p>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => onRemoveItem(item.id)} className={styles["cart-page-class-19"]} aria-label={`Remove ${item.movie.title} from cart`}>
                      <Trash2 className={styles["cart-page-class-3"]} />
                    </Button>
                  </div>

                  <div className={styles["cart-page-class-20"]}>
                    {["adult", "child", "senior"].map(type => <div key={type} className={styles["cart-page-class-21"]}>
                        <p className={styles["cart-page-class-22"]}>
                          {type}
                        </p>
                        <p className={styles["cart-page-class-17"]}>
                          ${ticketPrices[type].toFixed(2)}
                        </p>
                        <div className={styles["cart-page-class-23"]}>
                          <Button variant="outline" size="icon-sm" onClick={() => onUpdateTickets(item.id, type, -1)} aria-label={`Decrease ${type} tickets`}>
                            <Minus className={styles["cart-page-class-24"]} />
                          </Button>
                          <span className={styles["cart-page-class-25"]}>
                            {item.tickets[type]}
                          </span>
                          <Button variant="outline" size="icon-sm" onClick={() => onUpdateTickets(item.id, type, 1)} aria-label={`Increase ${type} tickets`}>
                            <Plus className={styles["cart-page-class-24"]} />
                          </Button>
                        </div>
                      </div>)}
                  </div>

                  <div className={styles["cart-page-class-26"]}>
                    <span className={styles["cart-page-class-27"]}>Item Total</span>
                    <span className={styles["cart-page-class-28"]}>
                      ${itemTotal.toFixed(2)}
                    </span>
                  </div>
                </div>;
        })}
          </div>

          <div className={styles["cart-page-class-29"]}>
            <h2 className={styles["cart-page-class-30"]}>Summary</h2>
            <div className={styles["cart-page-class-31"]}>
              <div className={styles["cart-page-class-32"]}>
                <span>Items</span>
                <span>{items.length}</span>
              </div>
              <div className={styles["cart-page-class-32"]}>
                <span>Total tickets</span>
                <span>{totalTickets}</span>
              </div>
            </div>

            <div className={styles["cart-page-class-33"]} />

            {/* Promo code section */}
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.6, marginBottom: "0.4rem" }}>
                Promo Code
              </p>
              {appliedPromo ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.45rem 0.65rem", borderRadius: "0.375rem", background: "color-mix(in srgb, var(--color-primary, #e05a7a) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--color-primary, #e05a7a) 35%, transparent)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-primary, #e05a7a)" }}>
                    <Tag size={13} />
                    {appliedPromo.code} — {appliedPromo.discountPercent}% off
                  </span>
                  <button onClick={() => { setPromoCodeInput(""); setAppliedPromo(null); setPromoError(null); }} style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.6, display: "flex", alignItems: "center" }} aria-label="Remove promo code">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <Input
                    value={promoCodeInput}
                    onChange={e => setPromoCodeInput(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === "Enter" && applyPromoCode()}
                    placeholder="Enter code"
                    style={{ flex: 1, height: "2rem", fontSize: "0.8rem", textTransform: "uppercase" }}
                    disabled={isApplyingPromo}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={applyPromoCode}
                    disabled={isApplyingPromo || !promoCodeInput.trim()}
                    style={{ height: "2rem", fontSize: "0.75rem", whiteSpace: "nowrap" }}
                  >
                    {isApplyingPromo ? "..." : "Apply"}
                  </Button>
                </div>
              )}
              {promoError && (
                <p style={{ fontSize: "0.75rem", color: "var(--color-destructive, #ef4444)", marginTop: "0.3rem" }}>{promoError}</p>
              )}
            </div>

            {appliedPromo && (
              <div className={styles["cart-page-class-32"]} style={{ marginBottom: "0.4rem", fontSize: "0.85rem" }}>
                <span style={{ opacity: 0.65 }}>Subtotal</span>
                <span style={{ opacity: 0.65 }}>${cartTotal.toFixed(2)}</span>
              </div>
            )}
            {appliedPromo && (
              <div className={styles["cart-page-class-32"]} style={{ marginBottom: "0.4rem", fontSize: "0.85rem" }}>
                <span style={{ color: "var(--color-primary, #e05a7a)" }}>Discount ({appliedPromo.discountPercent}%)</span>
                <span style={{ color: "var(--color-primary, #e05a7a)" }}>−${discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className={styles["cart-page-class-32"]}>
              <span className={styles["cart-page-class-34"]}>Total</span>
              <span className={styles["cart-page-class-35"]}>
                ${discountedTotal.toFixed(2)}
              </span>
            </div>

            <Button className={styles["cart-page-class-36"]} onClick={handleCheckoutClick} disabled={items.length === 0}>
              Checkout
            </Button>
            <p className={styles["cart-page-class-17"]}>
              Seat selection opens in the next step and must match the ticket count.
            </p>
          </div>
        </div>}

      <SeatSelectionDialog
        isOpen={isOpen}
        currentItem={currentItem}
        currentIndex={currentIndex}
        totalSteps={totalSteps}
        reservedSeats={reservedSeats}
        lockedSeats={lockedSeats}
        lockCountdown={lockCountdown}
        selfId={selfId}
        selectedSeatIds={selectedSeatIds}
        totalTickets={seatSelectionTicketCount}
        remainingSeats={remainingSeats}
        savedCards={savedCards}
        selectedCardId={selectedCardId}
        cardForm={cardForm}
        showCardForm={showCardForm}
        isCheckingCards={isCheckingCards}
        isSavingCard={isSavingCard}
        isDeletingCard={isDeletingCard}
        isUpdatingCard={isUpdatingCard}
        cardFieldErrors={cardFieldErrors}
        editingCardId={editingCardId}
        editCardForm={editCardForm}
        editCardFieldErrors={editCardFieldErrors}
        paymentError={paymentError}
        paymentInfo={paymentInfo}
        canAddMoreCards={canAddMoreCards}
        maxCardsAllowed={maxCardsAllowed}
        showPaymentStep={showPaymentStep}
        showOrderSummaryStep={showOrderSummaryStep}
        canCheckoutWithPayment={canCheckoutWithPayment}
        needsLogin={needsLogin}
        clearNeedsLogin={clearNeedsLogin}
        saveCard={saveCard}
        onSaveCardChange={setSaveCard}
        allItems={items}
        allSeatSelections={seatSelections}
        customerEmail={customerEmail}
        customerEmailFormatError={customerEmailFormatError}
        onCustomerEmailChange={handleCustomerEmailChange}
        needsEmailVerification={needsEmailVerification}
        otpSent={otpSent}
        otpCode={otpCode}
        onOtpCodeChange={setOtpCode}
        otpVerified={otpVerified}
        isSendingOtp={isSendingOtp}
        isVerifyingOtp={isVerifyingOtp}
        otpError={otpError}
        onSendOtp={handleSendOtp}
        onVerifyOtp={handleVerifyOtp}
        ticketPriceMap={ticketPrices}
        ROWS={ROWS}
        COLS={COLS}
        isLoadingSeats={isLoadingSeats}
        isSubmitting={isSubmitting}
        loadError={loadError}
        selectionError={selectionError}
        formatSeatLabel={formatSeatLabel}
        onSelectCard={handleSelectCard}
        onCardFieldChange={handleCardFieldChange}
        onStartEditCard={startEditingCard}
        onCancelEditCard={cancelEditingCard}
        onEditCardFieldChange={handleEditCardFieldChange}
        onToggleAddCard={setShowCardForm}
        onSaveCard={saveCardForEmail}
        onUpdateCard={updateSavedCardById}
        onDeleteCard={deleteSavedCardById}
        onClose={closeDialog}
        onLogin={() => {
          sessionStorage.setItem("cinebook:resumeCheckout", JSON.stringify({
            step: "order_summary",
            seatSelections
          }));
          closeDialog();
          const returnTo = encodeURIComponent(router.asPath || "/");
          void router.push(`/login?mode=login&returnTo=${returnTo}`);
        }}
        onToggleSeat={toggleSeat}
        onContinue={continueCheckout}
        onBack={goToPreviousItem}
        promoCodeInput={promoCodeInput}
        onPromoCodeInputChange={setPromoCodeInput}
        appliedPromo={appliedPromo}
        promoError={promoError}
        isApplyingPromo={isApplyingPromo}
        onApplyPromoCode={applyPromoCode}
        showroomNameMap={showroomNameMap}
        itemShowroomMap={itemShowroomMap}
        activeShowroomId={activeShowroomId}
        activeShowroomName={activeShowroomName}
      />
    </div>;
}
