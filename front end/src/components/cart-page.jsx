"use client";

import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeatSelectionDialog } from "@/components/seat-selection-dialog";
import { useSeatSelectionCheckoutController } from "@/controllers/useSeatSelectionCheckoutController";
import { ticketPrices } from "@/lib/ticket-prices";
import { MAX_TICKETS_PER_BOOKING } from "@/models/booking-model";
import { getMoviePosterUrl } from "@/models/movie-media";
import { getMovieGenreLabel } from "@/models/movie-model";
import "./cart-page.module.css";
export function CartPage({
  items,
  onBack,
  onUpdateTickets,
  onRemoveItem,
  onCheckout
}) {
  const {
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
    totalTickets: seatSelectionTicketCount,
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
    formatSeatLabel,
    handleSelectCard,
    handleCardFieldChange,
    setShowCardForm,
    saveCardForEmail,
    openDialog,
    closeDialog,
    toggleSeat,
    continueCheckout,
    goToPreviousItem
  } = useSeatSelectionCheckoutController({
    items,
    onCheckout
  });
  const cartTotal = items.reduce((sum, item) => {
    return sum + item.tickets.adult * ticketPrices.adult + item.tickets.child * ticketPrices.child + item.tickets.senior * ticketPrices.senior;
  }, 0);
  const totalTickets = items.reduce((sum, item) => sum + item.tickets.adult + item.tickets.child + item.tickets.senior, 0);
  return <div className={"cart-page-class-1"}>
      <Button variant="ghost" size="sm" onClick={onBack} className={"cart-page-class-2"}>
        <ArrowLeft className={"cart-page-class-3"} />
        Continue Browsing
      </Button>

      <div className={"cart-page-class-4"}>
        <ShoppingCart className={"cart-page-class-5"} />
        <h1 className={"cart-page-class-6"}>
          Your Cart
        </h1>
      </div>

      {items.length === 0 ? <div className={"cart-page-class-7"}>
          <p className={"cart-page-class-8"}>Your cart is empty</p>
          <p className={"cart-page-class-9"}>
            Add movies with showtimes to continue to checkout.
          </p>
        </div> : <div className={"cart-page-class-10"}>
          <div className={"cart-page-class-11"}>
            {items.map(item => {
          const itemTotal = item.tickets.adult * ticketPrices.adult + item.tickets.child * ticketPrices.child + item.tickets.senior * ticketPrices.senior;
          const posterUrl = getMoviePosterUrl(item.movie);
          return <div key={item.id} className={"cart-page-class-12"}>
                  <div className={"cart-page-class-13"}>
                    <img src={posterUrl} alt={item.movie.title} className={"cart-page-class-14"} />
                    <div className={"cart-page-class-15"}>
                      <p className={"cart-page-class-16"}>
                        {item.movie.title}
                      </p>
                      <p className={"cart-page-class-17"}>
                        Showtime: {item.showtime}
                      </p>
                      <p className={"cart-page-class-18"}>
                        Genre: {getMovieGenreLabel(item.movie)}
                      </p>
                      <p className={"cart-page-class-17"}>
                        Max {MAX_TICKETS_PER_BOOKING} tickets per booking
                      </p>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => onRemoveItem(item.id)} className={"cart-page-class-19"} aria-label={`Remove ${item.movie.title} from cart`}>
                      <Trash2 className={"cart-page-class-3"} />
                    </Button>
                  </div>

                  <div className={"cart-page-class-20"}>
                    {["adult", "child", "senior"].map(type => <div key={type} className={"cart-page-class-21"}>
                        <p className={"cart-page-class-22"}>
                          {type}
                        </p>
                        <p className={"cart-page-class-17"}>
                          ${ticketPrices[type].toFixed(2)}
                        </p>
                        <div className={"cart-page-class-23"}>
                          <Button variant="outline" size="icon-sm" onClick={() => onUpdateTickets(item.id, type, -1)} aria-label={`Decrease ${type} tickets`}>
                            <Minus className={"cart-page-class-24"} />
                          </Button>
                          <span className={"cart-page-class-25"}>
                            {item.tickets[type]}
                          </span>
                          <Button variant="outline" size="icon-sm" onClick={() => onUpdateTickets(item.id, type, 1)} aria-label={`Increase ${type} tickets`}>
                            <Plus className={"cart-page-class-24"} />
                          </Button>
                        </div>
                      </div>)}
                  </div>

                  <div className={"cart-page-class-26"}>
                    <span className={"cart-page-class-27"}>Item Total</span>
                    <span className={"cart-page-class-28"}>
                      ${itemTotal.toFixed(2)}
                    </span>
                  </div>
                </div>;
        })}
          </div>

          <div className={"cart-page-class-29"}>
            <h2 className={"cart-page-class-30"}>Summary</h2>
            <div className={"cart-page-class-31"}>
              <div className={"cart-page-class-32"}>
                <span>Items</span>
                <span>{items.length}</span>
              </div>
              <div className={"cart-page-class-32"}>
                <span>Total tickets</span>
                <span>{totalTickets}</span>
              </div>
            </div>

            <div className={"cart-page-class-33"} />

            <div className={"cart-page-class-32"}>
              <span className={"cart-page-class-34"}>Total</span>
              <span className={"cart-page-class-35"}>
                ${cartTotal.toFixed(2)}
              </span>
            </div>

            <Button className={"cart-page-class-36"} onClick={openDialog} disabled={items.length === 0}>
              Checkout
            </Button>
            <p className={"cart-page-class-17"}>
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
        selectedSeatIds={selectedSeatIds}
        totalTickets={seatSelectionTicketCount}
        remainingSeats={remainingSeats}
        savedCards={savedCards}
        selectedCardId={selectedCardId}
        cardForm={cardForm}
        showCardForm={showCardForm}
        isCheckingCards={isCheckingCards}
        isSavingCard={isSavingCard}
        paymentError={paymentError}
        paymentInfo={paymentInfo}
        canAddMoreCards={canAddMoreCards}
        maxCardsAllowed={maxCardsAllowed}
        showPaymentStep={showPaymentStep}
        canCheckoutWithPayment={canCheckoutWithPayment}
        ROWS={ROWS}
        COLS={COLS}
        isLoadingSeats={isLoadingSeats}
        isSubmitting={isSubmitting}
        loadError={loadError}
        selectionError={selectionError}
        formatSeatLabel={formatSeatLabel}
        onSelectCard={handleSelectCard}
        onCardFieldChange={handleCardFieldChange}
        onToggleAddCard={setShowCardForm}
        onSaveCard={saveCardForEmail}
        onClose={closeDialog}
        onToggleSeat={toggleSeat}
        onContinue={continueCheckout}
        onBack={goToPreviousItem}
      />
    </div>;
}
