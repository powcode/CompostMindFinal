'use client' // ⚠️ WAJIB ditambahkan di baris paling atas

import { signIn } from '@/app/actions/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function LoginPage() {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  // Effect untuk redirect otomatis setelah 3 detik jika sukses
  useEffect(() => {
    if (message?.type === 'success') {
      const timer = setTimeout(() => {
        router.push('/dashboard')
      }, 3000)

      return () => clearTimeout(timer) // Cleanup timer jika komponen unmount
    }
  }, [message, router])

  async function handleSubmit(formData: FormData) {
    setMessage(null)
    const result = await signIn(formData)

    if (result.success) {
      setMessage({ type: 'success', text: 'Berhasil login! Mengalihkan ke dashboard...' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Login gagal.' })
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <form action={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-4">Login</h1>

        {/* Tampilkan Pesan Sukses / Error */}
        {message && (
          <div
            className={`px-4 py-2 rounded text-sm ${
              message.type === 'success'
                ? 'bg-green-100 border border-green-400 text-green-700'
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="border p-2 rounded"
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          className="border p-2 rounded"
        />

        <button
          type="submit"
          disabled={message?.type === 'success'} // Disable tombol saat menunggu redirect
          className="bg-green-500 text-white p-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          Sign In
        </button>

        <p className="text-sm text-gray-600">
          Belum punya akun?{' '}
          <Link href="/register" className="text-blue-500">
            Daftar disini
          </Link>
        </p>
      </form>
    </div>
  )
}