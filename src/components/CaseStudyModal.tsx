import { useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { CaseStudy } from '../data/studioData';
import { ResilientImage } from './ResilientImage';

interface CaseStudyModalProps {
  study: CaseStudy | null;
  onClose: () => void;
  onDiscussSimilar: (study: CaseStudy) => void;
}

export function CaseStudyModal({
  study,
  onClose,
  onDiscussSimilar,
}: CaseStudyModalProps) {
  useEffect(() => {
    if (!study) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [study, onClose]);

  if (!study) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#111210]/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-study-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#F8F8F6] border border-[#E2E2DC] rounded-xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 bg-[#F8F8F6]/95 backdrop-blur-sm border-b border-[#E2E2DC]">
          <div className="flex items-center gap-2 text-xs text-[#575852]">
            <span className="font-semibold text-[#111210]">{study.client}</span>
            <span aria-hidden="true">·</span>
            <span>{study.category}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{study.year}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close case study"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#E2E2DC] bg-white text-[#111210] hover:bg-[#ECECE7] transition-colors duration-150 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          <div>
            <h2
              id="case-study-modal-title"
              className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#111210]"
            >
              {study.title}
            </h2>
            <p className="mt-3 text-base text-[#575852] leading-relaxed">
              {study.summary}
            </p>
          </div>

          <div className="aspect-[16/10] rounded-lg overflow-hidden border border-[#E2E2DC] bg-[#ECECE7]">
            <ResilientImage
              src={study.image}
              alt={study.imageAlt}
              fallbackTitle={study.client}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Quantified Outcomes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y border-[#E2E2DC] py-6">
            {study.results.map((result) => (
              <div key={result.label}>
                <div className="font-mono text-2xl font-medium text-[#111210] tabular-nums">
                  {result.value}
                </div>
                <div className="mt-1 text-xs text-[#575852]">{result.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-display text-base font-semibold text-[#111210] mb-2">
                01. The Challenge
              </h3>
              <p className="text-sm leading-relaxed text-[#575852]">
                {study.challenge}
              </p>
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-[#111210] mb-2">
                02. Our Approach
              </h3>
              <p className="text-sm leading-relaxed text-[#575852]">
                {study.approach}
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#E2E2DC] rounded-lg p-5">
            <blockquote className="text-sm leading-relaxed text-[#111210]">
              “{study.quote.text}”
            </blockquote>
            <div className="mt-3 text-xs text-[#575852]">
              <span className="font-semibold text-[#111210]">
                {study.quote.author}
              </span>{' '}
              · {study.quote.role}, {study.quote.organization}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div className="text-xs text-[#575852]">
              <span className="font-medium text-[#111210]">Stack: </span>
              {study.stack.join(' · ')}
            </div>

            <button
              type="button"
              onClick={() => onDiscussSimilar(study)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-medium text-white bg-[#1E40AF] rounded-lg hover:bg-[#1D4ED8] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Discuss a Similar Project</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
