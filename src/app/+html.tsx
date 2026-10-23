import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Phone browsers: use the visible height (dvh) so the bottom bar is not hidden under the
// browser toolbar, stop double-tap zoom and rubber-band scrolling, and show the logo
// while the app code downloads. #boot hides itself as soon as the app renders into #root.
const webCss = `
html,body,#root{height:100%;height:100dvh;width:100%;max-width:100vw}
html{-webkit-text-size-adjust:100%;touch-action:manipulation}
body{overscroll-behavior:none;-webkit-tap-highlight-color:transparent;background:#E9E5E0}
#boot{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#E9E5E0;z-index:-1}
#boot img{border-radius:22px}
#root:not(:empty)~#boot{display:none}
`;

// Web-only document shell: gives the installed home-screen app its icon, name and full-screen look.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <title>Vossie Marketplace</title>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#E9E5E0" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Vossie" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: webCss }} />
      </head>
      <body>
        {children}
        <div id="boot" aria-hidden="true">
          <img src="/icon-192.png" alt="" width="96" height="96" />
        </div>
      </body>
    </html>
  );
}
