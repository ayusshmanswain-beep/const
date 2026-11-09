// ==============================================================================
// FILE SERVICE
// Upload Authorization, Storage Ticket Issuance & Revision Control
// ==============================================================================

import type { SecurityContext } from "../../auth/context";
import { requirePermission, requireProjectAccess, requireTenant } from "../../auth/guards";
import { NotFoundError } from "../../core/errors/app-error";
import { createPaginationMeta, type PaginationMeta } from "../../core/response/pagination";
import type { DbDocument, DbDocumentVersion } from "../../db/types";
import { auditService } from "../audit/audit.service";
import { fileRepository, type FileRepository } from "./file.repository";
import { defaultStorageProvider, type StorageProvider } from "./file.storage";
import type { CreateVersionInput, InitiateUploadInput, QueryDocumentsParams } from "./file.types";

export class FileService {
  private readonly repo: FileRepository;
  private readonly storage: StorageProvider;

  constructor(
    repo: FileRepository = fileRepository,
    storage: StorageProvider = defaultStorageProvider
  ) {
    this.repo = repo;
    this.storage = storage;
  }

  public async initiateUpload(
    companyId: string,
    input: InitiateUploadInput,
    ctx: SecurityContext
  ): Promise<{ document: DbDocument; uploadUrl: string; storageKey: string }> {
    requireTenant(ctx, companyId);
    requirePermission(ctx, "Create", "documents", { projectId: input.projectId });

    if (input.projectId) {
      requireProjectAccess(ctx, input.projectId);
    }

    const targetKey = `companies/${companyId}/docs/${Date.now()}-${input.fileName}`;
    const { uploadUrl, storageKey } = await this.storage.generateUploadUrl(targetKey, input.mimeType);

    const document = await this.repo.create(companyId, storageKey, ctx.user.id, input);

    await auditService.logEvent({
      companyId,
      actorUserId: ctx.user.id,
      action: "INITIATE_DOCUMENT_UPLOAD",
      tableName: "documents",
      recordId: document.id,
      newData: {
        documentCode: input.documentCode,
        fileName: input.fileName,
        fileSizeBytes: input.fileSizeBytes,
      },
    });

    return { document, uploadUrl, storageKey };
  }

  public async getDocument(id: string, companyId: string, ctx: SecurityContext): Promise<DbDocument> {
    requireTenant(ctx, companyId);

    const doc = await this.repo.findById(id);
    if (!doc || doc.companyId !== companyId) {
      throw new NotFoundError("Document", id);
    }

    requirePermission(ctx, "View", "documents", { projectId: doc.projectId || undefined });
    if (doc.projectId) {
      requireProjectAccess(ctx, doc.projectId);
    }

    return doc;
  }

  public async getDownloadUrl(
    id: string,
    companyId: string,
    ctx: SecurityContext
  ): Promise<{ downloadUrl: string; fileName: string; mimeType: string }> {
    const doc = await this.getDocument(id, companyId, ctx);
    const downloadUrl = await this.storage.generateDownloadUrl(doc.storageKey);

    await auditService.logEvent({
      companyId,
      actorUserId: ctx.user.id,
      action: "DOWNLOAD_DOCUMENT",
      tableName: "documents",
      recordId: doc.id,
    });

    return { downloadUrl, fileName: doc.fileName, mimeType: doc.mimeType };
  }

  public async listDocuments(
    companyId: string,
    params: QueryDocumentsParams,
    ctx: SecurityContext
  ): Promise<{ data: DbDocument[]; meta: PaginationMeta }> {
    requireTenant(ctx, companyId);
    requirePermission(ctx, "View", "documents", { projectId: params.projectId });

    if (params.projectId) {
      requireProjectAccess(ctx, params.projectId);
    }

    const { data, total } = await this.repo.findMany(companyId, params);
    const meta = createPaginationMeta(params.page, params.limit, total);
    return { data, meta };
  }

  public async createVersion(
    documentId: string,
    companyId: string,
    input: CreateVersionInput,
    ctx: SecurityContext
  ): Promise<{ version: DbDocumentVersion; uploadUrl: string }> {
    const doc = await this.getDocument(documentId, companyId, ctx);
    requirePermission(ctx, "Update", "documents", { projectId: doc.projectId || undefined });

    const targetKey = `companies/${companyId}/docs/${Date.now()}-v${doc.currentVersion + 1}-${input.fileName}`;
    const { uploadUrl, storageKey } = await this.storage.generateUploadUrl(targetKey, doc.mimeType);

    const version = await this.repo.addVersion(
      doc,
      storageKey,
      input.fileName,
      input.fileSizeBytes,
      input.checksumSha256,
      input.changeSummary,
      ctx.user.id
    );

    await auditService.logEvent({
      companyId,
      actorUserId: ctx.user.id,
      action: "CREATE_DOCUMENT_VERSION",
      tableName: "document_versions",
      recordId: version.id,
      newData: { versionNumber: version.versionNumber, fileName: version.fileName },
    });

    return { version, uploadUrl };
  }
}

export const fileService = new FileService();
