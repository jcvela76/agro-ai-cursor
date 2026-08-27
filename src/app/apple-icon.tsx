import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4F6F52",
          color: "#FFFDF8",
          fontSize: 96,
          fontWeight: 600,
          fontFamily: "Georgia, serif",
        }}
      >
        A
      </div>
    ),
    { ...size },
  );
}
