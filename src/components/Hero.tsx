import { ArrowRight } from 'lucide-react';
import { STUDIO_METRICS } from '../data/studioData';
import { ResilientImage } from './ResilientImage';

interface HeroProps {
  onStartProject: () => void;
}

export function Hero({ onStartProject }: HeroProps) {
  return (
    <section className="pt-10 pb-16 lg:pt-16 lg:pb-20 border-b border-[#E2E2DC]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left Proposition Column */}
          <div className="lg:col-span-6 flex flex-col justify-between py-2">
            <div>
              <p className="text-sm font-medium text-[#575852] mb-4">
                Independent Web Engineering Studio · San Francisco &amp; Zurich
              </p>
              <h1 className="font-display text-[clamp(2.25rem,4vw,3.75rem)] font-bold leading-[1.08] tracking-tight text-[#111210] [text-wrap:balance]">
                Websites engineered for clarity, speed, and measurable conversion.
              </h1>
              <p className="mt-6 text-base sm:text-lg leading-relaxed text-[#575852] max-w-[60ch]">
                We design and build custom marketing websites, interactive product
                launches, and headless storefronts in 4 to 6 weeks—written in
                clean TypeScript with verified sub-second performance.
              </p>
            </div>

            <div className="mt-8 pt-4 flex flex-wrap items-center gap-6">
              <button
                type="button"
                onClick={onStartProject}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] text-sm font-medium text-white bg-[#1E40AF] rounded-lg hover:bg-[#1D4ED8] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Start a Project</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <a
                href="#work"
                className="inline-flex items-center py-2.5 text-sm font-medium text-[#111210] hover:text-[#1E40AF] underline underline-offset-4 transition-colors duration-150 whitespace-nowrap shrink-0"
              >
                Explore Selected Work
              </a>
            </div>
          </div>

          {/* Right Hero Photography */}
          <div className="lg:col-span-6">
            <div className="h-full min-h-[260px] sm:min-h-[340px] lg:min-h-[420px] rounded-xl overflow-hidden border border-[#E2E2DC] bg-[#ECECE7]">
              <ResilientImage
                src="/src/assets/images/hero_design_studio_1795362218483.jpg"
                alt="Meridian design and engineering team collaborating at a pale oak table in a sunlit architectural studio"
                fallbackTitle="Meridian Studio Workspace"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Studio Metrics Strip */}
        <div className="mt-12 pt-8 border-t border-[#E2E2DC] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {STUDIO_METRICS.map((metric) => (
            <div key={metric.label} className="flex flex-col">
              <span className="font-mono text-2xl sm:text-3xl font-medium tracking-tight text-[#111210] tabular-nums">
                {metric.value}
              </span>
              <span className="mt-1.5 text-sm font-semibold text-[#111210]">
                {metric.label}
              </span>
              <span className="mt-1 text-xs leading-relaxed text-[#575852]">
                {metric.context}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
