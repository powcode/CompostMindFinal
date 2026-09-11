# CompostMind

**Version: 0.1.0**

CompostMind adalah aplikasi web untuk membantu pengguna dalam proses composting dengan deteksi bahan, pelacakan sesi, dan panduan langkah demi langkah menggunakan AI.

**Tech Stack:**
- [Next.js 16](https://nextjs.org) - React framework
- [TypeScript](https://www.typescriptlang.org) - Type safety
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Supabase](https://supabase.io) - Backend & Database
- [Google Generative AI (Gemini)](https://ai.google.dev) - AI features
- [Lucide React](https://lucide.dev) - Icons

---

## 📋 Prerequisites

Pastikan Anda memiliki:
- **Node.js** v18+ ([Download](https://nodejs.org))
- **npm**, **yarn**, **pnpm**, atau **bun** sebagai package manager
- **Supabase Account** ([Daftar gratis](https://supabase.com))
- **Google AI API Key** ([Get API Key](https://ai.google.dev/))

---

## 🚀 Quick Start

### 1. Clone atau Extract Project

```bash
cd compostmind_final
```

### 2. Install Dependencies

```bash
npm install
# atau
yarn install
# atau
pnpm install
```

### 3. Setup Environment Variables

Buat file `.env.local` di root project:

```bash
# Supabase Configuration (dari Supabase Dashboard > Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google Gemini API (dari Google AI Studio)
GEMINI_API_KEY=your-gemini-api-key
```

**Bagaimana mendapatkan credentials:**

#### Supabase:
1. Buka [supabase.com](https://supabase.com) dan login
2. Buat project atau pilih project yang sudah ada
3. Go to **Settings** > **API**
4. Copy `Project URL` dan `Anon Key`

#### Google Gemini API:
1. Buka [ai.google.dev](https://ai.google.dev/)
2. Klik **"Get API Key"** dan buat project di Google Cloud
3. Copy API key Anda

### 4. Setup Database (Optional)

Jika menggunakan Supabase dengan database, jalankan migration:

```bash
# Import migration file jika diperlukan
# supabase_migration_add_condition.sql
```

### 5. Run Development Server

```bash
npm run dev
```

Buka browser dan kunjungi: **[http://localhost:3000](http://localhost:3000)**

---

## 📁 Project Structure

```
compostmind_final/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── chat/          # Chat endpoint
│   │   ├── detect/        # Deteksi bahan
│   │   ├── ingredients/   # Manajemen ingredients
│   │   └── sessions/      # Manajemen sessions
│   ├── composting/        # Halaman composting
│   ├── login/            # Halaman login
│   ├── register/         # Halaman registrasi
│   ├── tutorial/         # Halaman tutorial
│   └── actions/          # Server actions
├── components/           # React components
├── lib/                  # Utility functions
│   ├── gemini.ts        # Google AI integration
│   └── supabase.ts      # Supabase client
├── utils/               # Helper utilities
├── types/               # TypeScript types
├── public/              # Static assets
├── .env.local          # Environment variables (create this)
├── package.json         # Dependencies
├── next.config.ts      # Next.js config
├── tsconfig.json       # TypeScript config
└── tailwind.config.ts  # Tailwind config
```

---

## 🔧 Available Scripts

```bash
# Development server (hot reload)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

---

## 📦 Version & Dependencies

### Application Version
- **CompostMind**: v0.1.0

### Core Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `next` | ^16.3.1 | React framework & server |
| `react` | ^18.3.1 | UI library |
| `react-dom` | ^18.3.1 | React DOM rendering |
| `typescript` | ^5 | Type safety |
| `@google/generative-ai` | ^0.24.1 | Google AI Gemini API |
| `@supabase/supabase-js` | ^2.112.3 | Supabase client |
| `@supabase/ssr` | ^0.12.5 | Supabase SSR support |
| `axios` | ^1.19.0 | HTTP client |
| `lucide-react` | ^1.39.0 | Icon library |

### Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | ^4 | CSS utility framework |
| `@tailwindcss/postcss` | ^4 | Tailwind PostCSS plugin |
| `eslint` | ^9 | Code linting |
| `eslint-config-next` | 16.3.0 | Next.js ESLint config |
| `@types/react` | ^18.3.31 | React TypeScript types |
| `@types/react-dom` | ^18.3.7 | React DOM TypeScript types |
| `@types/node` | ^20 | Node.js TypeScript types |

---

## 🌐 API Endpoints

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/chat` | POST | Chat dengan AI |
| `/api/detect` | POST | Deteksi bahan menggunakan AI |
| `/api/ingredients` | GET/POST | Kelola ingredients |
| `/api/ingredients/[id]` | GET/PUT/DELETE | Detail ingredient |
| `/api/sessions` | GET/POST | Kelola composting sessions |
| `/api/sessions/[id]/start` | POST | Mulai session |
| `/api/steps/[id]/complete` | POST | Tandai step selesai |

---

## 🔐 Authentication

Project ini menggunakan Supabase Authentication. Features:
- Login dengan email/password
- Registrasi akun baru
- Session management

---

## 📱 Pages

- **`/`** - Home/Dashboard
- **`/login`** - Halaman login
- **`/register`** - Halaman registrasi
- **`/tutorial`** - Panduan composting
- **`/composting`** - Daftar session
- **`/composting/[id]`** - Detail session
- **`/composting/[id]/step/[stepId]`** - Detail step

---

## 🤖 AI Features

### Deteksi Bahan (Ingredient Detection)
Menggunakan Google Generative AI untuk mengidentifikasi bahan yang bisa dicompost dari input pengguna.

### Chat Assistant
Chatbot berbasis AI untuk menjawab pertanyaan tentang composting.

---

## 🐛 Troubleshooting

### Error: "GEMINI_API_KEY is not defined"
- Pastikan `.env.local` sudah dibuat dengan `GEMINI_API_KEY`
- Restart dev server setelah menambah environment variable

### Error: "Supabase URL is not defined"
- Pastikan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` sudah benar
- Check di Supabase Dashboard > Settings > API

### Port 3000 already in use
```bash
npm run dev -- -p 3001
```

---

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Google Generative AI](https://ai.google.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## 📝 License

Private Project

---

## 👤 Author

CompostMind Team
