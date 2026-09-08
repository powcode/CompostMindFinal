'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { TutorialStep } from '@/data/tutorial-steps'

type TutorialCarouselProps = {
  steps: TutorialStep[]
}

export default function TutorialCarousel({ steps }: TutorialCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeStep = steps[activeIndex]

  if (!activeStep) return null

  const goToStep = (index: number) => {
    setActiveIndex(Math.max(0, Math.min(index, steps.length - 1)))
  }

  return (
    <section aria-label="Langkah tutorial composting" className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="bg-emerald-50 px-2 py-2 sm:px-6 sm:py-5">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-emerald-100 bg-white sm:aspect-[16/9]">
            <Image
              src={activeStep.image}
              alt={activeStep.title}
              fill
              priority={activeIndex === 0}
              sizes="(max-width: 640px) calc(100vw - 2.5rem), 672px"
              className="object-contain"
            />
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white shadow-sm">
              {activeStep.stepNumber}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                Langkah {activeStep.stepNumber} dari {steps.length}
              </p>
              <h2 className="text-base font-bold leading-snug text-slate-900 sm:text-lg">
                {activeStep.title}
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                {activeStep.desc}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goToStep(activeIndex - 1)}
          disabled={activeIndex === 0}
          aria-label="Lihat langkah sebelumnya"
          className="interactive-button inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span aria-hidden="true">←</span>
        </button>

        <div className="flex items-center gap-2" aria-label="Pilih langkah tutorial">
          {steps.map((step, index) => (
            <button
              key={step.stepNumber}
              type="button"
              onClick={() => goToStep(index)}
              aria-label={`Buka langkah ${step.stepNumber}`}
              aria-current={index === activeIndex ? 'step' : undefined}
              className={`h-2.5 rounded-full transition-all ${
                index === activeIndex ? 'w-7 bg-emerald-600' : 'w-2.5 bg-slate-300 hover:bg-emerald-300'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => goToStep(activeIndex + 1)}
          disabled={activeIndex === steps.length - 1}
          aria-label="Lihat langkah berikutnya"
          className="interactive-button inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  )
}
