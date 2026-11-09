// ==============================================================================
// FILE STORAGE PROVIDER ABSTRACTION
// S3 Compatible & Local File Storage Gateway
// ==============================================================================

import { randomUUID } from "node:crypto";

export interface StorageProvider {
  generateUploadUrl(key: string, mimeType: string, expiresInSeconds?: number): Promise<{ uploadUrl: string; storageKey: string }>;
  generateDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

export class StandardStorageProvider implements StorageProvider {
  private bucketUrl: string;

  constructor() {
    this.bucketUrl = process.env.STORAGE_BUCKET_URL || "https://construct360-assets.internal.storage";
  }

  public async generateUploadUrl(
    key: string,
    _mimeType: string,
    expiresInSeconds = 900
  ): Promise<{ uploadUrl: string; storageKey: string }> {
    const storageKey = key || `docs/${new Date().getFullYear()}/${randomUUID()}`;
    // Simulates an S3 pre-signed PUT URL
    const uploadUrl = `${this.bucketUrl}/upload?key=${encodeURIComponent(storageKey)}&expires=${Date.now() + expiresInSeconds * 1000}`;
    return { uploadUrl, storageKey };
  }

  public async generateDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    // Simulates an S3 pre-signed GET URL
    return `${this.bucketUrl}/download?key=${encodeURIComponent(key)}&expires=${Date.now() + expiresInSeconds * 1000}`;
  }
}

export const defaultStorageProvider = new StandardStorageProvider();
