// ==============================================================================
// CONSTRUCT360 INVENTORY & WAREHOUSE MANAGEMENT SERVICE
// Business Rules, ACID Transaction Atomic Stock Operations & Indent Workflows
// ==============================================================================

import { randomUUID } from "node:crypto";
import type { SecurityContext } from "../../auth/context";
import {
  requireAuth,
  requirePermission,
  requireProjectAccess,
  requireTenant,
} from "../../auth/guards";
import { BadRequestError, NotFoundError } from "../../core/errors/app-error";
import { createPaginationMeta, type PaginationMeta } from "../../core/response/pagination";
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
} from "../../db/types";
import { auditService } from "../audit/audit.service";
import { inventoryRepository, type InventoryRepository } from "./inventory.repository";
import type {
  ApproveMaterialRequestInput,
  CreateMaterialInput,
  CreateMaterialRequestInput,
  CreateStorageLocationInput,
  CreateWarehouseInput,
  FulfillMaterialRequestInput,
  GoodsReceiptNoteInput,
  InitiateStockTransferInput,
  InventoryDashboardData,
  InventoryValuationSummary,
  IssueMaterialInput,
  MaterialWithStock,
  QueryMaterialsParams,
  ReceiveStockTransferInput,
  RecordWastageOrDamageInput,
  RejectMaterialRequestInput,
  ReturnMaterialInput,
  StockAdjustmentInput,
  StockAgeingReport,
  UpdateMaterialInput,
  UpdateWarehouseInput,
} from "./inventory.types";

export class InventoryService {
  private readonly repo: InventoryRepository;

  constructor(repo: InventoryRepository = inventoryRepository) {
    this.repo = repo;
  }

  // ----------------------------------------------------------------------------
  // 1. MATERIAL MASTER
  // ----------------------------------------------------------------------------

