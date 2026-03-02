"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ChangeEvent } from "react";

export function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
    const router = useRouter();
    const pathname = usePathname();

    const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const newLocale = e.target.value;
        const days = 30;
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = `NEXT_LOCALE=${newLocale};expires=${date.toUTCString()};path=/`;

        // redirect to the new locale path
        const currentPathname = pathname;
        if (!currentPathname) return;

        // Remove the current locale from the pathname if it exists
        const segments = currentPathname.split('/');
        if (segments.length > 1 && ['en', 'es', 'zh-CN', 'zh-HK', 'ja', 'th', 'tr', 'ar', 'vi', 'id'].includes(segments[1])) {
            segments[1] = newLocale;
            router.push(segments.join('/'));
        } else {
            router.push(`/${newLocale}${currentPathname}`);
        }
    };

    return (
        <select
            value={currentLocale}
            onChange={handleChange}
            className="text-sm font-medium text-gray-600 bg-transparent border-none focus:ring-0 cursor-pointer hover:text-purple-600 appearance-none pr-4"
            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: '8px auto' }}
        >
            <option value="en">🇺🇸 EN</option>
            <option value="es">🇪🇸 ES</option>
            <option value="zh-CN">🇨🇳 中文(简)</option>
            <option value="zh-HK">🇭🇰 中文(繁)</option>
            <option value="ja">🇯🇵 日本語</option>
            <option value="th">🇹🇭 ไทย</option>
            <option value="tr">🇹🇷 Türkçe</option>
            <option value="ar">🇦🇪 العربية</option>
            <option value="vi">🇻🇳 Tiếng Việt</option>
            <option value="id">🇮🇩 Bahasa</option>
        </select>
    );
}
