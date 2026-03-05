import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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
                {children}
            </body>
        </html>
    );
}
