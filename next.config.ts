// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Opsional: Matikan Turbopack jika menyebabkan masalah build di Vercel
  // turbopack: false, 
  
  // Pastikan env vars NEXT_PUBLIC_ terekspos
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  
  // Jika menggunakan image optimization dari domain luar (misal YOLO/Colab)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Sesuaikan dengan domain gambar Anda
      },
    ],
  },
};

export default nextConfig;