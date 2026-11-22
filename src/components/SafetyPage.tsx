import { ArrowLeft, Camera, CheckCircle2, MapPin, ShieldCheck } from 'lucide-react';
import { SiteSettings } from '../types/marketplace';

interface SafetyPageProps {
  siteSettings: SiteSettings;
  onBack: () => void;
}

const SAFETY_GUIDELINES = [
  {
    number: '01.',
    icon: MapPin,
    title: 'Meet on Campus in Public Areas',
    summary:
      'Always schedule pickups and returns in busy, well-lit campus spots during daylight hours—like the Central Library steps, Student Activity Center, or hostel reception desks. Avoid off-campus alleys or late-night handovers.',
  },
  {
    number: '02.',
    icon: CheckCircle2,
    title: 'Inspect the Item Together Before Handover',
    summary:
      'Power on cameras, projectors, or calculators on the spot. Check cycle brakes and gears, inspect blazer seams, and confirm all cables, batteries, and SD cards match the listing description before transferring the deposit.',
  },
  {
    number: '03.',
    icon: Camera,
    title: 'Take Timestamped Photos at Pickup & Return',
    summary:
      'Both the owner and the renter should snap 2–3 clear phone photos of the item and any existing scratches at handover. Share them on WhatsApp immediately so both students have an agreed baseline condition.',
  },
  {
    number: '04.',
    icon: ShieldCheck,
    title: 'Verify College ID & Keep Deposits Transparent',
    summary:
      'Quickly verify each other’s student ID card at the first meeting. Agree on the refundable security deposit amount via UPI or cash and confirm return timing in writing before leaving.',
  },
];

export function SafetyPage({ siteSettings, onBack }: SafetyPageProps) {
  return (
    <section className="py-10 lg:py-16">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-xl text-sm font-medium text-[#141512] dark:text-[#F4F4F0] bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] hover:bg-[#EFEFEA] dark:hover:bg-[#222420] transition-colors mb-8 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to Browse</span>
        </button>

        <div className="max-w-2xl mb-10">
          <p className="text-sm font-medium text-[var(--accent)] mb-2">
            {siteSettings.brandName} · Campus Trust &amp; Handover Checklist
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#141512] dark:text-[#F4F4F0] [text-wrap:balance]">
            Safe, drama-free rentals between classmates.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#5B5D54] dark:text-[#A3A69B]">
            {siteSettings.brandName} connects students within the same campus
            community. Follow these four habits on every rental—and reach us at{' '}
            <span className="font-medium text-[#141512] dark:text-[#F4F4F0]">
              {siteSettings.supportWhatsapp}
            </span>{' '}
            if anything needs attention.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SAFETY_GUIDELINES.map((tip) => {
            const Icon = tip.icon;
            return (
              <article
                key={tip.number}
                className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-6 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium text-[var(--accent)] tabular-nums">
                    {tip.number}
                  </span>
                  <Icon
                    className="w-5 h-5 text-[#5B5D54] dark:text-[#A3A69B]"
                    aria-hidden="true"
                  />
                </div>
                <h2 className="font-display text-xl font-semibold text-[#141512] dark:text-[#F4F4F0]">
                  {tip.title}
                </h2>
                <p className="text-sm leading-relaxed text-[#5B5D54] dark:text-[#A3A69B]">
                  {tip.summary}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
