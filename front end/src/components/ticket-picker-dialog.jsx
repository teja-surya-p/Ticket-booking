"use client";

import { useState, useEffect } from "react";
import { Minus, Plus, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { DEFAULT_PRICING, MAX_TICKETS_PER_BOOKING } from "@/models/booking-model";

const TICKET_LABELS = {
  adult: "Adult",
  child: "Child",
  senior: "Senior"
};

const TICKET_SUBTITLES = {
  adult: "Ages 13+",
  child: "Ages 3–12",
  senior: "Ages 65+"
};

function formatShowtime(startAt) {
  if (!startAt) return "";
  const date = new Date(startAt);
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC"
  });
  return `${dateStr} · ${timeStr}`;
}

export function TicketPickerDialog({ pendingItem, cartItems, onConfirm, onCancel }) {
  const [tickets, setTickets] = useState({ adult: 1, child: 0, senior: 0 });

  // Reset counts whenever a new pendingItem appears
  useEffect(() => {
    if (pendingItem) {
      setTickets({ adult: 1, child: 0, senior: 0 });
    }
  }, [pendingItem?.movie?.id, pendingItem?.showtime]);

  const isAlreadyInCart = Array.isArray(cartItems) && cartItems.some(
    (item) => item.movie?.id === pendingItem?.movie?.id && item.showtime === pendingItem?.showtime
  );

  const totalTickets = tickets.adult + tickets.child + tickets.senior;
  const totalPrice =
    tickets.adult * DEFAULT_PRICING.adult +
    tickets.child * DEFAULT_PRICING.child +
    tickets.senior * DEFAULT_PRICING.senior;

  // How many tickets are already in cart for this item
  const existingTotal = isAlreadyInCart
    ? (() => {
        const existing = cartItems.find(
          (item) => item.movie?.id === pendingItem?.movie?.id && item.showtime === pendingItem?.showtime
        );
        return existing ? existing.tickets.adult + existing.tickets.child + existing.tickets.senior : 0;
      })()
    : 0;

  const wouldExceedMax = isAlreadyInCart && existingTotal + totalTickets > MAX_TICKETS_PER_BOOKING;

  const handleChange = (type, delta) => {
    setTickets((prev) => {
      const newTotal = prev.adult + prev.child + prev.senior + delta;
      if (delta > 0 && newTotal > MAX_TICKETS_PER_BOOKING) return prev;
      return { ...prev, [type]: Math.max(0, prev[type] + delta) };
    });
  };

  const handleConfirm = () => {
    if (totalTickets === 0 || wouldExceedMax) return;
    onConfirm(tickets);
    setTickets({ adult: 1, child: 0, senior: 0 });
  };

  return (
    <Dialog open={Boolean(pendingItem)} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent style={{ maxWidth: "26rem" }}>
        <DialogHeader>
          <DialogTitle style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Ticket style={{ width: "1.1rem", height: "1.1rem", color: "var(--primary)" }} />
            Select Tickets
          </DialogTitle>
          {pendingItem && (
            <DialogDescription>
              <strong style={{ color: "var(--foreground)" }}>{pendingItem.movie?.title}</strong>
              <br />
              <span style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                {formatShowtime(pendingItem.showtime)}
              </span>
            </DialogDescription>
          )}
        </DialogHeader>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", margin: "0.5rem 0" }}>
          {["adult", "child", "senior"].map((type) => (
            <div
              key={type}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.6rem 0.75rem",
                borderRadius: "0.5rem",
                background: "var(--muted, #f4f4f5)",
                gap: "0.75rem"
              }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem", textTransform: "capitalize" }}>
                  {TICKET_LABELS[type]}
                </p>
                <p style={{ margin: 0, fontSize: "0.74rem", color: "var(--muted-foreground)" }}>
                  {TICKET_SUBTITLES[type]}
                </p>
              </div>
              <span style={{ fontWeight: 600, fontSize: "0.88rem", minWidth: "3rem", textAlign: "right" }}>
                ${DEFAULT_PRICING[type].toFixed(2)}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  style={{ width: "1.8rem", height: "1.8rem" }}
                  onClick={() => handleChange(type, -1)}
                  disabled={tickets[type] === 0}
                >
                  <Minus style={{ width: "0.8rem", height: "0.8rem" }} />
                </Button>
                <span style={{ minWidth: "1.5rem", textAlign: "center", fontWeight: 600, fontSize: "0.9rem" }}>
                  {tickets[type]}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  style={{ width: "1.8rem", height: "1.8rem" }}
                  onClick={() => handleChange(type, 1)}
                  disabled={totalTickets >= MAX_TICKETS_PER_BOOKING}
                >
                  <Plus style={{ width: "0.8rem", height: "0.8rem" }} />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {isAlreadyInCart && !wouldExceedMax && (
          <p style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", margin: "0 0 0.25rem", textAlign: "center" }}>
            Already in cart ({existingTotal} ticket{existingTotal !== 1 ? "s" : ""}) — these will be added on top.
          </p>
        )}
        {wouldExceedMax && (
          <p style={{ fontSize: "0.78rem", color: "var(--destructive)", margin: "0 0 0.25rem", textAlign: "center" }}>
            Cannot add {totalTickets} more — you already have {existingTotal} ticket{existingTotal !== 1 ? "s" : ""} (max {MAX_TICKETS_PER_BOOKING}).
          </p>
        )}

        <DialogFooter style={{ gap: "0.5rem" }}>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={totalTickets === 0 || wouldExceedMax}
          >
            {totalTickets > 0
              ? `Add ${totalTickets} Ticket${totalTickets !== 1 ? "s" : ""} · $${totalPrice.toFixed(2)}`
              : "Select at least 1 ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
