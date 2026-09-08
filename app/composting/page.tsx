'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SessionCard from '@/components/SessionCard';

interface SessionData {
  id: string;
  title?: string | null;
  status: string;
  created_at: string;
  user_id: string;
  ingredients: { name: string; quantity: number }[];
}

const SESSIONS_PER_PAGE = 6;

export default function CompostDashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function fetchSessions() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch('/api/sessions', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (res.status === 401) {
          window.location.href = '/login?redirectedFrom=/composting';
          return;
        }

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          const errorMessage = data?.error || `Gagal mengambil riwayat sesi (${res.status})`;
          throw new Error(errorMessage);
        }

        setSessions(data?.data || []);
        setCurrentPage(1);
      } catch (error: any) {
        console.error("Gagal mengambil riwayat sesi:", error?.message || error);
        setErrorMsg(error?.message || 'Terjadi kesalahan saat memuat data sesi.');
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, []);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  const handleSessionClick = (session: SessionData) => {
    router.push(`/composting/${session.id}`);
  };

  const totalPages = Math.ceil(sessions.length / SESSIONS_PER_PAGE);
  const paginatedSessions = sessions.slice(
    (currentPage - 1) * SESSIONS_PER_PAGE,
    currentPage * SESSIONS_PER_PAGE
  );

  return (
    <div className="flex-1 w-full bg-slate-50 p-4 sm:p-6 lg:p-8 safe-bottom">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">📋 Riwayat Sesi Kompos</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Pantau progres pengomposan Anda atau lanjutkan sesi sebelumnya.</p>
          </div>
          <Link 
            href="/" 
            className="w-full sm:w-auto min-h-[44px] flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 sm:py-2.5 rounded-2xl font-bold text-sm shadow-md transition active:scale-[0.98]"
          >
            + Scan Baru
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-16 sm:py-20 text-slate-500 text-sm sm:text-base">Memuat riwayat sesi...</div>
        ) : errorMsg ? (
          <div className="text-center py-8 sm:py-12 bg-white rounded-3xl border border-rose-200 shadow-sm p-6">
            <div className="text-3xl sm:text-4xl mb-3">⚠️</div>
            <h2 className="text-base sm:text-lg font-bold text-rose-700 mb-2">Gagal Memuat Sesi</h2>
            <p className="text-xs sm:text-sm text-slate-600">{errorMsg}</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 sm:py-20 px-4 bg-white rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="text-4xl sm:text-6xl mb-4">🍃</div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">Belum ada sesi kompos</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-6">Mulai scan sisa makananmu untuk membuat sesi pertamamu!</p>
            <Link href="/" className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-emerald-50 text-emerald-700 rounded-2xl font-bold text-sm hover:bg-emerald-100 transition-colors">
              Klik di sini untuk mulai scan →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
            {paginatedSessions.map((session) => (
              <SessionCard
                key={session.id}
                id={session.id}
                title={session.title}
                status={session.status}
                createdAt={formatDate(session.created_at)}
                ingredients={session.ingredients}
                onClick={() => handleSessionClick(session)}
              />
            ))}
            {totalPages > 1 && (
              <div className="col-span-full flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Sebelumnya
                </button>

                <div className="flex items-center gap-1" aria-label="Navigasi halaman sesi">
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
                    <button
                      key={page}
                      type="button"
                      aria-label={`Halaman ${page}`}
                      aria-current={currentPage === page ? 'page' : undefined}
                      onClick={() => setCurrentPage(page)}
                      className={`h-9 w-9 rounded-xl text-sm font-semibold transition ${
                        currentPage === page
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Berikutnya →
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
