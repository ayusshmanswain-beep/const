// ==============================================================================
// CONSTRUCT360 INVENTORY & WAREHOUSE MANAGEMENT REPOSITORY
// Atomic Stock Ledger, Multi-Warehouse Balances, Indent Workflows & Valuation
// ==============================================================================

import { randomUUID } from "node:crypto";
import { db } from "../../db/client";
import type {
  DbMaterial,
  DbMaterialRequest,
  DbStockLedgerEntry,
  DbStockTransfer,
  DbStorageLocation,
  DbSupplierPriceHistory,
  DbWarehouse,
  DbWarehouseStock,
  MaterialCategory,
  MaterialStatus,
} from "../../db/types";
import type {
  InventoryDashboardData,
  InventoryValuationSummary,
  MaterialWithStock,
  QueryMaterialsParams,
  StockAgeingReport,
} from "./inventory.types";

export class InventoryRepository {
  // ----------------------------------------------------------------------------
  // 1. SEQUENCE NUMBER GENERATORS
  // ----------------------------------------------------------------------------

  public async generateNextMaterialCode(companyId: string, category: MaterialCategory): Promise<string> {
    const store = db.getStore();
    const prefixMap: Record<MaterialCategory, string> = {
      CEMENT: "MAT-CEM",
      STEEL_REBAR: "MAT-STL",
      AGGREGATES_SAND: "MAT-AGG",
      BRICKS_BLOCKS: "MAT-BRK",
      ELECTRICAL: "MAT-ELE",
      PLUMBING_PIPES: "MAT-PIP",
      FINISHING_PAINT: "MAT-PNT",
      TIMBER_FORMWORK: "MAT-PLY",
      CHEMICALS_ADMIXTURES: "MAT-CHM",
      SAFETY_PPE: "MAT-PPE",
      OTHER: "MAT-GEN",
    };

    const prefix = prefixMap[category] || "MAT-GEN";
    const existing = Array.from(store.materials.values()).filter(
      (m) => m.companyId === companyId && m.materialCode.startsWith(prefix)
    );

    const nextNum = existing.length + 1;
    return `${prefix}-${String(nextNum).padStart(3, "0")}`;
  }

  public async generateNextDocumentNumber(companyId: string, prefix: string): Promise<string> {
    const store = db.getStore();
    const year = new Date().getFullYear();
    const fullPrefix = `${prefix}-${year}-`;

    const existingCount = Array.from(store.stockLedger.values()).filter(
      (l) => l.companyId === companyId && l.referenceNumber.startsWith(fullPrefix)
    ).length;

    return `${fullPrefix}${String(existingCount + 1).padStart(4, "0")}`;
  }

  public async generateNextMaterialRequestCode(companyId: string): Promise<string> {
    const store = db.getStore();
    const existingCount = Array.from(store.materialRequests.values()).filter(
      (r) => r.companyId === companyId
    ).length;
    return `MR-APEX-${String(existingCount + 1).padStart(4, "0")}`;
  }

  public async generateNextTransferCode(companyId: string): Promise<string> {
    const store = db.getStore();
    const year = new Date().getFullYear();
    const existingCount = Array.from(store.stockTransfers.values()).filter(
      (t) => t.companyId === companyId
    ).length;
    return `STC-${year}-${String(existingCount + 1).padStart(3, "0")}`;
  }

  // ----------------------------------------------------------------------------
  // 2. MATERIAL MASTER
  // ----------------------------------------------------------------------------

  public async createMaterial(material: DbMaterial): Promise<DbMaterial> {
    const store = db.getStore();
    store.materials.set(material.id, material);
    return material;
  }

  public async findMaterialById(id: string): Promise<DbMaterial | null> {
    const store = db.getStore();
    return store.materials.get(id) || null;
  }

  public async findMaterialByCode(companyId: string, code: string): Promise<DbMaterial | null> {
    const store = db.getStore();
    return (
      Array.from(store.materials.values()).find(
        (m) => m.companyId === companyId && m.materialCode.toUpperCase() === code.trim().toUpperCase()
      ) || null
    );
  }

