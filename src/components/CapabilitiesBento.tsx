import { ArrowUpRight } from 'lucide-react';
import { CAPABILITIES, SiteType } from '../data/studioData';

interface CapabilitiesBentoProps {
  onSelectPreset: (siteType: SiteType) => void;
}

export function CapabilitiesBento({ onSelectPreset }: CapabilitiesBentoProps) {
  return (
    <section id="capabilities" className="py-16 lg:py-24 border-b border-[#E2E2DC]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-[#575852] mb-2">
              Core Capabilities
            </p>
            <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[#111210] [text-wrap:balance]">
              Four disciplines aligned around shipping high-trust websites.
            </h2>
          </div>
          <p className="text-sm text-[#575852] max-w-sm leading-relaxed">
            Every engagement combines positioning, interface design, and
            production front-end engineering under one senior team.
          </p>
        </div>

        {/* Asymmetric 3-Column Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {CAPABILITIES.map((cap) => {
            const isWide = cap.span === 'wide';
            return (
              <article
                key={cap.id}
                className={`${
                  isWide ? 'lg:col-span-2' : 'lg:col-span-1'
                } bg-white border border-[#E2E2DC] rounded-xl p-6 sm:p-8 flex flex-col justify-between transition-colors duration-150 hover:border-[#C8C8BE]`}
              >
                <div>
                  <h3 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-[#111210]">
                    {cap.number} {cap.title}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-[#575852] max-w-[65ch]">
                    {cap.summary}
                  </p>
                </div>

                <div className="mt-8 pt-5 border-t border-[#E2E2DC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#575852]">
                    {cap.deliverables.map((item, idx) => (
                      <span key={item} className="inline-flex items-center gap-2">
                        <span>{item}</span>
                        {idx < cap.deliverables.length - 1 && (
                          <span aria-hidden="true">·</span>
                        )}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectPreset(cap.presetSiteType)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1E40AF] hover:text-[#1D4ED8] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer py-1"
                  >
                    <span>Estimate scope</span>
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
