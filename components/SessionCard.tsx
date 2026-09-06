'use client';

import React from 'react';

interface Ingredient {
  name: string;
  quantity: number;
}

interface SessionCardProps {
  id: string;
  title?: string | null;
  status: string;
  createdAt: string;
  ingredients: Ingredient[];
  onClick: () => void;
}

export default function SessionCard({
  id,
  title,
  status,
  createdAt,
  ingredients,
  onClick,
}: SessionCardProps) {
  const sessionTitle = (() => {
    const trimmedTitle = (title || '').trim();
    if (trimmedTitle) return trimmedTitle;
    return `Sesi ${id.slice(0, 6).toUpperCase()}`;
  })();

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'pre_composting':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-100 text-amber-900 border border-amber-200/60">🥣 Persiapan</span>;
      case 'generating_steps':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-100 text-blue-900 border border-blue-200/60">🧠 AI Bekerja</span>;
      case 'active':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200/60">🚀 Berjalan</span>;
      case 'completed':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-slate-200 text-slate-800 border border-slate-300/60">✅ Selesai</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200">{st}</span>;
    }
  };

  return (
    <div
      onClick={onClick}
      className="interactive-card bg-[var(--surface)] rounded-[var(--radius-md)] border border-[var(--border)] shadow-[var(--shadow-sm)] cursor-pointer overflow-hidden flex flex-col active:scale-[0.99] group"
    >
      <div className="px-3.5 py-3 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface-strong)]">
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base truncate leading-snug">{sessionTitle}</h3>
          <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">{createdAt}</p>
        </div>
        <div className="shrink-0">{getStatusBadge(status)}</div>
      </div>

      <div className="px-3.5 py-2.5 flex-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bahan Terdeteksi:</p>
        {ingredients && ingredients.length > 0 ? (
          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            {ingredients.map((ingr, idx) => (
              <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-50/80 text-emerald-800 border border-emerald-200/80 capitalize">
                {ingr.name.replace('_', ' ')} <span className="ml-1 opacity-70">({ingr.quantity})</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Tidak ada bahan tercatat.</p>
        )}
      </div>

      <div className="bg-[var(--surface-strong)] px-3.5 py-2 border-t border-[var(--border)] text-right flex items-center justify-end min-h-[36px]">
        <span className="text-emerald-700 text-xs font-bold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
          {status === 'completed' ? 'Lihat Riwayat →' : 'Lanjutkan Sesi →'}
        </span>
      </div>
    </div>
  );
}
