# PANASEA

Coffee Shop POS + Management System — aplikasi internal untuk owner dan cashier.

Status saat ini: **BATCH 1 (Foundation)** dan **BATCH 2 (Database + Authentication)**
selesai. Fitur bisnis (POS, inventori, laporan, dst.) belum dibangun — itu untuk
batch berikutnya.

## Stack

| Bagian | Pilihan | Alasan |
|---|---|---|
| Framework | **Next.js 14** (App Router) + TypeScript | Satu framework untuk frontend & backend (API routes). |
| Database | **SQLite** via **Prisma ORM** | Jalan tanpa instalasi database server. Pindah ke PostgreSQL nanti hanya mengubah 2 baris konfigurasi. |
| Auth | **JWT (jose)** dalam httpOnly cookie + **bcryptjs** untuk password hashing | Stateless, edge-safe untuk middleware, standar industri. |
| Styling | **Tailwind CSS** | Design token terpusat di `tailwind.config.ts`. |
| Validasi | **Zod** | Validasi environment variable dan input API. |
| Ikon | **lucide-react** | Ikon garis sederhana dan konsisten. |

## Struktur folder

```
panasea/
├── prisma/
│   ├── schema.prisma          # User, Role, Permission, RolePermission
│   ├── migrations/             # Migration history (SQLite)
│   └── seed.ts                 # Seed role/permission/dev user
├── src/
│   ├── app/
│   │   ├── (app)/               # Area terproteksi (perlu login)
│   │   │   ├── layout.tsx        # Resolve session, render AppShell
│   │   │   └── page.tsx           # Dashboard
│   │   ├── login/page.tsx        # Halaman login (publik)
│   │   ├── api/
│   │   │   ├── auth/login/        # POST — login
│   │   │   ├── auth/logout/       # POST — logout
│   │   │   ├── auth/me/           # GET — sesi saat ini
│   │   │   ├── health/             # GET — status sistem (publik)
│   │   │   └── users/              # GET — daftar user (owner-only, contoh RBAC)
│   │   └── layout.tsx             # Root layout: font, metadata (tanpa AppShell)
│   ├── components/
│   │   ├── ui/                    # Button, Input, Badge, Spinner
│   │   ├── layout/                 # AppShell, Sidebar, Topbar (Topbar kini menampilkan user asli + logout)
│   │   ├── states/                  # LoadingState, ErrorState, EmptyState
│   │   └── dashboard/                # SystemStatusPanel (client, health check)
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── jwt.ts               # Sign/verify session token (edge-safe, dipakai middleware)
│   │   │   ├── password.ts          # Hash/compare bcrypt
│   │   │   ├── session.ts           # getCurrentSession()/requireSession() — query DB tiap request
│   │   │   ├── permissions.ts       # requirePermission()/requireRole()
│   │   │   └── permission-catalog.ts # Sumber kebenaran daftar permission + default role grant
│   │   ├── services/user-service.ts # Data access user (exclude passwordHash)
│   │   ├── validation/auth.ts       # loginSchema
│   │   ├── db.ts / env.ts / errors.ts / api-response.ts / utils.ts
│   ├── types/                      # SessionUser, ApiBody, dst.
│   └── middleware.ts               # Redirect halaman yang belum login (UX layer, bukan security utama)
└── .env.example
```

## Menjalankan project

**Prasyarat:** Node.js 18.18+, npm.

```bash
npm install
cp .env.example .env
# generate AUTH_SECRET, contoh: openssl rand -base64 32
# lalu isi AUTH_SECRET di .env dengan hasilnya

npm run db:push       # sinkronkan schema ke database SQLite
npm run db:generate   # generate Prisma Client
npm run db:seed       # buat role, permission, dan akun development

npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) — akan diarahkan ke `/login`.

> Catatan lingkungan pengerjaan: sandbox tempat kode ini ditulis tidak
> memiliki akses jaringan, sehingga `npm install`, `prisma migrate`, `db:seed`,
> `typecheck`, `lint`, dan `build` **tidak bisa dijalankan/diverifikasi di sini**.
> Semua file sudah ditinjau ulang secara manual (konsistensi import, alur
> data, penamaan) tetapi belum divalidasi oleh compiler/DB sungguhan — jalankan
> command di atas di mesin Anda sebagai verifikasi final. Jika ada error,
> beri tahu saya pesannya dan akan langsung diperbaiki.

## Command

| Command | Fungsi |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Build production |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:push` | Sinkronkan schema ke DB (cara cepat untuk dev) |
| `npm run db:migrate` | `prisma migrate dev` — terapkan migration history di `prisma/migrations/` |
| `npm run db:seed` | Jalankan `prisma/seed.ts` |
| `npm run db:studio` | Buka Prisma Studio |

