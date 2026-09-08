import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { TUTORIAL_STEPS } from '@/data/tutorial-steps'
import TutorialCarousel from '@/components/TutorialCarousel'

export default async function TutorialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  return (
    <div className="flex-1 w-full bg-slate-50 text-slate-800 py-6 sm:py-8 px-3 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 pb-20 sm:pb-8">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
            Panduan Composting di CompostMind
          </h1>
          <p className="text-sm text-slate-600">
            Pelajari Semua langkah mengolah bahan compostable menjadi kompos berkualitas tinggi dengan bantuan AI.
          </p>
        </div>

        {/* STEP CAROUSEL */}
        <TutorialCarousel steps={TUTORIAL_STEPS} />

        {/* STICKY CTA BUTTON FOR MOBILE */}
        <div className="sticky bottom-4 sm:relative sm:bottom-0 z-30 pt-2">
          <div className="bg-slate-50/80 backdrop-blur-md p-2 rounded-2xl sm:bg-transparent sm:p-0">
            <Link
              href={isAuthenticated ? '/composting' : '/login'}
              className="interactive-button w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 text-center"
            >
              <span>Mulai Composting Sekarang →</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
