import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ProgressUpdate } from "@/types";

const PROGRESS_UPDATES_COLLECTION = "progressUpdates";

export async function getProgressUpdates(
  songId: string,
  limitCount = 30,
): Promise<ProgressUpdate[]> {
  const updatesQuery = query(
    collection(db, PROGRESS_UPDATES_COLLECTION),
    where("songId", "==", songId),
    orderBy("createdAt", "desc"),
    limit(limitCount),
  );
  const snapshot = await getDocs(updatesQuery);

  return snapshot.docs.map((updateDoc) => ({
    id: updateDoc.id,
    ...updateDoc.data(),
  })) as ProgressUpdate[];
}

export async function addProgressUpdate(input: {
  songId: string;
  artistId: string;
  progress: number;
  comment: string;
}): Promise<void> {
  await addDoc(collection(db, PROGRESS_UPDATES_COLLECTION), {
    ...input,
    createdAt: serverTimestamp(),
  });
}
