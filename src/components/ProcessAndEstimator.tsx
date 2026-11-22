import { Check, ArrowRight } from 'lucide-react';
import {
  ADDON_OPTIONS,
  PAGE_SCALE_CONFIG,
  PROCESS_STEPS,
  PageScale,
  SITE_TYPE_CONFIG,
  SiteType,
} from '../data/studioData';

interface ProcessAndEstimatorProps {
  siteType: SiteType;
  onChangeSiteType: (type: SiteType) => void;
  pageScale: PageScale;
  onChangePageScale: (scale: PageScale) => void;
  selectedAddons: string[];
  onToggleAddon: (id: string) => void;
  onApplyScope: (summary: string) => void;
}

export function ProcessAndEstimator({
  siteType,
  onChangeSiteType,
  pageScale,
  onChangePageScale,
  selectedAddons,
  onToggleAddon,
  onApplyScope,
}: ProcessAndEstimatorProps) {
  const siteConfig = SITE_TYPE_CONFIG[siteType];
  const scaleConfig = PAGE_SCALE_CONFIG[pageScale];

  const addonTotal = ADDON_OPTIONS.filter((a) =>
    selectedAddons.includes(a.id)
  ).reduce((sum, item) => sum + item.price, 0);

  const addonWeeks = ADDON_OPTIONS.filter((a) =>
    selectedAddons.includes(a.id)
  ).reduce((sum, item) => sum + item.weeks, 0);

  const estimatedTotal = Math.round(
    siteConfig.basePrice * scaleConfig.multiplier + addonTotal
  );
  const lowRange = Math.round((estimatedTotal * 0.92) / 100) * 100;
  const highRange = Math.round((estimatedTotal * 1.08) / 100) * 100;
  const totalWeeks =
    siteConfig.baseWeeks + scaleConfig.extraWeeks + addonWeeks;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);

  const buildScopeSummary = () => {
    const addonLabels = ADDON_OPTIONS.filter((a) =>
      selectedAddons.includes(a.id)
    ).map((a) => a.label);
    const addonsText =
      addonLabels.length > 0 ? ` + ${addonLabels.join(', ')}` : '';
    return `${siteConfig.label} (${scaleConfig.pages})${addonsText} — Est. ${formatCurrency(lowRange)}–${formatCurrency(highRange)} · ${totalWeeks} weeks`;
  };

  return (
    <>
      {/* Delivery Process */}
      <section id="process" className="py-16 lg:py-24 border-b border-[#E2E2DC]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <p className="text-sm font-medium text-[#575852] mb-2">
              Delivery Cadence
            </p>
            <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[#111210] [text-wrap:balance]">
              Predictable weekly milestones from kickoff to production deploy.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 border-t border-[#E2E2DC] pt-8">
            {PROCESS_STEPS.map((step) => (
              <div key={step.number} className="flex flex-col">
                <div className="flex items-center justify-between gap-2 text-xs text-[#575852] mb-3">
                  <span className="font-mono font-medium text-[#111210] tabular-nums">
                    {step.number}
                  </span>
                  <span className="font-mono tabular-nums">{step.duration}</span>
                </div>
                <h3 className="font-display text-lg font-semibold text-[#111210]">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#575852]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Scope & Timeline Estimator */}
      <section id="pricing" className="py-16 lg:py-24 border-b border-[#E2E2DC]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-sm font-medium text-[#575852] mb-2">
              Transparent Scoping
            </p>
            <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[#111210] [text-wrap:balance]">
              Estimate your website investment and launch timeline.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Controls Column */}
            <div className="lg:col-span-7 bg-white border border-[#E2E2DC] rounded-xl p-6 sm:p-8 space-y-8">
              {/* 1. Website Type */}
              <div>
                <div className="text-sm font-semibold text-[#111210] mb-3">
                  1. Website Format
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(Object.keys(SITE_TYPE_CONFIG) as SiteType[]).map((key) => {
                    const item = SITE_TYPE_CONFIG[key];
                    const active = siteType === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => onChangeSiteType(key)}
                        className={`text-left p-4 rounded-lg border transition-colors duration-150 cursor-pointer ${
                          active
                            ? 'border-[#1E40AF] bg-[#F4F6FC]'
                            : 'border-[#E2E2DC] bg-white hover:border-[#C8C8BE]'
                        }`}
                      >
                        <div className="text-sm font-semibold text-[#111210]">
                          {item.label}
                        </div>
                        <div className="mt-1 text-xs text-[#575852] leading-relaxed">
                          {item.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Page Scale */}
              <div>
                <div className="text-sm font-semibold text-[#111210] mb-3">
                  2. Page &amp; Content Scale
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.keys(PAGE_SCALE_CONFIG) as PageScale[]).map((key) => {
                    const item = PAGE_SCALE_CONFIG[key];
                    const active = pageScale === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => onChangePageScale(key)}
                        className={`text-left p-3.5 rounded-lg border transition-colors duration-150 cursor-pointer ${
                          active
                            ? 'border-[#1E40AF] bg-[#F4F6FC]'
                            : 'border-[#E2E2DC] bg-white hover:border-[#C8C8BE]'
                        }`}
                      >
                        <div className="text-sm font-semibold text-[#111210]">
                          {item.label}
                        </div>
                        <div className="mt-0.5 font-mono text-xs text-[#575852] tabular-nums">
                          {item.pages}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Optional Engineering Add-ons */}
              <div>
                <div className="text-sm font-semibold text-[#111210] mb-3">
                  3. Optional Capabilities
                </div>
                <div className="space-y-2.5">
                  {ADDON_OPTIONS.map((addon) => {
                    const checked = selectedAddons.includes(addon.id);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        onClick={() => onToggleAddon(addon.id)}
                        className={`w-full flex items-start justify-between gap-4 p-4 rounded-lg border text-left transition-colors duration-150 cursor-pointer ${
                          checked
                            ? 'border-[#1E40AF] bg-[#F4F6FC]'
                            : 'border-[#E2E2DC] bg-white hover:border-[#C8C8BE]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border shrink-0 transition-colors duration-150 ${
                              checked
                                ? 'bg-[#1E40AF] border-[#1E40AF] text-white'
                                : 'bg-white border-[#C8C8BE]'
                            }`}
                          >
                            {checked && (
                              <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                          </span>
                          <div>
                            <div className="text-sm font-medium text-[#111210]">
                              {addon.label}
                            </div>
                            <div className="text-xs text-[#575852] mt-0.5">
                              {addon.description}
                            </div>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-medium text-[#111210] tabular-nums whitespace-nowrap shrink-0">
                          +{formatCurrency(addon.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Summary Output Column */}
            <div className="lg:col-span-5 bg-white border border-[#E2E2DC] rounded-xl p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="text-xs font-medium text-[#575852]">
                  Estimated Project Investment
                </div>
                <div className="mt-2 font-mono text-3xl sm:text-4xl font-medium tracking-tight text-[#111210] tabular-nums">
                  {formatCurrency(lowRange)} – {formatCurrency(highRange)}
                </div>

                <div className="mt-4 pt-4 border-t border-[#E2E2DC] flex items-center justify-between text-sm">
                  <span className="text-[#575852]">Estimated Launch Window</span>
                  <span className="font-mono font-medium text-[#111210] tabular-nums">
                    {totalWeeks} weeks
                  </span>
                </div>

                <div className="mt-6 space-y-2 text-sm text-[#575852]">
                  <div className="font-semibold text-[#111210]">
                    Included in every build:
                  </div>
                  <p>· Responsive 1440px &amp; mobile layout engineering</p>
                  <p>· WCAG AA contrast &amp; keyboard accessibility review</p>
                  <p>· Clean TypeScript codebase with full IP ownership</p>
                  <p>· Production deployment &amp; 30-day post-launch support</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-[#E2E2DC]">
                <button
                  type="button"
                  onClick={() => onApplyScope(buildScopeSummary())}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] text-sm font-medium text-white bg-[#1E40AF] rounded-lg hover:bg-[#1D4ED8] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Apply Scope to Project Brief</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <p className="mt-3 text-xs text-[#575852] text-center">
                  Fixed-fee proposals are finalized after a 30-minute discovery
                  call.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
