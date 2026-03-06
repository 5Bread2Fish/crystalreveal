"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Loader2, DollarSign, TrendingUp, Users, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";

interface TrackResult {
    code: string;
    timesRedeemed: number;
    eligibleSales: number;
    earnings: number;
    active: boolean;
}

export default function PartnersPage() {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<TrackResult | null>(null);
    const [error, setError] = useState("");

    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) {
            setError("Please enter your promo code.");
            return;
        }

        setLoading(true);
        setError("");
        setResult(null);

        try {
            const res = await fetch(`/api/track-code?code=${encodeURIComponent(code.toUpperCase())}`);
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Something went wrong.");
                return;
            }

            setResult(data);
        } catch (err) {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/50 font-sans">
            {/* Header */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-purple-600 transition-colors text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                    <div className="flex items-center gap-2 text-purple-600 font-bold text-sm">
                        <Sparkles className="w-4 h-4" />
                        Creator Partner Program
                    </div>
                </div>
            </nav>

            <div className="max-w-2xl mx-auto px-6 py-16">
                {/* Hero */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-100 text-xs font-semibold text-purple-700 mb-6">
                        <Users className="w-3.5 h-3.5" />
                        KOL Dashboard
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
                        Creator Partner Dashboard
                    </h1>
                    <p className="text-gray-500 text-sm md:text-base max-w-md mx-auto leading-relaxed">
                        Enter your unique promo code to track your real-time sales and expected earnings.
                    </p>
                </div>

                {/* Input Card */}
                <div className="bg-white rounded-2xl shadow-xl shadow-purple-900/5 border border-gray-100 p-6 md:p-8 mb-8">
                    <form onSubmit={handleTrack} className="space-y-4">
                        <div>
                            <label htmlFor="promoCode" className="block text-sm font-semibold text-gray-700 mb-2">
                                Your Promo Code
                            </label>
                            <div className="relative">
                                <input
                                    id="promoCode"
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="e.g. ALEXA482"
                                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-lg font-mono tracking-wider uppercase placeholder:text-gray-300 placeholder:tracking-normal placeholder:font-sans placeholder:text-base transition-all"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300">
                                    <Search className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !code.trim()}
                            className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-900/10"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Looking up...
                                </>
                            ) : (
                                <>
                                    <TrendingUp className="w-4 h-4" />
                                    Track My Performance
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-8 flex items-start gap-3 animate-in fade-in duration-300">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-red-700 font-medium text-sm">{error}</p>
                        </div>
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Status Badge */}
                        <div className="flex items-center justify-center gap-2">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${result.active ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Code: {result.code} — {result.active ? "Active" : "Inactive"}
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Total Sales */}
                            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Sales</span>
                                </div>
                                <p className="text-3xl font-bold text-gray-900">{result.timesRedeemed}</p>
                                <p className="text-xs text-gray-400 mt-1">All-time code usage</p>
                            </div>

                            {/* Eligible Sales */}
                            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Eligible Sales</span>
                                </div>
                                <p className="text-3xl font-bold text-gray-900">{result.eligibleSales}</p>
                                <p className="text-xs text-gray-400 mt-1">Commission-eligible (after 10)</p>
                            </div>

                            {/* Expected Payout */}
                            <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl p-6 shadow-lg shadow-purple-200/50 text-white">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                                        <DollarSign className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-xs font-semibold text-purple-100 uppercase tracking-wider">Expected Payout</span>
                                </div>
                                <p className="text-3xl font-bold">${result.earnings.toFixed(2)}</p>
                                <p className="text-xs text-purple-200 mt-1">$5.00 per eligible sale</p>
                            </div>
                        </div>

                        {/* Payout Info */}
                        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 text-center">
                            <p className="text-xs text-amber-700 leading-relaxed">
                                💰 Payouts are processed via <strong>Zelle</strong> on the <strong>1st of every month</strong> for balances over <strong>$50</strong> (10+ sales).
                            </p>
                        </div>

                        {/* How it works */}
                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-700 mb-3">How Commission Works</h3>
                            <div className="space-y-2 text-xs text-gray-500">
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</span>
                                    <span>First <strong className="text-gray-700">10 sales</strong> build your audience — no commission yet</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</span>
                                    <span>From sale <strong className="text-gray-700">#11 onward</strong>, you earn <strong className="text-gray-700">$5.00</strong> per sale</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">3</span>
                                    <span>Payouts via <strong className="text-gray-700">Zelle</strong> on the 1st of each month (min $50 balance)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="border-t border-gray-100 py-8 mt-auto">
                <div className="max-w-5xl mx-auto px-6 text-center">
                    <p className="text-xs text-gray-400">© 2026 Humanscape US INC. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
