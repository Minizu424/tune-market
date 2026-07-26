import { initializeApp } from "firebase/app";
import { collection, getDocs, getFirestore } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyBmJ7Sc8ZCnJrQ27a2Rsei8_kQ0FJVlELA",
  authDomain: "tune-market.firebaseapp.com",
  projectId: "tune-market",
  storageBucket: "tune-market.firebasestorage.app",
  messagingSenderId: "259318601563",
  appId: "1:259318601563:web:7505a3243d50294a576c7e",
});
const db = getFirestore(app);

const ts = (v) => (v && v.toDate ? v.toDate().toISOString().slice(0, 16) : "-");

const songsSnap = await getDocs(collection(db, "songs"));
console.log(`\n=== songs: ${songsSnap.size}件 ===`);
for (const d of songsSnap.docs) {
  const s = d.data();
  console.log(
    [
      d.id.slice(0, 8),
      (s.title ?? "").padEnd(16),
      (s.artistName ?? "").padEnd(12),
      `st=${s.status}`,
      `price=${s.currentPrice}`,
      `prev=${s.previousPrice ?? "-"}`,
      `play=${s.playCount ?? 0}`,
      `like=${s.likeCount ?? 0}`,
      `cmt=${s.commentCount ?? 0}`,
      `hold=${s.holderCount ?? 0}`,
      `sup=${s.supportPoint ?? 0}`,
      `sec=${s.totalPlaySeconds ?? 0}`,
      `prog=${s.progress ?? "-"}`,
      `audio=${s.audioUrl ? "o" : "x"}`,
      `jacket=${s.jacketUrl ? "o" : "x"}`,
      `created=${ts(s.createdAt)}`,
    ].join(" "),
  );
}

const artistsSnap = await getDocs(collection(db, "artists"));
console.log(`\n=== artists: ${artistsSnap.size}件 ===`);
for (const d of artistsSnap.docs) {
  const a = d.data();
  console.log(`${d.id.slice(0, 10)} ${(a.name ?? "").padEnd(14)} weekly=${a.weeklySupportPoint ?? 0} total=${a.totalSupportPoint ?? 0} userId=${a.userId ? "o" : "x"}`);
}

const phSnap = await getDocs(collection(db, "priceHistories"));
const bySong = {};
for (const d of phSnap.docs) {
  const p = d.data();
  (bySong[p.songId] ??= []).push(p);
}
console.log(`\n=== priceHistories: ${phSnap.size}件 / ${Object.keys(bySong).length}曲分 ===`);
for (const [songId, rows] of Object.entries(bySong)) {
  const sorted = rows.slice().sort((a, b) => (a.recordedAt?.seconds ?? 0) - (b.recordedAt?.seconds ?? 0));
  console.log(`${songId.slice(0, 8)} ${String(rows.length).padStart(3)}件 ${ts(sorted[0]?.recordedAt)} → ${ts(sorted.at(-1)?.recordedAt)}  価格: ${sorted.map((r) => r.price).join(",")}`);
}

const puSnap = await getDocs(collection(db, "progressUpdates"));
console.log(`\n=== progressUpdates: ${puSnap.size}件 ===`);

process.exit(0);
