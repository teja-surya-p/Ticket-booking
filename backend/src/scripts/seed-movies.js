import { FirestoreService } from "../config/firestore.service.js";

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

async function main() {
  const firestoreService = new FirestoreService();
  const db = firestoreService.db();

  let created = 0;
  for (const m of SAMPLE_MOVIES) {
    const docRef = db.collection("movies").doc(String(m.id));
    const snapshot = await docRef.get();
    if (snapshot.exists) continue;

    const record = {
      id: m.id,
      title: m.title,
      genres: m.genres,
      duration: m.duration,
      director: m.director,
      description: m.description,
      poster: m.poster,
      status: m.status,
      showtimes: []
    };

    await docRef.set(record);
    created += 1;
  }

  console.log(`Seed movies complete. Created ${created} movies (or skipped existing).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
