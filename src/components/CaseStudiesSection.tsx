import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { CASE_STUDIES, CaseCategory, CaseStudy } from '../data/studioData';
import { ResilientImage } from './ResilientImage';

interface CaseStudiesSectionProps {
  onOpenCaseStudy: (study: CaseStudy) => void;
}

const CATEGORIES: CaseCategory[] = [
  'All Work',
  'B2B SaaS',
  'Commerce',
  'Architecture',
];

export function CaseStudiesSection({ onOpenCaseStudy }: CaseStudiesSectionProps) {
  const [activeCategory, setActiveCategory] = useState<CaseCategory>('All Work');

  const filteredStudies =
    activeCategory === 'All Work'
      ? CASE_STUDIES
      : CASE_STUDIES.filter((study) => study.category === activeCategory);

  return (
    <section id="work" className="py-16 lg:py-24 border-b border-[#E2E2DC]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-sm font-medium text-[#575852] mb-2">
              Proof of Impact
            </p>
            <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[#111210] [text-wrap:balance]">
              Selected launches with measured commercial outcomes.
            </h2>
          </div>

          {/* Interactive Filter Tabs */}
          <div
            role="tablist"
            aria-label="Filter case studies by industry"
            className="inline-flex items-center gap-1 p-1 bg-[#ECECE7] rounded-lg border border-[#E2E2DC] self-start md:self-auto overflow-x-auto max-w-full"
          >
            {CATEGORIES.map((category) => {
              const isSelected = activeCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveCategory(category)}
                  className={`px-3.5 py-2 min-h-[36px] text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-white text-[#111210] shadow-xs'
                      : 'text-[#575852] hover:text-[#111210]'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudies.map((study) => (
            <article
              key={study.id}
              className="group bg-white border border-[#E2E2DC] rounded-xl overflow-hidden flex flex-col justify-between transition-colors duration-150 hover:border-[#C8C8BE]"
            >
              <div>
                <div className="aspect-[4/3] overflow-hidden bg-[#ECECE7] border-b border-[#E2E2DC]">
                  <ResilientImage
                    src={study.image}
                    alt={study.imageAlt}
                    fallbackTitle={study.client}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>

                <div className="p-6">
                  {/* Unboxed Metadata */}
                  <div className="flex items-center gap-2 text-xs text-[#575852] mb-2">
                    <span className="font-medium text-[#111210]">
                      {study.client}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{study.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{study.year}</span>
                  </div>

                  <h3 className="font-display text-lg sm:text-xl font-semibold leading-snug text-[#111210]">
                    {study.title}
                  </h3>

                  <p className="mt-2.5 text-sm leading-relaxed text-[#575852]">
                    {study.summary}
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-4 border-t border-[#E2E2DC] flex flex-col gap-4">
                <div className="font-mono text-sm font-medium text-[#111210] tabular-nums">
                  {study.headlineMetric}
                </div>

                <button
                  type="button"
                  onClick={() => onOpenCaseStudy(study)}
                  className="inline-flex items-center justify-between w-full py-2 text-sm font-medium text-[#1E40AF] hover:text-[#1D4ED8] transition-colors duration-150 cursor-pointer"
                >
                  <span>Read Case Study</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Adjacent Client Testimonial Strip */}
        <div className="mt-10 bg-white border border-[#E2E2DC] rounded-xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8">
            <blockquote className="text-base sm:text-lg leading-relaxed text-[#111210]">
              “Before the redesign, our sales engineers spent the first twenty
              minutes of every call explaining what our platform actually does.
              Meridian rebuilt our site so prospects arrive already understanding
              our architecture, and qualified demos more than doubled in one
              quarter.”
            </blockquote>
          </div>
          <div className="lg:col-span-4 lg:border-l lg:border-[#E2E2DC] lg:pl-6">
            <div className="text-sm font-semibold text-[#111210]">
              Hannah Lindqvist
            </div>
            <div className="text-xs text-[#575852] mt-0.5">
              VP of Marketing · Kestrel Treasury
            </div>
            <button
              type="button"
              onClick={() => onOpenCaseStudy(CASE_STUDIES[0])}
              className="mt-3 text-xs font-medium text-[#1E40AF] hover:underline cursor-pointer"
            >
              Inspect Kestrel Treasury results
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
