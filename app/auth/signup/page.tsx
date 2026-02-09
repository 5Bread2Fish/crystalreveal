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
        countryCode: "+1",
        phoneNumber: "",
        monthlyScanVolume: "", // Default empty to force selection
        pregnancyWeeks: "",
        marketingAgreed: true,
    });
    const [showMarketingDetails, setShowMarketingDetails] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Phone Number Formatting
    const formatPhoneNumber = (value: string, country: string) => {
        const numbers = value.replace(/\D/g, "");
        if (country === "+1") {
            // US: (XXX) XXX-XXXX
            if (numbers.length <= 3) return numbers;
            if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
            return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
        } else if (country === "+82") {
            // KR: 010-XXXX-XXXX
            if (numbers.length <= 3) return numbers;
            if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
            return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
        }
        // Default simple hyphenation for others
        return numbers.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3");
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value, formData.countryCode);
        setFormData({ ...formData, phoneNumber: formatted });
    };

    // Validation
    const isFormValid = () => {
        if (!formData.email || !formData.password || formData.password.length < 6) return false;
        if (userType === "BUSINESS") {
            if (!formData.businessName || !formData.ownerName || !formData.phoneNumber || !formData.monthlyScanVolume) return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid()) return;

        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, phoneNumber: `${formData.countryCode} ${formData.phoneNumber}`, userType }),
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
                    <div className="space-y-2">
                        <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-xs">
                            To share with staff, use a common email (e.g., info@studio.com).
                        </div>
                        <div className="bg-purple-50 text-purple-700 p-3 rounded-md text-xs">
                            We collect Business Info (Owner Name, Phone) strictly for urgent service announcements or billing support. Your contact info helps us support you faster.
                        </div>
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
                    <div>
                        <input
                            type="password"
                            required
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            placeholder="Password (min. 6 characters)"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                        {formData.password && formData.password.length < 6 && (
                            <p className="text-xs text-red-500 mt-1">Password must be at least 6 characters.</p>
                        )}
                    </div>

                    {userType === "INDIVIDUAL" && (
                        <select
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-gray-500"
                            value={formData.pregnancyWeeks}
                            onChange={(e) => setFormData({ ...formData, pregnancyWeeks: e.target.value })}
                        >
                            <option value="">Pregnancy Weeks (Optional)</option>
                            {Array.from({ length: 39 }, (_, i) => i + 4).map((week) => (
                                <option key={week} value={`${week} weeks`}>{week} weeks</option>
                            ))}
                            <option value="post-birth">Post-birth</option>
                            <option value="not-applicable">Not Applicable</option>
                        </select>
                    )}

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
                                required
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                placeholder="Owner Name"
                                value={formData.ownerName}
                                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                            />
                            <div className="flex gap-2">
                                <select
                                    className="block w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-gray-500"
                                    value={formData.countryCode}
                                    onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                                >
                                    <option value="+1">🇺🇸 +1</option>
                                    <option value="+82">🇰🇷 +82</option>
                                    <option value="+44">🇬🇧 +44</option>
                                    <option value="+81">🇯🇵 +81</option>
                                    <option value="+86">🇨🇳 +86</option>
                                </select>
                                <input
                                    type="tel"
                                    required
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                    placeholder="Phone Number"
                                    value={formData.phoneNumber}
                                    onChange={handlePhoneChange}
                                />
                            </div>
                            <select
                                required
                                className={`block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${!formData.monthlyScanVolume ? "text-gray-400" : "text-gray-900"}`}
                                value={formData.monthlyScanVolume}
                                onChange={(e) => setFormData({ ...formData, monthlyScanVolume: e.target.value })}
                            >
                                <option value="" disabled>Select average elective ultrasound scans per month</option>
                                <option value="0-10">0-10 Scans / Month</option>
                                <option value="11-20">11-20 Scans / Month</option>
                                <option value="21-30">21-30 Scans / Month</option>
                                <option value="31-40">31-40 Scans / Month</option>
                                <option value="41-50">41-50 Scans / Month</option>
                                <option value="51-60">51-60 Scans / Month</option>
                                <option value="61-70">61-70 Scans / Month</option>
                                <option value="71-80">71-80 Scans / Month</option>
                                <option value="81-90">81-90 Scans / Month</option>
                                <option value="91-100">91-100 Scans / Month</option>
                                <option value="100+">100+ Scans / Month</option>
                            </select>
                        </>
                    )}

                    <div className="space-y-3 pt-2">
                        <label className="flex items-start gap-2 text-sm text-gray-600">
                            <input
                                type="checkbox"
                                required
                                className="mt-1 rounded text-purple-600 focus:ring-purple-500"
                            />
                            <span>
                                I agree to the <Link href="/terms" className="text-purple-600 hover:text-purple-500 font-medium" target="_blank">Terms of Service & Disclaimer and Privacy Policy</Link>.
                            </span>
                        </label>

                        <label className="flex items-start gap-2 text-sm text-gray-600">
                            <input
                                type="checkbox"
                                checked={formData.marketingAgreed}
                                onChange={(e) => setFormData({ ...formData, marketingAgreed: e.target.checked })}
                                className="mt-1 rounded text-purple-600 focus:ring-purple-500"
                            />
                            <span>
                                (Optional) I agree to receive marketing updates and allow data sharing.
                                <button type="button" onClick={() => setShowMarketingDetails(!showMarketingDetails)} className="text-purple-600 hover:text-purple-500 font-medium ml-1">
                                    View Details
                                </button>
                            </span>
                        </label>

                        {showMarketingDetails && (
                            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border border-gray-200 mt-2 space-y-2 max-h-40 overflow-y-auto">
                                <p><strong>1. Consent to Direct Marketing & Profiling:</strong> By checking this box, I explicitly consent to Humanscape US Inc. contacting me via email and other electronic means for marketing and promotional purposes.</p>
                                <p><strong>2. Consent to Third-Party Data Sharing:</strong> I explicitly consent to the Company disclosing and sharing my personal information with selected third-party partners for their independent marketing purposes.</p>
                                <p><strong>3. Data Collection & Usage Scope:</strong> Individual Users: Email, Password, Pregnancy Weeks (Optional), Service Usage Data. Business Users: Email, Password, Business Name, Phone Number (Optional), Service Usage Data.</p>
                                <p><strong>4. Withdrawal of Consent:</strong> I understand that providing this consent is voluntary within my account settings or via "Unsubscribe" links.</p>
                            </div>
                        )}
                    </div>

                    {error && <div className="text-red-500 text-sm text-center">{error}</div>}

                    <button
                        type="submit"
                        disabled={loading || !isFormValid()}
                        className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign up"}
                    </button>
                </form>
            </div>
        </div>
    );
}
