// ==============================================================================
// FILE MANAGEMENT MODULE TYPES & SCHEMAS
// ==============================================================================

import { z } from "zod";
import { PaginationQuerySchema } from "../../core/response/pagination";

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "application/x-dwg",
  "application/octet-stream", // for CAD / BIM formats (.dwg, .ifc, .rvt)
] as const;

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

export const DocumentCategoryEnum = z.enum([
  "ARCHITECTURAL_DRAWING",
  "STRUCTURAL_DRAWING",
  "BIM_MODEL",
  "CONTRACT",
  "PERMIT",
  "SAFETY_CERTIFICATE",
  "INVOICE_COPY",
  "OTHER",
]);

export const InitiateUploadSchema = z.object({
  category: DocumentCategoryEnum.default("OTHER"),
  documentCode: z.string().trim().min(2).max(100),
  title: z.string().trim().min(2).max(255),
  description: z.string().max(1000).optional(),
  fileName: z.string().trim().min(1).max(255),
  fileSizeBytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES, "Maximum file upload limit is 100MB"),
  mimeType: z.string().refine((val) => ALLOWED_MIME_TYPES.includes(val as (typeof ALLOWED_MIME_TYPES)[number]), {
    message: "Unsupported file type",
  }),
  checksumSha256: z.string().length(64, { message: "Checksum must be 64-character SHA-256 hex string" }),
  projectId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
});

export type InitiateUploadInput = z.infer<typeof InitiateUploadSchema>;

export const CreateVersionSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  fileSizeBytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
  checksumSha256: z.string().length(64),
  changeSummary: z.string().max(1000).optional(),
});

export type CreateVersionInput = z.infer<typeof CreateVersionSchema>;

export const QueryDocumentsSchema = PaginationQuerySchema.extend({
  category: DocumentCategoryEnum.optional(),
  projectId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
});

export type QueryDocumentsParams = z.infer<typeof QueryDocumentsSchema>;
