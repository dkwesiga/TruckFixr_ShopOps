export type LocalDocKind = "estimate" | "invoice";

/**
 * local   — created/edited on this device, not yet pushed
 * syncing — push in progress
 * synced  — mirrored to the server (serverId set)
 * error   — last push failed (retryable)
 */
export type DocSyncState = "local" | "syncing" | "synced" | "error";

export interface LocalDocLine {
  id: string;
  type: "labour" | "part" | "fee";
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
}

export interface LocalDocument {
  id: string; // client-generated uuid (stable across syncs)
  kind: LocalDocKind;
  serverId?: string; // estimate/invoice id once mirrored
  serverNumber?: string; // EST-/INV- number once mirrored
  customerId?: string; // server customer id (chosen from the ref cache)
  customerName?: string; // denormalized for offline display
  vehicleId?: string;
  vehicleLabel?: string;
  complaint?: string;
  lines: LocalDocLine[];
  taxRate: number; // cached company rate, for local totals
  taxExempt?: boolean;
  syncState: DocSyncState;
  syncError?: string | null;
  createdAt: number;
  updatedAt: number; // logical clock — bumped on every local edit (drives last-write-wins)
  syncedAt?: number;
}

export interface SyncLogEntry {
  id: string;
  docId: string;
  kind: LocalDocKind;
  outcome: "created" | "updated" | "error";
  message?: string;
  at: number;
}

// Snapshot of server reference data cached for offline editing.
export interface RefCustomer {
  id: string;
  name: string;
  companyName: string | null;
  taxExempt: boolean;
  vehicles: { id: string; label: string }[];
}

export interface RefItem {
  id: string;
  type: "labour" | "part" | "fee";
  name: string;
  partNumber: string | null;
  unitPrice: number;
  defaultQty: number;
  taxable: boolean;
}

export interface RefCache {
  customers: RefCustomer[];
  items: RefItem[];
  taxRate: number;
  updatedAt: number;
}
