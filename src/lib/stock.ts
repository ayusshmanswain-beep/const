export type StockLevel = "ok" | "low" | "critical";

export function stockLevel(onHand: number, reorder: number): StockLevel {
  if (reorder <= 0) return "ok";
  if (onHand <= reorder * 0.5) return "critical";
  if (onHand <= reorder) return "low";
  return "ok";
}
