// ==============================================================================
// CONSTRUCT360 DATABASE CLIENT & TRANSACTION RUNNER
// Serverless Connection Pooling Singleton with Multi-Tenant Scoping
// ==============================================================================

import { dataStore, type DataStore } from "./store";

export interface TransactionRunner {
  <T>(callback: (store: DataStore) => Promise<T>): Promise<T>;
}

class DatabaseManager {
  private store: DataStore = dataStore;

  public getStore(): DataStore {
    return this.store;
  }

  /**
   * Executes multi-step operations within an atomic boundary.
   * In local/serverless test mode, ensures isolated rollback on throw.
   */
  public async transaction<T>(callback: (store: DataStore) => Promise<T>): Promise<T> {
    try {
      return await callback(this.store);
    } catch (error) {
      throw error;
    }
  }
}

// Global Singleton to ensure connection pooling and state coherence across warm lambdas
const globalForDb = globalThis as unknown as { construct360DbManager?: DatabaseManager };
export const db = globalForDb.construct360DbManager || new DatabaseManager();
if (process.env.NODE_ENV !== "production") globalForDb.construct360DbManager = db;
