"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Building, User } from "lucide-react";
import { signIn } from "next-auth/react";

export default function SignUp() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

    const [userType, setUserType] = useState<"INDIVIDUAL" | "BUSINESS">("INDIVIDUAL");
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        businessName: "",
        ownerName: "",
        phoneNumber: "",
        monthlyScanVolume: "0-50",
        marketingAgreed: true,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, userType }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Signup failed");
            }

            // Auto login after signup
            const loginRes = await signIn("credentials", {
                email: formData.email,
                password: formData.password,
                redirect: false,
            });

            if (loginRes?.error) {
                router.push("/auth/signin");
            } else {
                router.push(callbackUrl);
            }
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
            <Link href="/" className="absolute top-8 left-8">
                <div className="relative h-8 w-32">
                    <Image src="/bomee-logo.png" alt="Bomee" fill className="object-contain object-left" />
                </div>
            </Link>

            <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900">Create your account</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Or <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-medium text-purple-600 hover:text-purple-500">sign in to existing account</Link>
                    </p>
                </div>

                {/* User Type Toggle */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                    <button
                        type="button"
                        onClick={() => setUserType("INDIVIDUAL")}
                        className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${userType === "INDIVIDUAL" ? "bg-white shadow-sm text-purple-600" : "text-gray-500 hover:text-gray-900"}`}
                    >
                        <User className="w-4 h-4" /> Individual
                    </button>
                    <button
                        type="button"
                        onClick={() => setUserType("BUSINESS")}
                        className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${userType === "BUSINESS" ? "bg-white shadow-sm text-purple-600" : "text-gray-500 hover:text-gray-900"}`}
                    >
                        <Building className="w-4 h-4" /> Business
                    </button>
                </div>

                {userType === "BUSINESS" && (
                    <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-xs">
                        To share with staff, use a common email (e.g., info@studio.com).
                    </div>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <input
                        type="email"
                        required
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        placeholder="Email address"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <input
                        type="password"
                        required
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        placeholder="Password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />

                    {userType === "BUSINESS" && (
                        <>
                            <input
                                type="text"
                                required
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                placeholder="Business Name"
                                value={formData.businessName}
                                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                            />
                            <input
                                type="text"
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                placeholder="Owner Name (Optional)"
                                value={formData.ownerName}
                                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                            />
                            <input
                                type="tel"
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                placeholder="Phone Number (Optional)"
                                value={formData.phoneNumber}
                                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                            />
                            <select
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-gray-500"
                                value={formData.monthlyScanVolume}
                                onChange={(e) => setFormData({ ...formData, monthlyScanVolume: e.target.value })}
                            >
                                <option value="0-50">0-50 Scans / Month</option>
                                <option value="51-100">51-100 Scans / Month</option>
                                <option value="100+">100+ Scans / Month</option>
                            </select>
                        </>
                    )}

                    <label className="flex items-start gap-2 text-sm text-gray-600">
                        <input
                            type="checkbox"
                            checked={formData.marketingAgreed}
                            onChange={(e) => setFormData({ ...formData, marketingAgreed: e.target.checked })}
                            className="mt-1 rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span>I agree to the Terms & Privacy Policy and receiving marketing updates.</span>
                    </label>

                    {error && <div className="text-red-500 text-sm text-center">{error}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign up"}
                    </button>
                </form>
            </div>
        </div>
    );
}
