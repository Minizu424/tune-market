import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Song } from "@/types";

const SONGS_COLLECTION = "songs";

export async function getSongs(): Promise<Song[]> {
  const songsRef = collection(db, SONGS_COLLECTION);
  const snapshot = await getDocs(songsRef);

  return snapshot.docs.map((songDoc) => ({
    id: songDoc.id,
    ...songDoc.data(),
  })) as Song[];
}

export async function getSongById(songId: string): Promise<Song | null> {
  const songRef = doc(db, SONGS_COLLECTION, songId);
  const songSnap = await getDoc(songRef);

  if (!songSnap.exists()) {
    return null;
  }

  return { id: songSnap.id, ...songSnap.data() } as Song;
}
