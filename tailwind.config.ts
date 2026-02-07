import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                primary: {
                    DEFAULT: "#9B7EFC", // User Request
                    foreground: "#FFFFFF",
                },
                // Override purple to enforce the requested color globally
                purple: {
                    50: "#f5f3ff",
                    100: "#ede9fe",
                    200: "#ddd6fe",
                    300: "#c4b5fd",
                    400: "#a78bfa",
                    500: "#9B7EFC", // The requested color (shifted to 500/600 range)
                    600: "#9B7EFC", // Enforce as main interaction color
                    700: "#7e60cc",
                    800: "#6347a6",
                    900: "#4c3983",
                    950: "#2e2152",
                },
                muted: {
                    DEFAULT: "#F3F4F6", // Gray 100
                    foreground: "#6B7280", // Gray 500
                },
            },
            fontFamily: {
                sans: ["var(--font-inter)", "sans-serif"],
            },
        },
    },
    plugins: [],
};
export default config;
