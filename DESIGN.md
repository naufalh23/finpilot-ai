# DESIGN.md

# FinPilot AI Lite
## Design System & UI/UX Guideline

Version: 0.1

Status: Draft

---

# Design Philosophy

FinPilot bukan sekadar aplikasi pencatat keuangan.

FinPilot harus terasa seperti memiliki **Personal Financial Assistant**.

Design harus memberikan kesan:

- Clean
- Modern
- Premium
- Calm
- Fast
- Minimal
- AI First

Inspirasi:

- Apple Wallet
- Notion
- Linear
- Raycast
- Arc Browser
- Revolut
- Copilot Money
- Monzo

---

# Design Principles

## 1. Simplicity First

Semua aksi utama maksimal 2 klik.

Contoh

Tambah transaksi

Dashboard

↓

+

↓

Save

---

## 2. AI First

AI bukan halaman terpisah.

AI muncul di seluruh aplikasi.

Contoh

Dashboard

↓

Insight AI

Transaction

↓

AI Category

Receipt

↓

AI OCR

Budget

↓

AI Recommendation

---

## 3. Mobile First

Karena aplikasi akan di-install sebagai PWA.

Target utama

iPhone

Android

Desktop tetap responsive.

---

## 4. Less Input

Semakin sedikit mengetik semakin baik.

Prioritas

Upload Receipt

↓

AI membaca

↓

User konfirmasi

daripada

Isi form panjang.

---

# Layout

Desktop

```
+------------------------------+
| Sidebar      | Content        |
|              |                |
|              |                |
|              |                |
+------------------------------+
```

---

Tablet

```
+------------------------+
| Top Bar                |
+------------------------+

Sidebar Collapse

↓

Content
```

---

Mobile

```
Top Navigation

↓

Dashboard

↓

Bottom Navigation
```

Bottom Navigation

```
Dashboard

Wallet

+

Reports

Profile
```

Floating Action Button

```
      +

Tambah Transaksi
```

---

# Navigation

Sidebar

- Dashboard
- Wallet
- Transactions
- Budget
- Reports
- AI Coach
- Settings

---

# Dashboard Layout

```
Greeting

↓

AI Insight Card

↓

Balance Card

↓

Income Expense Card

↓

Cash Flow Chart

↓

Budget Progress

↓

Recent Transactions

↓

Quick Action
```

---

# Dashboard Cards

## Balance

```
Total Balance

Rp12.350.000
```

---

Income

```
Income

Rp8.500.000
```

---

Expense

```
Expense

Rp4.200.000
```

---

Saving Rate

```
Saving Rate

42%
```

---

# AI Insight Card

Paling atas.

Contoh

```
🤖 AI Insight

Pengeluaran makan naik
18%
dibanding minggu lalu.

Sebaiknya batasi
maksimal Rp70.000
per hari.
```

Harus bisa di-dismiss.

---

# Wallet

Card Layout

```
BCA

Rp8.500.000
```

```
Cash

Rp500.000
```

```
GoPay

Rp250.000
```

---

# Transaction Page

Header

```
Search

+

Filter
```

---

Transaction Card

```
🍔

McDonald's

Food

Hari ini

Rp120.000
```

Swipe

Desktop

Hover

---

# Add Transaction

Menggunakan Sheet / Bottom Sheet.

Tidak berpindah halaman.

Flow

```
+

↓

Modal

↓

Save

↓

Close
```

---

Field Order

Tanggal

↓

Jenis

↓

Wallet

↓

Category

↓

Amount

↓

Notes

↓

Receipt

↓

Save

---

# Receipt Scanner

Flow

```
Upload

↓

Preview

↓

Gemini OCR

↓

Draft

↓

Confirm

↓

Save
```

Loading Animation

```
Reading Receipt...

Analyzing...

Categorizing...
```

---

# Budget

Card

```
Food

75%

███████░░░
```

Jika

>90%

warna menjadi Warning.

---

# Reports

Tabs

- Weekly
- Monthly
- Yearly

Charts

- Pie
- Line
- Bar

---

# AI Chat

Layout

```
Chat History

↓

Input

```

Contoh

```
Kenapa uang saya habis?
```

AI

```
Pengeluaran terbesar Anda
bulan ini berasal dari:

Food

Shopping

Subscription
```

---

# Color Palette

Primary

```
#2563EB
```

Blue

---

Secondary

```
#14B8A6
```

Teal

---

Success

```
#22C55E
```

---

Warning

```
#F59E0B
```

---

Danger

```
#EF4444
```

---

AI Accent

```
#7C3AED
```

Purple

---

Background

Light

```
#FFFFFF
```

Dark

```
#09090B
```

---

Surface

```
#FAFAFA
```

Dark

```
#18181B
```

---

Border

```
#E5E7EB
```

---

# Typography

Font

Geist

Fallback

Inter

---

Heading

Bold

---

Body

Regular

---

Number

SemiBold

Monospaced Optional

---

# Radius

Cards

16px

Buttons

12px

Input

12px

Modal

20px

---

# Shadows

Gunakan soft shadow.

Tidak terlalu tebal.

---

# Icons

Lucide Icons

Ukuran

20

24

28

---

# Components

## Button

Primary

Secondary

Ghost

Outline

Destructive

---

Input

Text

Currency

Date

Search

---

Card

Default

Gradient

AI

Wallet

Budget

---

Charts

Recharts

---

Toast

Success

Error

Warning

Info

---

Loading

Skeleton

Spinner

Progress

---

# Empty State

Contoh

```
Belum ada transaksi.

Tambahkan transaksi pertama Anda.
```

---

# Animations

Framer Motion

Durasi

150-250ms

Gunakan untuk

- Modal
- Sidebar
- Card
- Charts
- AI Loading

Jangan berlebihan.

---

# Responsive Breakpoint

Mobile

<640px

Tablet

640-1024px

Desktop

>1024px

---

# Theme

Support

Light

Dark

System

Default

Dark

---

# Accessibility

Minimum

WCAG AA

Kontras cukup

Button minimal

44px

---

# UX Rules

✅ Maksimal 2 klik untuk menambah transaksi

✅ AI Insight selalu terlihat di Dashboard

✅ Selalu tampilkan saldo total

✅ Tidak lebih dari 5 aksi utama dalam satu layar

✅ Form sesingkat mungkin

✅ Gunakan AI untuk mengurangi input manual

---

# Future Design

## Glassmorphism (Opsional)

Untuk AI Card.

---

## Dynamic Dashboard

User bisa drag & drop widget.

---

## AI Floating Assistant

Floating bubble di kanan bawah.

Bisa ditanya kapan saja.

---

## AI Voice Input

"Catat makan siang lima puluh ribu."

↓

AI membuat transaksi otomatis.

---

# Design Goal

Saat pertama kali membuka aplikasi, pengguna harus merasa:

> "Aplikasi ini sederhana, cepat, dan benar-benar membantu saya memahami kondisi keuangan tanpa membuat saya repot mengisi banyak data."

Bukan hanya **Money Tracker**, tetapi **Personal Finance Companion** yang nyaman digunakan setiap hari.