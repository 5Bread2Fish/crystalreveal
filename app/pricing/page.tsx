"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Check, Sparkles, Zap, Crown } from "lucide-react";
import Image from "next/image";

export default function PricingPage() {
    const { data: session } = useSession();

    const packages = [
        {
            credits: 1,
            price: 9.99,
            name: "Single Shot",
            description: "Perfect for one specific photo enhancement.",
            icon: Sparkles,
            features: ["1 High-Quality Image", "Basic & Advanced Versions", "Instant Download"],
            link: "https://buy.stripe.com/4gM9ATdhx3k89jHbtmdEs03" // Needs unique link per package
        },
        {
            credits: 3,
            price: 19.99,
            name: "The Trio",
            description: "Most popular. Great for a few different angles.",
            icon: Zap,
            popular: true,
            features: ["3 High-Quality Images", "Basic & Advanced Versions", "Priority Processing", "Save $10"],
            link: "https://buy.stripe.com/4gM9ATdhx3k89jHbtmdEs03"
        },
        {
            credits: 10,
            price: 49.99,
            name: "The Album",
            description: "Best value. Enhance your entire ultrasound session.",
            icon: Crown,
            features: ["10 High-Quality Images", "Basic & Advanced Versions", "Priority Processing", "Dedicated Support", "Save $50"],
            link: "https://buy.stripe.com/4gM9ATdhx3k89jHbtmdEs03"
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 font-sans selection:bg-purple-100 selection:text-purple-900">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-purple-100">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link href="/">
                            <div className="relative h-8 w-32">
                                <Image src="/bomee-logo.png" alt="Bomee" fill className="object-contain object-left" />
                            </div>
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        {session ? (
                            <div className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100">
                                {session.user.credits} Credits Available
                            </div>
                        ) : (
                            <Link href="/auth/signin" className="text-sm font-medium text-gray-600 hover:text-purple-600">Sign In</Link>
                        )}
                    </div>
                </div>
            </nav>

            <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-16 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900">Simple, Transparent Pricing</h1>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                        Purchase credits to unlock your crystal-clear ultrasound images. <br />
                        1 Credit = 1 Image Unlock (includes Basic & Advanced versions).
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {packages.map((pkg, idx) => (
                        <div key={idx} className={`relative bg-white rounded-3xl p-8 border ${pkg.popular ? "border-purple-500 shadow-2xl scale-105 z-10" : "border-gray-200 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all"}`}>
                            {pkg.popular && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-purple-600 text-white text-xs font-bold uppercase tracking-widest py-1.5 px-4 rounded-full shadow-lg">
                                    Most Popular
                                </div>
                            )}

                            <div className="flex flex-col h-full">
                                <div className="mb-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${pkg.popular ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-600"}`}>
                                        <pkg.icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900">{pkg.name}</h3>
                                    <p className="text-gray-500 mt-2 text-sm">{pkg.description}</p>
                                </div>

                                <div className="mb-8">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-extrabold text-gray-900">${pkg.price}</span>
                                        <span className="text-gray-500 font-medium">USD</span>
                                    </div>
                                    <p className="text-sm text-gray-400 mt-1">Single one-time payment</p>
                                </div>

                                <div className="space-y-4 mb-8 flex-1">
                                    {pkg.features.map((feat, i) => (
                                        <div key={i} className="flex items-start gap-3 text-sm text-gray-600">
                                            <Check className="w-5 h-5 text-green-500 shrink-0" />
                                            <span>{feat}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => window.location.href = pkg.link}
                                    className={`w-full py-4 rounded-xl font-bold transition-all ${pkg.popular ? "bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200" : "bg-gray-900 hover:bg-gray-800 text-white"}`}
                                >
                                    Buy {pkg.credits} Credits
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-20 text-center border-t border-gray-200 pt-12">
                    <p className="text-gray-500 text-sm">
                        Need a custom enterprise plan? <Link href="mailto:support@bomee.ai" className="text-purple-600 hover:underline">Contact Sales</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
