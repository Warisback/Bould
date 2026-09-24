"use client";

import type { ChangeEvent, ReactNode } from "react";

export function CameraIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="6" width="13" height="12" rx="2.5" />
      <path d="m16 10.5 5-3v9l-5-3" />
    </svg>
  );
}

export function LibraryIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="9" cy="9" r="1.8" />
      <path d="m21 15-4.5-4.5L6 21" />
    </svg>
  );
}

const BASE =
  "relative flex h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-full text-[17px] font-bold transition active:scale-[0.98] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand";

/**
 * A big pill that opens the phone's camera (`record`) or photo library (`library`).
 * A <label> wrapping the input is the most reliable way to open the picker on iOS.
 */
export default function PickVideo({
  mode,
  variant = mode === "record" ? "solid" : "outline",
  onFile,
  children,
}: {
  mode: "record" | "library";
  variant?: "solid" | "outline";
  onFile: (file: File) => void;
  children?: ReactNode;
}) {
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so picking the same video again still fires a change.
    e.target.value = "";
    if (file) onFile(file);
  };

  const look =
    variant === "solid"
      ? "bg-brand text-white shadow-[0_8px_24px_rgb(252_76_2/0.35)]"
      : "border-2 border-brand text-brand active:bg-brand/10";

  return (
    <label className={`${BASE} ${look}`}>
      {mode === "record" ? <CameraIcon /> : <LibraryIcon />}
      {children ?? (mode === "record" ? "Record a climb" : "Upload from camera roll")}
      <input
        type="file"
        accept="video/*"
        capture={mode === "record" ? "environment" : undefined}
        onChange={onChange}
        className="sr-only"
      />
    </label>
  );
}
