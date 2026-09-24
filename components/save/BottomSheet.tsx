"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const DURATION = 280;

/**
 * Slide-up sheet. Mount it to open; it animates in, and animates out before
 * calling `onClose`. Children can be a function that receives `close`.
 */
export default function BottomSheet({
  onClose,
  labelledBy,
  children,
}: {
  onClose: () => void;
  labelledBy: string;
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Calling close twice just calls onClose twice, which is harmless for a setOpen(false).
  const close = useCallback(() => {
    setVisible(false);
    window.setTimeout(onClose, DURATION);
  }, [onClose]);

  // Once on mount: slide in, take focus, lock page scroll.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    panelRef.current?.focus({ preventScroll: true });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden
        onClick={close}
        className={`absolute inset-0 bg-black/65 transition-opacity ease-out ${visible ? "opacity-100" : "opacity-0"}`}
        style={{ transitionDuration: `${DURATION}ms` }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`absolute inset-x-0 bottom-0 mx-auto max-h-[92svh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-surface outline-none ring-1 ring-line transition-transform ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ transitionDuration: `${DURATION}ms`, paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line" aria-hidden />
        {typeof children === "function" ? children(close) : children}
      </div>
    </div>,
    document.body,
  );
}
