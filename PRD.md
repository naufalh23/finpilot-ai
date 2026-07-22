# PRD.md

# FinPilot AI Lite

Version: 0.1.0

Status: Planning

Target Release:
Private Personal Use

---

# Product Vision

FinPilot AI Lite adalah aplikasi Personal Finance berbasis AI yang membantu pengguna mencatat transaksi harian, mengelola keuangan, dan memperoleh insight finansial secara sederhana.

Versi ini ditujukan khusus untuk penggunaan pribadi sebagai tahap validasi produk sebelum dikembangkan menjadi Financial Operating System.

---

# Objectives

- Menggantikan pencatatan keuangan manual
- Mengetahui ke mana uang digunakan
- Mendapat insight otomatis dari AI
- Mengelola budget sederhana
- Menjadi aplikasi yang benar-benar dipakai setiap hari
- Mengumpulkan pain point sebelum pengembangan besar

---

# Tech Stack

Frontend

- Next.js (App Router)
- TypeScript
- TailwindCSS
- shadcn/ui

Backend

- Next.js Server Actions
- Prisma ORM

Database

- Neon PostgreSQL

Authentication

- Google OAuth

Storage

- Supabase Storage

AI

- Gemini API

Hosting

- Vercel

---

# Scope Version 0.1

Fokus:

AI Money Tracking
AI Money Manager
AI Financial Coach (Basic)

Tidak ada fitur sosial.

Tidak ada sharing.

Tidak ada multi user.

Tidak ada subscription premium.

Semua fokus untuk penggunaan pribadi.

---

# Core Modules

- Authentication
- Dashboard
- Wallet
- Transactions
- Categories
- AI Insight
- Budget
- Reports
- Import Export
- Settings

---

# Authentication

Support

✅ Login Google

Future

- Apple
- Facebook
- Email

---

# Dashboard

Menampilkan

- Total Balance
- Income Bulan Ini
- Expense Bulan Ini
- Cash Flow
- Saving Rate
- Budget Progress

AI Card

Contoh

"Pengeluaran makan meningkat 23% dibanding minggu lalu."

---

# Wallet

Support

- Cash
- Bank
- E-Wallet

Future

- Multi Currency

---

# Transactions

CRUD

Jenis

- Income
- Expense
- Transfer

Field

- Date
- Wallet
- Category
- Amount
- Notes
- Attachment

Status

- Pending
- Completed

---

# Attachment

Support

Upload

- Receipt
- Invoice
- Photo

Storage

Supabase Storage

---

# AI Receipt

Input

- Upload Photo
- Camera

Gemini membaca

- Merchant
- Total
- Date
- Items

AI membuat draft transaksi.

User tinggal konfirmasi.

---

# Categories

Default

Income

- Salary
- Bonus
- Freelance

Expense

- Food
- Transportation
- Shopping
- Bills
- Entertainment
- Health
- Education

Support

Custom Category

---

# Budget

Budget Bulanan

Per Category

Progress

Alert

AI Recommendation

---

# Recurring Transaction

Support

- Daily
- Weekly
- Monthly
- Yearly

Contoh

Netflix

Internet

Salary

Rent

Gym

---

# Subscription Manager

Support

- Netflix
- Spotify
- YouTube Premium
- ChatGPT
- Claude
- Gemini
- Apple
- Google One

Field

- Price
- Billing Date
- Auto Renewal
- Reminder

---

# Credit Card

Support

- Card List
- Credit Limit
- Billing Date
- Due Date
- Outstanding

AI Reminder

"Tagihan BCA Visa jatuh tempo dalam 5 hari."

---

# Loan Manager

Support

- Personal Loan
- Bank Loan
- Vehicle Loan
- Mortgage

Track

- Remaining Balance
- Installment
- Due Date

---

# Investment

Manual Tracking

Support

- Stock
- Crypto
- Gold
- Mutual Fund
- ETF

Field

- Buy Price
- Quantity
- Current Value (manual pada versi lite)
- Profit Loss

Catatan:
Belum ada sinkronisasi harga otomatis pada versi awal.

---

# AI Financial Coach

Dashboard AI

Memberikan insight seperti:

- Saving Rate
- Spending Pattern
- Monthly Review
- Budget Warning
- Recommendation

Contoh

"Anda menghabiskan Rp1.250.000 untuk kopi dalam 30 hari terakhir."

---

# AI Chat

Contoh

Kenapa uang saya habis?

Apa kategori terbesar bulan ini?

Berapa pengeluaran Shopee tahun ini?

Apa saya aman membeli laptop Rp15 juta?

AI hanya menggunakan data transaksi pengguna.

---

# Reports

Filter

- Daily
- Weekly
- Monthly
- Yearly
- Custom Date

Export

CSV

Excel

PDF (Future)

---

# Import

Support

CSV

Excel

Import Wizard

Preview

Column Mapping

---

# Export

CSV

Excel

JSON

---

# Search

Natural Language

Contoh

"Pengeluaran makan bulan ini"

"Total Grab bulan lalu"

"Belanja di Indomaret"

---

# Notifications

Browser Notification

Reminder

- Subscription
- Credit Card
- Loan
- Budget
- Recurring Transaction

---

# Settings

- Theme
- Currency
- Language
- Notification

---

# Out of Scope

Tidak ada:

- Multi User
- Family Sharing
- Split Bill
- OCR Item Level
- AI Prediction
- Investment API
- Open Banking
- Payment Gateway
- Premium Plan

Semua fitur tersebut masuk roadmap berikutnya.

---

# Success Metrics

Dalam 30 hari penggunaan pribadi:

- Aplikasi dipakai setiap hari
- Minimal 300 transaksi tercatat
- Seluruh subscription berhasil dikelola
- Tidak lagi mencatat keuangan di aplikasi lain
- AI Insight memberikan manfaat nyata
- Ditemukan minimal 10 pain point untuk iterasi berikutnya

---

# Vision Setelah Validasi

v0.1

↓

Daily Personal Finance

↓

v0.5

AI Money Manager

↓

v1.0

AI Personal Finance Assistant

↓

v2.0

Financial Operating System

↓

v3.0

Personal CFO