**Tentang migration:** folder `prisma/migrations/20260902000000_init_auth/`
ditulis manual agar sesuai `schema.prisma`, karena sandbox pengerjaan ini
tidak bisa menjalankan Prisma engine (butuh jaringan). Jalankan
`npm run db:migrate` di mesin Anda untuk memverifikasi migration ini
diterapkan bersih — seharusnya tidak ada drift terdeteksi. Untuk development
cepat, `npm run db:push` juga cukup dan tidak bergantung pada migration
history.

## Autentikasi

**Mekanisme:** JWT (ditandatangani `AUTH_SECRET`, expire 8 jam) disimpan di
cookie `panasea_session` — httpOnly, `secure` di production, `sameSite=lax`.
Token hanya membuktikan *siapa* user; role dan permission selalu dibaca ulang
dari database di setiap request (`src/lib/auth/session.ts`), bukan dari isi
token — jadi akun yang dinonaktifkan langsung kehilangan akses tanpa menunggu
token kedaluwarsa.

**Login** (`POST /api/auth/login`): validasi input → cari user → bcrypt
compare (selalu dijalankan, bahkan untuk email yang tidak terdaftar, untuk
mencegah timing attack) → cek `isActive` → buat token → set cookie.

**Logout** (`POST /api/auth/logout`): hapus cookie. Untuk sesi berbasis JWT
stateless, ini adalah mekanisme invalidasi yang benar — browser tidak lagi
mengirim token. (Trade-off yang disengaja: tanpa server-side blacklist,
sebuah token yang sudah dicuri sebelum logout tetap valid sampai expire
8 jam. Kalau butuh revocation lebih ketat, bisa ditambah token blacklist di
batch berikutnya — bukan foundation yang keliru, hanya belum diperlukan
untuk aplikasi internal satu minggu ini.)

**Error handling login** — dibedakan agar aman tapi tetap jelas ke user:
- Email tidak terdaftar ATAU password salah → pesan generik yang sama
  (`INVALID_CREDENTIALS`, "Email atau password salah.") — tidak membocorkan
  apakah email terdaftar.
- Password benar tapi akun nonaktif → pesan berbeda (`ACCOUNT_INACTIVE`) —
  ini bukan kebocoran karena user sudah membuktikan tahu passwordnya.
- Input tidak valid → `VALIDATION_ERROR` per-field.
- Jaringan/server error → pesan generik, tidak membocorkan detail internal.

## Role & Permission

Role dan permission adalah **tabel database**, bukan enum di kode — supaya
role/permission baru bisa ditambah tanpa mengubah logic authorization (lihat
`src/lib/auth/permission-catalog.ts` sebagai satu-satunya sumber kebenaran
yang dipakai `prisma/seed.ts`).

- **OWNER** — semua permission.
- **CASHIER** — `dashboard.view`, `pos.access`, `transactions.view`,
  `transactions.create`, `products.view`, `customers.view`.

Pengecekan otorisasi selalu lewat `requirePermission(session, "key")` atau
`requireRole(session, ...)` — tidak ada `if (role === "OWNER")` yang
di-hardcode. Contoh nyata ada di `src/app/api/users/route.ts`: endpoint ini
mewajibkan permission `employees.view`, jadi request dari akun CASHIER (atau
tanpa login sama sekali) ditolak backend dengan 401/403 — terlepas dari apa
yang ditampilkan atau disembunyikan di frontend.

Middleware (`src/middleware.ts`) hanya mengarahkan halaman yang belum login
ke `/login` — murni UX. Middleware ini sengaja tidak berjalan di `/api/*`,
karena setiap API route memvalidasi sesi & permission-nya sendiri lewat
`requireSession()`/`requirePermission()` dan harus mengembalikan JSON 401/403
yang benar, bukan redirect ke halaman HTML.

