"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Building, User, Check } from "lucide-react";
import { signIn } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

function SignUpContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

    const [step, setStep] = useState<1 | 2>(1);
    const [userType, setUserType] = useState<"INDIVIDUAL" | "BUSINESS">("INDIVIDUAL");
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        confirmPassword: "",
        businessName: "",
        ownerName: "",
        countryCode: "+1",
        phoneNumber: "",
        website: "",
        monthlyScanVolume: "", // Default empty to force selection
        pregnancyWeeks: "",
        country: "",
        marketingAgreed: false,
    });
    const [tosAgreed, setTosAgreed] = useState(false);
    const [showMarketingDetails, setShowMarketingDetails] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const t = useTranslations('auth');

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
        if (!formData.email || !formData.password || formData.password.length < 6 || !formData.country) return false;
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
                    <h2 className="text-3xl font-extrabold text-gray-900">{t('signUpTitle')}</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {t('signInOr')} <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-medium text-purple-600 hover:text-purple-500">{t('signInExisting')}</Link>
                    </p>
                </div>

                {/* Step 1: Selection */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => { setUserType("INDIVIDUAL"); setStep(2); }}
                                className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all group"
                            >
                                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <User className="w-8 h-8 text-purple-600" />
                                </div>
                                <div className="text-center">
                                    <h3 className="font-bold text-gray-900 text-lg">{t('parentFamily')}</h3>
                                    <p className="text-sm text-gray-500">{t('parentDesc')}</p>
                                </div>
                            </button>

                            <button
                                onClick={() => { setUserType("BUSINESS"); setStep(2); }}
                                className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                            >
                                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Building className="w-8 h-8 text-blue-600" />
                                </div>
                                <div className="text-center">
                                    <h3 className="font-bold text-gray-900 text-lg">{t('ultrasoundBusiness')}</h3>
                                    <p className="text-sm text-gray-500">{t('businessDesc')}</p>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Form */}
                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between">
                            <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
                                {t('back')}
                            </button>
                            <span className={cn("px-3 py-1 rounded-full text-xs font-bold", userType === "BUSINESS" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700")}>
                                {userType === "BUSINESS" ? t('businessAccount') : t('individualAccount')}
                            </span>
                        </div>

                        {userType === "BUSINESS" && (
                            <div className="space-y-2">
                                <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-xs">
                                    {t('businessTip')}
                                </div>
                                <div className="bg-purple-50 text-purple-700 p-3 rounded-md text-xs">
                                    {t('accurateInfo')}
                                </div>
                            </div>
                        )}

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <input
                                type="email"
                                required
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                placeholder={t('email')}
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                            <div>
                                <input
                                    type="password"
                                    required
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                    placeholder={t('passwordMin')}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div>
                                <input
                                    type="password"
                                    required
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                    placeholder={t('confirmPassword')}
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                />
                                {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                    <p className="text-xs text-red-500 mt-1">{t('passwordsNoMatch')}</p>
                                )}
                                {formData.password && formData.password.length < 6 && (
                                    <p className="text-xs text-red-500 mt-1">{t('passwordTooShort')}</p>
                                )}
                            </div>

                            {userType === "INDIVIDUAL" && (
                                <>
                                    <select
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-gray-500"
                                        value={formData.pregnancyWeeks}
                                        onChange={(e) => setFormData({ ...formData, pregnancyWeeks: e.target.value })}
                                    >
                                        <option value="">{t('pregnancyWeeks')}</option>
                                        {Array.from({ length: 39 }, (_, i) => i + 4).map((week) => (
                                            <option key={week} value={`${week} weeks`}>{week} weeks</option>
                                        ))}
                                        <option value="post-birth">Post-birth</option>
                                        <option value="not-applicable">Not Applicable</option>
                                    </select>
                                    <select
                                        required
                                        className={`block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${!formData.country ? "text-gray-400" : "text-gray-900"}`}
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                    >
                                        <option value="">Select Country *</option>
                                        <option value="United States">United States</option>
                                        <option value="South Korea">South Korea</option>
                                        <option value="United Kingdom">United Kingdom</option>
                                        <option value="Canada">Canada</option>
                                        <option value="Australia">Australia</option>
                                        <option value="Japan">Japan</option>
                                        <option value="China">China</option>
                                        <option value="Germany">Germany</option>
                                        <option value="France">France</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </>
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
                                    <input
                                        type="url"
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                        placeholder="Website (Optional)"
                                        value={formData.website}
                                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
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
                                    <input
                                        type="number"
                                        required
                                        step="10"
                                        min="0"
                                        className={`block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${!formData.monthlyScanVolume ? "text-gray-400" : "text-gray-900"}`}
                                        placeholder="Monthly Scan Volume *"
                                        value={formData.monthlyScanVolume}
                                        onChange={(e) => setFormData({ ...formData, monthlyScanVolume: e.target.value })}
                                    />
                                    <select
                                        required
                                        className={`block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${!formData.country ? "text-gray-400" : "text-gray-900"}`}
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                    >
                                        <option value="">Select Country *</option>
                                        <option value="United States">United States</option>
                                        <option value="South Korea">South Korea</option>
                                        <option value="United Kingdom">United Kingdom</option>
                                        <option value="Canada">Canada</option>
                                        <option value="Australia">Australia</option>
                                        <option value="Japan">Japan</option>
                                        <option value="China">China</option>
                                        <option value="Germany">Germany</option>
                                        <option value="France">France</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </>
                            )}

                            <div className="space-y-3 pt-2">
                                {/* Agree to All Button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newState = !tosAgreed;
                                        setTosAgreed(newState);
                                        setFormData({ ...formData, marketingAgreed: newState });
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all font-bold mb-2",
                                        tosAgreed && formData.marketingAgreed
                                            ? "border-purple-600 bg-purple-50 text-purple-700"
                                            : "border-gray-200 hover:border-purple-300 text-gray-600"
                                    )}
                                >
                                    <div className={cn(
                                        "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                        tosAgreed && formData.marketingAgreed ? "bg-purple-600 border-purple-600" : "border-gray-300"
                                    )}>
                                        {tosAgreed && formData.marketingAgreed && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    {t('agreeAll')}
                                </button>

                                <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer pl-1 px-1">
                                    <input
                                        type="checkbox"
                                        required
                                        checked={tosAgreed}
                                        onChange={(e) => setTosAgreed(e.target.checked)}
                                        className="mt-1 rounded text-purple-600 focus:ring-purple-500"
                                    />
                                    <span>
                                        {t('agreeTos')} <Link href="/terms" className="text-purple-600 hover:text-purple-500 font-medium" target="_blank">{t('tosLink')}</Link>.
                                    </span>
                                </label>

                                <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.marketingAgreed}
                                        onChange={(e) => setFormData({ ...formData, marketingAgreed: e.target.checked })}
                                        className="mt-1 rounded text-purple-600 focus:ring-purple-500"
                                    />
                                    <span>
                                        {t('marketingConsent')}
                                        <button type="button" onClick={() => setShowMarketingDetails(!showMarketingDetails)} className="text-purple-600 hover:text-purple-500 font-medium ml-1">
                                            {t('viewDetails')}
                                        </button>
                                    </span>
                                </label>

                                {showMarketingDetails && (
                                    <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border border-gray-200 mt-2 space-y-2 max-h-40 overflow-y-auto">
                                        <p><strong>2. Consent to Third-Party Data Sharing:</strong> I explicitly consent to the Company disclosing and sharing my personal information with selected third-party partners for their independent marketing purposes.</p>
                                        <p><strong>3. Data Collection & Usage Scope:</strong> Individual Users: Email, Password, Pregnancy Weeks (Optional), Service Usage Data. Business Users: Email, Password, Business Name, Phone Number (Optional), Service Usage Data.</p>
                                        <p><strong>4. Withdrawal of Consent:</strong> I understand that providing this consent is voluntary within my account settings or via "Unsubscribe" links.</p>
                                    </div>
                                )}
                            </div>

                            {error && <div className="text-red-500 text-sm text-center">{error}</div>}

                            <button
                                type="submit"
                                disabled={loading || !isFormValid() || !tosAgreed}
                                className={`w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:cursor-not-allowed transition-colors
                            ${loading || !isFormValid() || !tosAgreed ? "bg-gray-400" : "bg-purple-600 hover:bg-purple-700"}`}
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('signUpButton')}
                            </button>
                        </form>

                    </div>
                )}
            </div>
        </div>
    );
}

export default function SignUp() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>}>
            <SignUpContent />
        </Suspense>
    );
}
