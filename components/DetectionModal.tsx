'use client';

import React from 'react';

interface Ingredient {
  id?: string;
  name: string;
  quantity: number;
  condition: 'whole' | 'peel' | 'rotten';
}

interface DetectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  imagePreview: string | null;
  ingredients: Ingredient[];
  onUpdateQuantity: (index: number, delta: number) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function DetectionModal({
  isOpen,
  onClose,
  imagePreview,
  ingredients,
  onUpdateQuantity,
  onConfirm,
  isLoading = false,
}: DetectionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div 
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-200 safe-bottom"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">Hasil Deteksi Bahan</h3>
            <p className="text-xs text-slate-500">Periksa dan sesuaikan jumlah bahan</p>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {imagePreview && (
            <div className="relative aspect-[4/3] w-full max-h-48 sm:max-h-56 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200/80">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Detection preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Bahan Terdeteksi ({ingredients.length})
            </span>

            {ingredients.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-4 text-center">
                Tidak ada bahan organik terdeteksi.
              </p>
            ) : (
              <div className="space-y-2">
                {ingredients.map((ingr, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100"
                  >
                    <span className="font-bold text-sm text-slate-800 capitalize">
                      {ingr.name.replace('_', ' ')}
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onUpdateQuantity(idx, -1)}
                        className="w-11 h-11 flex items-center justify-center bg-white text-slate-700 rounded-xl border border-slate-200 font-bold text-base active:bg-slate-100 shadow-xs"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-black text-slate-800">
                        {ingr.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(idx, 1)}
                        className="w-11 h-11 flex items-center justify-center bg-white text-slate-700 rounded-xl border border-slate-200 font-bold text-base active:bg-slate-100 shadow-xs"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex flex-col sm:flex-row gap-2">
          <button
            onClick={onClose}
            className="w-full sm:w-1/3 min-h-[44px] py-3 px-4 rounded-2xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading || ingredients.length === 0}
            className="w-full sm:w-2/3 min-h-[44px] py-3 px-4 rounded-2xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
          >
            {isLoading ? 'Memproses...' : 'Mulai Pengomposan →'}
          </button>
        </div>
      </div>
    </div>
  );
}
