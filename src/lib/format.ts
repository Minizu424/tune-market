/** 1234.5 -> "1,234.5" */
export function formatPoint(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}

/** 0.182 -> "+18.2%" */
export function formatRate(rate: number): string {
  const percent = rate * 100;
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent.toFixed(1)}%`;
}

/** 12.5 -> "+12.5" / -3 -> "-3" */
export function formatSigned(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}`;
}

/** 保有株数 0.5 -> "0.5株" */
export function formatQuantity(quantity: number): string {
  return `${Number(quantity.toFixed(4)).toLocaleString("ja-JP", {
    maximumFractionDigits: 4,
  })}株`;
}
