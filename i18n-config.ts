export const locales = ['en', 'es', 'zh-CN', 'zh-HK', 'ja', 'th', 'tr', 'ar', 'vi', 'id'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
