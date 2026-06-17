"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOffline } from "@/lib/offline/provider";
import { Button } from "@/components/ui/button";

type Method = "text" | "voice" | "photo";

/** Capture a note/voice/photo straight to the on-device queue — works fully offline. */
export function CaptureComposer() {
  const router = useRouter();
  const { enqueue, online } = useOffline();
  const [method, setMethod] = useState<Method>("text");
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setAudio(new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }));
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

  const canSave =
    (method === "text" && text.trim().length > 0) ||
    (method === "photo" && !!image) ||
    (method === "voice" && (!!audio || text.trim().length > 0));

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      if (method === "text") await enqueue({ kind: "text", text: text.trim() });
      else if (method === "photo") await enqueue({ kind: "photo", imageDataUrl: image!, fromImage: true });
      else await enqueue({ kind: "voice", audio: audio ?? undefined, text: text.trim() || undefined });
      router.push("/capture");
    } catch {
      setError("Couldn’t save the capture.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="industrial-card p-1 flex gap-1">
        {(["text", "voice", "photo"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={`flex-1 py-2 rounded-md text-sm font-semibold capitalize transition-colors ${
              method === m ? "bg-[#004787] text-white" : "text-[#5f6673]"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {method === "voice" && (
        <div>
          {!recording ? (
            <Button type="button" variant="secondary" size="md" className="w-full" onClick={startRecording}>
              {audio ? "● Re-record" : "● Start recording"}
            </Button>
          ) : (
            <Button type="button" variant="destructive" size="md" className="w-full" onClick={stopRecording}>
              ■ Stop
            </Button>
          )}
          {audio && !recording && <p className="text-xs text-[#2e7d32] mt-2">Recording saved. It’ll be transcribed when you’re online.</p>}
        </div>
      )}

      {method === "photo" && (
        <div className="space-y-2">
          <input type="file" accept="image/*" capture="environment" onChange={onPickImage} className="block w-full text-xs text-[#5f6673] file:mr-3 file:rounded-lg file:border-0 file:bg-[#eef4ff] file:px-3 file:py-2 file:text-[#004787]" />
          {/* eslint-disable-next-line @next/next/no-img-element -- transient data-URL preview */}
          {image && <img src={image} alt="capture preview" className="rounded-lg max-h-56 w-full object-contain border border-[#c2c6d3]" />}
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder={method === "voice" ? "Optional note to go with the recording…" : method === "photo" ? "Optional note about this photo…" : "Describe the job… replaced both steer tires, front brake job…"}
        className="w-full rounded-lg border border-[#c2c6d3] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#004787]"
      />

      {error && <p className="text-xs text-[#d32f2f]">{error}</p>}

      <Button type="button" size="lg" className="w-full" onClick={save} disabled={!canSave || saving}>
        {saving ? "Saving…" : "Save to queue"}
      </Button>
      <p className="text-[11px] text-[#858b98] text-center">
        Saved on this device immediately. {online ? "AI will draft lines automatically." : "Will process when you reconnect."}
      </p>
    </div>
  );
}

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
