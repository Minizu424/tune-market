/**
 * 発表デモ用データ再構築スクリプト
 *
 * 目的:
 *   株価更新ボタンの連打で seed 楽曲が軒並み初期価格(100pt)割れしていたため、
 *   「市場が生きて見える」状態に作り直す。
 *
 * 実行方法:
 *   node scripts/seed-demo.mjs
 *
 *   Firestore のセキュリティルールを適用済みの場合は、ログインが必要:
 *   SEED_EMAIL=xxx@example.com SEED_PASSWORD=xxxxxx node scripts/seed-demo.mjs
 *
 * 触るもの:
 *   - songs/seed-*        価格・統計・pricingSnapshot を作り直す
 *   - artists/seed-*      応援ポイントを作り直す
 *   - priceHistories      seed 楽曲ぶんを「既存の最新より後」の時刻で30点追加する
 *                         （ルール上クライアントから削除できないため、追記で上書きする）
 *   - supports            直近7日の週間ランキング順を固定するために追加する
 *
 * 触らないもの:
 *   - 実際に投稿された楽曲（団子・ピエロ）
 *   - users / holdings / transactions
 */
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  Timestamp,
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
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
const auth = getAuth(app);

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

// ---------------------------------------------------------------------------
// 価格系列の生成
// ---------------------------------------------------------------------------

/** 決定論的な擬似乱数（実行のたびに同じデータになるようにする） */
function makeRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * startPrice から endPrice まで、shape に沿った30点の価格系列を作る。
 * 最後の点は必ず endPrice になる。
 */
function buildPriceSeries(startPrice, endPrice, shape, seed, points = 30) {
  const random = makeRandom(seed);
  const series = [];

  for (let i = 0; i < points; i += 1) {
    const t = i / (points - 1);
    let base;

    switch (shape) {
      case "up":
        base = startPrice + (endPrice - startPrice) * Math.pow(t, 0.8);
        break;
      case "down":
        base = startPrice + (endPrice - startPrice) * Math.pow(t, 0.7);
        break;
      case "spike":
        // 終盤で一気に伸びる（新星タイプ）
        base = startPrice + (endPrice - startPrice) * Math.pow(t, 2.6);
        break;
      case "dip":
        // 一度下げてから戻す
        base =
          startPrice +
          (endPrice - startPrice) * t -
          (startPrice * 0.22) * Math.sin(Math.PI * t);
        break;
      case "flat":
      default:
        base = startPrice + (endPrice - startPrice) * t;
        break;
    }

    const noise = shape === "flat" ? 0.016 : 0.028;
    const jitter = 1 + (random() - 0.5) * 2 * noise;
    series.push(Math.max(1, Math.round(base * jitter)));
  }

  series[0] = startPrice;
  series[points - 1] = endPrice;
  return series;
}

// ---------------------------------------------------------------------------
// デモ用の市場設計
// ---------------------------------------------------------------------------
// weeklySupport がリールの表示順（週間応援ランキング順）を決める。
// 先頭に来る Night Drive をデモの主役にする想定。

const artists = [
  { id: "seed-taro-beats", name: "Taro Beats", bio: "夜の街を走るビートを作っています。" },
  { id: "seed-mio", name: "Mio", bio: "星空みたいなエレクトロニカ。" },
  { id: "seed-luna", name: "Luna", bio: "帰り道に似合うポップスを。" },
  { id: "seed-riku", name: "Riku", bio: "波の音とチルアウト。" },
  { id: "seed-kuro", name: "Kuro", bio: "余韻の残るオルタナ。" },
  { id: "seed-beatlover", name: "BeatLover", bio: "朝いちばんのダンスミュージック。" },
  { id: "seed-azuki", name: "azuki", bio: "作業用のループを量産中。" },
  { id: "seed-neon-owl", name: "Neon Owl", bio: "深夜のシンセウェイヴ。" },
];

