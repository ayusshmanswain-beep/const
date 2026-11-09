// ==============================================================================
// FILE REPOSITORY
// Document Metadata & Version Tracking Data Access
// ==============================================================================

import { randomUUID } from "node:crypto";
import { db } from "../../db/client";
import type { DbDocument, DbDocumentVersion } from "../../db/types";
import type { InitiateUploadInput, QueryDocumentsParams } from "./file.types";

export class FileRepository {
  public async create(
    companyId: string,
    storageKey: string,
    uploadedById: string,
    input: InitiateUploadInput
  ): Promise<DbDocument> {
    const store = db.getStore();
    const doc: DbDocument = {
      id: randomUUID(),
      companyId,
      projectId: input.projectId || null,
      siteId: input.siteId || null,
      category: input.category,
      documentCode: input.documentCode,
      title: input.title,
      description: input.description,
      currentVersion: 1,
      storageProvider: "S3",
      storageKey,
      fileName: input.fileName,
      fileSizeBytes: input.fileSizeBytes,
      mimeType: input.mimeType,
      checksumSha256: input.checksumSha256,
      uploadedById,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    store.documents.set(doc.id, doc);

    // Create Version 1
    const v: DbDocumentVersion = {
      id: randomUUID(),
      documentId: doc.id,
      versionNumber: 1,
      storageKey,
      fileName: input.fileName,
      fileSizeBytes: input.fileSizeBytes,
      checksumSha256: input.checksumSha256,
      changeSummary: "Initial version",
      uploadedById,
      createdAt: new Date(),
    };

    store.documentVersions.set(v.id, v);
    return doc;
  }

  public async findById(id: string): Promise<DbDocument | null> {
    const store = db.getStore();
    return store.documents.get(id) || null;
  }

  public async findMany(
    companyId: string,
    params: QueryDocumentsParams
  ): Promise<{ data: DbDocument[]; total: number }> {
    const store = db.getStore();

    let docs = Array.from(store.documents.values()).filter((d) => d.companyId === companyId);

    if (params.category) {
      docs = docs.filter((d) => d.category === params.category);
    }

    if (params.projectId) {
      docs = docs.filter((d) => d.projectId === params.projectId);
    }

    if (params.siteId) {
      docs = docs.filter((d) => d.siteId === params.siteId);
    }

    if (params.search) {
      const q = params.search.toLowerCase();
      docs = docs.filter((d) => d.title.toLowerCase().includes(q) || d.documentCode.toLowerCase().includes(q));
    }

    const total = docs.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const data = docs.slice(offset, offset + limit);
    return { data, total };
  }

  public async addVersion(
    document: DbDocument,
    storageKey: string,
    fileName: string,
    fileSizeBytes: number,
    checksumSha256: string,
    changeSummary: string | undefined,
    uploadedById: string
  ): Promise<DbDocumentVersion> {
    const store = db.getStore();

    const newVersionNumber = document.currentVersion + 1;
    document.currentVersion = newVersionNumber;
    document.storageKey = storageKey;
    document.fileName = fileName;
    document.fileSizeBytes = fileSizeBytes;
    document.checksumSha256 = checksumSha256;
    document.updatedAt = new Date();
    store.documents.set(document.id, document);

    const version: DbDocumentVersion = {
      id: randomUUID(),
      documentId: document.id,
      versionNumber: newVersionNumber,
      storageKey,
      fileName,
      fileSizeBytes,
      checksumSha256,
      changeSummary,
      uploadedById,
      createdAt: new Date(),
    };

    store.documentVersions.set(version.id, version);
    return version;
  }

  public async findVersions(documentId: string): Promise<DbDocumentVersion[]> {
    const store = db.getStore();
    return Array.from(store.documentVersions.values()).filter((v) => v.documentId === documentId);
  }
}

export const fileRepository = new FileRepository();
