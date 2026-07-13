import { doc, increment, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 楽曲の再生を記録する（一定時間視聴した時点で1再生とカウント）。
 * 再生数は株価更新（updateSongPrices）で価格に反映される。
 */
export async function registerSongPlay(songId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "songs", songId), {
      playCount: increment(1),
    });
  } catch (error) {
    // 再生記録の失敗は体験を止めない
    console.error("registerSongPlay failed:", error);
  }
}

/**
 * 楽曲の再生時間（秒）を加算する。
 * リールで表示されていた時間・詳細画面で再生していた時間を記録し、
 * 株価更新時に「どれだけ聴かれたか」として価格に反映される。
 */
export async function addSongPlaySeconds(
  songId: string,
  seconds: number,
): Promise<void> {
  const rounded = Math.round(seconds);
  if (rounded <= 0) {
    return;
  }
  try {
    await updateDoc(doc(db, "songs", songId), {
      totalPlaySeconds: increment(rounded),
    });
  } catch (error) {
    console.error("addSongPlaySeconds failed:", error);
  }
}
