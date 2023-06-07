export function sumProfit({
  income,
  consumption,
}: {
  income: number;
  consumption: number;
}): number {
  return income - consumption;
}

export function sumProfitPercent({
  profit,
  income,
}: {
  profit: number;
  income: number;
}): number {
  return (profit / (income || 1)) * 100;
}
