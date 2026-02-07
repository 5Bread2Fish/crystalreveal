import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import Script from "next/script";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
    title: "Bomee - Fetal Ultrasound Transformation",
    description: "Transform 3D/4D ultrasound images into realistic infant photos.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.variable} font-sans antialiased min-h-screen bg-slate-50 text-slate-900`}>
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
            </body>
        </html>
    );
}
