'use client';

import React from 'react';

interface Ingredient {
  name: string;
  quantity: number;
}

interface SessionCardProps {
  id: string;
  status: string;
  createdAt: string;
  ingredients: Ingredient[];
  onClick: () => void;
}

export default function SessionCard({
  id,
  status,
  createdAt,
  ingredients,
  onClick,
}: SessionCardProps) {
  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'pre_composting':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">🥣 Persiapan</span>;
      case 'generating_steps':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">🧠 AI Bekerja</span>;
      case 'active':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">🚀 Berjalan</span>;
      case 'completed':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-200 text-slate-700">✅ Selesai</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">{st}</span>;
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col active:scale-[0.99] group"
    >
      <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
        <div>
          <h3 className="font-bold text-slate-800 text-base sm:text-lg">Sesi {id.slice(0, 6).toUpperCase()}</h3>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">{createdAt}</p>
        </div>
        {getStatusBadge(status)}
      </div>

      <div className="p-4 sm:p-5 flex-1">
        <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 sm:mb-3">Bahan Terdeteksi:</p>
        {ingredients && ingredients.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {ingredients.map((ingr, idx) => (
              <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-100 capitalize">
                {ingr.name.replace('_', ' ')} ({ingr.quantity})
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-slate-400 italic">Tidak ada bahan tercatat.</p>
        )}
      </div>

      <div className="bg-slate-50/50 px-4 sm:px-5 py-3 border-t border-slate-100 text-right min-h-[44px] flex items-center justify-end">
        <span className="text-emerald-600 text-xs sm:text-sm font-bold group-hover:translate-x-1 transition-transform inline-block">
          {status === 'completed' ? 'Lihat Riwayat →' : 'Lanjutkan Sesi →'}
        </span>
      </div>
    </div>
  );
}
