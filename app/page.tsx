import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

const countryToLocale: Record<string, string> = {
    'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'PE': 'es', 'VE': 'es', 'CL': 'es',
    'EC': 'es', 'GT': 'es', 'CU': 'es', 'BO': 'es', 'DO': 'es', 'HN': 'es', 'PY': 'es',
    'SV': 'es', 'NI': 'es', 'CR': 'es', 'PA': 'es', 'UY': 'es',
    'JP': 'ja',
    'CN': 'zh-CN', 'TW': 'zh-CN', 'SG': 'zh-CN',
    'HK': 'zh-HK', 'MO': 'zh-HK',
    'TH': 'th',
    'TR': 'tr',
    'AE': 'ar', 'SA': 'ar', 'EG': 'ar', 'JO': 'ar', 'KW': 'ar', 'QA': 'ar', 'BH': 'ar',
    'OM': 'ar', 'IQ': 'ar', 'LB': 'ar', 'LY': 'ar', 'MA': 'ar', 'DZ': 'ar', 'TN': 'ar',
    'VN': 'vi',
    'ID': 'id',
};

export default function RootPage() {
    const headersList = headers();
    const country = headersList.get('x-vercel-ip-country') || 'US';
    const locale = countryToLocale[country] || 'en';
    redirect(`/${locale}`);
}
