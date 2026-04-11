import { FirestoreService } from "./firestore.service.js";
import { DEFAULT_RESERVED_SEATS } from "../common/constants.js";

const DEFAULT_TIMES = ["11:00", "14:30", "18:00", "21:30"];
const DEFAULT_DAYS = 7;

function combineDateAndTime(date, time) {
  const [hh, mm] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

async function ensureShowrooms(db) {
  const snap = await db.collection("showrooms").get();
  if (!snap.empty) return snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const showrooms = [
    { id: "showroom-1", name: "Blue Hall", rows: 8, cols: 12 },
    { id: "showroom-2", name: "Red Hall", rows: 10, cols: 12 },
    { id: "showroom-3", name: "Green Hall", rows: 6, cols: 10 }
  ];

  for (const s of showrooms) {
    const seats = [];
    for (let r = 1; r <= s.rows; r += 1) {
      for (let c = 1; c <= s.cols; c += 1) {
        seats.push(`${r}-${c}`);
      }
    }

    await db.collection("showrooms").doc(s.id).set({
      showroomId: s.id,
      name: s.name,
      rows: s.rows,
      cols: s.cols,
      seats,
      createdAt: new Date().toISOString()
    });
  }

  const createdSnap = await db.collection("showrooms").get();
  return createdSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function ensureMovies(db) {
  const snap = await db.collection("movies").get();
  if (!snap.empty) return snap.docs.map((d) => ({ ref: d.ref, id: d.id, ...d.data() }));

  const SAMPLE_MOVIES = [
    {
      id: 1,
      title: "The Last Horizon",
      genres: ["Sci-Fi", "Adventure"],
      duration: "2h 10m",
      director: "A. Director",
      description: "A journey beyond the stars.",
      poster: "/placeholder.jpg",
      status: "currently_running",
      showtimes: []
    },
    {
      id: 2,
      title: "City of Echoes",
      genres: ["Drama", "Mystery"],
      duration: "1h 45m",
      director: "B. Filmmaker",
      description: "Secrets under the neon lights.",
      poster: "/placeholder.jpg",
      status: "currently_running",
      showtimes: []
    },
    {
      id: 3,
      title: "Laugh Track",
      genres: ["Comedy"],
      duration: "1h 30m",
      director: "C. Comedian",
      description: "A comedy special turned cinematic.",
      poster: "/placeholder.jpg",
      status: "coming_soon",
      showtimes: []
    }
  ];

  for (const m of SAMPLE_MOVIES) {
    await db.collection("movies").doc(String(m.id)).set(m);
  }

  const created = await db.collection("movies").get();
  return created.docs.map((d) => ({ ref: d.ref, id: d.id, ...d.data() }));
}

async function ensureShows(db, movies, showrooms) {
  const showsSnap = await db.collection("shows").get();
  if (!showsSnap.empty) return showsSnap.docs.map((d) => d.data());

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const days = DEFAULT_DAYS;
  const times = DEFAULT_TIMES;

  let created = 0;
  for (let d = 0; d < days; d += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + d);

    for (const movie of movies) {
      for (let tIndex = 0; tIndex < times.length; tIndex += 1) {
        const time = times[tIndex].trim();
        if (!time) continue;

        const showroom = showrooms[(tIndex + d + Number(movie.id || 0)) % showrooms.length];
        const showtime = combineDateAndTime(date, time);
        const showroomId = showroom.id;
        const showtimeKey = `${showtime}::${showroomId}`;

        const conflict = await db
          .collection("shows")
          .where("showroomId", "==", showroomId)
          .where("showtime", "==", showtime)
          .limit(1)
          .get();
        if (!conflict.empty) continue;

        const showId = `${movie.id}-${d}-${tIndex}`;
        const record = {
          showId,
          movieId: Number(movie.id),
          showtime,
          showroomId,
          showtimeKey,
          createdAt: new Date().toISOString()
        };

        await db.collection("shows").doc(showId).set(record);

        // update movie doc showtimes
        try {
          await movie.ref.set(
            { showtimes: [...(Array.isArray(movie.showtimes) ? movie.showtimes : []), showtimeKey] },
            { merge: true }
          );
        } catch {
          // ignore
        }

        created += 1;
      }
    }
  }

  const createdSnap = await db.collection("shows").get();
  return createdSnap.docs.map((d) => d.data());
}

async function ensureBookings(db) {
  const snap = await db.collection("booking").get();
  if (!snap.empty) return snap.docs.map((d) => d.data());

  // Create a few demo bookings and tickets for the earliest shows
  const showsSnap = await db.collection("shows").orderBy("showtime").limit(6).get();
  if (showsSnap.empty) return [];

  const bookings = [];
  const ticketsCreated = [];
  let counter = 1;
  for (const doc of showsSnap.docs) {
    const show = doc.data();
    const bookingId = `booking-${counter}`;
    const seatCount = (counter % 3) + 1; // 1..3 seats
    const seatIds = [];
    for (let s = 1; s <= seatCount; s += 1) {
      seatIds.push(`1-${s}`);
    }

    const bookingRecord = {
      bookingId,
      movieId: show.movieId,
      showtime: show.showtime,
      seatIds,
      tickets: { adult: seatCount, child: 0, senior: 0 },
      customerUid: null,
      customerName: "Demo User",
      customerEmail: "demo@example.com",
      paymentCard: { cardId: "demo-card", brand: "Visa", last4: "4242", expMonth: 12, expYear: 2030 },
      status: "confirmed",
      total: 0,
      createdAt: new Date().toISOString()
    };

    await db.collection("booking").doc(bookingId).set(bookingRecord);
    bookings.push(bookingRecord);

    // create ticket documents for each seat
    for (const seatId of seatIds) {
      const ticketId = `ticket-${bookingId}-${seatId}`;
      const ticketRecord = {
        ticketId,
        bookingId,
        movieId: show.movieId,
        showtime: show.showtime,
        showId: show.showId ?? null,
        showroomId: show.showroomId ?? null,
        seatId,
        type: "adult",
        price: 0,
        createdAt: new Date().toISOString()
      };

      await db.collection("tickets").doc(ticketId).set(ticketRecord);
      ticketsCreated.push(ticketRecord);
    }

    counter += 1;
  }

  console.log(`Created ${bookings.length} demo bookings and ${ticketsCreated.length} tickets.`);
  return bookings;
}

async function ensureUsersAndRelated(db) {
  const usersSnap = await db.collection("users").limit(1).get();
  if (!usersSnap.empty) return usersSnap.docs.map((d) => d.data());

  const demoUid = "demo-uid";
  const demoEmail = "demo@example.com";
  const userRecord = {
    uid: demoUid,
    email: demoEmail,
    name: "Demo User",
    createdAt: new Date().toISOString()
  };

  await db.collection("users").doc(demoUid).set(userRecord);

  // create address (composition)
  const addressId = `addr-${demoUid}`;
  const addressRecord = {
    addressId,
    uid: demoUid,
    line1: "123 Demo St",
    city: "Demo City",
    state: "DC",
    postalCode: "00000",
    country: "Demo Country"
  };
  await db.collection("addresses").doc(addressId).set(addressRecord);

  // create a saved card (composition)
  const cardId = `card-${demoUid}-1`;
  const cardRecord = {
    cardId,
    customerUid: demoUid,
    customerEmail: demoEmail,
    cardholderName: "Demo User",
    brand: "Visa",
    last4: "4242",
    expMonth: 12,
    expYear: 2030,
    cardToken: "demo-token",
    createdAt: new Date().toISOString()
  };
  await db.collection("payment_cards").doc(cardId).set(cardRecord);

  return [userRecord];
}

async function ensurePromotionsPreferencesRecommendations(db, movies) {
  const promoSnap = await db.collection("promotions").limit(1).get();
  if (promoSnap.empty) {
    const promo = {
      promoId: "promo-1",
      code: "WELCOME10",
      description: "10% off for first booking",
      discountPercent: 10,
      active: true,
      createdAt: new Date().toISOString()
    };
    await db.collection("promotions").doc(promo.promoId).set(promo);
  }

  // preferences: link demo user to first movie
  const prefsSnap = await db.collection("preferences").limit(1).get();
  if (prefsSnap.empty && movies.length > 0) {
    const pref = {
      preferenceId: `pref-demo-${movies[0].id}`,
      uid: "demo-uid",
      movieId: movies[0].id,
      createdAt: new Date().toISOString()
    };
    await db.collection("preferences").doc(pref.preferenceId).set(pref);
  }

  // recommendations
  const recSnap = await db.collection("recommendations").limit(1).get();
  if (recSnap.empty && movies.length > 0) {
    const rec = {
      recommendationId: `rec-demo-${movies[0].id}`,
      uid: "demo-uid",
      movieId: movies[0].id,
      reason: "Because you liked similar films",
      createdAt: new Date().toISOString()
    };
    await db.collection("recommendations").doc(rec.recommendationId).set(rec);
  }
}

async function ensureShowSeats(db, shows, showrooms) {
  const showSeatsSnap = await db.collection("show_seats").limit(1).get();
  if (!showSeatsSnap.empty) return;

  // Map showrooms by id for seat layout
  const showroomMap = new Map(showrooms.map((s) => [s.id, s]));

  for (const show of shows) {
    const showroom = showroomMap.get(show.showroomId);
    const seats = Array.isArray(showroom?.seats) ? showroom.seats : [];

    for (const seatId of seats) {
      const seatDocId = `${show.showId}::${seatId}`;
      const isReserved = DEFAULT_RESERVED_SEATS.includes(seatId);
      const seatRecord = {
        showId: show.showId,
        movieId: show.movieId,
        showroomId: show.showroomId,
        seatId,
        status: isReserved ? "booked" : "available",
        createdAt: new Date().toISOString()
      };

      await db.collection("show_seats").doc(seatDocId).set(seatRecord);
    }
  }
}

export async function initData() {
  const fs = new FirestoreService();
  const db = fs.db();

  const showrooms = await ensureShowrooms(db);
  const movies = await ensureMovies(db);
  const shows = await ensureShows(db, movies, showrooms);
  const users = await ensureUsersAndRelated(db);
  await ensurePromotionsPreferencesRecommendations(db, movies);
  await ensureShowSeats(db, shows, showrooms);
  const bookings = await ensureBookings(db);

  console.log(`DB init complete: showrooms=${showrooms.length}, movies=${movies.length}, shows=${shows.length}, users=${users.length}, bookings=${bookings.length}`);
}
