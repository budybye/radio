import { renderToString } from "react-dom/server";
import { Link, Script, ViteClient } from "vite-ssr-components/react";
import { serializePage, type PageObject, type RootView } from "@hono/inertia";

const SITE_TITLE = "mpd radio";
const SITE_DESCRIPTION = "Live internet radio from mpd radio.";
const OG_IMAGE_PATH = "/og.png";

const Document = ({
  origin,
  page,
}: {
  origin: string;
  page: PageObject;
}) => {
  const canonicalUrl = new URL(page.url, origin).href;
  const ogImage = new URL(OG_IMAGE_PATH, origin).href;

  return (
    <html lang="en" data-theme="radio">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <title>{SITE_TITLE}</title>
        <meta name="description" content={SITE_DESCRIPTION} />
        <link rel="canonical" href={canonicalUrl} />
        <meta name="theme-color" content="#111827" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content={SITE_TITLE} />
        <meta property="og:title" content={SITE_TITLE} />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:alt" content="mpd radio live internet radio" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SITE_TITLE} />
        <meta name="twitter:description" content={SITE_DESCRIPTION} />
        <meta name="twitter:image" content={ogImage} />
        <link
          href="/manifest.webmanifest"
          rel="manifest"
          crossOrigin="use-credentials"
        />
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/logo.svg" sizes="any" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
        <ViteClient />
        <Script src="/app/client.tsx" />
        <Link href="/app/style.css" rel="stylesheet" />
      </head>
      <body>
        <script
          data-page="app"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: serializePage(page) }}
        />
        <div id="app" />
      </body>
    </html>
  );
};

export const rootView: RootView = (page, c) => {
  const origin = new URL(c.req.url).origin;
  return "<!DOCTYPE html>" + renderToString(<Document origin={origin} page={page} />);
};