const songs = [
  {
    id: "seed-night-drive",
    artistId: "seed-taro-beats",
    artistName: "Taro Beats",
    title: "Night Drive",
    genre: "Lo-fi",
    tags: ["夜ドライブ", "チル", "作業用"],
    description: "夜の街を走るようなチル系ビート",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    jacketUrl: "https://picsum.photos/seed/seed-night-drive/600/600",
    progress: 65,
    ageDays: 38,
    startPrice: 100,
    endPrice: 124,
    prevPrice: 119,
    shape: "up",
    weeklySupport: 1280,
    lastWeekSupport: 940,
    stats: { playCount: 48224, likeCount: 1245, commentCount: 96, saveCount: 830, holderCount: 320, totalPlaySeconds: 675 },
  },
  {
    id: "seed-starlight",
    artistId: "seed-mio",
    artistName: "Mio",
    title: "Starlight",
    genre: "EDM",
    tags: ["星空", "ダンス", "夜に聴きたい"],
    description: "星空の下で踊りたくなるエレクトロニカ",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    jacketUrl: "https://picsum.photos/seed/seed-starlight/600/600",
    progress: 45,
    ageDays: 13,
    startPrice: 100,
    endPrice: 187,
    prevPrice: 168,
    shape: "spike",
    weeklySupport: 980,
    lastWeekSupport: 240,
    stats: { playCount: 15024, likeCount: 560, commentCount: 41, saveCount: 320, holderCount: 140, totalPlaySeconds: 412 },
  },
  {
    id: "seed-sunset-walk",
    artistId: "seed-luna",
    artistName: "Luna",
    title: "Sunset Walk",
    genre: "Pop",
    tags: ["夕方", "散歩", "ポップス"],
    description: "夕暮れの帰り道を彩るポップチューン",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    jacketUrl: "https://picsum.photos/seed/seed-sunset-walk/600/600",
    progress: 80,
    ageDays: 33,
    startPrice: 100,
    endPrice: 141,
    prevPrice: 136,
    shape: "up",
    weeklySupport: 860,
    lastWeekSupport: 720,
    stats: { playCount: 38445, likeCount: 980, commentCount: 74, saveCount: 640, holderCount: 250, totalPlaySeconds: 588 },
  },
  {
    id: "seed-ocean-eyes",
    artistId: "seed-riku",
    artistName: "Riku",
    title: "Ocean Eyes",
    genre: "Lo-fi",
    tags: ["海", "チル", "旅"],
    description: "波の音と混ざるチルアウトトラック",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    jacketUrl: "https://picsum.photos/seed/seed-ocean-eyes/600/600",
    progress: 40,
    ageDays: 20,
    startPrice: 100,
    endPrice: 112,
    prevPrice: 104,
    shape: "dip",
    weeklySupport: 640,
    lastWeekSupport: 610,
    stats: { playCount: 6320, likeCount: 290, commentCount: 18, saveCount: 150, holderCount: 70, totalPlaySeconds: 233 },
  },
  {
    id: "seed-fading-echo",
    artistId: "seed-kuro",
    artistName: "Kuro",
    title: "Fading Echo",
    genre: "Rock",
    tags: ["バンド", "エモ", "夜に聴きたい"],
    description: "余韻が残るオルタナティブロック",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    jacketUrl: "https://picsum.photos/seed/seed-fading-echo/600/600",
    progress: 90,
    ageDays: 28,
    startPrice: 100,
    endPrice: 103,
    prevPrice: 104,
    shape: "flat",
    weeklySupport: 520,
    lastWeekSupport: 500,
    stats: { playCount: 21233, likeCount: 610, commentCount: 58, saveCount: 380, holderCount: 170, totalPlaySeconds: 355 },
  },
  {
    id: "seed-new-dawn",
    artistId: "seed-beatlover",
    artistName: "BeatLover",
    title: "New Dawn",
    genre: "EDM",
    tags: ["朝", "ダンス", "前向き"],
    description: "夜明けの高揚感を詰め込んだビート",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    jacketUrl: "https://picsum.photos/seed/seed-new-dawn/600/600",
    progress: 55,
    ageDays: 16,
    startPrice: 100,
    endPrice: 96,
    prevPrice: 91,
    shape: "dip",
    weeklySupport: 430,
    lastWeekSupport: 480,
    stats: { playCount: 12402, likeCount: 380, commentCount: 30, saveCount: 220, holderCount: 110, totalPlaySeconds: 298 },
  },
  {
    id: "seed-color-loop",
    artistId: "seed-azuki",
    artistName: "azuki",
    title: "Color Loop",
    genre: "Pop",
    tags: ["ループ", "カラフル", "作業用"],
    description: "カラフルに繰り返すループミュージック",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    jacketUrl: "https://picsum.photos/seed/seed-color-loop/600/600",
    progress: 30,
    ageDays: 11,
    startPrice: 100,
    endPrice: 78,
    prevPrice: 81,
    shape: "down",
    weeklySupport: 260,
    lastWeekSupport: 350,
    stats: { playCount: 8892, likeCount: 420, commentCount: 25, saveCount: 210, holderCount: 95, totalPlaySeconds: 187 },
  },
  {
    id: "seed-midnight-city",
    artistId: "seed-neon-owl",
    artistName: "Neon Owl",
    title: "Midnight City",
    genre: "EDM",
    tags: ["夜", "シンセウェイヴ", "都会"],
    description: "真夜中の都市を駆けるシンセウェイヴ",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    jacketUrl: "https://picsum.photos/seed/seed-midnight-city/600/600",
    progress: 70,
    ageDays: 23,
    startPrice: 100,
    endPrice: 62,
    prevPrice: 66,
    shape: "down",
    weeklySupport: 150,
    lastWeekSupport: 320,
    stats: { playCount: 5212, likeCount: 210, commentCount: 12, saveCount: 120, holderCount: 55, totalPlaySeconds: 141 },
  },
];

