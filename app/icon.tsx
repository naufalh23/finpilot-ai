import { ImageResponse } from "next/og"

export const size = { width: 512, height: 512 }
export const contentType = "image/png"

/**
 * Generated at build time rather than checked in as a binary, so the mark stays
 * in sync with the brand colour in one place.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
          color: "#ffffff",
          fontSize: 300,
          fontWeight: 700,
          letterSpacing: -12,
        }}
      >
        F
      </div>
    ),
    size
  )
}
