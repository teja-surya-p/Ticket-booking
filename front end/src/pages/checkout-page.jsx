"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { CheckCircle2, Home, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribeToAuthState } from "@/services";
import styles from "./checkout-page.module.css";
export function CheckoutPage({
  orderId,
  total,
  bookings = [],
  warning = null,
  onGoHome,
  onOpenCart
}) {
  return <div className={styles["checkout-confirmation-class-1"]}>
      <div className={styles["checkout-confirmation-class-2"]}>
        <div className={styles["checkout-confirmation-class-3"]}>
          <CheckCircle2 className={styles["checkout-confirmation-class-4"]} />
        </div>

        <h1 className={styles["checkout-confirmation-class-5"]}>
          Booking Confirmed
        </h1>
        <p className={styles["checkout-confirmation-class-6"]}>
          Your tickets are reserved successfully.
        </p>

        <div className={styles["checkout-confirmation-class-7"]}>
          <p className={styles["checkout-confirmation-class-8"]}>
            Confirmation Number
          </p>
          <p className={styles["checkout-confirmation-class-9"]}>{orderId}</p>

          <div className={styles["checkout-confirmation-class-10"]}>
            <span className={styles["checkout-confirmation-class-11"]}>Paid</span>
            <span className={styles["checkout-confirmation-class-12"]}>${total.toFixed(2)}</span>
          </div>
        </div>

        {bookings.length > 0 && <div className={styles["checkout-confirmation-class-7"]}>
            <p className={styles["checkout-confirmation-class-8"]}>Booked Seats</p>
            {bookings.map((booking) => <div key={booking.bookingId} className={styles["checkout-confirmation-class-10"]}>
                <span className={styles["checkout-confirmation-class-11"]}>
                  {booking.movieTitle} - {booking.showtime}
                </span>
                <span className={styles["checkout-confirmation-class-12"]}>
                  {booking.seatLabels.join(", ")}
                </span>
              </div>)}
          </div>}

        {warning && <p className={styles["checkout-confirmation-class-6"]}>
            {warning}
          </p>}

        <div className={styles["checkout-confirmation-class-13"]}>
          <Button onClick={onGoHome} className={[styles["checkout-confirmation-class-14"], styles["checkout-confirmation-class-16"]].filter(Boolean).join(" ")}>
            <Home className={styles["checkout-confirmation-class-15"]} />
            Back to Home
          </Button>
          <Button variant="outline" onClick={onOpenCart} className={[styles["checkout-confirmation-class-14"], styles["checkout-confirmation-class-17"]].filter(Boolean).join(" ")}>
            <ShoppingCart className={styles["checkout-confirmation-class-15"]} />
            Open Cart
          </Button>
        </div>
      </div>
    </div>;
}

export default function CheckoutPageRoute() {
  const router = useRouter();
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      const signedIn = typeof user?.uid === "string" && user.uid.trim().length > 0;
      setIsAuthenticated(signedIn);
      setIsAuthResolved(true);

      if (!signedIn) {
        void router.replace("/login?mode=login");
      }
    });

    return () => {
      unsubscribe();
    };
  }, [router]);

  if (!isAuthResolved || !isAuthenticated) {
    return null;
  }

  return (
    <CheckoutPage
      orderId={"CB-DEMO-0001"}
      total={0}
      onGoHome={() => {}}
      onOpenCart={() => {}}
    />
  );
}
