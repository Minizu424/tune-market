import {
  addDoc,
  collection,
  getDocs,
  limit,
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
  // where + orderBy の複合インデックスを避けるため、並び替えはクライアント側で行う
  const updatesQuery = query(
    collection(db, PROGRESS_UPDATES_COLLECTION),
    where("songId", "==", songId),
    limit(limitCount),
  );
  const snapshot = await getDocs(updatesQuery);

  const updates = snapshot.docs.map((updateDoc) => ({
    id: updateDoc.id,
    ...updateDoc.data(),
  })) as ProgressUpdate[];

  return updates.sort(
    (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
  );
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