  public async updateMaterial(id: string, updates: Partial<DbMaterial>): Promise<DbMaterial | null> {
    return db.transaction(async (store) => {
      const existing = store.materials.get(id);
      if (!existing) return null;

      const updated: DbMaterial = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };
      store.materials.set(id, updated);
      return updated;
    });
  }

  public async findMaterials(
    companyId: string,
    params: QueryMaterialsParams = {}
  ): Promise<{ data: MaterialWithStock[]; total: number }> {
    const store = db.getStore();
    let materials = Array.from(store.materials.values()).filter((m) => m.companyId === companyId);

    if (params.search) {
      const q = params.search.toLowerCase();
      materials = materials.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.materialCode.toLowerCase().includes(q) ||
          m.brand?.toLowerCase().includes(q) ||
          m.specification?.toLowerCase().includes(q)
      );
    }

    if (params.category) {
      materials = materials.filter((m) => m.category === params.category);
    }

    if (params.status) {
      materials = materials.filter((m) => m.status === params.status);
    }

    // Enrich with current on-hand stock and warehouse distribution
    const enriched: MaterialWithStock[] = materials.map((m) => {
      const stocks = Array.from(store.warehouseStocks.values()).filter(
        (s) => s.materialId === m.id
      );

      let totalQuantityOnHand = 0;
      let totalAvailableQuantity = 0;
      let totalAllocatedQuantity = 0;
      let totalValue = 0;

      const warehousesDistribution = stocks.map((s) => {
        const wh = store.warehouses.get(s.warehouseId);
        totalQuantityOnHand += s.quantity;
        totalAvailableQuantity += s.availableQuantity;
        totalAllocatedQuantity += s.allocatedQuantity;
        totalValue += s.quantity * (s.averageUnitCost || m.standardRate);

        return {
          warehouseId: s.warehouseId,
          warehouseName: wh?.name || "Unknown Warehouse",
          warehouseCode: wh?.warehouseCode || "WH",
          quantity: s.quantity,
          availableQuantity: s.availableQuantity,
        };
      });

      const isLowStock = totalQuantityOnHand <= m.minimumStock;

      return {
        ...m,
        totalQuantityOnHand: Math.round(totalQuantityOnHand * 1000) / 1000,
        totalAvailableQuantity: Math.round(totalAvailableQuantity * 1000) / 1000,
        totalAllocatedQuantity: Math.round(totalAllocatedQuantity * 1000) / 1000,
        totalInventoryValue: Math.round(totalValue),
        isLowStock,
        warehousesDistribution,
      };
    });

    let filtered = enriched;
    if (params.lowStockOnly) {
      filtered = filtered.filter((m) => m.isLowStock);
    }

    const total = filtered.length;
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    return {
      data: filtered.slice(offset, offset + limit),
      total,
    };
  }

  // ----------------------------------------------------------------------------
  // 3. WAREHOUSES & STORAGE LOCATIONS
  // ----------------------------------------------------------------------------

  public async createWarehouse(wh: DbWarehouse): Promise<DbWarehouse> {
    const store = db.getStore();
    store.warehouses.set(wh.id, wh);
    return wh;
  }

  public async findWarehouseById(id: string): Promise<DbWarehouse | null> {
    const store = db.getStore();
    return store.warehouses.get(id) || null;
  }

  public async findWarehouses(companyId: string): Promise<DbWarehouse[]> {
    const store = db.getStore();
    return Array.from(store.warehouses.values())
      .filter((w) => w.companyId === companyId)
      .sort((a, b) => a.warehouseCode.localeCompare(b.warehouseCode));
  }

  public async updateWarehouse(id: string, updates: Partial<DbWarehouse>): Promise<DbWarehouse | null> {
    return db.transaction(async (store) => {
      const existing = store.warehouses.get(id);
      if (!existing) return null;

      const updated = { ...existing, ...updates, updatedAt: new Date() };
      store.warehouses.set(id, updated);
      return updated;
    });
  }

  public async createStorageLocation(loc: DbStorageLocation): Promise<DbStorageLocation> {
    const store = db.getStore();
    store.storageLocations.set(loc.id, loc);
    return loc;
  }

  public async getStorageLocations(warehouseId: string): Promise<DbStorageLocation[]> {
    const store = db.getStore();
    return Array.from(store.storageLocations.values())
      .filter((l) => l.warehouseId === warehouseId)
      .sort((a, b) => a.locationCode.localeCompare(b.locationCode));
  }

  // ----------------------------------------------------------------------------
  // 4. ATOMIC STOCK TRANSACTION & IMMUTABLE LEDGER
  // ----------------------------------------------------------------------------

  public async getWarehouseStock(
    warehouseId: string,
    materialId: string,
    locationId?: string
  ): Promise<DbWarehouseStock | null> {
    const store = db.getStore();
    return (
      Array.from(store.warehouseStocks.values()).find(
        (s) =>
          s.warehouseId === warehouseId &&
          s.materialId === materialId &&
          (locationId ? s.storageLocationId === locationId : true)
      ) || null
    );
  }

  public async getAllStocksInWarehouse(warehouseId: string): Promise<DbWarehouseStock[]> {
    const store = db.getStore();
    return Array.from(store.warehouseStocks.values()).filter((s) => s.warehouseId === warehouseId);
  }

  /**
   * CRITICAL TRANSACTIONAL INVARIANT:
   * Every stock update writes an immutable DbStockLedgerEntry and atomically modifies
   * quantity on-hand inside db.transaction(...).
   */
  public async executeStockTransaction(options: {
    ledgerEntry: DbStockLedgerEntry;
    targetWarehouseId: string;
    locationId?: string;
    quantityDelta: number; // Positive = add to stock, Negative = subtract from stock
    allocatedQuantityDelta?: number;
    newUnitCost?: number;
  }): Promise<{ ledger: DbStockLedgerEntry; stock: DbWarehouseStock }> {
    return db.transaction(async (store) => {
      const { ledgerEntry, targetWarehouseId, locationId, quantityDelta, allocatedQuantityDelta, newUnitCost } = options;

      // 1. Write immutable ledger entry
      store.stockLedger.set(ledgerEntry.id, ledgerEntry);

      // 2. Find or create stock balance record
      let stock = Array.from(store.warehouseStocks.values()).find(
        (s) =>
          s.warehouseId === targetWarehouseId &&
          s.materialId === ledgerEntry.materialId &&
          (locationId ? s.storageLocationId === locationId : true)
      );

      if (!stock) {
        stock = {
          id: randomUUID(),
          companyId: ledgerEntry.companyId,
          warehouseId: targetWarehouseId,
          storageLocationId: locationId,
          materialId: ledgerEntry.materialId,
          quantity: 0,
          allocatedQuantity: 0,
          availableQuantity: 0,
          averageUnitCost: newUnitCost || ledgerEntry.unitCost,
          lastMovementDate: ledgerEntry.timestamp,
          updatedAt: new Date(),
        };
        store.warehouseStocks.set(stock.id, stock);
      }

      // Update Weighted Average Cost on inward additions
      if (quantityDelta > 0 && newUnitCost && newUnitCost > 0) {
        const currentTotalVal = stock.quantity * stock.averageUnitCost;
        const newAdditionVal = quantityDelta * newUnitCost;
        const newTotalQty = stock.quantity + quantityDelta;
        if (newTotalQty > 0) {
          stock.averageUnitCost = Math.round(((currentTotalVal + newAdditionVal) / newTotalQty) * 100) / 100;
        }
      }

      // Apply decimal deltas
      stock.quantity = Math.round((stock.quantity + quantityDelta) * 1000) / 1000;
      if (allocatedQuantityDelta) {
        stock.allocatedQuantity = Math.max(0, Math.round((stock.allocatedQuantity + allocatedQuantityDelta) * 1000) / 1000);
      }
      stock.availableQuantity = Math.max(0, Math.round((stock.quantity - stock.allocatedQuantity) * 1000) / 1000);
      stock.lastMovementDate = ledgerEntry.timestamp;
      stock.updatedAt = new Date();

      return { ledger: ledgerEntry, stock };
    });
  }

  public async getStockLedger(
    companyId: string,
    filters: {
      materialId?: string;
      warehouseId?: string;
      transactionType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<DbStockLedgerEntry[]> {
    const store = db.getStore();
    let entries = Array.from(store.stockLedger.values()).filter((e) => e.companyId === companyId);

    if (filters.materialId) {
      entries = entries.filter((e) => e.materialId === filters.materialId);
    }
    if (filters.warehouseId) {
      entries = entries.filter(
        (e) => e.sourceWarehouseId === filters.warehouseId || e.destinationWarehouseId === filters.warehouseId
      );
    }
    if (filters.transactionType) {
      entries = entries.filter((e) => e.transactionType === filters.transactionType);
    }
    if (filters.startDate) {
      entries = entries.filter((e) => e.timestamp.getTime() >= filters.startDate!.getTime());
    }
    if (filters.endDate) {
      entries = entries.filter((e) => e.timestamp.getTime() <= filters.endDate!.getTime());
    }

    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const limit = filters.limit || 100;
    return entries.slice(0, limit);
  }

  // ----------------------------------------------------------------------------
  // 5. MATERIAL REQUEST WORKFLOW
  // ----------------------------------------------------------------------------

  public async createMaterialRequest(req: DbMaterialRequest): Promise<DbMaterialRequest> {
    const store = db.getStore();
    store.materialRequests.set(req.id, req);
    return req;
  }

  public async findMaterialRequestById(id: string): Promise<DbMaterialRequest | null> {
    const store = db.getStore();
    return store.materialRequests.get(id) || null;
  }

  public async findMaterialRequests(
    companyId: string,
    filters: { projectId?: string; status?: string } = {}
  ): Promise<DbMaterialRequest[]> {
    const store = db.getStore();
    let reqs = Array.from(store.materialRequests.values()).filter((r) => r.companyId === companyId);

    if (filters.projectId) {
      reqs = reqs.filter((r) => r.projectId === filters.projectId);
    }
    if (filters.status) {
      reqs = reqs.filter((r) => r.status === filters.status);
    }

    return reqs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async updateMaterialRequest(
    id: string,
    updates: Partial<DbMaterialRequest>
  ): Promise<DbMaterialRequest | null> {
    return db.transaction(async (store) => {
      const existing = store.materialRequests.get(id);
      if (!existing) return null;

      const updated: DbMaterialRequest = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };
      store.materialRequests.set(id, updated);
      return updated;
    });
  }

  // ----------------------------------------------------------------------------
  // 6. INTER-WAREHOUSE TRANSFERS
  // ----------------------------------------------------------------------------

  public async createStockTransfer(st: DbStockTransfer): Promise<DbStockTransfer> {
    const store = db.getStore();
    store.stockTransfers.set(st.id, st);
    return st;
  }

  public async findStockTransferById(id: string): Promise<DbStockTransfer | null> {
    const store = db.getStore();
    return store.stockTransfers.get(id) || null;
  }

  public async findStockTransfers(companyId: string): Promise<DbStockTransfer[]> {
    const store = db.getStore();
    return Array.from(store.stockTransfers.values())
      .filter((t) => t.companyId === companyId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async updateStockTransfer(
    id: string,
    updates: Partial<DbStockTransfer>
  ): Promise<DbStockTransfer | null> {
    return db.transaction(async (store) => {
      const existing = store.stockTransfers.get(id);
      if (!existing) return null;

      const updated = { ...existing, ...updates, updatedAt: new Date() };
      store.stockTransfers.set(id, updated);
      return updated;
    });
  }

  // ----------------------------------------------------------------------------
  // 7. SUPPLIER PRICE HISTORIES
  // ----------------------------------------------------------------------------

  public async addSupplierPriceHistory(record: DbSupplierPriceHistory): Promise<DbSupplierPriceHistory> {
    const store = db.getStore();
    store.supplierPriceHistories.set(record.id, record);
    return record;
  }

  public async getSupplierPriceHistory(materialId: string): Promise<DbSupplierPriceHistory[]> {
    const store = db.getStore();
    return Array.from(store.supplierPriceHistories.values())
      .filter((h) => h.materialId === materialId)
      .sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime());
  }

  // ----------------------------------------------------------------------------
  // 8. INVENTORY VALUATION & STOCK AGEING
  // ----------------------------------------------------------------------------

  public async calculateInventoryValuation(companyId: string): Promise<InventoryValuationSummary> {
    const store = db.getStore();
    const materials = Array.from(store.materials.values()).filter((m) => m.companyId === companyId);
    const stocks = Array.from(store.warehouseStocks.values()).filter((s) => s.companyId === companyId);
    const warehouses = Array.from(store.warehouses.values()).filter((w) => w.companyId === companyId);

    let totalValuation = 0;
    const catMap = new Map<MaterialCategory, { itemCount: number; totalQty: number; totalVal: number }>();

    for (const m of materials) {
      if (!catMap.has(m.category)) {
        catMap.set(m.category, { itemCount: 0, totalQty: 0, totalVal: 0 });
      }
      const catEntry = catMap.get(m.category)!;
      catEntry.itemCount++;

      const matStocks = stocks.filter((s) => s.materialId === m.id);
      for (const s of matStocks) {
        const val = s.quantity * (s.averageUnitCost || m.standardRate);
        catEntry.totalQty += s.quantity;
        catEntry.totalVal += val;
        totalValuation += val;
      }
    }

    const categoryValuation = Array.from(catMap.entries()).map(([cat, data]) => ({
      category: cat,
      itemCount: data.itemCount,
      totalQuantity: Math.round(data.totalQty * 100) / 100,
      totalValueINR: Math.round(data.totalVal),
      percentOfTotalValuation: totalValuation > 0 ? Math.round((data.totalVal / totalValuation) * 1000) / 10 : 0,
    })).sort((a, b) => b.totalValueINR - a.totalValueINR);

    return {
      totalInventoryValuationINR: Math.round(totalValuation),
      totalMaterialsCount: materials.length,
      totalWarehousesCount: warehouses.length,
      categoryValuation,
    };
  }

  public async calculateStockAgeing(companyId: string): Promise<StockAgeingReport[]> {
    const store = db.getStore();
    const materials = Array.from(store.materials.values()).filter((m) => m.companyId === companyId);
    const stocks = Array.from(store.warehouseStocks.values()).filter((s) => s.companyId === companyId);
    const now = Date.now();

    return materials.map((m) => {
      const matStocks = stocks.filter((s) => s.materialId === m.id);
      const totalQty = matStocks.reduce((sum, s) => sum + s.quantity, 0);
      const avgCost = matStocks[0]?.averageUnitCost || m.standardRate;
      const totalVal = Math.round(totalQty * avgCost);

      let days0to30 = 0;
      let days31to60 = 0;
      let days61to90 = 0;
      let daysOver90 = 0;

      for (const s of matStocks) {
        const ageDays = Math.round((now - s.lastMovementDate.getTime()) / (24 * 3600 * 1000));
        if (ageDays <= 30) days0to30 += s.quantity;
        else if (ageDays <= 60) days31to60 += s.quantity;
        else if (ageDays <= 90) days61to90 += s.quantity;
        else daysOver90 += s.quantity;
      }

      // Perishable alert: Cement older than 60 days loses 20-30% compressive strength
      const isPerishableAlert = m.category === "CEMENT" && (days61to90 > 0 || daysOver90 > 0);

      return {
        materialId: m.id,
        materialCode: m.materialCode,
        name: m.name,
        unit: m.unitOfMeasurement,
        totalStock: Math.round(totalQty * 1000) / 1000,
        value: totalVal,
        days0to30: Math.round(days0to30 * 1000) / 1000,
        days31to60: Math.round(days31to60 * 1000) / 1000,
        days61to90: Math.round(days61to90 * 1000) / 1000,
        daysOver90: Math.round(daysOver90 * 1000) / 1000,
        isPerishableAlert,
      };
    });
  }

  // ----------------------------------------------------------------------------
  // 9. INVENTORY EXECUTIVE DASHBOARD
  // ----------------------------------------------------------------------------

  public async getInventoryDashboard(companyId: string): Promise<InventoryDashboardData> {
    const store = db.getStore();
    const valuation = await this.calculateInventoryValuation(companyId);
    const { data: materialsWithStock } = await this.findMaterials(companyId, { limit: 500 });
    const warehouses = await this.findWarehouses(companyId);
    const requests = await this.findMaterialRequests(companyId);
    const transfers = await this.findStockTransfers(companyId);
    const recentMovements = await this.getStockLedger(companyId, { limit: 10 });

    const lowStockAlerts = materialsWithStock
      .filter((m) => m.isLowStock)
      .map((m) => ({
        materialId: m.id,
        materialCode: m.materialCode,
        name: m.name,
        category: m.category,
        currentStock: m.totalQuantityOnHand,
        minimumStock: m.minimumStock,
        unit: m.unitOfMeasurement,
        standardRate: m.standardRate,
      }));

    const warehouseQuantities = warehouses.map((w) => {
      const whStocks = Array.from(store.warehouseStocks.values()).filter((s) => s.warehouseId === w.id);
      const totalVal = whStocks.reduce((sum, s) => sum + s.quantity * s.averageUnitCost, 0);

      return {
        warehouseId: w.id,
        warehouseName: w.name,
        warehouseCode: w.warehouseCode,
        totalItems: whStocks.length,
        totalValuationINR: Math.round(totalVal),
      };
    });

    const pendingRequestsCount = requests.filter(
      (r) => r.status === "SUBMITTED" || r.status === "PM_APPROVED" || r.status === "STORE_CHECKED"
    ).length;

    const inTransitTransfersCount = transfers.filter(
      (t) => t.status === "DISPATCHED" || t.status === "IN_TRANSIT"
    ).length;

    return {
      totalMaterialsCount: valuation.totalMaterialsCount,
      totalStockValueINR: valuation.totalInventoryValuationINR,
      lowStockItemsCount: lowStockAlerts.length,
      activeWarehousesCount: warehouses.filter((w) => w.isActive).length,
      pendingRequestsCount,
      inTransitTransfersCount,
      recentMovements,
      lowStockAlerts,
      categoryDistribution: valuation.categoryValuation.map((c) => ({
        category: c.category,
        count: c.itemCount,
        valueINR: c.totalValueINR,
      })),
      warehouseQuantities,
    };
  }
}

export const inventoryRepository = new InventoryRepository();
