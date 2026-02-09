"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Check, Sparkles, Zap, Crown, User, HelpCircle, LogOut } from "lucide-react";
import Image from "next/image";

export default function PricingPage() {
    const { data: session } = useSession();

    const packages = [
        {
            credits: 1,
            price: 9.99,
            name: "Pay-As-You-Go",
            description: "Just one enhancement.",
            icon: Sparkles,
            features: ["1 High-Quality Image", "Instant 8K Upgrade"],
            link: "https://buy.stripe.com/4gM9ATdhx3k89jHbtmdEs03", // Update links as needed
            unitPrice: "$9.99/generation"
        },
        {
            credits: 20,
            price: 99,
            name: "Starter",
            description: "Perfect for a single session.",
            icon: Zap,
            features: ["20 High-Quality Images", "Instant 8K Upgrade"],
            link: "https://buy.stripe.com/4gM9ATdhx3k89jHbtmdEs03",
            unitPrice: "$4.95/generation"
        },
        {
            credits: 50,
            price: 199,
            name: "Basic",
            description: "Great for regular visits.",
            icon: User,
            features: ["50 High-Quality Images", "Instant 8K Upgrade"],
            link: "https://buy.stripe.com/4gM9ATdhx3k89jHbtmdEs03",
            unitPrice: "$3.98/generation"
        },
        {
            credits: 100,
            price: 299,
            name: "Pro",
            description: "Best choice for frequent users.",
            icon: Crown,
            popular: true,
            features: ["100 High-Quality Images", "Instant 8K Upgrade"],
            link: "https://buy.stripe.com/4gM9ATdhx3k89jHbtmdEs03",
            unitPrice: "$2.99/generation"
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
                        <Link href="/help" className="p-2 text-gray-500 hover:text-purple-600 transition-colors" title="Need Help?">
                            <HelpCircle className="w-5 h-5" />
                        </Link>
                        {session ? (
                            <div className="flex items-center gap-4">
                                <div className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100">
                                    {session.user.credits} Credits Available
                                </div>
                                <div className="relative group">
                                    <button className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-purple-600">
                                        <User className="w-5 h-5" />
                                        <span>{session.user.email?.split('@')[0]}</span>
                                    </button>
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 z-50">
                                        <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Dashboard</Link>
                                        <Link href="/pricing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Buy Credits</Link>
                                        {/* Admin Link Removed */}
                                        <button onClick={() => signOut({ callbackUrl: '/' })} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2">
                                            <LogOut className="w-4 h-4" /> Sign Out
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Link href="/auth/signin" className="text-sm font-medium text-gray-600 hover:text-purple-600">Sign In</Link>
                        )}
                    </div>
                </div>
            </nav>

            <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-16 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900">Purchase Credits</h1>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                        Simple, transparent pricing. <br />
                        Use credits whenever you need a perfect shot.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-20">
                    {packages.map((pkg, idx) => (
                        <div key={idx} className={`relative bg-white rounded-3xl p-6 border flex flex-col ${pkg.popular ? "border-purple-500 shadow-xl ring-4 ring-purple-50 z-10" : "border-gray-200 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"}`}>
                            {pkg.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold uppercase tracking-widest py-1.5 px-4 rounded-full shadow-lg whitespace-nowrap">
                                    Best Value
                                </div>
                            )}

                            <div className="flex-1">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${pkg.popular ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-600"}`}>
                                    <pkg.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">{pkg.name}</h3>
                                <p className="text-gray-500 text-sm mt-1">{pkg.description}</p>

                                <div className="my-6">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-extrabold text-gray-900">${pkg.price}</span>
                                    </div>
                                    <p className="text-xs font-semibold text-purple-600 mt-1">{pkg.unitPrice}</p>
                                </div>

                                <ul className="space-y-3 mb-8">
                                    {pkg.features.map((feat, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                            <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                            <span>{feat}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <a
                                href={pkg.link}
                                className={`w-full py-3 rounded-xl font-bold text-sm text-center transition-all ${pkg.popular ? "bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200" : "bg-gray-900 hover:bg-gray-800 text-white"}`}
                            >
                                Buy {pkg.credits} Credits
                            </a>
                        </div>
                    ))}
                </div>

                <div className="text-center text-sm text-gray-400 pb-20">
                    <p>Credits are valid for up to 1 year from the date of purchase.</p>
                </div>
            </div>
        </div>
    );
}
