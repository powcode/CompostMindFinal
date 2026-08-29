import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { TUTORIAL_STEPS } from '@/data/tutorial-steps'

export default async function TutorialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthenticated = !!user

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
          {TUTORIAL_STEPS.map((step) => (
            <div
              key={step.stepNumber}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs transition-all hover:shadow-md"
            >
              {/* IMAGE */}
              <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden bg-emerald-50 border border-slate-100 mb-4">
                <Image
                  src={step.image}
                  alt={step.title}
                  fill
                  priority={step.stepNumber === 1}
                  sizes="(max-width: 768px) 100vw, 800px"
                  className="object-cover"
                />
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
