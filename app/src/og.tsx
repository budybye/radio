import { GoogleFont, ImageResponse, cache } from "@cf-wasm/og/workerd";
import { Hono } from "hono";

const W = 1200;
const H = 630;

export type OgText = { title: string; subtitle: string };

type OgVariant = "1" | "2" | "3" | "4";

function variantStyle(bg: OgVariant) {
  if (bg === "2") {
    return {
      background:
        "linear-gradient(135deg, #0b1324 0%, #1e1b4b 45%, #0f172a 100%)",
      accentTop: "rgba(56, 189, 248, 0.24)",
      accentBottom: "rgba(59, 130, 246, 0.22)",
      stripeOpacity: 0.22,
    };
  }
  if (bg === "3") {
    return {
      background:
        "linear-gradient(135deg, #111827 0%, #0f766e 48%, #0b1324 100%)",
      accentTop: "rgba(45, 212, 191, 0.24)",
      accentBottom: "rgba(16, 185, 129, 0.22)",
      stripeOpacity: 0.16,
    };
  }
  if (bg === "4") {
    return {
      background:
        "linear-gradient(135deg, #1f2937 0%, #7c2d12 48%, #111827 100%)",
      accentTop: "rgba(251, 146, 60, 0.26)",
      accentBottom: "rgba(245, 158, 11, 0.22)",
      stripeOpacity: 0.18,
    };
  }
  return {
    background:
      "linear-gradient(135deg, #0c1222 0%, #152238 45%, #0c1222 100%)",
    accentTop: "rgba(125, 211, 252, 0.22)",
    accentBottom: "rgba(56, 189, 248, 0.18)",
    stripeOpacity: 0.14,
  };
}

function ogMarkup({ title, subtitle }: OgText, bg: OgVariant) {
  const theme = variantStyle(bg);
  return (
    <div
      className="flex flex-col w-300 h-157.5 p-1 justify-center overflow-hidden relative"
      style={{
        background: theme.background,
        fontFamily: "Inter",
      }}
    >
      <div
        className="absolute w-108 h-108 rounded-full -top-45 -right-30"
        style={{
          background: theme.accentTop,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 340,
          height: 340,
          borderRadius: "9999px",
          bottom: -140,
          left: -110,
          background: theme.accentBottom,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `repeating-linear-gradient(-24deg, rgba(255,255,255,${theme.stripeOpacity}) 0px, rgba(255,255,255,${theme.stripeOpacity}) 2px, transparent 2px, transparent 16px)`,
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ fontSize: 26, color: "#7dd3fc", marginBottom: 20 }}>
          radio
        </div>
        <div
          style={{
            fontSize: 52,
            color: "#f8fafc",
            fontWeight: 700,
            lineHeight: 1.15,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 26,
            color: "#94a3b8",
            marginTop: 24,
            lineHeight: 1.45,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}

const ogOptions = {
  width: W,
  height: H,
  fonts: [new GoogleFont("Inter")],
};

export const og = new Hono().get("/og.png", async (c) => {
  cache.setExecutionContext(c.executionCtx);

  const title = c.req.query("title") ?? "radio";
  const subtitle = c.req.query("subtitle") ?? "mpd radio 320kbps";
  const bgParam = c.req.query("bg");
  const bg: OgVariant =
    bgParam === "2" || bgParam === "3" || bgParam === "4" ? bgParam : "1";

  try {
    return await ImageResponse.async(ogMarkup({ title, subtitle }, bg), {
      ...ogOptions,
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    console.error("og render failed", err);
    const msg = err instanceof Error ? err.message : String(err);
    return c.text(`OG render failed: ${msg}`, 500);
  }
});
