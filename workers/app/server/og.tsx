import { GoogleFont, ImageResponse, cache } from "@cf-wasm/og/workerd";
import { Hono } from "hono";

const W = 1200;
const H = 630;

export type OgText = { title: string; subtitle: string };

type OgVariant = "1" | "2" | "3" | "4";

type OgTheme = {
  root: string;
  accentTop: string;
  accentBottom: string;
  stripes: string;
};

const themes: Record<OgVariant, OgTheme> = {
  "1": {
    root: "bg-gradient-to-br from-[#0c1222] via-[#152238] to-[#0c1222]",
    accentTop: "bg-sky-300/22",
    accentBottom: "bg-sky-400/18",
    stripes:
      "bg-[repeating-linear-gradient(-24deg,rgba(255,255,255,0.14)_0px,rgba(255,255,255,0.14)_2px,transparent_2px,transparent_16px)]",
  },
  "2": {
    root: "bg-gradient-to-br from-[#0b1324] via-[#1e1b4b] to-[#0f172a]",
    accentTop: "bg-sky-400/24",
    accentBottom: "bg-blue-500/22",
    stripes:
      "bg-[repeating-linear-gradient(-24deg,rgba(255,255,255,0.22)_0px,rgba(255,255,255,0.22)_2px,transparent_2px,transparent_16px)]",
  },
  "3": {
    root: "bg-gradient-to-br from-[#111827] via-[#0f766e] to-[#0b1324]",
    accentTop: "bg-teal-400/24",
    accentBottom: "bg-emerald-500/22",
    stripes:
      "bg-[repeating-linear-gradient(-24deg,rgba(255,255,255,0.16)_0px,rgba(255,255,255,0.16)_2px,transparent_2px,transparent_16px)]",
  },
  "4": {
    root: "bg-gradient-to-br from-[#1f2937] via-[#7c2d12] to-[#111827]",
    accentTop: "bg-orange-400/26",
    accentBottom: "bg-amber-500/22",
    stripes:
      "bg-[repeating-linear-gradient(-24deg,rgba(255,255,255,0.18)_0px,rgba(255,255,255,0.18)_2px,transparent_2px,transparent_16px)]",
  },
};

function ogMarkup({ title, subtitle }: OgText, bg: OgVariant) {
  const theme = themes[bg];
  return (
    <div
      className={`relative flex h-157.5 w-300 flex-col justify-center overflow-hidden p-4 font-[Inter] ${theme.root}`}
    >
      <div
        className={`absolute -top-45 -right-30 h-108 w-108 rounded-full ${theme.accentTop}`}
      />
      <div
        className={`absolute -bottom-35 -left-27.5 h-85 w-85 rounded-full ${theme.accentBottom}`}
      />
      <div className={`absolute inset-0 ${theme.stripes}`} />
      <div className="relative flex flex-col">
        <div className="mb-5 text-[26px] text-sky-300">radio</div>
        <div className="text-[52px] font-bold leading-[1.15] text-slate-50">
          {title}
        </div>
        <div className="mt-6 text-[26px] leading-[1.45] text-slate-400">
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
  const subtitle = c.req.query("subtitle") ?? "mpd radio";
  const bgParam = c.req.query("bg");
  let bg: OgVariant = "1";
  if (bgParam === "2" || bgParam === "3" || bgParam === "4") {
    bg = bgParam;
  }

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