// ---------------------------------------------------------------------------

async function latestHistoryMillis(songId) {
  const snapshot = await getDocs(
    query(
      collection(db, "priceHistories"),
      where("songId", "==", songId),
      orderBy("recordedAt", "desc"),
      limit(1),
    ),
  );
  if (snapshot.empty) {
    return null;
  }
  return snapshot.docs[0].data().recordedAt?.toMillis() ?? null;
}

async function main() {
  const email = process.env.SEED_EMAIL;
  const password = process.env.SEED_PASSWORD;
  let uid = "seed-supporter";

  if (email && password) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    uid = credential.user.uid;
    console.log(`ログインしました: ${email}`);
  } else {
    console.log("※ 未ログインで実行します（セキュリティルール未適用の場合のみ通ります）");
  }

  const now = Date.now();

  // --- artists ---
  const artistBatch = writeBatch(db);
  for (const artist of artists) {
    const totals = songs
      .filter((song) => song.artistId === artist.id)
      .reduce(
        (acc, song) => ({
          weekly: acc.weekly + song.weeklySupport,
          total: acc.total + song.weeklySupport + song.lastWeekSupport,
        }),
        { weekly: 0, total: 0 },
      );

    artistBatch.set(doc(db, "artists", artist.id), {
      userId: `${artist.id}-user`,
      name: artist.name,
      bio: artist.bio,
      weeklySupportPoint: totals.weekly,
      totalSupportPoint: totals.total,
      createdAt: Timestamp.fromMillis(now - 60 * DAY_MS),
      updatedAt: Timestamp.fromMillis(now),
    });
  }
  await artistBatch.commit();
  console.log(`artists: ${artists.length}件`);

  // --- songs ---
  const songBatch = writeBatch(db);
  for (const song of songs) {
    songBatch.set(doc(db, "songs", song.id), {
      artistId: song.artistId,
      artistName: song.artistName,
      title: song.title,
      genre: song.genre,
      tags: song.tags,
      description: song.description,
      audioUrl: song.audioUrl,
      jacketUrl: song.jacketUrl,
      status: "public",
      progress: song.progress,
      initialPrice: 100,
      previousPrice: song.prevPrice,
      currentPrice: song.endPrice,
      supportPoint: song.weeklySupport + song.lastWeekSupport,
      ...song.stats,
      // 次回のバッチ更新でいきなり大きく動かないよう、現在値をスナップショットにしておく
      pricingSnapshot: {
        playCount: song.stats.playCount,
        supportPoint: song.weeklySupport + song.lastWeekSupport,
        holderCount: song.stats.holderCount,
        totalPlaySeconds: song.stats.totalPlaySeconds,
        likeCount: song.stats.likeCount,
        commentCount: song.stats.commentCount,
      },
      createdAt: Timestamp.fromMillis(now - song.ageDays * DAY_MS),
      updatedAt: Timestamp.fromMillis(now),
    });
  }
  await songBatch.commit();
  console.log(`songs: ${songs.length}件`);

  // --- priceHistories ---
  // 既存の履歴はルール上クライアントから削除できないため、
  // 「既存の最新より後」の時刻で新しい系列を書き、実質的に上書きする。
  let historyCount = 0;
  for (const song of songs) {
    const latest = await latestHistoryMillis(song.id);
    const startAt = (latest ?? now - 30 * DAY_MS) + MINUTE_MS;
    const series = buildPriceSeries(
      song.startPrice,
      song.endPrice,
      song.shape,
      song.id.length * 7919,
    );

    const batch = writeBatch(db);
    series.forEach((price, index) => {
      batch.set(doc(collection(db, "priceHistories")), {
        songId: song.id,
        price,
        source: "seed",
        recordedAt: Timestamp.fromMillis(startAt + index * MINUTE_MS),
      });
    });
    await batch.commit();
    historyCount += series.length;

    console.log(
      `  ${song.title.padEnd(14)} ${String(song.startPrice).padStart(3)} → ${String(song.endPrice).padStart(3)}pt  [${song.shape}]  ${series.join(",")}`,
    );
  }
  console.log(`priceHistories: ${historyCount}件を追加`);

  // --- supports ---
  // リールの並び（週間応援ランキング）を確定させるため、直近7日ぶんを入れる。
  const supportBatch = writeBatch(db);
  let supportCount = 0;
  for (const song of songs) {
    const thisWeekChunks = 4;
    for (let i = 0; i < thisWeekChunks; i += 1) {
      supportBatch.set(doc(collection(db, "supports")), {
        userId: uid,
        songId: song.id,
        artistId: song.artistId,
        point: Math.round(song.weeklySupport / thisWeekChunks),
        createdAt: Timestamp.fromMillis(now - (i + 1) * DAY_MS),
      });
      supportCount += 1;
    }
    supportBatch.set(doc(collection(db, "supports")), {
      userId: uid,
      songId: song.id,
      artistId: song.artistId,
      point: song.lastWeekSupport,
      createdAt: Timestamp.fromMillis(now - 10 * DAY_MS),
    });
    supportCount += 1;
  }
  await supportBatch.commit();
  console.log(`supports: ${supportCount}件を追加`);

  // --- 株主投票（デモ用に1件） ---
  // 主役の Night Drive に、株主だけが投票できる設問を用意する。
  const pollSongId = "seed-night-drive";
  const pollRef = doc(collection(db, "songs", pollSongId, "polls"));
  await setDoc(pollRef, {
    songId: pollSongId,
    artistId: "seed-taro-beats",
    question: "次のジャケット、どっちがいい？",
    options: [
      { id: "option-1", label: "夜の街バージョン", voteWeight: 18.42, voterCount: 12 },
      { id: "option-2", label: "海バージョン", voteWeight: 11.07, voterCount: 9 },
    ],
    status: "open",
    totalVoteWeight: 29.49,
    totalVoterCount: 21,
    createdAt: Timestamp.fromMillis(now - 2 * DAY_MS),
    updatedAt: Timestamp.fromMillis(now - 2 * DAY_MS),
  });
  console.log("polls: Night Drive に株主投票を1件作成");

  console.log("\n完了。リールの表示順は次のようになります:");
  songs
    .slice()
    .sort((a, b) => b.weeklySupport - a.weeklySupport)
    .forEach((song, index) => {
      console.log(`  ${index + 1}. ${song.title}（${song.endPrice}pt / 週間${song.weeklySupport}pt）`);
    });
  console.log("\n※ 実データの「団子」「ピエロ」は変更していません。");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
