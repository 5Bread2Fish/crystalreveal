import type { Metadata } from "next";

import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export const metadata: Metadata = {
    title: "Bomee - Fetal Ultrasound Transformation",
    description: "Transform 3D/4D ultrasound images into realistic infant photos.",
};

import { Providers } from "@/components/Providers";

export default async function LocaleLayout({
    children,
    params: { locale }
}: Readonly<{
    children: React.ReactNode;
    params: { locale: string };
}>) {
    const messages = await getMessages();

    return (
        <NextIntlClientProvider messages={messages}>
            <Providers>
                <Script
                    src="https://www.googletagmanager.com/gtag/js?id=AW-17535143678"
                    strategy="afterInteractive"
                />
                <Script id="google-analytics" strategy="afterInteractive">
                    {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                
                  gtag('config', 'AW-17535143678');
                `}
                </Script>
                <Script id="google-ads-conversion" strategy="afterInteractive">
                    {`
                  function gtag_report_conversion(url) {
                    var callback = function () {
                      if (typeof(url) != 'undefined') {
                        window.location = url;
                      }
                    };
                    gtag('event', 'conversion', {
                        'send_to': 'AW-17535143678/MIz1COqBpesbEP6dtKlB',
                        'value': 1.0,
                        'currency': 'USD',
                        'transaction_id': '',
                        'event_callback': callback
                    });
                    return false;
                  }
                `}
                </Script>
                {children}
                <Analytics />
            </Providers>
        </NextIntlClientProvider>
    );
}
