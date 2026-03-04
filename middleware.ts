import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n-config';

const countryToLocaleMap: Record<string, string> = {
    // Spanish
    'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'PE': 'es', 'VE': 'es', 'CL': 'es',
    'EC': 'es', 'GT': 'es', 'CU': 'es', 'BO': 'es', 'DO': 'es', 'HN': 'es', 'PY': 'es',
    'SV': 'es', 'NI': 'es', 'CR': 'es', 'PA': 'es', 'UY': 'es',
    // Japanese
    'JP': 'ja',
    // Chinese
    'CN': 'zh-CN', 'TW': 'zh-CN', 'SG': 'zh-CN',
    'HK': 'zh-HK', 'MO': 'zh-HK',
    // Thai
    'TH': 'th',
    // Turkish
    'TR': 'tr',
    // Arabic (UAE + major Arabic-speaking countries)
    'AE': 'ar', 'SA': 'ar', 'EG': 'ar', 'JO': 'ar', 'KW': 'ar', 'QA': 'ar', 'BH': 'ar',
    'OM': 'ar', 'IQ': 'ar', 'LB': 'ar', 'LY': 'ar', 'MA': 'ar', 'DZ': 'ar', 'TN': 'ar',
    // Vietnamese
    'VN': 'vi',
    // Indonesian
    'ID': 'id',
};

// Create a middleware instance with default settings
const intlMiddleware = createMiddleware({
    locales,
    defaultLocale,
    localePrefix: 'always'
});

export default function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Don't localize api, admin, Next.js internal routes
    const isPublicRoute = /^\/((api|admin|_next)(?:\/.*)?)$/.test(pathname);
    if (isPublicRoute) {
        return NextResponse.next();
    }

    // Next-intl automatically handles NEXT_LOCALE cookie if it's set.
    // If no locale cookie exists, and the user visits the root / or a path without a locale prefix,
    // we can override the defaultLocale based on IP.
    const hasLocaleCookie = request.cookies.has('NEXT_LOCALE');

    if (!hasLocaleCookie) {
        // Vercel populates 'x-vercel-ip-country' header
        const country = request.geo?.country || request.headers.get('x-vercel-ip-country');
        const detectedLocale = (country && countryToLocaleMap[country] ? countryToLocaleMap[country] : defaultLocale) as typeof locales[number];

        // We can create a dynamic instance of the middleware just for this request 
        // to use the detected locale as the default
        const dynamicMiddleware = createMiddleware({
            locales,
            defaultLocale: detectedLocale,
            localePrefix: 'always'
        });

        return dynamicMiddleware(request);
    }

    // If cookie exists, rely on standard next-intl logic
    return intlMiddleware(request);
}

export const config = {
    // Match all internationalized pathnames including root
    matcher: ['/', '/((?!api|admin|_next|.*\\..*).*)']
};
