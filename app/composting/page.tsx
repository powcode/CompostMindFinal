'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SessionData {
  id: string;
  status: string;
  created_at: string;
  user_id?: string | null;
  guest_identifier?: string | null;
  ingredients: { name: string; quantity: number }[];
}

export default function CompostDashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();

        let query = supabase.from('sessions').select('id, status, created_at, user_id, guest_identifier').order('created_at', { ascending: false });

        if (user) {
          query = query.eq('user_id', user.id);
        }

        const { data: sessionsData, error } = await query;

        if (error) throw error;

        if (sessionsData && sessionsData.length > 0) {
          const sessionsWithIngredients = await Promise.all(
            sessionsData.map(async (session) => {
              const { data: ingrData } = await supabase
                .from('ingredients')
                .select('name, quantity')
                .eq('session_id', session.id);
              
              return {
                ...session,
                ingredients: ingrData || []
              };
            })
          );
          setSessions(sessionsWithIngredients);
        } else {
          setSessions([]);
        }
      } catch (error) {
        console.error("Gagal mengambil riwayat sesi:", error);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pre_composting':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">🥣 Persiapan</span>;
      case 'generating_steps':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">🧠 AI Bekerja</span>;
      case 'active':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">🚀 Berjalan</span>;
      case 'completed':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">✅ Selesai</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">{status}</span>;
    }
  };

  const handleSessionClick = (session: SessionData) => {
    router.push(`/composting/${session.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">📋 Riwayat Sesi Kompos</h1>
            <p className="text-gray-500 mt-1">Pantau progres pengomposan Anda atau lanjutkan sesi sebelumnya.</p>
          </div>
          <Link 
            href="/" 
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition"
          >
            + Scan Baru
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Memuat riwayat sesi...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="text-6xl mb-4">🍃</div>
            <h2 className="text-xl font-bold text-gray-700">Belum ada sesi kompos</h2>
            <p className="text-gray-500 mt-2 mb-6">Mulai scan sisa makananmu untuk membuat sesi pertamamu!</p>
            <Link href="/" className="text-green-600 font-bold hover:underline">Klik di sini untuk mulai scan →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sessions.map((session) => (
              <div 
                key={session.id}
                onClick={() => handleSessionClick(session)}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden flex flex-col"
              >
                <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">Sesi {session.id.slice(0, 6).toUpperCase()}</h3>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(session.created_at)}</p>
                  </div>
                  {getStatusBadge(session.status)}
                </div>

                <div className="p-5 flex-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Bahan Terdeteksi:</p>
                  {session.ingredients.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {session.ingredients.map((ingr, idx) => (
                        <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-green-50 text-green-700 border border-green-100 capitalize">
                          {ingr.name.replace('_', ' ')} ({ingr.quantity})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Tidak ada bahan tercatat.</p>
                  )}
                </div>

                <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 text-right">
                  <span className="text-green-600 text-sm font-bold group-hover:translate-x-1 transition-transform inline-block">
                    {session.status === 'completed' ? 'Lihat Riwayat →' : 'Lanjutkan Sesi →'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
