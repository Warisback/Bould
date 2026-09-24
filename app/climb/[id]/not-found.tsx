import Link from "next/link";
import { MountainIcon } from "@/components/icons";
import PageHeader from "@/components/review/PageHeader";

export default function ClimbNotFound() {
  return (
    <div className="px-4">
      <PageHeader title="Climb review" backHref="/profile" />
      <div className="mt-6 rounded-3xl bg-surface p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-muted">
          <MountainIcon className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-bold">Climb not found</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          This climb isn&apos;t on the board any more, or the link is wrong.
        </p>
        <Link
          href="/profile"
          className="mt-6 flex h-12 items-center justify-center rounded-full border-2 border-brand font-semibold text-brand transition active:scale-[0.98] active:bg-brand/10"
        >
          Go to my profile
        </Link>
      </div>
    </div>
  );
}
