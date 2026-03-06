"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, ArrowLeft, TrendingUp, DollarSign, Users, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface TrackResult {
    code: string;
    timesRedeemed: number;
    eligibleSales: number;
    earnings: number;
    active: boolean;
}

export default function PartnersPage() {
    const locale = useLocale();
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<TrackResult | null>(null);
    const [error, setError] = useState("");

    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;

        setLoading(true);
        setError("");
        setResult(null);

        try {
            const res = await fetch(`/api/track-code?code=${encodeURIComponent(code.toUpperCase())}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to track code");
            }

            setResult(data);
        } catch (err: any) {
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 font-sans text-gray-900 selection:bg-purple-100 selection:text-purple-900">
            {/* Navbar */}
            <nav className="w-full bg-white/80 backdrop-blur-md border-b border-purple-100">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/">
                        <div className="relative h-8 w-32">
                            <Image src="/bomee-logo.png" alt="Bomee" fill className="object-contain object-left" />
                        </div>
                    </Link>
                    <div className="flex items-center gap-4">
                        <LanguageSwitcher currentLocale={locale} />
                        <Link href="/" className="text-sm font-medium text-gray-600 hover:text-purple-600 flex items-center gap-1">
                            <ArrowLeft className="w-4 h-4" /> Back
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="max-w-2xl mx-auto px-6 py-16">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 border border-purple-200 text-xs font-semibold text-purple-700 mb-4">
                        <Users className="w-4 h-4" />
                        <span>Creator Partner Program</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
                        Creator Partner Dashboard
                    </h1>
                    <p className="text-gray-500 text-sm max-w-md mx-auto">
                        Enter your unique promo code to track your real-time sales and expected earnings.
                    </p>
                </div>

                {/* Input Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
                    <form onSubmit={handleTrack} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Your Promo Code
                            </label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                placeholder="e.g. ALEXA482"
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-lg font-mono tracking-wider uppercase transition-all"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !code.trim()}
                            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-purple-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Tracking...</>
                            ) : (
                                <><BarChart3 className="w-5 h-5" /> Track My Performance</>
                            )}
                        </button>
                    </form>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-8 text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
                        {error}
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Status badge */}
                        <div className="text-center">
                            <span className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                result.active
                                    ? "bg-green-100 text-green-700 border border-green-200"
                                    : "bg-red-100 text-red-700 border border-red-200"
                            )}>
                                <span className={cn("w-2 h-2 rounded-full", result.active ? "bg-green-500" : "bg-red-500")} />
                                {result.active ? "Active" : "Inactive"}
                            </span>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Total Sales */}
                            <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                                    <TrendingUp className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="text-3xl font-extrabold text-gray-900">{result.timesRedeemed}</div>
                                <div className="text-sm text-gray-500 font-medium mt-1">Total Sales</div>
                            </div>

                            {/* Eligible Sales */}
                            <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                                    <Users className="w-6 h-6 text-purple-600" />
                                </div>
                                <div className="text-3xl font-extrabold text-gray-900">{result.eligibleSales}</div>
                                <div className="text-sm text-gray-500 font-medium mt-1">Eligible Sales</div>
                                <div className="text-[10px] text-gray-400 mt-1">After first 10 sales</div>
                            </div>

                            {/* Expected Payout */}
                            <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-6 text-center shadow-lg text-white hover:shadow-xl transition-shadow">
                                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                                    <DollarSign className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-3xl font-extrabold">${result.earnings.toFixed(2)}</div>
                                <div className="text-sm text-purple-200 font-medium mt-1">Expected Payout</div>
                            </div>
                        </div>

                        {/* Payout Info */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 leading-relaxed">
                                💰 Payouts are processed via <span className="font-semibold text-gray-700">Zelle</span> on the <span className="font-semibold text-gray-700">1st of every month</span> for balances over <span className="font-semibold text-gray-700">$50</span> (10+ sales).
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
