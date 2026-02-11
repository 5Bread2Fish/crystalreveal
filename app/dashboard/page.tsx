"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { User, CreditCard, Image as ImageIcon, Settings, LogOut, Loader2, Download, ExternalLink, HelpCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabFromUrl = searchParams.get("tab") as "overview" | "gallery" | "billing" | "settings" | null;
    const [activeTab, setActiveTab] = useState<"overview" | "gallery" | "billing" | "settings">(tabFromUrl || "overview");

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/signin");
        }
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    if (!session) return null;

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-purple-100 selection:text-purple-900">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-white border-b border-gray-200">
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
                        <div className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100">
                            {session.user.credits} Credits
                        </div>
                        <button onClick={() => signOut({ callbackUrl: '/' })} className="p-2 text-gray-500 hover:text-red-600 transition-colors">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </nav>

            <div className="pt-24 pb-12 px-6 max-w-7xl mx-auto flex gap-8">
                {/* Sidebar */}
                <aside className="w-64 shrink-0 hidden md:block">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sticky top-24">
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={() => setActiveTab("overview")}
                                className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors", activeTab === "overview" ? "bg-purple-50 text-purple-700" : "text-gray-600 hover:bg-gray-50")}
                            >
                                <User className="w-5 h-5" /> Overview
                            </button>
                            <button
                                onClick={() => setActiveTab("gallery")}
                                className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors", activeTab === "gallery" ? "bg-purple-50 text-purple-700" : "text-gray-600 hover:bg-gray-50")}
                            >
                                <ImageIcon className="w-5 h-5" /> My Gallery
                            </button>
                            <button
                                onClick={() => setActiveTab("billing")}
                                className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors", activeTab === "billing" ? "bg-purple-50 text-purple-700" : "text-gray-600 hover:bg-gray-50")}
                            >
                                <CreditCard className="w-5 h-5" /> Billing & Credits
                            </button>
                            <button
                                onClick={() => setActiveTab("settings")}
                                className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors", activeTab === "settings" ? "bg-purple-50 text-purple-700" : "text-gray-600 hover:bg-gray-50")}
                            >
                                <Settings className="w-5 h-5" /> Settings
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0">
                    {activeTab === "overview" && <OverviewTab session={session} setActiveTab={setActiveTab} />}
                    {activeTab === "gallery" && <GalleryTab />}
                    {activeTab === "billing" && <BillingTab session={session} />}
                    {activeTab === "settings" && <SettingsTab session={session} />}
                </main>
            </div>
        </div>
    );
}



function OverviewTab({ session, setActiveTab }: { session: any, setActiveTab: (tab: any) => void }) {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {session.user.email?.split("@")[0]}</h1>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="text-sm text-gray-500 font-medium mb-1">Available Credits</div>
                    <div className="text-3xl font-bold text-purple-600">{session.user.credits}</div>
                    {session.user.creditExpiresAt && (
                        <p className="text-xs text-gray-400 mt-1">Expires on {new Date(session.user.creditExpiresAt).toLocaleDateString()}</p>
                    )}
                    <Link href="/pricing" className="mt-4 block text-sm text-purple-600 font-semibold hover:underline">Get more credits →</Link>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="text-sm text-gray-500 font-medium mb-1">Images Generated</div>
                    <div className="text-3xl font-bold text-gray-900">View All</div>
                    <button onClick={() => setActiveTab("gallery")} className="mt-4 block text-sm text-gray-600 font-semibold hover:underline">Go to Gallery →</button>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="text-sm text-gray-500 font-medium mb-1">Account Type</div>
                    <div className="text-3xl font-bold text-gray-900 capitalize">{session.user.userType?.toLowerCase() || "Individual"}</div>
                    <button onClick={() => setActiveTab("settings")} className="mt-4 block text-sm text-gray-600 font-semibold hover:underline">Manage Account →</button>
                </div>
            </div>

            <div className="bg-purple-600 text-white rounded-2xl p-8 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Create Your Next Masterpiece</h2>
                        <p className="text-purple-100">Upload a new ultrasound scan and let our AI work its magic.</p>
                    </div>
                    <Link href="/" className="bg-white text-purple-600 px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-gray-50 transition-colors">
                        Generate New Image
                    </Link>
                </div>
                {/* Decorative BG */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
            </div>
        </div>
    );
}

