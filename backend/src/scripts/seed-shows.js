import { randomUUID } from "node:crypto";
import { FirestoreService } from "../config/firestore.service.js";

const DEFAULT_TIMES = ["11:00", "14:30", "18:00", "21:30"];
const DEFAULT_DAYS = 7;

function combineDateAndTime(date, time) {
  const [hh, mm] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

async function main() {
  const firestoreService = new FirestoreService();
  const db = firestoreService.db();

  const showroomsSnap = await db.collection("showrooms").get();
  const moviesSnap = await db.collection("movies").get();

  if (showroomsSnap.empty) {
    console.error("No showrooms found in Firestore. Please add showrooms to the 'showrooms' collection first.");
    process.exit(1);
  }

  if (moviesSnap.empty) {
    console.error("No movies found in Firestore. Please add movies to the 'movies' collection first.");
    process.exit(1);
  }

  const showrooms = showroomsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const movies = moviesSnap.docs.map((d) => ({ ref: d.ref, id: d.id, ...d.data() }));

  const days = Number(process.env.SEED_DAYS ?? DEFAULT_DAYS);
  const times = process.env.SEED_TIMES ? process.env.SEED_TIMES.split(",") : DEFAULT_TIMES;

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  let created = 0;
  for (let d = 0; d < days; d += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + d);

    for (const movie of movies) {
      for (let tIndex = 0; tIndex < times.length; tIndex += 1) {
        const time = times[tIndex].trim();
        if (!time) continue;

        // Pick showroom in round-robin to avoid conflicts where possible
        const showroom = showrooms[(tIndex + d + (movie.id ? Number(movie.id) : 0)) % showrooms.length];
        const showtime = combineDateAndTime(date, time);
        const showroomId = showroom.id;
        const showtimeKey = `${showtime}::${showroomId}`;

        // Check for existing show in same showroom at same showtime
        const conflict = await db
          .collection("shows")
          .where("showroomId", "==", showroomId)
          .where("showtime", "==", showtime)
          .limit(1)
          .get();

        if (!conflict.empty) {
          // Skip creating duplicate/conflicting show
          continue;
        }

        const showId = randomUUID();
        const record = {
          showId,
          movieId: movie.id ?? Number(movie.id),
          showtime,
          showroomId,
          showtimeKey,
          createdAt: new Date().toISOString()
        };

        await db.collection("shows").doc(showId).set(record);

        // Append showtimeKey to movie document's showtimes array
        try {
          await movie.ref.set(
            { showtimes: [...(Array.isArray(movie.showtimes) ? movie.showtimes : []), showtimeKey] },
            { merge: true }
          );
        } catch (err) {
          console.warn(`Failed to update movie doc ${movie.id} showtimes: ${err?.message ?? err}`);
        }

        created += 1;
      }
    }
  }

  console.log(`Seed complete. Created ${created} shows across ${movies.length} movies and ${showrooms.length} showrooms for ${days} days.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