  public async createMaterial(input: CreateMaterialInput, ctx: SecurityContext): Promise<DbMaterial> {
    requireAuth(ctx);
    requirePermission(ctx, "Create", "inventory");

    if (input.standardRate < 0) {
      throw new BadRequestError("Standard rate cannot be negative");
    }
    if (input.minimumStock < 0 || input.maximumStock <= input.minimumStock) {
      throw new BadRequestError("Maximum stock must be strictly greater than minimum stock");
    }

    const materialCode = await this.repo.generateNextMaterialCode(ctx.companyId, input.category);

    const material: DbMaterial = {
      id: randomUUID(),
      companyId: ctx.companyId,
      materialCode,
      name: input.name.trim(),
      category: input.category,
      unitOfMeasurement: input.unitOfMeasurement,
      brand: input.brand?.trim(),
      specification: input.specification?.trim(),
      standardRate: input.standardRate,
      preferredSupplier: input.preferredSupplier?.trim(),
      minimumStock: input.minimumStock,
      maximumStock: input.maximumStock,
      reorderLevel: input.reorderLevel || Math.round(input.minimumStock * 1.5),
      hsnCode: input.hsnCode?.trim(),
      gstPercent: input.gstPercent ?? 18,
      barcode: input.barcode?.trim() || `890${Date.now().toString().slice(-9)}`,
      qrCode: `MAT:${materialCode}:${ctx.companyId.slice(0, 8)}`,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = await this.repo.createMaterial(material);

    await auditService.logEvent({
      companyId: ctx.companyId,
      actorUserId: ctx.user.id,
      action: "CREATE_MATERIAL_MASTER",
      tableName: "materials",
      recordId: created.id,
      newData: { code: created.materialCode, name: created.name, rate: created.standardRate },
    });

    return created;
  }

  public async updateMaterial(
    id: string,
    input: UpdateMaterialInput,
    ctx: SecurityContext
  ): Promise<DbMaterial> {
    requireAuth(ctx);
    requirePermission(ctx, "Update", "inventory");

    const existing = await this.repo.findMaterialById(id);
    if (!existing) throw new NotFoundError("Material", id);
    requireTenant(ctx, existing.companyId);

    const updates: Partial<DbMaterial> = {};
    if (input.name) updates.name = input.name.trim();
    if (input.category) updates.category = input.category;
    if (input.unitOfMeasurement) updates.unitOfMeasurement = input.unitOfMeasurement;
    if (input.brand !== undefined) updates.brand = input.brand?.trim();
    if (input.specification !== undefined) updates.specification = input.specification?.trim();
    if (input.standardRate !== undefined) updates.standardRate = input.standardRate;
    if (input.preferredSupplier !== undefined) updates.preferredSupplier = input.preferredSupplier?.trim();
    if (input.minimumStock !== undefined) updates.minimumStock = input.minimumStock;
    if (input.maximumStock !== undefined) updates.maximumStock = input.maximumStock;
    if (input.reorderLevel !== undefined) updates.reorderLevel = input.reorderLevel;
    if (input.hsnCode !== undefined) updates.hsnCode = input.hsnCode?.trim();
    if (input.gstPercent !== undefined) updates.gstPercent = input.gstPercent;
    if (input.barcode !== undefined) updates.barcode = input.barcode?.trim();
    if (input.status) updates.status = input.status;

    const updated = await this.repo.updateMaterial(id, updates);
    if (!updated) throw new NotFoundError("Material", id);

    await auditService.logEvent({
      companyId: existing.companyId,
      actorUserId: ctx.user.id,
      action: "UPDATE_MATERIAL_MASTER",
      tableName: "materials",
      recordId: id,
      newData: updates as unknown as Record<string, unknown>,
    });

    return updated;
  }

  public async listMaterials(
    ctx: SecurityContext,
    params: QueryMaterialsParams = {}
  ): Promise<{ data: MaterialWithStock[]; meta: PaginationMeta }> {
    requireAuth(ctx);
    requirePermission(ctx, "View", "inventory");

    const { data, total } = await this.repo.findMaterials(ctx.companyId, params);
    const meta = createPaginationMeta(params.page || 1, params.limit || 50, total);

    return { data, meta };
  }

  public async getMaterial(
    id: string,
    ctx: SecurityContext
  ): Promise<MaterialWithStock & { ledger: DbStockLedgerEntry[]; priceHistory: DbSupplierPriceHistory[] }> {
    requireAuth(ctx);
    requirePermission(ctx, "View", "inventory");

    const material = await this.repo.findMaterialById(id);
    if (!material) throw new NotFoundError("Material", id);
    requireTenant(ctx, material.companyId);

    const { data } = await this.repo.findMaterials(ctx.companyId, { search: material.materialCode });
    const enriched = data.find((m) => m.id === id) || {
      ...material,
      totalQuantityOnHand: 0,
      totalAvailableQuantity: 0,
      totalAllocatedQuantity: 0,
      totalInventoryValue: 0,
      isLowStock: false,
      warehousesDistribution: [],
    };

    const ledger = await this.repo.getStockLedger(ctx.companyId, { materialId: id, limit: 30 });
    const priceHistory = await this.repo.getSupplierPriceHistory(id);

    return {
      ...enriched,
      ledger,
      priceHistory,
    };
  }

  // ----------------------------------------------------------------------------
  // 2. WAREHOUSES & STORAGE LOCATIONS
  // ----------------------------------------------------------------------------

  public async createWarehouse(input: CreateWarehouseInput, ctx: SecurityContext): Promise<DbWarehouse> {
    requireAuth(ctx);
    requirePermission(ctx, "Create", "inventory");

    const existingCount = (await this.repo.findWarehouses(ctx.companyId)).length;
    const warehouseCode = `WH-${input.warehouseType.slice(0, 3)}-${String(existingCount + 1).padStart(2, "0")}`;

    const wh: DbWarehouse = {
      id: randomUUID(),
      companyId: ctx.companyId,
      projectId: input.projectId,
      siteId: input.siteId,
      warehouseCode,
      name: input.name.trim(),
      warehouseType: input.warehouseType,
      address: input.address.trim(),
      managerUserId: input.managerUserId || ctx.user.id,
      contactPhone: input.contactPhone?.trim(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.repo.createWarehouse(wh);
  }

  public async listWarehouses(ctx: SecurityContext): Promise<DbWarehouse[]> {
    requireAuth(ctx);
    requirePermission(ctx, "View", "inventory");
    return this.repo.findWarehouses(ctx.companyId);
  }

  public async updateWarehouse(
    id: string,
    input: UpdateWarehouseInput,
    ctx: SecurityContext
  ): Promise<DbWarehouse> {
    requireAuth(ctx);
    requirePermission(ctx, "Update", "inventory");

    const wh = await this.repo.findWarehouseById(id);
    if (!wh) throw new NotFoundError("Warehouse", id);
    requireTenant(ctx, wh.companyId);

    const updated = await this.repo.updateWarehouse(id, input);
    if (!updated) throw new NotFoundError("Warehouse", id);

    return updated;
  }

  public async createStorageLocation(
    input: CreateStorageLocationInput,
    ctx: SecurityContext
  ): Promise<DbStorageLocation> {
    requireAuth(ctx);
    requirePermission(ctx, "Create", "inventory");

    const wh = await this.repo.findWarehouseById(input.warehouseId);
    if (!wh) throw new NotFoundError("Warehouse", input.warehouseId);
    requireTenant(ctx, wh.companyId);

    const loc: DbStorageLocation = {
      id: randomUUID(),
      companyId: ctx.companyId,
      warehouseId: input.warehouseId,
      locationCode: input.locationCode.trim().toUpperCase(),
      name: input.name.trim(),
      description: input.description?.trim(),
      zone: input.zone || "COVERED_SHED",
      isActive: true,
      createdAt: new Date(),
    };

    return this.repo.createStorageLocation(loc);
  }

  public async listStorageLocations(warehouseId: string, ctx: SecurityContext): Promise<DbStorageLocation[]> {
    requireAuth(ctx);
    requirePermission(ctx, "View", "inventory");

    const wh = await this.repo.findWarehouseById(warehouseId);
    if (!wh) throw new NotFoundError("Warehouse", warehouseId);
    requireTenant(ctx, wh.companyId);

    return this.repo.getStorageLocations(warehouseId);
  }

  // ----------------------------------------------------------------------------
  // 3. STOCK MOVEMENTS (GRN, ISSUE, RETURN, DAMAGE, ADJUSTMENT)
  // ----------------------------------------------------------------------------

  public async recordGoodsReceiptNote(
    input: GoodsReceiptNoteInput,
    ctx: SecurityContext
  ): Promise<{ ledger: DbStockLedgerEntry; stock: DbWarehouseStock }> {
    requireAuth(ctx);
    requirePermission(ctx, "Create", "inventory");

    if (input.quantity <= 0) {
      throw new BadRequestError("GRN receipt quantity must be strictly positive");
    }

    const wh = await this.repo.findWarehouseById(input.warehouseId);
    if (!wh || !wh.isActive) throw new NotFoundError("Active Warehouse", input.warehouseId);
    requireTenant(ctx, wh.companyId);

    const mat = await this.repo.findMaterialById(input.materialId);
    if (!mat) throw new NotFoundError("Material", input.materialId);
    requireTenant(ctx, mat.companyId);

    const grnNumber = input.grnNumber || (await this.repo.generateNextDocumentNumber(ctx.companyId, "GRN"));

    const ledgerEntry: DbStockLedgerEntry = {
      id: randomUUID(),
      companyId: ctx.companyId,
      projectId: wh.projectId,
      siteId: wh.siteId,
      transactionType: "GOODS_RECEIPT_NOTE",
      materialId: input.materialId,
      destinationWarehouseId: input.warehouseId,
      destinationLocationId: input.storageLocationId,
      quantity: input.quantity,
      unit: mat.unitOfMeasurement,
      unitCost: input.unitCost,
      totalValue: Math.round(input.quantity * input.unitCost * 100) / 100,
      referenceType: "GOODS_RECEIPT_NOTE",
      referenceNumber: grnNumber,
      batchNumber: input.batchNumber?.trim(),
      performedByUserId: ctx.user.id,
      timestamp: new Date(),
      remarks: input.remarks?.trim() || `Inward GRN receipt from ${input.supplierName.trim()}`,
    };

    // Track supplier price revision history
    await this.repo.addSupplierPriceHistory({
      id: randomUUID(),
      companyId: ctx.companyId,
      materialId: input.materialId,
      supplierName: input.supplierName.trim(),
      unitRate: input.unitCost,
      effectiveDate: new Date(),
      grnReferenceNumber: grnNumber,
      notes: `PO Ref: ${input.purchaseOrderRef || "Direct Delivery"}`,
    });

    const result = await this.repo.executeStockTransaction({
      ledgerEntry,
      targetWarehouseId: input.warehouseId,
      locationId: input.storageLocationId,
      quantityDelta: input.quantity,
      newUnitCost: input.unitCost,
    });

    await auditService.logEvent({
      companyId: ctx.companyId,
      actorUserId: ctx.user.id,
      action: "INVENTORY_GRN_RECEIPT",
      tableName: "stock_ledger",
      recordId: ledgerEntry.id,
      newData: { grnNumber, material: mat.name, quantity: input.quantity, unitCost: input.unitCost },
    });

    return result;
  }

  public async issueMaterialToSite(
    input: IssueMaterialInput,
    ctx: SecurityContext
  ): Promise<{ ledger: DbStockLedgerEntry; stock: DbWarehouseStock }> {
    requireAuth(ctx);
    requirePermission(ctx, "Create", "inventory");

    if (input.quantity <= 0) {
      throw new BadRequestError("Issue quantity must be strictly positive");
    }

    const wh = await this.repo.findWarehouseById(input.warehouseId);
    if (!wh || !wh.isActive) throw new NotFoundError("Active Warehouse", input.warehouseId);
    requireTenant(ctx, wh.companyId);

    const mat = await this.repo.findMaterialById(input.materialId);
    if (!mat) throw new NotFoundError("Material", input.materialId);
    requireTenant(ctx, mat.companyId);

    // Validate available stock in warehouse
    const currentStock = await this.repo.getWarehouseStock(input.warehouseId, input.materialId, input.storageLocationId);
    if (!currentStock || currentStock.availableQuantity < input.quantity) {
      throw new BadRequestError(
        `Insufficient available stock for '${mat.name}'. Available: ${currentStock?.availableQuantity || 0} ${mat.unitOfMeasurement}, Requested: ${input.quantity}`
      );
    }

    const issueRef = input.referenceNumber || (await this.repo.generateNextDocumentNumber(ctx.companyId, "ISS"));
    const unitCost = currentStock.averageUnitCost || mat.standardRate;

    const ledgerEntry: DbStockLedgerEntry = {
      id: randomUUID(),
      companyId: ctx.companyId,
      projectId: input.projectId || wh.projectId,
      siteId: input.siteId || wh.siteId,
      transactionType: "ISSUE_TO_SITE",
      materialId: input.materialId,
      sourceWarehouseId: input.warehouseId,
      sourceLocationId: input.storageLocationId,
      quantity: input.quantity,
      unit: mat.unitOfMeasurement,
      unitCost,
      totalValue: Math.round(input.quantity * unitCost * 100) / 100,
      referenceType: "MATERIAL_REQUEST",
      referenceNumber: issueRef,
      performedByUserId: ctx.user.id,
      timestamp: new Date(),
      remarks: input.remarks?.trim() || `Material issued to ${input.issuedToPersonName.trim()}`,
    };

    const result = await this.repo.executeStockTransaction({
      ledgerEntry,
      targetWarehouseId: input.warehouseId,
      locationId: input.storageLocationId,
      quantityDelta: -input.quantity, // Deduct
    });

    await auditService.logEvent({
      companyId: ctx.companyId,
      actorUserId: ctx.user.id,
      action: "INVENTORY_ISSUE_TO_SITE",
      tableName: "stock_ledger",
      recordId: ledgerEntry.id,
      newData: { issueRef, material: mat.name, quantity: input.quantity, issuedTo: input.issuedToPersonName },
    });

    return result;
  }

  public async returnMaterialFromSite(
    input: ReturnMaterialInput,
    ctx: SecurityContext
  ): Promise<{ ledger: DbStockLedgerEntry; stock: DbWarehouseStock }> {
    requireAuth(ctx);
    requirePermission(ctx, "Create", "inventory");

    if (input.quantity <= 0) {
      throw new BadRequestError("Return quantity must be strictly positive");
    }

    const wh = await this.repo.findWarehouseById(input.warehouseId);
    if (!wh) throw new NotFoundError("Warehouse", input.warehouseId);
    requireTenant(ctx, wh.companyId);

    const mat = await this.repo.findMaterialById(input.materialId);
    if (!mat) throw new NotFoundError("Material", input.materialId);
    requireTenant(ctx, mat.companyId);

    const currentStock = await this.repo.getWarehouseStock(input.warehouseId, input.materialId, input.storageLocationId);
    const unitCost = currentStock?.averageUnitCost || mat.standardRate;
    const retNumber = input.referenceNumber || (await this.repo.generateNextDocumentNumber(ctx.companyId, "RET"));

    const ledgerEntry: DbStockLedgerEntry = {
      id: randomUUID(),
      companyId: ctx.companyId,
      projectId: input.projectId || wh.projectId,
      siteId: input.siteId || wh.siteId,
      transactionType: "RETURN_FROM_SITE",
      materialId: input.materialId,
      destinationWarehouseId: input.warehouseId,
      destinationLocationId: input.storageLocationId,
      quantity: input.quantity,
      unit: mat.unitOfMeasurement,
      unitCost,
      totalValue: Math.round(input.quantity * unitCost * 100) / 100,
      referenceType: "RETURN_VOUCHER",
      referenceNumber: retNumber,
      performedByUserId: ctx.user.id,
      timestamp: new Date(),
      remarks: input.remarks?.trim() || `Material returned from site: ${input.returnReason.trim()}`,
    };

    return this.repo.executeStockTransaction({
      ledgerEntry,
      targetWarehouseId: input.warehouseId,
      locationId: input.storageLocationId,
      quantityDelta: input.quantity, // Add back
    });
  }

  public async recordWastageOrDamage(
    input: RecordWastageOrDamageInput,
    ctx: SecurityContext
  ): Promise<{ ledger: DbStockLedgerEntry; stock: DbWarehouseStock }> {
    requireAuth(ctx);
    requirePermission(ctx, "Update", "inventory");

    if (input.quantity <= 0) {
      throw new BadRequestError("Wastage/Damage quantity must be strictly positive");
    }

    const wh = await this.repo.findWarehouseById(input.warehouseId);
    if (!wh) throw new NotFoundError("Warehouse", input.warehouseId);
    requireTenant(ctx, wh.companyId);

    const mat = await this.repo.findMaterialById(input.materialId);
    if (!mat) throw new NotFoundError("Material", input.materialId);
    requireTenant(ctx, mat.companyId);

    const currentStock = await this.repo.getWarehouseStock(input.warehouseId, input.materialId, input.storageLocationId);
    if (!currentStock || currentStock.quantity < input.quantity) {
      throw new BadRequestError(`Insufficient stock in warehouse for write-off. Available: ${currentStock?.quantity || 0}`);
    }

    const unitCost = currentStock.averageUnitCost || mat.standardRate;
    const transactionType = input.isDamage ? "DAMAGED_WRITE_OFF" : "WASTAGE_CONSUMPTION";
    const refNumber = input.referenceNumber || (await this.repo.generateNextDocumentNumber(ctx.companyId, input.isDamage ? "DMG" : "WST"));

    const ledgerEntry: DbStockLedgerEntry = {
      id: randomUUID(),
      companyId: ctx.companyId,
      projectId: input.projectId || wh.projectId,
      siteId: input.siteId || wh.siteId,
      transactionType,
      materialId: input.materialId,
      sourceWarehouseId: input.warehouseId,
      sourceLocationId: input.storageLocationId,
      quantity: input.quantity,
      unit: mat.unitOfMeasurement,
      unitCost,
      totalValue: Math.round(input.quantity * unitCost * 100) / 100,
      referenceType: "DAMAGE_REPORT",
      referenceNumber: refNumber,
      performedByUserId: ctx.user.id,
      timestamp: new Date(),
      remarks: input.remarks?.trim() || `Root cause: ${input.rootCause.trim()}`,
    };

    return this.repo.executeStockTransaction({
      ledgerEntry,
      targetWarehouseId: input.warehouseId,
      locationId: input.storageLocationId,
      quantityDelta: -input.quantity,
    });
  }

  public async reconcileStockAdjustment(
    input: StockAdjustmentInput,
    ctx: SecurityContext
  ): Promise<{ ledger: DbStockLedgerEntry; stock: DbWarehouseStock }> {
    requireAuth(ctx);
    requirePermission(ctx, "Approve", "inventory");

    if (input.actualPhysicalQuantity < 0) {
      throw new BadRequestError("Physical count cannot be negative");
    }

    const wh = await this.repo.findWarehouseById(input.warehouseId);
    if (!wh) throw new NotFoundError("Warehouse", input.warehouseId);
    requireTenant(ctx, wh.companyId);

    const mat = await this.repo.findMaterialById(input.materialId);
    if (!mat) throw new NotFoundError("Material", input.materialId);
    requireTenant(ctx, mat.companyId);

    const currentStock = await this.repo.getWarehouseStock(input.warehouseId, input.materialId, input.storageLocationId);
    const bookQuantity = currentStock?.quantity || 0;
    const quantityDelta = input.actualPhysicalQuantity - bookQuantity;

    if (Math.abs(quantityDelta) < 0.0001) {
      throw new BadRequestError("Physical quantity matches current book balance; no adjustment needed");
    }

    const unitCost = currentStock?.averageUnitCost || mat.standardRate;
    const adjNumber = await this.repo.generateNextDocumentNumber(ctx.companyId, "ADJ");

    const ledgerEntry: DbStockLedgerEntry = {
      id: randomUUID(),
      companyId: ctx.companyId,
      projectId: wh.projectId,
      siteId: wh.siteId,
      transactionType: "PHYSICAL_AUDIT_RECONCILIATION",
      materialId: input.materialId,
      sourceWarehouseId: quantityDelta < 0 ? input.warehouseId : undefined,
      destinationWarehouseId: quantityDelta > 0 ? input.warehouseId : undefined,
      sourceLocationId: input.storageLocationId,
      quantity: Math.abs(quantityDelta),
      unit: mat.unitOfMeasurement,
      unitCost,
      totalValue: Math.round(Math.abs(quantityDelta) * unitCost * 100) / 100,
      referenceType: "AUDIT_RECONCILIATION",
      referenceNumber: adjNumber,
      performedByUserId: ctx.user.id,
      timestamp: new Date(),
      remarks: `Stock reconciliation (Book: ${bookQuantity}, Physical: ${input.actualPhysicalQuantity}). Reason: ${input.adjustmentReason.trim()}`,
    };

    return this.repo.executeStockTransaction({
      ledgerEntry,
      targetWarehouseId: input.warehouseId,
      locationId: input.storageLocationId,
      quantityDelta,
    });
  }

  // ----------------------------------------------------------------------------
  // 4. INTER-WAREHOUSE TRANSFERS
  // ----------------------------------------------------------------------------

  public async initiateStockTransfer(
    input: InitiateStockTransferInput,
    ctx: SecurityContext
  ): Promise<DbStockTransfer> {
    requireAuth(ctx);
    requirePermission(ctx, "Create", "inventory");

    if (input.sourceWarehouseId === input.destinationWarehouseId) {
      throw new BadRequestError("Source and destination warehouse cannot be the same");
    }
    if (input.quantity <= 0) {
      throw new BadRequestError("Transfer quantity must be strictly positive");
    }

    const srcWh = await this.repo.findWarehouseById(input.sourceWarehouseId);
    const destWh = await this.repo.findWarehouseById(input.destinationWarehouseId);
    if (!srcWh || !destWh) throw new NotFoundError("Warehouse", "Source or Destination not found");
    requireTenant(ctx, srcWh.companyId);
    requireTenant(ctx, destWh.companyId);

    const mat = await this.repo.findMaterialById(input.materialId);
    if (!mat) throw new NotFoundError("Material", input.materialId);

    // Validate available stock at source
    const srcStock = await this.repo.getWarehouseStock(input.sourceWarehouseId, input.materialId);
    if (!srcStock || srcStock.availableQuantity < input.quantity) {
      throw new BadRequestError(`Insufficient stock in source warehouse '${srcWh.name}'. Available: ${srcStock?.availableQuantity || 0}`);
    }

    const transferCode = await this.repo.generateNextTransferCode(ctx.companyId);
    const unitCost = srcStock.averageUnitCost || mat.standardRate;

    // Deduct from source warehouse
    const outLedger: DbStockLedgerEntry = {
      id: randomUUID(),
      companyId: ctx.companyId,
      transactionType: "INTER_WAREHOUSE_TRANSFER_OUT",
      materialId: input.materialId,
      sourceWarehouseId: input.sourceWarehouseId,
      destinationWarehouseId: input.destinationWarehouseId,
      quantity: input.quantity,
      unit: mat.unitOfMeasurement,
      unitCost,
      totalValue: Math.round(input.quantity * unitCost * 100) / 100,
      referenceType: "TRANSFER_CHALLAN",
      referenceNumber: transferCode,
      performedByUserId: ctx.user.id,
      timestamp: new Date(),
      remarks: `Stock transfer dispatched to ${destWh.name}. Vehicle: ${input.vehicleNumber || "N/A"}`,
    };

    await this.repo.executeStockTransaction({
      ledgerEntry: outLedger,
      targetWarehouseId: input.sourceWarehouseId,
      quantityDelta: -input.quantity,
    });

    const transfer: DbStockTransfer = {
      id: randomUUID(),
      companyId: ctx.companyId,
      transferCode,
      sourceWarehouseId: input.sourceWarehouseId,
      destinationWarehouseId: input.destinationWarehouseId,
      materialId: input.materialId,
      quantity: input.quantity,
      unit: mat.unitOfMeasurement,
      status: "DISPATCHED",
      initiatedByUserId: ctx.user.id,
      dispatchedAt: new Date(),
      vehicleNumber: input.vehicleNumber?.trim(),
      challanNumber: transferCode,
      notes: input.notes?.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.repo.createStockTransfer(transfer);
  }

  public async receiveStockTransfer(
    input: ReceiveStockTransferInput,
    ctx: SecurityContext
  ): Promise<DbStockTransfer> {
    requireAuth(ctx);
    requirePermission(ctx, "Update", "inventory");

    const transfer = await this.repo.findStockTransferById(input.transferId);
    if (!transfer) throw new NotFoundError("StockTransfer", input.transferId);
    requireTenant(ctx, transfer.companyId);

    if (transfer.status === "RECEIVED") {
      throw new BadRequestError("Transfer has already been received");
    }

    const mat = await this.repo.findMaterialById(transfer.materialId);
    if (!mat) throw new NotFoundError("Material", transfer.materialId);

    // Inward entry into destination warehouse
    const inLedger: DbStockLedgerEntry = {
      id: randomUUID(),
      companyId: ctx.companyId,
      transactionType: "INTER_WAREHOUSE_TRANSFER_IN",
      materialId: transfer.materialId,
      sourceWarehouseId: transfer.sourceWarehouseId,
      destinationWarehouseId: transfer.destinationWarehouseId,
      destinationLocationId: input.destinationLocationId,
      quantity: transfer.quantity,
      unit: transfer.unit,
      unitCost: mat.standardRate,
      totalValue: Math.round(transfer.quantity * mat.standardRate * 100) / 100,
      referenceType: "TRANSFER_CHALLAN",
      referenceNumber: transfer.transferCode,
      performedByUserId: ctx.user.id,
      timestamp: new Date(),
      remarks: `Transfer receipt verified at destination warehouse. Notes: ${input.notes || "None"}`,
    };

    await this.repo.executeStockTransaction({
      ledgerEntry: inLedger,
      targetWarehouseId: transfer.destinationWarehouseId,
      locationId: input.destinationLocationId,
      quantityDelta: transfer.quantity,
    });

    const updated = await this.repo.updateStockTransfer(transfer.id, {
      status: "RECEIVED",
      receivedByUserId: ctx.user.id,
      receivedAt: new Date(),
    });

    return updated!;
  }

  public async listStockTransfers(ctx: SecurityContext): Promise<DbStockTransfer[]> {
    requireAuth(ctx);
    requirePermission(ctx, "View", "inventory");
    return this.repo.findStockTransfers(ctx.companyId);
  }

  // ----------------------------------------------------------------------------
  // 5. MATERIAL REQUEST WORKFLOW
  // ----------------------------------------------------------------------------

  public async createMaterialRequest(
    input: CreateMaterialRequestInput,
    ctx: SecurityContext
  ): Promise<DbMaterialRequest> {
    requireAuth(ctx);
    requireProjectAccess(ctx, input.projectId);
    requirePermission(ctx, "Create", "inventory", { projectId: input.projectId });

    if (!input.items || input.items.length === 0) {
      throw new BadRequestError("Material request must contain at least one item");
    }

    const requestCode = await this.repo.generateNextMaterialRequestCode(ctx.companyId);

    const req: DbMaterialRequest = {
      id: randomUUID(),
      companyId: ctx.companyId,
      projectId: input.projectId,
      siteId: input.siteId,
      requestCode,
      priority: input.priority || "NORMAL",
      requestedByUserId: ctx.user.id,
      targetSiteId: input.targetSiteId || input.siteId,
      dateRequired: new Date(input.dateRequired),
      status: "SUBMITTED",
      items: input.items.map((item) => ({
        id: randomUUID(),
        requestId: "",
        materialId: item.materialId,
        requestedQuantity: item.requestedQuantity,
        issuedQuantity: 0,
        unit: item.unit,
        remarks: item.remarks?.trim(),
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    req.items.forEach((item) => (item.requestId = req.id));

    return this.repo.createMaterialRequest(req);
  }

  public async approveMaterialRequest(
    input: ApproveMaterialRequestInput,
    ctx: SecurityContext
  ): Promise<DbMaterialRequest> {
    requireAuth(ctx);
    requirePermission(ctx, "Approve", "inventory");

    const req = await this.repo.findMaterialRequestById(input.requestId);
    if (!req) throw new NotFoundError("MaterialRequest", input.requestId);
    requireTenant(ctx, req.companyId);

    const updatedItems = req.items.map((item) => {
      const match = input.approvedItems?.find((ai) => ai.materialId === item.materialId);
      return {
        ...item,
        approvedQuantity: match ? match.approvedQuantity : item.requestedQuantity,
      };
    });

    const updated = await this.repo.updateMaterialRequest(req.id, {
      status: "PM_APPROVED",
      approvedByUserId: ctx.user.id,
      approvalNotes: input.notes?.trim(),
      sourceWarehouseId: input.sourceWarehouseId,
      items: updatedItems,
    });

    return updated!;
  }

  public async rejectMaterialRequest(
    input: RejectMaterialRequestInput,
    ctx: SecurityContext
  ): Promise<DbMaterialRequest> {
    requireAuth(ctx);
    requirePermission(ctx, "Approve", "inventory");

    const req = await this.repo.findMaterialRequestById(input.requestId);
    if (!req) throw new NotFoundError("MaterialRequest", input.requestId);
    requireTenant(ctx, req.companyId);

    const updated = await this.repo.updateMaterialRequest(req.id, {
      status: "REJECTED",
      approvalNotes: input.rejectionReason.trim(),
    });

    return updated!;
  }

  public async fulfillMaterialRequest(
    input: FulfillMaterialRequestInput,
    ctx: SecurityContext
  ): Promise<DbMaterialRequest> {
    requireAuth(ctx);
    requirePermission(ctx, "Update", "inventory");

    const req = await this.repo.findMaterialRequestById(input.requestId);
    if (!req) throw new NotFoundError("MaterialRequest", input.requestId);
    requireTenant(ctx, req.companyId);

    if (req.status !== "PM_APPROVED" && req.status !== "STORE_CHECKED") {
      throw new BadRequestError(`Cannot fulfill request in status '${req.status}'. Must be PM_APPROVED.`);
    }

    const warehouseId = req.sourceWarehouseId;
    if (!warehouseId) {
      throw new BadRequestError("Source warehouse must be assigned before fulfillment");
    }

    // Issue each item atomically and record ledger
    for (const item of req.items) {
      const qtyToIssue = (item.approvedQuantity ?? item.requestedQuantity) - item.issuedQuantity;
      if (qtyToIssue > 0) {
        await this.issueMaterialToSite(
          {
            warehouseId,
            materialId: item.materialId,
            quantity: qtyToIssue,
            projectId: req.projectId,
            siteId: req.targetSiteId,
            issuedToPersonName: `Indent Fulfillment: ${req.requestCode}`,
            materialRequestId: req.id,
            referenceNumber: input.deliveryChallanNumber || req.requestCode,
            remarks: input.notes,
          },
          ctx
        );
        item.issuedQuantity += qtyToIssue;
      }
    }

    const updated = await this.repo.updateMaterialRequest(req.id, {
      status: "DELIVERED",
      items: req.items,
    });

    return updated!;
  }

  public async listMaterialRequests(
    ctx: SecurityContext,
    filters: { projectId?: string; status?: string } = {}
  ): Promise<DbMaterialRequest[]> {
    requireAuth(ctx);
    requirePermission(ctx, "View", "inventory");
    return this.repo.findMaterialRequests(ctx.companyId, filters);
  }

  // ----------------------------------------------------------------------------
  // 6. DASHBOARDS & ANALYTICS
  // ----------------------------------------------------------------------------

  public async getInventoryDashboard(ctx: SecurityContext): Promise<InventoryDashboardData> {
    requireAuth(ctx);
    requirePermission(ctx, "View", "inventory");
    return this.repo.getInventoryDashboard(ctx.companyId);
  }

  public async getInventoryValuation(ctx: SecurityContext): Promise<InventoryValuationSummary> {
    requireAuth(ctx);
    requirePermission(ctx, "View", "inventory");
    return this.repo.calculateInventoryValuation(ctx.companyId);
  }

  public async getStockAgeingReport(ctx: SecurityContext): Promise<StockAgeingReport[]> {
    requireAuth(ctx);
    requirePermission(ctx, "View", "inventory");
    return this.repo.calculateStockAgeing(ctx.companyId);
  }

  public async getStockLedger(
    ctx: SecurityContext,
    filters: {
      materialId?: string;
      warehouseId?: string;
      transactionType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<DbStockLedgerEntry[]> {
    requireAuth(ctx);
    requirePermission(ctx, "View", "inventory");
    return this.repo.getStockLedger(ctx.companyId, filters);
  }
}

export const inventoryService = new InventoryService();
