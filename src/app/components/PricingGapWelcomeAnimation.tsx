import { BarChart3, Lightbulb, TrendingDown } from 'lucide-react';

/**
 * Limited onboarding preview — `NavigatorIntroPreview` is the only export consumed in the
 * product (OnboardingTour Step 0). Visuals match the live competitor experience so the
 * preview doubles as a teaser for what users will see inside.
 */

const STAGE_LABEL = 'text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400';

function InsightCallout({ icon, title, body }: { icon: 'bulb' | 'down'; title: string; body: string }) {
  const Icon = icon === 'bulb' ? Lightbulb : TrendingDown;
  const tone =
    icon === 'down'
      ? { wrap: 'border-red-100 bg-red-50/40', icon: 'bg-red-100 text-red-700', title: 'text-red-900' }
      : { wrap: 'border-amber-100 bg-amber-50/50', icon: 'bg-amber-100 text-amber-800', title: 'text-amber-900' };
  return (
    <div className={`mt-3 flex items-start gap-2.5 rounded-lg border px-2.5 py-2 ${tone.wrap}`}>
      <span className={`mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${tone.icon}`}>
        <Icon className="h-3 w-3" strokeWidth={2.4} />
      </span>
      <div className="min-w-0">
        <p className={`text-[11px] font-bold leading-snug ${tone.title}`}>{title}</p>
        <p className="mt-0.5 text-[10.5px] leading-snug text-slate-600">{body}</p>
      </div>
    </div>
  );
}

function IntroCompetitorRow({
  label,
  rate,
  dotColor,
  highlight
}: {
  label: string;
  rate: string;
  dotColor: 'red' | 'blue' | 'green';
  highlight?: boolean;
}) {
  const dotClass =
    dotColor === 'red' ? 'bg-red-500' : dotColor === 'green' ? 'bg-emerald-500' : 'bg-sky-500';
  const textClass = highlight ? 'text-sky-800' : 'text-slate-700';
  return (
    <div className="flex items-center justify-between gap-2 rounded-md px-1.5 py-0.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} aria-hidden />
        <span className={`truncate text-[10px] font-medium ${textClass}`}>{label}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className={`text-[10px] font-bold tabular-nums ${textClass}`}>{rate}</span>
        {highlight ? (
          <span className="text-[9px] font-bold leading-none text-red-600" aria-hidden>
            ↑
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Competitor-only intro visual — single panel rather than the previous side-by-side parity layout. */
function IntroVisual() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-blue-50/50 via-white to-emerald-50/40 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col">
        <div className="mb-1.5 flex items-center gap-1">
          <span className="flex h-4 w-4 items-center justify-center rounded-md bg-blue-50 text-[#2753eb] ring-1 ring-blue-200/70">
            <BarChart3 className="h-2.5 w-2.5" strokeWidth={2.4} />
          </span>
          <span className={STAGE_LABEL}>Competitor rates · sample night</span>
        </div>
        <div className="space-y-0.5">
          <IntroCompetitorRow label="Competitor max" rate="₹3,500" dotColor="red" />
          <IntroCompetitorRow label="Your rate" rate="₹3,800" dotColor="blue" highlight />
          <IntroCompetitorRow label="Competitor min" rate="₹2,900" dotColor="green" />
        </div>
        <p className="mt-1.5 text-[8.5px] font-medium uppercase tracking-wide text-slate-400">
          Above competitor max — pricing risk
        </p>
      </div>
    </div>
  );
}

function ValuePoint({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200/90 bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#2753eb] ring-1 ring-blue-200/70">
        <BarChart3 className="h-4 w-4" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <h4 className="text-[12.5px] font-bold leading-snug text-slate-900">{title}</h4>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{body}</p>
      </div>
    </div>
  );
}

export function NavigatorIntroPreview() {
  return (
    <div className="onboard-limited-pricing-visual mx-auto w-full max-w-[460px]">
      <div className="grid gap-2">
        <ValuePoint
          title="Spot pricing gaps"
          body="See when your rates drift above or below competitors on any date."
        />
      </div>

      <div className="mt-3">
        <IntroVisual />
      </div>

      <InsightCallout
        icon="bulb"
        title="Why it matters"
        body="Pricing gaps directly impact bookings — catch them before they move spend to OTAs."
      />
    </div>
  );
}
