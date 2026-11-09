// ==============================================================================
// CONSTRUCT360 INVENTORY & WAREHOUSE MANAGEMENT TYPES & DTOs
// Material Master, Stock Balances, Immutable Ledger, Requests & Valuation
// ==============================================================================

import type {
  DbMaterial,
  DbMaterialRequest,
  DbMaterialRequestItem,
  DbStockLedgerEntry,
  DbStockTransfer,
  DbStorageLocation,
  DbSupplierPriceHistory,
  DbWarehouse,
  DbWarehouseStock,
  InventoryReferenceType,
  InventoryUnit,
  MaterialCategory,
  MaterialRequestStatus,
  MaterialStatus,
  RequestPriority,
  StockTransactionType,
  StockTransferStatus,
  WarehouseType,
} from "../../db/types";

// ----------------------------------------------------------------------------
// 1. MATERIAL MASTER DTOs
// ----------------------------------------------------------------------------

export interface CreateMaterialInput {
  name: string;
  category: MaterialCategory;
  unitOfMeasurement: InventoryUnit;
  brand?: string;
  specification?: string;
  standardRate: number;
  preferredSupplier?: string;
  minimumStock: number;
  maximumStock: number;
  reorderLevel?: number;
  hsnCode?: string;
  gstPercent?: number;
  barcode?: string;
}

export interface UpdateMaterialInput {
  name?: string;
  category?: MaterialCategory;
  unitOfMeasurement?: InventoryUnit;
  brand?: string;
  specification?: string;
  standardRate?: number;
  preferredSupplier?: string;
  minimumStock?: number;
  maximumStock?: number;
  reorderLevel?: number;
  hsnCode?: string;
  gstPercent?: number;
  barcode?: string;
  status?: MaterialStatus;
}

