"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CheckIcon, PinIcon } from "@/components/icons";
import { apiFetch, errorMessage, type CreateUserResponse } from "@/lib/api";
import { changeUserId } from "@/lib/useUserId";

const MIN = 2;
const MAX = 20;

function cleanName(v: string) {
  return v.replace(/\s+/g, " ").trim();
}

export default function JoinForm({ next }: { next: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clean = cleanName(name);
  const length = [...clean].length;
  const valid = length >= MIN && length <= MAX;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { user } = await apiFetch<CreateUserResponse>("/api/users", {
        method: "POST",
        body: JSON.stringify({ name: clean, gym: "aldgate" }),
      });
      changeUserId(user.id);
      router.replace(next);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="px-4 pt-8">
      <p className="text-sm font-extrabold tracking-[0.22em] text-brand">BETA REVIEW</p>
      <h1 className="mt-4 text-[34px] font-extrabold leading-[1.05] tracking-tight">Join your gym</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-muted">
        Pick the name you want on the board. Every climb you review earns points and moves your rating.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-6" noValidate>
        <div>
          <label htmlFor="climber-name" className="flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Climber name</span>
            <span className={`text-xs tabular-nums ${length > MAX ? "text-blunder" : "text-faint"}`}>
              {length}/{MAX}
            </span>
          </label>
          <input
            id="climber-name"
            name="nickname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX + 4}
            autoCapitalize="words"
            autoComplete="nickname"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            placeholder="e.g. Sam K."
            className="mt-2 h-14 w-full rounded-2xl bg-surface px-4 text-[17px] font-semibold text-ink outline-none ring-1 ring-line transition placeholder:font-normal placeholder:text-faint focus:ring-2 focus:ring-brand"
          />
          <p className="mt-2 text-sm text-faint">No password. Your profile lives on this phone.</p>
        </div>

        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wider text-muted">Your gym</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div
              role="radio"
              aria-checked="true"
              aria-label="Aldgate, London"
              className="relative rounded-2xl bg-surface p-4 ring-2 ring-brand"
            >
              <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white">
                <CheckIcon className="h-3.5 w-3.5" />
              </span>
              <PinIcon className="h-6 w-6 text-brand" />
              <p className="mt-3 text-lg font-bold leading-tight">Aldgate</p>
              <p className="text-sm text-muted">London</p>
              <p className="mt-2.5 flex items-center gap-2 text-xs font-semibold text-brand">
                <span className="h-1.5 w-1.5 animate-live-pulse rounded-full bg-brand" />
                Live board
              </p>
            </div>
            <div
              role="radio"
              aria-checked="false"
              aria-disabled="true"
              aria-label="More gyms soon"
              className="rounded-2xl border border-dashed border-line p-4 opacity-55"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-faint" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              <p className="mt-3 text-lg font-bold leading-tight text-muted">More gyms</p>
              <p className="text-sm text-faint">Soon</p>
            </div>
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="animate-fade-up rounded-2xl bg-blunder/10 px-4 py-3 text-sm text-blunder">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!valid || busy}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-brand text-[17px] font-bold text-white shadow-[0_8px_24px_rgb(252_76_2/0.35)] transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
        >
          {busy ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Joining Aldgate…
            </>
          ) : (
            "Start climbing"
          )}
        </button>
      </form>

      <p className="mt-3 text-center text-sm text-muted">
        Just looking?{" "}
        <Link href="/review/sample" className="inline-flex h-11 items-center font-semibold text-brand">
          Try a sample climb
        </Link>
      </p>
    </div>
  );
}
