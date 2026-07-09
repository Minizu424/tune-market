import { getSupportsSince } from "@/repositories/supportsRepository";
import {
  calculatePriceChangeRate,
  getNewSongs,
  getSongs,
} from "@/repositories/songsRepository";
import type { Song } from "@/types";

export type WeeklyRankingItem = {
  song: Song;
  weeklySupportPoint: number;
  previousWeekSupportPoint: number;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 週間応援ポイントランキング。
 * 直近7日間の supports を楽曲ごとに集計し、前週分（8〜14日前）と比較する。
 */
export async function getWeeklySupportRanking(
  limitCount = 20,
): Promise<WeeklyRankingItem[]> {
  const now = Date.now();
  const [songs, supports] = await Promise.all([
    getSongs(),
    getSupportsSince(new Date(now - 2 * WEEK_MS)),
  ]);

  const thisWeek = new Map<string, number>();
  const lastWeek = new Map<string, number>();

  for (const support of supports) {
    const createdAt = support.createdAt?.toMillis() ?? 0;
    if (createdAt >= now - WEEK_MS) {
      thisWeek.set(support.songId, (thisWeek.get(support.songId) ?? 0) + support.point);
    } else {
      lastWeek.set(support.songId, (lastWeek.get(support.songId) ?? 0) + support.point);
    }
  }

  return songs
    .map((song) => ({
      song,
      weeklySupportPoint: thisWeek.get(song.id) ?? 0,
      previousWeekSupportPoint: lastWeek.get(song.id) ?? 0,
    }))
    .sort((a, b) => {
      if (b.weeklySupportPoint !== a.weeklySupportPoint) {
        return b.weeklySupportPoint - a.weeklySupportPoint;
      }
      return b.song.supportPoint - a.song.supportPoint;
    })
    .slice(0, limitCount);
}

/** 急上昇ランキング（前回更新比の価格上昇率順） */
export async function getTrendingRanking(limitCount = 20): Promise<Song[]> {
  const songs = await getSongs();
  return songs
    .sort((a, b) => calculatePriceChangeRate(b) - calculatePriceChangeRate(a))
    .slice(0, limitCount);
}

/** 新規上場ランキング（投稿日時の新しい順） */
export async function getNewListingRanking(limitCount = 20): Promise<Song[]> {
  return getNewSongs(limitCount);
}

/** ジャンル別ランキング（応援ポイント順） */
export async function getGenreRanking(
  genre: string,
  limitCount = 20,
): Promise<Song[]> {
  const songs = await getSongs();
  return songs
    .filter((song) => song.genre === genre)
    .sort((a, b) => b.supportPoint - a.supportPoint)
    .slice(0, limitCount);
}
