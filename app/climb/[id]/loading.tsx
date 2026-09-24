import PageHeader from "@/components/review/PageHeader";

export default function ClimbLoading() {
  return (
    <div className="px-4" aria-busy aria-label="Loading climb">
      <PageHeader title="Climb review" backHref="/profile" />
      <div className="h-[82px] animate-pulse rounded-2xl bg-surface" />
      <div className="mt-4 flex gap-2">
        <div className="w-3 rounded-full bg-surface" />
        <div className="aspect-[3/4] max-h-[55svh] flex-1 animate-pulse rounded-2xl bg-surface" />
      </div>
    </div>
  );
}