## Seed / Development login credentials

**HANYA untuk development — jangan pernah dipakai di production.**

| Role | Email | Password |
|---|---|---|
| OWNER | `owner@panasea.dev` | `Owner#12345` |
| CASHIER | `cashier@panasea.dev` | `Cashier#12345` |

Untuk mengganti: edit array `DEV_USERS` di `prisma/seed.ts`. Untuk
production, buat user baru langsung lewat database dengan password yang
di-hash memakai `hashPassword()` dari `src/lib/auth/password.ts` — jangan
pernah commit password asli ke seed file. Manajemen user lewat UI (tambah/
nonaktifkan karyawan) adalah pekerjaan batch berikutnya.

## Security checklist BATCH 2

- Password di-hash dengan bcrypt (10 salt rounds), tidak pernah disimpan/dikirim sebagai plaintext.
- `AUTH_SECRET` dari environment variable, divalidasi wajib ada oleh `src/lib/env.ts` (dan dicek langsung oleh `jwt.ts` untuk konteks Edge).
- Cookie sesi: httpOnly, `secure` di production, `sameSite=lax`.
- Semua endpoint sensitif memvalidasi sesi + permission di backend (bukan hanya menyembunyikan menu).
- Response error tidak pernah menyertakan password/hash/secret/token/detail internal server.
- Query user untuk listing (`user-service.ts`) memakai `select` eksplisit — `passwordHash` tidak pernah ikut ter-fetch untuk endpoint yang tidak membutuhkannya.
- Trade-off yang disengaja: tidak ada token blacklist server-side, dan tidak ada CSRF token eksplisit (mengandalkan `sameSite=lax`). Wajar untuk aplikasi internal tahap ini; bisa diperkuat nanti jika dibutuhkan.

## Yang sengaja belum dibuat (setelah BATCH 2)

Tidak ada fitur POS, inventori, produk, laporan, atau manajemen karyawan
(di luar endpoint `GET /api/users`). Semua itu dibangun di BATCH 3 (di
bawah) atau menyusul di batch selanjutnya.

---

# BATCH 3 — Master Data & Inventory

Menambahkan: Category, Product (+ Variant, + Add-on), Unit, Ingredient,
Supplier, dan Inventory Movement (stock in/out, adjustment, low stock) —
semuanya nyata: skema DB sungguhan, service layer, API dengan
otorisasi, dan UI yang benar-benar memanggil API tersebut.

## File baru / diubah (ringkas)

- `prisma/schema.prisma` — model `Unit`, `Category`, `Product`, `ProductVariant`, `Addon`, `ProductAddon`, `Ingredient`, `Supplier`, `InventoryMovement`.
- `prisma/migrations/20260904000000_master_data_inventory/` — migration BATCH 3.
- `prisma/seed.ts` — ditambah: 5 unit (g, kg, ml, l, pcs dengan konversi), 5 kategori, 11 produk (+variant), 4 add-on, 10 ingredient (2 sengaja di bawah minimum stock untuk uji Low Stock), 3 supplier.
- `src/lib/inventory/unit-conversion.ts` — satu-satunya tempat logic konversi satuan.
- `src/lib/services/{category,product,addon,ingredient,inventory,unit,supplier}-service.ts` — business logic, terpisah dari route handler.
- `src/lib/validation/{category,product,ingredient,inventory,supplier}.ts` — skema Zod.
- `src/lib/api-response.ts` — ditambah pemetaan error Prisma (unique/FK/not-found) terpusat, supaya service tidak perlu query pre-check manual untuk validasi uniqueness.
- `src/lib/api-client.ts` — helper fetch di sisi client (dipakai semua halaman baru).
- `src/app/api/{categories,products,addons,ingredients,suppliers,units}/**` — route API lengkap dengan `requireSession()` + `requirePermission()`.
- `src/app/(app)/{products,products/[id],products/categories,products/addons,inventory,inventory/[id],suppliers}/page.tsx` — halaman baru.
- `src/components/{products,inventory,suppliers}/*` — UI manager per modul.
- `src/components/ui/{modal,confirm-dialog,pagination,select,textarea,status-badge,toast}.tsx` — primitive baru, dipakai lintas modul (bukan dibuat ulang per halaman).
- `src/components/layout/Sidebar.tsx` — nav Produk/Inventori/Pemasok kini aktif, difilter sesuai permission user.
- `src/app/(app)/page.tsx` — dashboard menampilkan jumlah produk aktif + ringkasan low stock.

