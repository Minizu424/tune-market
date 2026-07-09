import { getUserHoldings } from "@/repositories/holdingsRepository";
import { getSongById } from "@/repositories/songsRepository";
import { getUserProfile } from "@/repositories/usersRepository";
import type { Holding, Song } from "@/types";

export type PortfolioItem = {
  holding: Holding;
  song: Song;
  currentValue: number;
  acquisitionCost: number;
  profitLoss: number;
  profitLossRate: number;
  todayChange: number;
};

export type PortfolioSummary = {
  pointBalance: number;
  holdingsValue: number;
  totalAssets: number;
  totalProfitLoss: number;
  todayChange: number;
  items: PortfolioItem[];
};

/**
 * ポートフォリオ集計。
 * holdings と songs を結合し、評価額・損益・本日の増減を計算する。
 */
export async function getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
  const [user, holdings] = await Promise.all([
    getUserProfile(userId),
    getUserHoldings(userId),
  ]);

  const songs = await Promise.all(
    holdings.map((holding) => getSongById(holding.songId)),
  );

  const items: PortfolioItem[] = [];

  holdings.forEach((holding, index) => {
    const song = songs[index];
    if (!song) {
      return;
    }

    const currentValue = holding.quantity * song.currentPrice;
    const acquisitionCost = holding.quantity * holding.averagePrice;
    const profitLoss = currentValue - acquisitionCost;
    const profitLossRate =
      acquisitionCost > 0 ? profitLoss / acquisitionCost : 0;
    const todayChange =
      holding.quantity * (song.currentPrice - song.previousPrice);

    items.push({
      holding,
      song,
      currentValue,
      acquisitionCost,
      profitLoss,
      profitLossRate,
      todayChange,
    });
  });

  items.sort((a, b) => b.currentValue - a.currentValue);

  const holdingsValue = items.reduce((sum, item) => sum + item.currentValue, 0);
  const totalProfitLoss = items.reduce((sum, item) => sum + item.profitLoss, 0);
  const todayChange = items.reduce((sum, item) => sum + item.todayChange, 0);
  const pointBalance = user?.pointBalance ?? 0;

  return {
    pointBalance,
    holdingsValue,
    totalAssets: pointBalance + holdingsValue,
    totalProfitLoss,
    todayChange,
    items,
  };
}
