'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Step {
  stepNumber: number
  title: string
  desc: string
  image: string
}

const steps: Step[] = [
  {
    stepNumber: 1,
    title: 'Deteksi Bahan Makanan',
    desc: 'Arahkan kamera ke sisa makanan. AI akan mengenali jenis dan kondisi bahan secara otomatis.',
    image: '/tutorial/step-1-detect.jpg',
  },
  {
    stepNumber: 2,
    title: 'Atur Kondisi Bahan',
    desc: 'Tandai apakah bahan masih utuh, kulit, atau busuk. Ini menentukan langkah composting yang tepat.',
    image: '/tutorial/step-2-condition.jpg',
  },
  {
    stepNumber: 3,
    title: 'Ikuti Panduan Kompos',
    desc: 'Dapatkan instruksi langkah demi langkah dari AI Gemini untuk mengolah bahan menjadi kompos berkualitas.',
    image: '/tutorial/step-3-compost.jpg',
  },
]

export default function TutorialPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({})

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setIsAuthenticated(!!data.user)
    })
  }, [])

  const handleImageError = (stepNum: number) => {
    setImageErrors((prev) => ({ ...prev, [stepNum]: true }))
  }

  return (
    <div className="flex-1 w-full bg-slate-50 text-slate-800 py-8 px-4 sm:px-6 safe-bottom">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
            Panduan Composting
          </h1>
          <p className="text-sm text-slate-600">
            Pelajari 3 langkah mudah mengolah sisa makanan menjadi kompos berkualitas tinggi dengan bantuan AI.
          </p>
        </div>

        {/* STEP CARDS */}
        <div className="space-y-6">
          {steps.map((step) => (
            <div
              key={step.stepNumber}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs transition-all hover:shadow-md"
            >
              {/* IMAGE / FALLBACK */}
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-emerald-50 border border-slate-100 mb-4 flex items-center justify-center">
                {!imageErrors[step.stepNumber] ? (
                  <Image
                    src={step.image}
                    alt={step.title}
                    fill
                    className="object-cover"
                    onError={() => handleImageError(step.stepNumber)}
                    unoptimized
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-emerald-800">
                    <span className="text-3xl mb-2">🌱</span>
                    <p className="font-bold text-sm">Langkah {step.stepNumber}: {step.title}</p>
                    <p className="text-xs text-emerald-600/80 mt-1">{step.desc}</p>
                  </div>
                )}
              </div>

              {/* DETAILS */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                  {step.stepNumber}
                </div>
                <div className="space-y-1 pt-0.5">
                  <h2 className="text-lg font-bold text-slate-900">
                    {step.title}
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA BUTTON */}
        <div className="pt-4 sticky bottom-4 sm:relative sm:bottom-0">
          <Link
            href={isAuthenticated ? '/composting' : '/login'}
            className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-center"
          >
            <span>Mulai Composting Sekarang →</span>
          </Link>
        </div>

      </div>
    </div>
  )
}