## Desain kunci

- **Stock = ledger, bukan angka bebas.** `Ingredient.currentStock` hanya pernah diubah oleh `recordMovement()` (`src/lib/services/inventory-service.ts`), yang menulis baris `InventoryMovement` DAN meng-update `currentStock` dalam satu `db.$transaction` — tidak mungkin salah satu berhasil tanpa yang lain.
- **Uang tetap integer Rupiah** (pola BATCH 1), **stok tetap Float** (kg/liter memang pecahan) tapi selalu berubah lewat movement, bukan lewat write langsung ke field.
- **Unit conversion**: satu source of truth (`unit-conversion.ts`), unit disimpan sebagai data DB (bukan enum), tiap tipe (WEIGHT/VOLUME/COUNT) punya satu base unit.
- **Otorisasi**: memakai permission BATCH 2 apa adanya — `products.view/manage` untuk Category+Product+Variant+Addon, `inventory.view/manage` untuk Ingredient+Movement, `purchasing.view/manage` untuk Supplier. Cashier (punya `products.view` saja dari modul ini) bisa lihat produk tapi tidak bisa mengelola apa pun atau mengakses inventori/supplier sama sekali — diverifikasi lewat kode, bukan diasumsikan.
- **Delete vs deactivate**: Category diblokir hapus jika masih punya produk; Ingredient diblokir hapus jika sudah punya riwayat movement (pesan mengarahkan ke nonaktifkan). Product/Variant/Addon/Supplier aman dihapus karena belum ada modul lain (transaksi, PO) yang mereferensikan mereka di batch ini.

## Keterbatasan yang disengaja (agar scope tidak membengkak)

- Unit **tidak** punya halaman CRUD sendiri — hanya data seed + endpoint baca (`GET /api/units`) yang dipakai dropdown form Ingredient. Menambah/ubah unit berarti edit `prisma/seed.ts`.
- Kategori "Add-ons" dari contoh brief tidak dibuat sebagai Category — add-on sudah punya model sendiri, membuatnya juga jadi Category akan duplikatif.
- Product name **tidak unique** (SKU yang unique) — sesuai instruksi eksplisit terbaru.

## Verification

Sandbox tempat kode ini ditulis **tidak punya akses jaringan** (`npm install` gagal 403 saat dicoba), jadi `npm install`, `prisma migrate dev`, `prisma db seed`, `next build`, `next lint`, dan `tsc --noEmit` **tidak bisa benar-benar dijalankan di sini** — sama seperti BATCH 2. Yang sudah dilakukan sebagai gantinya:

- Tinjauan manual tiap file baru untuk import/export yang cocok (dicek dengan script sederhana, bukan hanya dibaca sekilas).
- Pengecekan silang skema Prisma vs migration SQL vs pemakaian di service (field demi field).
- Ditemukan dan diperbaiki 3 bug nyata selama proses ini: (1) `Supplier.name` dipakai di `upsert()` padahal tidak unique, (2) hal sama terjadi pada `Product.name`, (3) unused import di `validation/inventory.ts`.
- Sweep akhir: tidak ada sisa branding lama, tidak ada `.env` asli ikut ter-commit, tidak ada `node_modules`/`.next`/`.git` dalam paket.

**Mohon jalankan langsung di mesin Anda** (`npm install` → `cp .env.example .env` → isi `AUTH_SECRET` → `npm run db:push && npm run db:generate && npm run db:seed` → `npm run dev`, atau `npm run db:migrate` sebagai alternatif `db:push`) dan kabari saya jika `typecheck`/`lint`/`build` menemukan error — akan langsung diperbaiki.

## Yang sengaja belum dibuat (BATCH 3)

POS, checkout, payment/QRIS, shift, refund, reports, loyalty, promotion,
recipe/HPP otomatis, purchase order. Semua untuk batch berikutnya.

