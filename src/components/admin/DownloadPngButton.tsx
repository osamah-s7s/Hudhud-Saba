"use client";

import { useState } from "react";

/**
 * Canvas area limits: iOS / iPadOS Safari refuses anything above ~16.7 million
 * pixels; desktop browsers allow far more. Staying under the limit means the
 * big board image is scaled down a little instead of coming out blank.
 */
function maxCanvasPixels(): number {
  const appleTouch = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
  return appleTouch ? 16_000_000 : 64_000_000;
}

/**
 * Rasterises a self-contained SVG string in the browser, no library:
 * SVG text → Blob URL → <img> → <canvas> (2x for print) → PNG Blob → download.
 */
async function svgToPng(svg: string, width: number, height: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("The chart image could not be read."));
      image.src = url;
    });

    const scale = Math.min(2, Math.sqrt(maxCanvasPixels() / (width * height)));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot draw the image.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("The image could not be encoded."))),
        "image/png",
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before the URL goes away.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function ImageIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
      <path d="M2.5 11 5.8 7.8l2.6 2.4 2-1.8 3.1 2.8" />
      <circle cx="10.6" cy="5.8" r="1" />
    </svg>
  );
}

export function DownloadPngButton({
  svg,
  width,
  height,
  fileName,
  label,
  accessibleLabel,
  className = "admin-btn admin-btn-quiet",
}: {
  svg: string;
  width: number;
  height: number;
  fileName: string;
  label: string;
  /** Fuller name for screen readers, e.g. "Download question 6 as PNG". */
  accessibleLabel?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "working" | "failed">("idle");

  async function download() {
    if (state === "working") return;
    setState("working");
    try {
      saveBlob(await svgToPng(svg, width, height), fileName);
      setState("idle");
    } catch {
      setState("failed");
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-2">
      <button
        type="button"
        className={className}
        onClick={download}
        aria-disabled={state === "working"}
        aria-label={accessibleLabel}
      >
        <ImageIcon />
        {state === "working" ? "Preparing…" : label}
      </button>
      <span role="status" className="text-[0.8125rem] text-sand empty:hidden">
        {state === "failed" ? "The image could not be created. Please try again." : ""}
      </span>
    </span>
  );
}
