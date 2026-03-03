"use client";

import { CheckCircle2, Home, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import "./checkout-page.module.css";
export function CheckoutPage({
  orderId,
  total,
  bookings = [],
  warning = null,
  onGoHome,
  onOpenCart
}) {
  return <div className={"checkout-confirmation-class-1"}>
      <div className={"checkout-confirmation-class-2"}>
        <div className={"checkout-confirmation-class-3"}>
          <CheckCircle2 className={"checkout-confirmation-class-4"} />
        </div>

        <h1 className={"checkout-confirmation-class-5"}>
          Booking Confirmed
        </h1>
        <p className={"checkout-confirmation-class-6"}>
          Your tickets are reserved successfully.
        </p>

        <div className={"checkout-confirmation-class-7"}>
          <p className={"checkout-confirmation-class-8"}>
            Confirmation Number
          </p>
          <p className={"checkout-confirmation-class-9"}>{orderId}</p>

          <div className={"checkout-confirmation-class-10"}>
            <span className={"checkout-confirmation-class-11"}>Paid</span>
            <span className={"checkout-confirmation-class-12"}>${total.toFixed(2)}</span>
          </div>
        </div>

        {bookings.length > 0 && <div className={"checkout-confirmation-class-7"}>
            <p className={"checkout-confirmation-class-8"}>Booked Seats</p>
            {bookings.map((booking) => <div key={booking.bookingId} className={"checkout-confirmation-class-10"}>
                <span className={"checkout-confirmation-class-11"}>
                  {booking.movieTitle} - {booking.showtime}
                </span>
                <span className={"checkout-confirmation-class-12"}>
                  {booking.seatLabels.join(", ")}
                </span>
              </div>)}
          </div>}

        {warning && <p className={"checkout-confirmation-class-6"}>
            {warning}
          </p>}

        <div className={"checkout-confirmation-class-13"}>
          <Button onClick={onGoHome} className={"checkout-confirmation-class-14 checkout-confirmation-class-16"}>
            <Home className={"checkout-confirmation-class-15"} />
            Back to Home
          </Button>
          <Button variant="outline" onClick={onOpenCart} className={"checkout-confirmation-class-14 checkout-confirmation-class-17"}>
            <ShoppingCart className={"checkout-confirmation-class-15"} />
            Open Cart
          </Button>
        </div>
      </div>
    </div>;
}

export default function CheckoutPageRoute() {
  return (
    <CheckoutPage
      orderId={"CB-DEMO-0001"}
      total={0}
      onGoHome={() => {}}
      onOpenCart={() => {}}
    />
  );
}
