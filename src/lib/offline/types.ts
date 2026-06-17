export type CaptureKind = "text" | "voice" | "photo";

/**
 * queued     — saved on device, not yet processed
 * processing — being transcribed / drafted (online)
 * ready      — draft available (or raw note when AI is off), awaiting the owner
 * error      — processing failed on the server (retryable)
 * applied    — turned into an estimate/invoice
 */
export type CaptureStatus = "queued" | "processing" | "ready" | "error" | "applied";

export interface DraftLineLite {
  type: "labour" | "part" | "fee";
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  confidence: number;
  matchedItemId: string | null;
}

export interface CaptureDraft {
  complaint: string | null;
  recommendedWork: string | null;
  customerNote: string | null;
  internalNote: string | null;
  lines: DraftLineLite[];
}

export interface CaptureRecord {
  id: string;
  kind: CaptureKind;
  status: CaptureStatus;
  /** Typed note, or the transcript once a voice clip is processed. */
  text?: string;
  imageDataUrl?: string;
  audio?: Blob;
  fromImage?: boolean;
  draft?: CaptureDraft | null;
  errorMessage?: string | null;
  /** The doc this was turned into, once applied. */
  appliedKind?: "estimate" | "invoice";
  appliedDocId?: string;
  createdAt: number;
  updatedAt: number;
}
