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
import type { Artist } from "@/types";

const ARTISTS_COLLECTION = "artists";

export type CreateArtistInput = {
  userId: string;
  artistName: string;
  profile: string;
  genres: string[];
  snsLink: string;
};

export async function getArtistById(artistId: string): Promise<Artist | null> {
  const artistRef = doc(db, ARTISTS_COLLECTION, artistId);
  const artistSnap = await getDoc(artistRef);

  if (!artistSnap.exists()) {
    return null;
  }

  return { id: artistSnap.id, ...artistSnap.data() } as Artist;
}

export async function getArtistByUserId(userId: string): Promise<Artist | null> {
  const artistsQuery = query(
    collection(db, ARTISTS_COLLECTION),
    where("userId", "==", userId),
    limit(1),
  );
  const snapshot = await getDocs(artistsQuery);

  if (snapshot.empty) {
    return null;
  }

  const artistDoc = snapshot.docs[0];
  return { id: artistDoc.id, ...artistDoc.data() } as Artist;
}

export async function createArtist(input: CreateArtistInput): Promise<string> {
  const artistRef = doc(collection(db, ARTISTS_COLLECTION));

  await setDoc(artistRef, {
    userId: input.userId,
    artistName: input.artistName,
    profile: input.profile,
    genres: input.genres,
    snsLink: input.snsLink,
    totalSupportPoint: 0,
    weeklySupportPoint: 0,
    followerCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return artistRef.id;
}

export async function updateArtist(
  artistId: string,
  data: Partial<Pick<Artist, "artistName" | "profile" | "genres" | "snsLink">>,
): Promise<void> {
  const artistRef = doc(db, ARTISTS_COLLECTION, artistId);
  await updateDoc(artistRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getArtistsByWeeklySupport(limitCount = 50): Promise<Artist[]> {
  const artistsQuery = query(
    collection(db, ARTISTS_COLLECTION),
    orderBy("weeklySupportPoint", "desc"),
    limit(limitCount),
  );
  const snapshot = await getDocs(artistsQuery);

  return snapshot.docs.map((artistDoc) => ({
    id: artistDoc.id,
    ...artistDoc.data(),
  })) as Artist[];
}