export interface QueryMaterialsParams {
  search?: string;
  category?: MaterialCategory;
  status?: MaterialStatus;
  lowStockOnly?: boolean;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// 2. WAREHOUSE & LOCATION DTOs
// ----------------------------------------------------------------------------

export interface CreateWarehouseInput {
  name: string;
  warehouseType: WarehouseType;
  address: string;
  projectId?: string;
  siteId?: string;
  managerUserId?: string;
  contactPhone?: string;
}

export interface UpdateWarehouseInput {
  name?: string;
  warehouseType?: WarehouseType;
  address?: string;
  managerUserId?: string;
  contactPhone?: string;
  isActive?: boolean;
}

export interface CreateStorageLocationInput {
  warehouseId: string;
  locationCode: string;
  name: string;
  description?: string;
  zone?: "DRY_STORAGE" | "OPEN_YARD" | "HAZMAT" | "COVERED_SHED" | "ENCLOSED_RACK";
}

// ----------------------------------------------------------------------------
// 3. STOCK MOVEMENTS & LEDGER DTOs
// ----------------------------------------------------------------------------

export interface GoodsReceiptNoteInput {
  warehouseId: string;
  storageLocationId?: string;
  materialId: string;
  quantity: number; // Positive decimal
  unitCost: number; // Rate per unit
  supplierName: string;
  purchaseOrderRef?: string;
  grnNumber?: string;
  batchNumber?: string;
  remarks?: string;
}

export interface IssueMaterialInput {
  warehouseId: string;
  storageLocationId?: string;
  materialId: string;
  quantity: number; // Positive decimal
  projectId?: string;
  siteId?: string;
  contractorId?: string;
  issuedToPersonName: string;
  materialRequestId?: string;
  referenceNumber?: string;
  remarks?: string;
}

export interface ReturnMaterialInput {
  warehouseId: string;
  storageLocationId?: string;
  materialId: string;
  quantity: number;
  projectId?: string;
  siteId?: string;
  returnReason: string;
  referenceNumber?: string;
  remarks?: string;
}

export interface RecordWastageOrDamageInput {
  warehouseId: string;
  storageLocationId?: string;
  materialId: string;
  quantity: number;
  isDamage: boolean; // true = DAMAGED_WRITE_OFF, false = WASTAGE_CONSUMPTION
  rootCause: string;
  projectId?: string;
  siteId?: string;
  referenceNumber?: string;
  remarks?: string;
}

export interface StockAdjustmentInput {
  warehouseId: string;
  storageLocationId?: string;
  materialId: string;
  actualPhysicalQuantity: number;
  adjustmentReason: string;
  remarks?: string;
}

// ----------------------------------------------------------------------------
// 4. INTER-WAREHOUSE STOCK TRANSFER DTOs
// ----------------------------------------------------------------------------

export interface InitiateStockTransferInput {
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  materialId: string;
  quantity: number;
  vehicleNumber?: string;
  notes?: string;
}

export interface ReceiveStockTransferInput {
  transferId: string;
  destinationLocationId?: string;
  notes?: string;
}

// ----------------------------------------------------------------------------
// 5. MATERIAL REQUEST WORKFLOW DTOs
// ----------------------------------------------------------------------------

export interface CreateMaterialRequestInput {
  projectId: string;
  siteId: string;
  priority?: RequestPriority;
  dateRequired: string; // ISO date
  targetSiteId?: string;
  items: Array<{
    materialId: string;
    requestedQuantity: number;
    unit: InventoryUnit;
    remarks?: string;
  }>;
}

export interface ApproveMaterialRequestInput {
  requestId: string;
  sourceWarehouseId: string;
  notes?: string;
  approvedItems?: Array<{
    materialId: string;
    approvedQuantity: number;
  }>;
}

export interface RejectMaterialRequestInput {
  requestId: string;
  rejectionReason: string;
}

export interface FulfillMaterialRequestInput {
  requestId: string;
  deliveryChallanNumber?: string;
  notes?: string;
}

// ----------------------------------------------------------------------------
// 6. DASHBOARD & ADVANCED ANALYTICS DTOs
// ----------------------------------------------------------------------------

export interface MaterialWithStock extends DbMaterial {
  totalQuantityOnHand: number;
  totalAvailableQuantity: number;
  totalAllocatedQuantity: number;
  totalInventoryValue: number;
  isLowStock: boolean;
  warehousesDistribution: Array<{
    warehouseId: string;
    warehouseName: string;
    warehouseCode: string;
    quantity: number;
    availableQuantity: number;
  }>;
}

export interface StockAgeingReport {
  materialId: string;
  materialCode: string;
  name: string;
  unit: InventoryUnit;
  totalStock: number;
  value: number;
  days0to30: number;
  days31to60: number;
  days61to90: number;
  daysOver90: number;
  isPerishableAlert: boolean; // Cement older than 60 days
}

export interface InventoryValuationSummary {
  totalInventoryValuationINR: number;
  totalMaterialsCount: number;
  totalWarehousesCount: number;
  categoryValuation: Array<{
    category: MaterialCategory;
    itemCount: number;
    totalQuantity: number;
    totalValueINR: number;
    percentOfTotalValuation: number;
  }>;
}

export interface InventoryDashboardData {
  totalMaterialsCount: number;
  totalStockValueINR: number;
  lowStockItemsCount: number;
  activeWarehousesCount: number;
  pendingRequestsCount: number;
  inTransitTransfersCount: number;
  recentMovements: DbStockLedgerEntry[];
  lowStockAlerts: Array<{
    materialId: string;
    materialCode: string;
    name: string;
    category: MaterialCategory;
    currentStock: number;
    minimumStock: number;
    unit: InventoryUnit;
    standardRate: number;
  }>;
  categoryDistribution: Array<{
    category: MaterialCategory;
    count: number;
    valueINR: number;
  }>;
  warehouseQuantities: Array<{
    warehouseId: string;
    warehouseName: string;
    warehouseCode: string;
    totalItems: number;
    totalValuationINR: number;
  }>;
}
