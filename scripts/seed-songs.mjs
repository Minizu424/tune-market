/**
 * テスト楽曲データ投入スクリプト（課題作成用資料 5.3 のテスト楽曲例に対応）
 *
 * 実行方法:
 *   node scripts/seed-songs.mjs
 *
 * Firestore に以下を作成する:
 *   - artists: シード用アーティスト
 *   - songs: Night Drive など8曲
 *   - priceHistories: 各曲の直近14日分の価格履歴
 */
import { initializeApp } from "firebase/app";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBmJ7Sc8ZCnJrQ27a2Rsei8_kQ0FJVlELA",
  authDomain: "tune-market.firebaseapp.com",
  projectId: "tune-market",
  storageBucket: "tune-market.firebasestorage.app",
  messagingSenderId: "259318601563",
  appId: "1:259318601563:web:7505a3243d50294a576c7e",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DAY_MS = 24 * 60 * 60 * 1000;

const artists = [
  {
    id: "seed-taro-beats",
    artistName: "Taro Beats",
    profile: "Lo-fi / Chillを中心に、日常に寄り添う音楽を制作しています。",
    genres: ["Lo-fi"],
  },
  {
    id: "seed-luna",
    artistName: "Luna",
    profile: "夕暮れの空気感を音にするシンガーソングライター。",
    genres: ["Pop"],
  },
  {
    id: "seed-mio",
    artistName: "Mio",
    profile: "星空の下で聴きたいエレクトロニカを作っています。",
    genres: ["EDM"],
  },
  {
    id: "seed-azuki",
    artistName: "azuki",
    profile: "カラフルなループミュージックが得意です。",
    genres: ["Pop"],
  },
  {
    id: "seed-kuro",
    artistName: "Kuro",
    profile: "余韻の残るオルタナティブロックを届けます。",
    genres: ["Rock"],
  },
  {
    id: "seed-beatlover",
    artistName: "BeatLover",
    profile: "夜明けをテーマにしたビートメイカー。",
    genres: ["EDM"],
  },
  {
    id: "seed-riku",
    artistName: "Riku",
    profile: "海と旅をテーマにしたトラックを制作中。",
    genres: ["Lo-fi"],
  },
  {
    id: "seed-neon-owl",
    artistName: "Neon Owl",
    profile: "真夜中の都市をイメージしたシンセウェイヴ。",
    genres: ["EDM"],
  },
];

