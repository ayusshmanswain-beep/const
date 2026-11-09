// ==============================================================================
// CONSTRUCT360 PAGINATION, SORTING & FILTERING CONTRACTS
// ==============================================================================

import { z } from "zod";

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationParams = z.infer<typeof PaginationQuerySchema>;

export interface PaginationMeta {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function parsePaginationParams(urlOrSearch: URL | URLSearchParams | Record<string, string | undefined>): PaginationParams {
  let entries: Record<string, unknown> = {};

  if (urlOrSearch instanceof URL) {
    entries = Object.fromEntries(urlOrSearch.searchParams.entries());
  } else if (urlOrSearch instanceof URLSearchParams) {
    entries = Object.fromEntries(urlOrSearch.entries());
  } else {
    entries = { ...urlOrSearch };
  }

  const result = PaginationQuerySchema.safeParse(entries);
  if (!result.success) {
    return { page: 1, limit: 20, sortOrder: "desc" };
  }
  return result.data;
}

export function createPaginationMeta(page: number, limit: number, totalRecords: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
  return {
    page,
    limit,
    totalRecords,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
