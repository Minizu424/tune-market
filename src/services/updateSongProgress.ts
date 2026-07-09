import { addProgressUpdate } from "@/repositories/progressUpdatesRepository";
import { updateSong } from "@/repositories/songsRepository";

export type UpdateSongProgressInput = {
  songId: string;
  artistId: string;
  progress: number;
  comment: string;
};

/**
 * 制作進捗を更新する。
 * songs.progress を更新し、progressUpdates に履歴を保存する。
 */
export async function updateSongProgress(
  input: UpdateSongProgressInput,
): Promise<void> {
  const progress = Math.max(0, Math.min(100, Math.round(input.progress)));

  await updateSong(input.songId, { progress });
  await addProgressUpdate({
    songId: input.songId,
    artistId: input.artistId,
    progress,
    comment: input.comment,
  });
}
