import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n-config';

// 국가 코드 → locale 매핑
const countryToLocale: Record<string, string> = {
    // Spanish
    'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'PE': 'es', 'VE': 'es', 'CL': 'es',
    'EC': 'es', 'GT': 'es', 'CU': 'es', 'BO': 'es', 'DO': 'es', 'HN': 'es', 'PY': 'es',
    'SV': 'es', 'NI': 'es', 'CR': 'es', 'PA': 'es', 'UY': 'es',
    // Japanese
    'JP': 'ja',
    // Chinese (Simplified)
    'CN': 'zh-CN', 'TW': 'zh-CN', 'SG': 'zh-CN',
    // Chinese (Hong Kong)
    'HK': 'zh-HK', 'MO': 'zh-HK',
    // Thai
    'TH': 'th',
    // Turkish
    'TR': 'tr',
    // Arabic
    'AE': 'ar', 'SA': 'ar', 'EG': 'ar', 'JO': 'ar', 'KW': 'ar', 'QA': 'ar', 'BH': 'ar',
    'OM': 'ar', 'IQ': 'ar', 'LB': 'ar', 'LY': 'ar', 'MA': 'ar', 'DZ': 'ar', 'TN': 'ar',
    // Vietnamese
    'VN': 'vi',
    // Indonesian
    'ID': 'id',
};

const intlMiddleware = createMiddleware({
    locales,
    defaultLocale
});

export default function middleware(req: NextRequest) {
    const country = req.headers.get('x-vercel-ip-country') || 'US';

    // 루트 경로('/') 접속 시, 국가에 맞춰 강제 리다이렉트
    // basePath 적용 환경에서는 /crystalreveal → 미들웨어에 '/'로 전달됨
    if (req.nextUrl.pathname === '/') {
        const targetLocale = countryToLocale[country] || 'en';

        // ⚠️ 핵심 수정: new URL() 대신 req.nextUrl.clone() 사용
        // new URL('/en', req.url) → basePath 무시하여 /en 으로 리다이렉트 (404 발생)
        // req.nextUrl.clone()    → basePath 인식하여 /crystalreveal/en 으로 리다이렉트 (정상)
        const url = req.nextUrl.clone();
        url.pathname = `/${targetLocale}`;
        return NextResponse.redirect(url);
    }

    // 하위 경로는 next-intl이 정상 처리
    return intlMiddleware(req);
}

export const config = {
    matcher: ['/((?!api|_next|.*\\..*).*)']
};
