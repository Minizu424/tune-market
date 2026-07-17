import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Song, SongStatus } from "@/types";

const SONGS_COLLECTION = "songs";

export type CreateSongInput = {
  artistId: string;
  artistName: string;
  title: string;
  genre: string;
  tags: string[];
  description: string;
  audioUrl: string;
  jacketUrl: string;
  initialPrice: number;
  progress: number;
  status: SongStatus;
};

function mapSongs(snapshotDocs: { id: string; data: () => unknown }[]): Song[] {
  return snapshotDocs.map((songDoc) => ({
    id: songDoc.id,
    ...(songDoc.data() as object),
  })) as Song[];
}

export async function getSongs(): Promise<Song[]> {
  const songsQuery = query(
    collection(db, SONGS_COLLECTION),
    where("status", "==", "public"),
  );
  const snapshot = await getDocs(songsQuery);
  return mapSongs(snapshot.docs);
}

export async function getSongById(songId: string): Promise<Song | null> {
  const songRef = doc(db, SONGS_COLLECTION, songId);
  const songSnap = await getDoc(songRef);

  if (!songSnap.exists()) {
    return null;
  }

  return { id: songSnap.id, ...songSnap.data() } as Song;
}

export async function getSongsByGenre(genre: string): Promise<Song[]> {
  const songsQuery = query(
    collection(db, SONGS_COLLECTION),
    where("status", "==", "public"),
    where("genre", "==", genre),
  );
  const snapshot = await getDocs(songsQuery);
  return mapSongs(snapshot.docs);
}

export async function getSongsByArtistId(artistId: string): Promise<Song[]> {
  const songsQuery = query(
    collection(db, SONGS_COLLECTION),
    where("artistId", "==", artistId),
  );
  const snapshot = await getDocs(songsQuery);

  const songs = mapSongs(snapshot.docs);
  return songs.sort((a, b) => {
    const aTime = a.createdAt?.toMillis() ?? 0;
    const bTime = b.createdAt?.toMillis() ?? 0;
    return bTime - aTime;
  });
}

export async function getNewSongs(limitCount = 10): Promise<Song[]> {
  const songsQuery = query(
    collection(db, SONGS_COLLECTION),
    where("status", "==", "public"),
    orderBy("createdAt", "desc"),
    limit(limitCount),
  );
  const snapshot = await getDocs(songsQuery);
  return mapSongs(snapshot.docs);
}

export function calculatePriceChangeRate(song: Song): number {
  if (!song.previousPrice) {
    return 0;
  }
  return (song.currentPrice - song.previousPrice) / song.previousPrice;
}

export async function getTrendingSongs(limitCount = 10): Promise<Song[]> {
  const songs = await getSongs();
  return songs
    .sort((a, b) => calculatePriceChangeRate(b) - calculatePriceChangeRate(a))
    .slice(0, limitCount);
}

export async function createSong(input: CreateSongInput): Promise<string> {
  const songRef = doc(collection(db, SONGS_COLLECTION));

  await setDoc(songRef, {
    artistId: input.artistId,
    artistName: input.artistName,
    title: input.title,
    genre: input.genre,
    tags: input.tags,
    description: input.description,
    audioUrl: input.audioUrl,
    jacketUrl: input.jacketUrl,
    currentPrice: input.initialPrice,
    previousPrice: input.initialPrice,
    initialPrice: input.initialPrice,
    progress: input.progress,
    status: input.status,
    playCount: 0,
    likeCount: 0,
    saveCount: 0,
    commentCount: 0,
    holderCount: 0,
    supportPoint: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return songRef.id;
}

export async function updateSong(
  songId: string,
  data: Partial<
    Pick<
      Song,
      | "title"
      | "genre"
      | "tags"
      | "description"
      | "audioUrl"
      | "jacketUrl"
      | "progress"
      | "status"
    >
  >,
): Promise<void> {
  const songRef = doc(db, SONGS_COLLECTION, songId);
  await updateDoc(songRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
