import { z } from "zod";

/** Anchor for the development dataset. Not the live site clock. */
export const DATASET_TODAY = "2026-11-09";

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a full calendar date.");

export const rangeSchema = z
  .object({
    from: dateSchema,
    to: dateSchema,
  })
  .refine((value) => value.from <= value.to, {
    message: "Start date must be on or before the end date.",
    path: ["from"],
  });

export type DateRange = z.infer<typeof rangeSchema>;

function parseUtc(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(iso: string, days: number) {
  const date = parseUtc(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function presetRange(preset: "today" | "7d" | "30d" | "month"): DateRange {
  if (preset === "today") return { from: DATASET_TODAY, to: DATASET_TODAY };
  if (preset === "7d") return { from: addDays(DATASET_TODAY, -6), to: DATASET_TODAY };
  if (preset === "30d") return { from: addDays(DATASET_TODAY, -29), to: DATASET_TODAY };
  return { from: `${DATASET_TODAY.slice(0, 8)}01`, to: DATASET_TODAY };
}

export function inRange(iso: string, from: string, to: string) {
  const day = iso.slice(0, 10);
  return day >= from && day <= to;
}
