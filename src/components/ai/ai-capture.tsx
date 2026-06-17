"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { commitEstimateDraft, commitInvoiceDraft, type CommitLineInput } from "@/lib/actions/ai-capture";

type ItemType = "labour" | "part" | "fee";

interface DraftLine {
  type: ItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  confidence: number;
  matchedItemId: string | null;
}

interface DraftResult {
  complaint: string | null;
  recommendedWork: string | null;
  customerNote: string | null;
  internalNote: string | null;
  lines: DraftLine[];
}

interface EditableLine extends DraftLine {
  include: boolean;
  originalDescription: string;
}

type Method = "text" | "voice" | "photo";

export function AiCapture({
  kind,
  docId,
  transcriptionEnabled,
  extractionEnabled,
}: {
  kind: "estimate" | "invoice";
  docId: string;
  transcriptionEnabled: boolean;
  extractionEnabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<Method>("text");
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState<null | "transcribing" | "drafting" | "committing">(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<EditableLine[] | null>(null);
  const [meta, setMeta] = useState<Omit<DraftResult, "lines"> | null>(null);
  const [fromImage, setFromImage] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  if (!extractionEnabled) return null;

  function reset() {
    setText("");
    setImage(null);
    setDrafts(null);
    setMeta(null);
    setError(null);
    setFromImage(false);
  }

  // --- Voice ---------------------------------------------------------------
  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        await transcribe(blob);
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch {
      setError("Microphone access was blocked.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  async function transcribe(blob: Blob) {
    setBusy("transcribing");
    setError(null);
    try {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      const res = await fetch("/api/ai/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed.");
      setText((prev) => (prev ? `${prev} ${data.text}` : data.text));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transcription failed.");
    } finally {
      setBusy(null);
    }
  }

  // --- Photo ---------------------------------------------------------------
  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      setImage(await downscaleToDataUrl(file));
    } catch {
      setError("Could not read that image.");
    }
  }

  // --- Draft ---------------------------------------------------------------
  async function draft() {
    setBusy("drafting");
    setError(null);
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          [kind === "estimate" ? "estimateId" : "invoiceId"]: docId,
          text: text || undefined,
          image: method === "photo" ? image || undefined : undefined,
        }),
      });
      const data: DraftResult & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || "Drafting failed.");
      setFromImage(method === "photo");
      setMeta({ complaint: data.complaint, recommendedWork: data.recommendedWork, customerNote: data.customerNote, internalNote: data.internalNote });
      setDrafts(
        data.lines.map((l) => ({ ...l, include: true, originalDescription: l.description }))
      );
      if (data.lines.length === 0) setError("The AI couldn't draft any lines from that. Try adding more detail.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Drafting failed.");
    } finally {
      setBusy(null);
    }
  }

  function patch(idx: number, changes: Partial<EditableLine>) {
    setDrafts((cur) => cur && cur.map((l, i) => (i === idx ? { ...l, ...changes } : l)));
  }

  // --- Commit --------------------------------------------------------------
  async function commit() {
    if (!drafts) return;
    const chosen = drafts.filter((l) => l.include && l.description.trim());
    if (chosen.length === 0) {
      setError("Select at least one line to add.");
      return;
    }
    setBusy("committing");
    setError(null);
    const payload: CommitLineInput[] = chosen.map((l) => ({
      type: l.type,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxable: l.taxable,
      confidence: l.confidence,
      matchedItemId: l.matchedItemId,
      aiOriginalDescription: l.originalDescription,
    }));
    try {
      const commitFn = kind === "estimate" ? commitEstimateDraft : commitInvoiceDraft;
      await commitFn(docId, payload, {
        complaint: meta?.complaint,
        recommendedWork: meta?.recommendedWork,
        customerNote: meta?.customerNote,
        internalNote: meta?.internalNote,
        fromImage,
      });
      reset();
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add lines.");
    } finally {
      setBusy(null);
    }
  }

  // --- Render --------------------------------------------------------------
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#9cb6dc] bg-[#eef4ff] px-4 py-3 text-sm font-bold text-[#004787] active:bg-[#dfeaff]"
      >
        <Sparkle /> Draft lines with AI
      </button>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-[#c2c6d3] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-bold text-[#004787]"><Sparkle /> AI Capture</p>
        <button type="button" onClick={() => { reset(); setOpen(false); }} className="text-xs font-semibold text-[#5f6673]">Close</button>
      </div>

      {!drafts && (
        <>
          {/* Method tabs */}
          <div className="flex gap-1.5 rounded-lg bg-[#eef0f5] p-1">
            {([["text", "Type"], ["voice", "Voice"], ["photo", "Photo"]] as const).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                disabled={m === "voice" && !transcriptionEnabled}
                className={`min-h-10 flex-1 rounded-md py-1.5 text-xs font-bold transition-colors ${
                  method === m ? "bg-white text-[#004787] shadow-sm" : "text-[#5f6673]"
                } ${m === "voice" && !transcriptionEnabled ? "opacity-40" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>

          {method === "voice" && (
            <div className="space-y-2">
              {!recording ? (
                <Button type="button" variant="secondary" size="md" className="w-full" onClick={startRecording} disabled={busy !== null}>
                  {busy === "transcribing" ? "Transcribing..." : "Speak Description"}
                </Button>
              ) : (
                <Button type="button" variant="destructive" size="md" className="w-full" onClick={stopRecording}>
                  Stop and transcribe
                </Button>
              )}
            </div>
          )}

          {method === "photo" && (
            <div className="space-y-2">
              <label className="block">
                <span className="sr-only">Photo</span>
                <input type="file" accept="image/*" capture="environment" onChange={onPickImage} className="block w-full text-xs text-[#5f6673] file:mr-3 file:rounded-lg file:border-0 file:bg-[#eef4ff] file:px-3 file:py-2 file:font-semibold file:text-[#004787]" />
              </label>
              {/* eslint-disable-next-line @next/next/no-img-element -- transient data-URL preview, not a hostable asset */}
              {image && <img src={image} alt="capture preview" className="max-h-48 w-full rounded-lg border border-[#c2c6d3] object-contain" />}
            </div>
          )}

          {(method === "text" || method === "voice") && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder={method === "voice" ? "Transcript appears here - edit if needed" : "Describe the work, for example: replaced both steer tires and did a front brake job"}
              className="w-full rounded-lg border border-[#c2c6d3] px-3.5 py-3 text-sm text-[#191c20] placeholder:text-[#858b98] focus:outline-none focus:ring-2 focus:ring-[#004787]"
            />
          )}

          {error && <p className="text-xs font-semibold text-[#d32f2f]">{error}</p>}

          <Button
            type="button"
            size="md"
            className="w-full"
            onClick={draft}
            disabled={busy !== null || (method === "photo" ? !image : !text.trim())}
          >
            {busy === "drafting" ? "Drafting..." : "Draft with AI"}
          </Button>
          <p className="rounded-lg bg-[#eef4ff] px-3 py-2 text-[11px] font-medium text-[#004787]">
            AI suggestions are marked for your review. Nothing is added until you confirm.
          </p>
        </>
      )}

      {/* Review */}
      {drafts && (
        <div className="space-y-3">
          {drafts.length > 0 && (
            <p className="rounded-lg bg-[#eef4ff] px-3 py-2 text-xs font-medium text-[#004787]">
              Review the suggestions, edit anything, then add. Low-confidence lines are flagged.
            </p>
          )}
          <div className="space-y-2">
            {drafts.map((l, idx) => (
              <DraftRow key={idx} line={l} onChange={(c) => patch(idx, c)} />
            ))}
          </div>

          {error && <p className="text-xs font-semibold text-[#d32f2f]">{error}</p>}

          <div className="flex gap-2">
            <Button type="button" size="md" className="flex-1" onClick={commit} disabled={busy !== null}>
              {busy === "committing" ? "Adding..." : `Add ${drafts.filter((l) => l.include).length} line(s)`}
            </Button>
            <Button type="button" variant="secondary" size="md" onClick={() => { setDrafts(null); setMeta(null); setError(null); }}>
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DraftRow({ line, onChange }: { line: EditableLine; onChange: (c: Partial<EditableLine>) => void }) {
  const low = line.confidence < 0.5;
  const mid = line.confidence >= 0.5 && line.confidence < 0.75;
  return (
    <div className={`space-y-2 rounded-lg border p-3 ${line.include ? (low ? "border-[#d32f2f] bg-[#fdecec]" : "border-[#b7c8e8] bg-[#eef4ff]") : "border-[#c2c6d3] opacity-60"}`}>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={line.include} onChange={(e) => onChange({ include: e.target.checked })} className="h-4 w-4 rounded border-[#c2c6d3] text-[#004787]" />
        <select value={line.type} onChange={(e) => onChange({ type: e.target.value as ItemType })} className="rounded-lg border border-[#c2c6d3] bg-white px-2 py-1 text-xs">
          <option value="part">Part</option>
          <option value="labour">Labour</option>
          <option value="fee">Fee</option>
        </select>
        {low && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#d32f2f]">Low confidence</span>}
        {mid && <span className="rounded-full bg-[#fff3e8] px-2 py-0.5 text-[10px] font-bold text-[#b95c14]">Review</span>}
        {!line.matchedItemId && <span className="text-[10px] font-semibold text-[#5f6673]">new</span>}
      </div>
      <input
        value={line.description}
        onChange={(e) => onChange({ description: e.target.value })}
        className="w-full rounded-lg border border-[#c2c6d3] bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#004787]"
      />
      <div className="grid grid-cols-2 gap-2">
        <input type="number" step="0.01" min="0" value={line.quantity} onChange={(e) => onChange({ quantity: parseFloat(e.target.value) || 0 })} className="rounded-lg border border-[#c2c6d3] bg-white px-2.5 py-1.5 text-sm" placeholder="Qty" />
        <input type="number" step="0.01" min="0" value={line.unitPrice} onChange={(e) => onChange({ unitPrice: parseFloat(e.target.value) || 0 })} className="rounded-lg border border-[#c2c6d3] bg-white px-2.5 py-1.5 text-sm" placeholder="Unit price" />
      </div>
    </div>
  );
}

function Sparkle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
    </svg>
  );
}

/** Downscale an image client-side to keep the upload payload small. */
async function downscaleToDataUrl(file: File, maxDim = 1280): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  if (scale === 1) return dataUrl;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}