function GalleryTab() {
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetch("/api/user/gallery")
            .then(res => res.json())
            .then(data => {
                if (data.images) setImages(data.images);
            })
            .finally(() => setLoading(false));
    }, []);

    const handleUnlock = async (imageId: string) => {
        router.push(`/checkout?imageId=${imageId}`);
    };

    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>;

    if (images.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No images yet</h3>
                <p className="text-gray-500 mb-6">Create your first AI enhancement to see it here.</p>
                <Link href="/" className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-purple-700 transition-colors">
                    Start Generating
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">My Gallery</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {images.map((img) => (
                    <div key={img.id} className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                        {/* Image Area */}
                        <div className="relative aspect-square bg-gray-100 group">
                            {/* LOCKED OVERLAY */}
                            {!img.unlocked && (
                                <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
                                    <Lock className="w-8 h-8 text-white mb-2 opacity-80" />
                                    <p className="text-white font-bold mb-1">Locked</p>
                                    <p className="text-white/70 text-xs mb-4">Unlock to view high-res & download</p>
                                    <button
                                        onClick={() => handleUnlock(img.id)}
                                        className="bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-100 transition-colors shadow-lg"
                                    >
                                        Unlock Image
                                    </button>
                                </div>
                            )}

                            {/* Image Display */}
                            {img.advancedUrl ? (
                                <Image
                                    src={img.advancedUrl}
                                    alt="Generated"
                                    fill
                                    className={cn("object-cover transition-transform duration-500 group-hover:scale-105", !img.unlocked && "blur-md scale-105")}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">Processing...</div>
                            )}

                            {/* Actions Overlay (Only if Unlocked) */}
                            {img.unlocked && (
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                                    <a href={img.advancedUrl} download target="_blank" className="p-2 bg-white rounded-full text-gray-900 hover:text-purple-600 transition-colors" title="Download Advanced">
                                        <Download className="w-5 h-5" />
                                    </a>
                                    <a href={img.originalUrl} target="_blank" className="p-2 bg-white rounded-full text-gray-900 hover:text-purple-600 transition-colors" title="View Original">
                                        <ExternalLink className="w-5 h-5" />
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Info Area */}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm font-medium text-gray-900">{new Date(img.createdAt).toLocaleDateString()}</span>
                                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", img.unlocked ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>
                                        {img.unlocked ? "Unlocked" : "Locked"}
                                    </span>
                                </div>

                                {/* Versions Access */}
                                {img.unlocked && (
                                    <div className="flex gap-2 mt-3 text-xs">
                                        <a href={img.originalUrl} target="_blank" className="hover:text-purple-600 underline text-gray-500">Original</a>
                                        <span className="text-gray-300">|</span>
                                        <a href={img.basicUrl} target="_blank" className="hover:text-purple-600 underline text-gray-500">Basic</a>
                                        <span className="text-gray-300">|</span>
                                        <a href={img.advancedUrl} target="_blank" className="hover:text-purple-600 underline text-purple-600 font-medium">Advanced</a>
                                    </div>
                                )}
                            </div>

                            {img.unlocked && img.unlockedAt && (
                                <div className="mt-3 pt-3 border-t border-gray-100/50">
                                    <p className="text-[10px] text-gray-400">Unlocked on {new Date(img.unlockedAt).toLocaleDateString()}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function BillingTab({ session }: { session: any }) {
    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
        fetch("/api/user/transactions")
            .then(res => res.json())
            .then(data => {
                if (data.transactions) setTransactions(data.transactions);
            });
    }, []);

    return (
        <div className="space-y-8">
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Credit Balance</h2>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-4xl font-extrabold text-gray-900">{session.user.credits}</div>
                        <p className="text-gray-500">Available Credits</p>
                        {session.user.creditExpiresAt && (
                            <p className="text-sm text-gray-400 mt-1">Expires on {new Date(session.user.creditExpiresAt).toLocaleDateString()}</p>
                        )}
                    </div>
                    <Link href="/pricing" className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200">
                        Buy More Credits
                    </Link>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Transaction History</h3>
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-700">Date</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Description</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Amount</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Credits</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {transactions.length > 0 ? transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-600">{new Date(tx.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{tx.transactionType === 'CHARGE' ? 'Credit Purchase' : 'Image Unlock'}</td>
                                    <td className="px-6 py-4 text-gray-600">{tx.amountPaid ? `$${Number(tx.amountPaid).toFixed(2)}` : '-'}</td>
                                    <td className={cn("px-6 py-4 font-bold text-right", tx.creditsChange > 0 ? "text-green-600" : "text-gray-900")}>
                                        {tx.creditsChange > 0 ? "+" : ""}{tx.creditsChange}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No transactions found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function SettingsTab({ session }: { session: any }) {
    const [formData, setFormData] = useState({
        businessName: session.user.businessName || "",
        phoneNumber: session.user.phoneNumber || "",
        website: session.user.website || "",
        pregnancyWeeks: session.user.pregnancyWeeks || "",
        monthlyScanVolume: session.user.monthlyScanVolume || "",
    });
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage({ type: "", text: "" });

        try {
            const res = await fetch("/api/user/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setMessage({ type: "success", text: "Profile updated successfully!" });
                // Note: Session update requires page reload or complicated re-fetch logic usually, 
                // but local state is fine for now.
            } else {
                setMessage({ type: "error", text: "Failed to update profile." });
            }
        } catch (error) {
            setMessage({ type: "error", text: "An error occurred." });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-2xl bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Account Settings</h2>

            {message.text && (
                <div className={cn("p-4 mb-6 rounded-xl text-sm font-medium", message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input type="text" value={session.user.email} disabled className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 cursor-not-allowed" />
                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                    <input type="text" value={session.user.userType || "Individual"} disabled className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 capitalize cursor-not-allowed" />
                </div>

                <div className="pt-4 border-t border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-4">Profile Information</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name (Optional)</label>
                            <input
                                type="text"
                                name="businessName"
                                value={formData.businessName}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
                                placeholder="Enter your studio or business name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <input
                                type="tel"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                            <input
                                type="url"
                                name="website"
                                value={formData.website}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
                                placeholder="https://example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Pregnancy Weeks</label>
                            <input
                                type="text"
                                name="pregnancyWeeks"
                                value={formData.pregnancyWeeks}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
                                placeholder="e.g. 24 Weeks"
                            />
                        </div>

                        {/* Only for Business Users usually, but let's keep it visible for flexibility as per request "everything visible" */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Scan Volume (Estimate)</label>
                            <select
                                name="monthlyScanVolume"
                                value={formData.monthlyScanVolume}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
                            >
                                <option value="">Select average elective ultrasound scans per month</option>
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
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                    <div>
                        <button type="button" className="text-red-600 font-medium hover:text-red-700 text-sm">Delete Account</button>
                    </div>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
}
