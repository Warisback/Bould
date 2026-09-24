const TIPS = [
  {
    title: "Whole problem in frame",
    body: "Start holds to the top, with your feet in shot the whole time.",
    icon: (
      <>
        <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
        <circle cx="12" cy="9" r="1.6" />
        <path d="M12 11v4m0-2.5-2.5-1.5m2.5 1.5 2.5-2M12 15l-2 2.5m2-2.5 2 2.5" />
      </>
    ),
  },
  {
    title: "Film from behind or the side",
    body: "A few metres back shows your hips and feet best.",
    icon: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.6" />
      </>
    ),
  },
  {
    title: "Keep the phone steady",
    body: "A friend holding it still, or propped up on a bag.",
    icon: (
      <>
        <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
        <path d="M11 18.5h2" />
      </>
    ),
  },
  {
    title: "Start just before you pull on",
    body: "Stop when you top out or drop. One attempt, under 30 seconds, works best.",
    icon: (
      <>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2M10 2.5h4" />
      </>
    ),
  },
];

export default function FilmingTips() {
  return (
    <section className="rounded-3xl bg-surface p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Filming tips</h2>
      <ul className="mt-4 space-y-4">
        {TIPS.map((tip) => (
          <li key={tip.title} className="flex gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-brand">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {tip.icon}
              </svg>
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="font-semibold leading-snug">{tip.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted">{tip.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
