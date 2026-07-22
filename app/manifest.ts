import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FinPilot AI",
    short_name: "FinPilot",
    description:
      "Personal finance assistant bertenaga AI — catat, pahami, dan kendalikan keuangan harian.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#09090b",
    theme_color: "#09090b",
    lang: "id",
    categories: ["finance", "productivity"],
    icons: [
      // Served by app/icon.tsx; "any maskable" lets Android apply its own shape.
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      { name: "Tambah Transaksi", url: "/transactions" },
      { name: "Laporan", url: "/reports" },
      { name: "AI Coach", url: "/coach" },
    ],
  }
}
