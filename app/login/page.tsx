'use client'

import { signIn } from '@/app/actions/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function LoginPage() {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  // Effect untuk redirect otomatis setelah 3 detik jika sukses
  useEffect(() => {
    if (message?.type === 'success') {
      const timer = setTimeout(() => {
        router.push('/')
      }, 3000)

      return () => clearTimeout(timer) // Cleanup timer jika komponen unmount
    }
  }, [message, router])

  async function handleSubmit(formData: FormData) {
    setMessage(null)
    setIsSubmitting(true)

    try {
      const result = await signIn(formData)

      if (result.success) {
        setMessage({ type: 'success', text: 'Berhasil login! Mengalihkan ke dashboard...' })
      } else {
        setMessage({ type: 'error', text: result.error || 'Login gagal.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan sistem. Silakan coba lagi.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 via-slate-50 to-white text-slate-800 flex flex-col justify-center items-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-emerald-100/80 transition-all">
        
        {/* HEADER ICON & TITLE */}
        <div className="text-center mb-6 space-y-2">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
            🍃
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Selamat Datang Kembali
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Masuk ke akun CompostMind Anda untuk melanjutkan pengomposan.
          </p>
        </div>

        {/* ALERT MESSAGES */}
        {message && (
          <div
            className={`p-4 rounded-2xl text-xs sm:text-sm font-medium mb-5 border ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* LOGIN FORM */}
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block pl-1">
              Email
            </label>
            <input
              name="email"
              type="email"
              placeholder="nama@email.com"
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 placeholder:text-slate-400 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block pl-1">
              Password
            </label>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 placeholder:text-slate-400 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || message?.type === 'success'}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Memproses...</span>
              </>
            ) : (
              <span>Sign In →</span>
            )}
          </button>
        </form>

        {/* FOOTER LINK */}
        <p className="text-xs text-center text-slate-500 font-medium mt-6">
          Belum punya akun?{' '}
          <Link href="/register" className="text-emerald-600 font-bold hover:underline">
            Daftar di sini
          </Link>
        </p>
      </div>
    </div>
  )
}
