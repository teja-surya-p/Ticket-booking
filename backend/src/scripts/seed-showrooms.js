import { randomUUID } from "node:crypto";
import { FirestoreService } from "../config/firestore.service.js";

async function main() {
  const firestoreService = new FirestoreService();
  const db = firestoreService.db();

  const showrooms = [
    { id: "showroom-1", name: "Blue Hall", rows: 8, cols: 12 },
    { id: "showroom-2", name: "Red Hall", rows: 10, cols: 12 },
    { id: "showroom-3", name: "Green Hall", rows: 6, cols: 10 }
  ];

  let created = 0;
  for (const s of showrooms) {
    const docRef = db.collection("showrooms").doc(s.id);
    const snapshot = await docRef.get();
    if (snapshot.exists) continue;

    // Build seatIds like "1-1" .. "rows-cols"
    const seats = [];
    for (let r = 1; r <= s.rows; r += 1) {
      for (let c = 1; c <= s.cols; c += 1) {
        seats.push(`${r}-${c}`);
      }
    }

    const record = {
      showroomId: s.id,
      name: s.name,
      rows: s.rows,
      cols: s.cols,
      seats,
      createdAt: new Date().toISOString()
    };

    await docRef.set(record);
    created += 1;
  }

  console.log(`Seed showrooms complete. Created ${created} showrooms (or skipped existing).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
