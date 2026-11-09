// ==============================================================================
// COMPANY MODULE TYPES & SCHEMAS
// ==============================================================================

import { z } from "zod";
import { PaginationQuerySchema } from "../../core/response/pagination";

export const UpdateCompanySchema = z.object({
  legalName: z.string().min(2).max(255).optional(),
  tradeName: z.string().max(255).optional(),
  taxId: z.string().max(50).optional(),
  phone: z.string().max(30).optional(),
  website: z.string().url().optional(),
  timezone: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
});

export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;

export const CreateBranchSchema = z.object({
  code: z.string().min(2).max(50).regex(/^[A-Z0-9_-]+$/, "Branch code must be uppercase alphanumeric"),
  name: z.string().min(2).max(255),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  addressLine1: z.string().min(5),
  addressLine2: z.string().optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  country: z.string().default("India"),
  postalCode: z.string().min(4).max(20),
  isHeadquarters: z.boolean().default(false),
});

export type CreateBranchInput = z.infer<typeof CreateBranchSchema>;

export const QueryCompaniesSchema = PaginationQuerySchema;
export type QueryCompaniesParams = z.infer<typeof QueryCompaniesSchema>;
