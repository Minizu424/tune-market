import {
  getArtistByUserId,
  getArtistsByWeeklySupport,
} from "@/repositories/artistsRepository";
import { getSongsByArtistId } from "@/repositories/songsRepository";
import type { Artist, Song } from "@/types";

export type ArtistDashboard = {
  artist: Artist;
  songs: Song[];
  weeklyRank: number | null;
  totals: {
    supportPoint: number;
    playCount: number;
    likeCount: number;
    commentCount: number;
    holderCount: number;
    songCount: number;
  };
};

/**
 * アーティストダッシュボード用の集計。
 * 投稿楽曲の合計値と週間応援ランキング順位を返す。
 */
export async function getArtistDashboard(
  userId: string,
): Promise<ArtistDashboard | null> {
  const artist = await getArtistByUserId(userId);
  if (!artist) {
    return null;
  }

  const [songs, rankedArtists] = await Promise.all([
    getSongsByArtistId(artist.id),
    getArtistsByWeeklySupport(100),
  ]);

  const rankIndex = rankedArtists.findIndex((entry) => entry.id === artist.id);
  const weeklyRank = rankIndex >= 0 ? rankIndex + 1 : null;

  const totals = songs.reduce(
    (acc, song) => ({
      supportPoint: acc.supportPoint + (song.supportPoint ?? 0),
      playCount: acc.playCount + (song.playCount ?? 0),
      likeCount: acc.likeCount + (song.likeCount ?? 0),
      commentCount: acc.commentCount + (song.commentCount ?? 0),
      holderCount: acc.holderCount + (song.holderCount ?? 0),
      songCount: acc.songCount + 1,
    }),
    {
      supportPoint: 0,
      playCount: 0,
      likeCount: 0,
      commentCount: 0,
      holderCount: 0,
      songCount: 0,
    },
  );

  return { artist, songs, weeklyRank, totals };
}