const songs = [
  {
    id: "seed-night-drive",
    artistId: "seed-taro-beats",
    artistName: "Taro Beats",
    title: "Night Drive",
    genre: "Lo-fi",
    description: "夜の街を走るようなチル系ビート",
    currentPrice: 128,
    previousPrice: 108,
    progress: 65,
    playCount: 48210,
    likeCount: 1245,
    saveCount: 830,
    commentCount: 96,
    holderCount: 320,
    supportPoint: 1280,
    daysAgo: 30,
  },
  {
    id: "seed-sunset-walk",
    artistId: "seed-luna",
    artistName: "Luna",
    title: "Sunset Walk",
    genre: "Pop",
    description: "夕暮れの帰り道を彩るポップチューン",
    currentPrice: 98,
    previousPrice: 87,
    progress: 80,
    playCount: 38441,
    likeCount: 980,
    saveCount: 640,
    commentCount: 74,
    holderCount: 250,
    supportPoint: 980,
    daysAgo: 25,
  },
  {
    id: "seed-starlight",
    artistId: "seed-mio",
    artistName: "Mio",
    title: "Starlight",
    genre: "EDM",
    description: "星空の下で踊りたくなるエレクトロニカ",
    currentPrice: 68,
    previousPrice: 63,
    progress: 45,
    playCount: 15020,
    likeCount: 560,
    saveCount: 320,
    commentCount: 41,
    holderCount: 140,
    supportPoint: 680,
    daysAgo: 5,
  },
  {
    id: "seed-color-loop",
    artistId: "seed-azuki",
    artistName: "azuki",
    title: "Color Loop",
    genre: "Pop",
    description: "カラフルに繰り返すループミュージック",
    currentPrice: 54,
    previousPrice: 51,
    progress: 30,
    playCount: 8890,
    likeCount: 420,
    saveCount: 210,
    commentCount: 25,
    holderCount: 95,
    supportPoint: 540,
    daysAgo: 3,
  },
  {
    id: "seed-fading-echo",
    artistId: "seed-kuro",
    artistName: "Kuro",
    title: "Fading Echo",
    genre: "Rock",
    description: "余韻が残るオルタナティブロック",
    currentPrice: 76,
    previousPrice: 79,
    progress: 90,
    playCount: 21230,
    likeCount: 610,
    saveCount: 380,
    commentCount: 58,
    holderCount: 170,
    supportPoint: 420,
    daysAgo: 20,
  },
  {
    id: "seed-new-dawn",
    artistId: "seed-beatlover",
    artistName: "BeatLover",
    title: "New Dawn",
    genre: "EDM",
    description: "夜明けの高揚感を詰め込んだビート",
    currentPrice: 62,
    previousPrice: 64,
    progress: 55,
    playCount: 12400,
    likeCount: 380,
    saveCount: 220,
    commentCount: 30,
    holderCount: 110,
    supportPoint: 620,
    daysAgo: 8,
  },
  {
    id: "seed-ocean-eyes",
    artistId: "seed-riku",
    artistName: "Riku",
    title: "Ocean Eyes",
    genre: "Lo-fi",
    description: "波の音と混ざるチルアウトトラック",
    currentPrice: 45,
    previousPrice: 48,
    progress: 40,
    playCount: 6320,
    likeCount: 290,
    saveCount: 150,
    commentCount: 18,
    holderCount: 70,
    supportPoint: 350,
    daysAgo: 12,
  },
  {
    id: "seed-midnight-city",
    artistId: "seed-neon-owl",
    artistName: "Neon Owl",
    title: "Midnight City",
    genre: "EDM",
    description: "真夜中の都市を駆けるシンセウェイヴ",
    currentPrice: 39,
    previousPrice: 43,
    progress: 70,
    playCount: 5210,
    likeCount: 210,
    saveCount: 120,
    commentCount: 12,
    holderCount: 55,
    supportPoint: 310,
    daysAgo: 15,
  },
];

function buildPriceHistory(song) {
  const points = [];
  const days = 14;
  const start = Math.max(20, Math.round(song.currentPrice * 0.6));

  for (let i = days; i >= 0; i -= 1) {
    const t = (days - i) / days;
    const base = start + (song.currentPrice - start) * t;
    const wobble = Math.sin(i * 1.7 + song.title.length) * song.currentPrice * 0.04;
    const price = i === 0 ? song.currentPrice : Math.max(1, Math.round(base + wobble));
    points.push({
      price,
      recordedAt: Timestamp.fromDate(new Date(Date.now() - i * DAY_MS)),
    });
  }

  return points;
}

async function main() {
  console.log("Seeding artists...");
  for (const artist of artists) {
    await setDoc(doc(db, "artists", artist.id), {
      userId: `seed-user-${artist.id}`,
      artistName: artist.artistName,
      profile: artist.profile,
      genres: artist.genres,
      snsLink: "",
      totalSupportPoint: 0,
      weeklySupportPoint: 0,
      followerCount: Math.floor(Math.random() * 3000) + 100,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log(`  artist: ${artist.artistName}`);
  }

  console.log("Seeding songs...");
  for (const song of songs) {
    const { id, daysAgo, ...rest } = song;
    await setDoc(doc(db, "songs", id), {
      ...rest,
      audioUrl: "",
      jacketUrl: "",
      initialPrice: 100,
      status: "public",
      createdAt: Timestamp.fromDate(new Date(Date.now() - daysAgo * DAY_MS)),
      updatedAt: serverTimestamp(),
    });
    console.log(`  song: ${song.title}`);
  }

  console.log("Seeding price histories...");
  for (const song of songs) {
    const existing = await getDocs(
      query(collection(db, "priceHistories"), where("songId", "==", song.id)),
    );
    if (!existing.empty) {
      console.log(`  skip (already exists): ${song.title}`);
      continue;
    }

    const histories = buildPriceHistory(song);
    for (const history of histories) {
      await setDoc(doc(collection(db, "priceHistories")), {
        songId: song.id,
        ...history,
      });
    }
    console.log(`  history: ${song.title} (${histories.length} points)`);
  }

  console.log("Done!");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
