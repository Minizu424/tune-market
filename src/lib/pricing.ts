/**
 * 売買による価格インパクト（需給モデル）。
 *
 * これまでの価格は updateSongPrices（再生数・いいね数などの統計）だけで決まっていたため、
 * 「株を買っても価格が動かない」「1pt買っても10,000pt買っても影響が同じ」という問題があった。
 * ここでは売買そのものが価格を動かす簡易的なボンディングカーブを定義する。
 *
 *     変動率 = 取引額 / (板の厚み + 取引額)
 *
 * - 取引額が大きいほど大きく動く（大口が意味を持つ）
 * - 変動率は 1 に漸近するので、いくら大きく買っても価格は発散しない
 * - さらに1回あたり MAX_TRADE_IMPACT で頭打ちにする
 *
 * TODO(本番公開まで):
 *   この計算はクライアント上で実行されており改竄可能。Cloud Functions へ移行すること。
 *   LIQUIDITY_DEPTH は実際の取引量に合わせて引き上げる（下記はデモ用に敏感めの値）。
 */

/** 板の厚み。大きいほど価格が動きにくい。 */
export const LIQUIDITY_DEPTH = 400;

/** 1回の取引での変動上限（±25%） */
export const MAX_TRADE_IMPACT = 0.25;

/** 価格の下限 */
export const MIN_PRICE = 1;

export type TradeSide = "buy" | "sell";

/** 取引額から価格の変動率（0〜MAX_TRADE_IMPACT）を求める。 */
export function calculateTradeImpactRate(tradePoint: number): number {
  if (!Number.isFinite(tradePoint) || tradePoint <= 0) {
    return 0;
  }
  const rate = tradePoint / (LIQUIDITY_DEPTH + tradePoint);
  return Math.min(rate, MAX_TRADE_IMPACT);
}

/** 取引後の価格を求める。買いは上昇、売りは下落。 */
export function applyTradeImpact(
  currentPrice: number,
  tradePoint: number,
  side: TradeSide,
): number {
  const rate = calculateTradeImpactRate(tradePoint);
  const nextPrice =
    side === "buy" ? currentPrice * (1 + rate) : currentPrice * (1 - rate);
  return Math.max(MIN_PRICE, Math.round(nextPrice));
}

export type TradeExecution = {
  /** 平均約定価格（板を食いながら約定するため、取引前価格と取引後価格の中間になる） */
  executionPrice: number;
  /** 取引前の価格 */
  beforePrice: number;
  /** 取引後の価格 */
  afterPrice: number;
};

/**
 * 取引の約定価格と取引後価格をまとめて求める。
 *
 * 約定を「取引前の価格」で行うと、買った直後に売るだけで確実に儲かる
 * 無リスクの裁定が成立してしまう（買いで価格が上がった分をそのまま売り抜けられるため）。
 * 実際の板取引と同じように、価格を押し上げながら約定していく平均価格を使うことで、
 * 往復の売買にはコスト（スプレッド）がかかるようにする。
 *
 * @param currentPrice 取引前の価格
 * @param notionalPoint 取引の規模（買いは購入pt、売りは取引前価格での概算売却額）
 */
export function executeTrade(
  currentPrice: number,
  notionalPoint: number,
  side: TradeSide,
): TradeExecution {
  const rate = calculateTradeImpactRate(notionalPoint);
  const rawAfter =
    side === "buy" ? currentPrice * (1 + rate) : currentPrice * (1 - rate);
  const afterPrice = Math.max(MIN_PRICE, Math.round(rawAfter));
  const executionPrice = Math.max(
    MIN_PRICE,
    Number(((currentPrice + rawAfter) / 2).toFixed(2)),
  );

  return { executionPrice, beforePrice: currentPrice, afterPrice };
}
