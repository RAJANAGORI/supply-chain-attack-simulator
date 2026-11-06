import Script from 'next/script';

/** Same GA4 property as docs/index.html (simulator.rajanagori.in). */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? 'G-0EC7Y69Y12';

const gaBootstrap =
  'window.dataLayer = window.dataLayer || [];' +
  'function gtag(){dataLayer.push(arguments);}' +
  "gtag('js', new Date());" +
  "gtag('config', '" +
  GA_ID +
  "');";

/**
 * Embed Google Analytics in the Control Center so ./run.sh workshop
 * sessions report to the same property as the public docs site.
 * Opt out: NEXT_PUBLIC_SCAS_DISABLE_GA=1
 */
export function GoogleAnalytics() {
  if (process.env.NEXT_PUBLIC_SCAS_DISABLE_GA === '1') return null;
  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="scas-ga"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: gaBootstrap }}
      />
    </>
  );
}
