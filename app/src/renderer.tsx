import { jsxRenderer } from "hono/jsx-renderer";
import { Link, Script, ViteClient } from "vite-ssr-components/hono";

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Workers</title>
        <link
          href="/manifest.webmanifest"
          rel="manifest"
          crossOrigin="use-credentials"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto+Mono:ital,wght@0,100..700;1,100..700&family=Roboto:ital,wght@0,100..900;1,100..900&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/logo.svg" sizes="any" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
        <ViteClient />
        <Script src="/src/client/main.tsx" async />
        <Link href="/src/style.css" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
});
