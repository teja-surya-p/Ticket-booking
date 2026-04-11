import { randomUUID } from "node:crypto";
import { FirestoreService } from "../config/firestore.service.js";

async function main() {
  const firestoreService = new FirestoreService();
  const db = firestoreService.db();

  const showsSnap = await db.collection("shows").get();
  if (showsSnap.empty) {
    console.error("No shows found. Run show seeds first.");
    process.exit(1);
  }

  const bookingsCollection = db.collection("booking");
  let created = 0;

  // Create a few sample bookings for the earliest shows
  const shows = showsSnap.docs.map((d) => d.data()).sort((a, b) => (a.showtime > b.showtime ? 1 : -1));
  for (let i = 0; i < Math.min(6, shows.length); i += 1) {
    const show = shows[i];
    const bookingId = randomUUID();
    const seatIds = ["1-1", "1-2"].slice(0, (i % 3) + 1);
    const record = {
      bookingId,
      movieId: show.movieId,
      showtime: show.showtimeKey ?? `${show.showtime}::${show.showroomId}`,
      seatIds,
      tickets: { adult: seatIds.length, child: 0, senior: 0 },
      customerUid: null,
      customerName: "Demo User",
      customerEmail: "demo@example.com",
      paymentCard: { cardId: "demo-card", brand: "Visa", last4: "4242", expMonth: 12, expYear: 2030 },
      status: "confirmed",
      total: 0,
      createdAt: new Date().toISOString()
    };

    await bookingsCollection.doc(bookingId).set(record);
    created += 1;
  }

  console.log(`Seed bookings complete. Created ${created} bookings.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
