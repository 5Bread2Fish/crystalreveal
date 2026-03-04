"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { User, CreditCard, Image as ImageIcon, Settings, LogOut, Loader2, Download, HelpCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BASE_PATH } from "@/lib/basepath";

// Force dynamic rendering to fix build error
export const dynamic = 'force-dynamic';

function DashboardContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabFromUrl = searchParams.get("tab") as "overview" | "gallery" | "billing" | "settings" | null;
    const [activeTab, setActiveTab] = useState<"overview" | "gallery" | "billing" | "settings">(tabFromUrl || "overview");
    const locale = useLocale();
    const t = useTranslations('dashboard');

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
                        <LanguageSwitcher currentLocale={locale} />
                        <Link href="/help" className="p-2 text-gray-500 hover:text-purple-600 transition-colors" title="Need Help?">
                            <HelpCircle className="w-5 h-5" />
                        </Link>

                        <div className="flex items-center gap-4">
                            <div className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100">
                                {session.user.credits} {t('creditsColumn')}
                            </div>
                            <div className="relative group">
                                <button className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-purple-600">
                                    <User className="w-5 h-5" />
                                    <span>{session.user.email?.split('@')[0]}</span>
                                </button>
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 z-50">
                                    <button onClick={() => setActiveTab("settings")} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">{t('settings')}</button>
                                    <button onClick={() => setActiveTab("billing")} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">{t('billingCredits')}</button>
                                    <button onClick={() => signOut({ callbackUrl: '/' })} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2">
                                        <LogOut className="w-4 h-4" /> Sign Out
                                    </button>
                                </div>
                            </div>
                        </div>
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
                                <User className="w-5 h-5" /> {t('overview')}
                            </button>
                            <button
                                onClick={() => setActiveTab("gallery")}
                                className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors", activeTab === "gallery" ? "bg-purple-50 text-purple-700" : "text-gray-600 hover:bg-gray-50")}
                            >
                                <ImageIcon className="w-5 h-5" /> {t('myGallery')}
                            </button>
                            <button
                                onClick={() => setActiveTab("billing")}
                                className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors", activeTab === "billing" ? "bg-purple-50 text-purple-700" : "text-gray-600 hover:bg-gray-50")}
                            >
                                <CreditCard className="w-5 h-5" /> {t('billingCredits')}
                            </button>
                            <button
                                onClick={() => setActiveTab("settings")}
                                className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors", activeTab === "settings" ? "bg-purple-50 text-purple-700" : "text-gray-600 hover:bg-gray-50")}
                            >
                                <Settings className="w-5 h-5" /> {t('settings')}
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
    const t = useTranslations('dashboard');
    const [imageStats, setImageStats] = useState({ generated: 0, unlocked: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`${BASE_PATH}/api/images/gallery`);
                if (res.ok) {
                    const data = await res.json();
                    const images = data.images || [];
                    setImageStats({
                        generated: images.length,
                        unlocked: images.filter((img: any) => img.unlocked).length
                    });
                }
            } catch (e) {
                console.error("Failed to fetch image stats", e);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">{t('welcomeBack', { name: session.user.email?.split("@")[0] })}</h1>

            <div className="grid md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="text-sm text-gray-500 font-medium mb-1">{t('availableCredits')}</div>
                    <div className="text-3xl font-bold text-purple-600">{session.user.credits}</div>
                    {session.user.creditExpiresAt && (
                        <p className="text-xs text-gray-400 mt-1">{t('expiresOn', { date: new Date(session.user.creditExpiresAt).toLocaleDateString() })}</p>
                    )}
                    <Link href="/pricing" className="mt-4 block text-sm text-purple-600 font-semibold hover:underline">{t('getMoreCredits')}</Link>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="text-sm text-gray-500 font-medium mb-1">{t('imagesGenerated')}</div>
                    <div className="text-3xl font-bold text-gray-900">{imageStats.generated}</div>
                    <button onClick={() => setActiveTab("gallery")} className="mt-4 block text-sm text-gray-600 font-semibold hover:underline">{t('goToGallery')}</button>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="text-sm text-gray-500 font-medium mb-1">Images Unlocked</div>
                    <div className="text-3xl font-bold text-green-600">{imageStats.unlocked}</div>
                    <button onClick={() => setActiveTab("gallery")} className="mt-4 block text-sm text-gray-600 font-semibold hover:underline">{t('goToGallery')}</button>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="text-sm text-gray-500 font-medium mb-1">{t('accountType')}</div>
                    <div className="text-3xl font-bold text-gray-900 capitalize">{session.user.userType?.toLowerCase() || "Individual"}</div>
                    <button onClick={() => setActiveTab("settings")} className="mt-4 block text-sm text-gray-600 font-semibold hover:underline">{t('manageAccount')}</button>
                </div>
            </div>

            <div className="bg-purple-600 text-white rounded-2xl p-8 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">{t('createMasterpiece')}</h2>
                        <p className="text-purple-100">{t('createMasterpieceDesc')}</p>
                    </div>
                    <Link href="/" className="bg-white text-purple-600 px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-gray-50 transition-colors">
                        {t('generateNew')}
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
    const [imageVersions, setImageVersions] = useState<{ [key: string]: 'original' | 'basic' | 'advanced' }>({});
    const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
    const router = useRouter();
    const t = useTranslations('dashboard');

    useEffect(() => {
        fetch(`${BASE_PATH}/api/user/gallery`)
            .then(res => res.json())
            .then(data => {
                if (data.images) setImages(data.images);
            })
            .finally(() => setLoading(false));
    }, []);

    const handleUnlock = async (imageId: string) => {
        try {
            const res = await fetch(`${BASE_PATH}/api/images/unlock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageId })
            });

            const data = await res.json();

            if (data.success) {
                // Refresh gallery to show unlocked image
                const galleryRes = await fetch(`${BASE_PATH}/api/user/gallery`);
                const galleryData = await galleryRes.json();
                if (galleryData.images) setImages(galleryData.images);

                // Instant Credit Update
                await update(); // Trigger re-fetch of session data

                alert('Image unlocked successfully!');
            } else {
                alert(data.error || 'Failed to unlock image. Please check your credits.');
            }
        } catch (error) {
            console.error('Unlock error:', error);
            alert('Failed to unlock image. Please try again.');
        }
    };

    // Helper to update session
    const { update } = useSession();

    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>;

    if (images.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">{t('noImages')}</h3>
                <p className="text-gray-500 mb-6">{t('noImagesDesc')}</p>
                <Link href="/" className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-purple-700 transition-colors">
                    {t('startGenerating')}
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{t('myGallery')}</h2>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setFilter('all')}
                        className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all", filter === 'all' ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-900")}
                    >
                        {t('all')}
                    </button>
                    <button
                        onClick={() => setFilter('unlocked')}
                        className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all", filter === 'unlocked' ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-900")}
                    >
                        {t('unlocked')}
                    </button>
                    <button
                        onClick={() => setFilter('locked')}
                        className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all", filter === 'locked' ? "bg-white text-gray-700 shadow-sm" : "text-gray-500 hover:text-gray-900")}
                    >
                        {t('locked')}
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {images.filter(img => {
                    if (filter === 'all') return true;
                    if (filter === 'unlocked') return img.unlocked;
                    if (filter === 'locked') return !img.unlocked;
                    return true;
                }).map((img) => {
                    const currentVersion = imageVersions[img.id] || 'original';
                    const imageUrl = currentVersion === 'original' ? img.originalUrl : currentVersion === 'basic' ? img.basicUrl : img.advancedUrl;
                    const showWatermark = !img.unlocked && (currentVersion === 'basic' || currentVersion === 'advanced');

                    return (
                        <div key={img.id} className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                            {/* Image Area */}
                            <div className="relative aspect-square bg-gray-100 group overflow-hidden">
                                {/* Image Display */}
                                {imageUrl ? (
                                    <>
                                        <Image
                                            src={imageUrl}
                                            alt="Generated"
                                            fill
                                            className={cn("object-cover transition-transform duration-500", img.unlocked && "group-hover:scale-105")}
                                        />

                                        {/* Dense Watermark for Locked Basic/Advanced */}
                                        {showWatermark && (
                                            <div className="absolute inset-0 flex flex-col justify-between p-4 opacity-40 transform -rotate-12 pointer-events-none select-none overflow-hidden z-20">
                                                {[...Array(5)].map((_, rowIdx) => (
                                                    <div key={rowIdx} className="flex justify-center gap-8 whitespace-nowrap">
                                                        {[...Array(6)].map((_, colIdx) => (
                                                            <div key={colIdx} className="flex flex-col items-center justify-center shrink-0 w-32">
                                                                <div className="relative w-20 h-10 mb-1 grayscale brightness-200">
                                                                    <Image
                                                                        src="/bomee-logo.png"
                                                                        alt="Watermark"
                                                                        fill
                                                                        className="object-contain"
                                                                    />
                                                                </div>
                                                                <span className="text-[14px] font-black text-white/50 uppercase tracking-widest">CrystalReveal</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Lock Overlay Button (if locked, but still allow viewing) */}
                                        {!img.unlocked && (
                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
                                                <button
                                                    onClick={() => handleUnlock(img.id)}
                                                    className="bg-white/90 backdrop-blur text-gray-900 px-4 py-2 rounded-full text-sm font-bold hover:bg-white transition-colors shadow-lg flex items-center gap-2 border border-purple-100"
                                                >
                                                    <Lock className="w-4 h-4 text-purple-600" />
                                                    {t('unlockToDownload')}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400">Processing...</div>
                                )}

                                {/* Actions Overlay (Only if Unlocked) */}
                                {img.unlocked && (
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                                        <button
                                            onClick={async () => {
                                                const version = imageVersions[img.id] || 'original';
                                                const urlToDownload = version === 'original' ? img.originalUrl : version === 'basic' ? img.basicUrl : img.advancedUrl;
                                                if (!urlToDownload) return;

                                                try {
                                                    const response = await fetch(urlToDownload);
                                                    const blob = await response.blob();
                                                    const url = window.URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = `crystalreveal-${version}-${img.id}.png`;
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    window.URL.revokeObjectURL(url);
                                                    document.body.removeChild(a);
                                                } catch (error) {
                                                    console.error('Download failed:', error);
                                                }
                                            }}
                                            className="p-2 bg-white rounded-full text-gray-900 hover:text-purple-600 transition-colors"
                                            title={`Download ${currentVersion}`}
                                        >
                                            <Download className="w-5 h-5" />
                                        </button>
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

                                    {/* Versions Access - ALWAYS VISIBLE */}
                                    <div className="flex gap-2 mt-3 text-xs justify-center bg-gray-50 rounded-lg p-1">
                                        <button
                                            onClick={() => setImageVersions(prev => ({ ...prev, [img.id]: 'original' }))}
                                            className={cn(
                                                "flex-1 py-1.5 rounded-md transition-all text-center",
                                                currentVersion === 'original' ? "bg-white text-purple-700 shadow-sm font-bold" : "text-gray-500 hover:text-gray-900"
                                            )}>
                                            Original
                                        </button>
                                        <button
                                            onClick={() => setImageVersions(prev => ({ ...prev, [img.id]: 'basic' }))}
                                            className={cn(
                                                "flex-1 py-1.5 rounded-md transition-all text-center",
                                                currentVersion === 'basic' ? "bg-white text-purple-700 shadow-sm font-bold" : "text-gray-500 hover:text-gray-900"
                                            )}>
                                            Basic
                                        </button>
                                        <button
                                            onClick={() => setImageVersions(prev => ({ ...prev, [img.id]: 'advanced' }))}
                                            className={cn(
                                                "flex-1 py-1.5 rounded-md transition-all text-center",
                                                currentVersion === 'advanced' ? "bg-white text-purple-700 shadow-sm font-bold" : "text-gray-500 hover:text-gray-900"
                                            )}>
                                            Advanced
                                        </button>
                                    </div>

                                    {!img.unlocked && (currentVersion === 'basic' || currentVersion === 'advanced') && (
                                        <p className="text-[10px] text-center text-purple-600 mt-2 font-medium">
                                            Previewing with Watermark
                                        </p>
                                    )}
                                </div>

                                {img.unlocked && img.unlockedAt && (
                                    <div className="mt-3 pt-3 border-t border-gray-100/50">
                                        <p className="text-[10px] text-gray-400">Unlocked on {new Date(img.unlockedAt).toLocaleDateString()}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function BillingTab({ session }: { session: any }) {
    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
        fetch(`${BASE_PATH}/api/user/transactions`)
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
                        {(() => {
                            // Find nearest expiration from transactions
                            const activeCredits = transactions.filter(tx =>
                                tx.transactionType === 'PURCHASE' &&
                                tx.expiresAt &&
                                new Date(tx.expiresAt) > new Date() &&
                                !tx.isExpired
                            );

                            if (activeCredits.length > 0) {
                                const nearest = activeCredits.reduce((prev, curr) =>
                                    new Date(curr.expiresAt) < new Date(prev.expiresAt) ? curr : prev
                                );
                                return (
                                    <p className="text-sm text-orange-600 mt-1 font-medium">
                                        {nearest.creditsChange} credits expire on {new Date(nearest.expiresAt).toLocaleDateString()}
                                    </p>
                                );
                            }
                            return null;
                        })()}
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
                                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Expires On</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {transactions.length > 0 ? transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-600">{new Date(tx.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{tx.transactionType === 'PURCHASE' ? 'Credit Purchase' : tx.transactionType === 'USE' ? 'Image Unlock' : tx.transactionType}</td>
                                    <td className="px-6 py-4 text-gray-600">{tx.amountPaid ? `$${Number(tx.amountPaid).toFixed(2)}` : '-'}</td>
                                    <td className={cn("px-6 py-4 font-bold text-right", tx.creditsChange > 0 ? "text-green-600" : "text-gray-900")}>
                                        {tx.creditsChange > 0 ? "+" : ""}{tx.creditsChange}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm">
                                        {tx.expiresAt ? (
                                            <span className={cn(
                                                "font-medium",
                                                new Date(tx.expiresAt) < new Date() || tx.isExpired ? "text-red-500" : "text-gray-600"
                                            )}>
                                                {new Date(tx.expiresAt).toLocaleDateString()}
                                                {(new Date(tx.expiresAt) < new Date() || tx.isExpired) && " (Expired)"}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No transactions found.</td>
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
    const { update } = useSession();
    const router = useRouter();
    const [formData, setFormData] = useState({
        businessName: session.user.businessName || "",
        ownerName: session.user.ownerName || "",
        phoneNumber: session.user.phoneNumber || "",
        website: session.user.website || "",
        pregnancyWeeks: session.user.pregnancyWeeks || "",
        monthlyScanVolume: session.user.monthlyScanVolume || "",
        country: session.user.country || "",
        marketingAgreed: session.user.marketingAgreed ?? false,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage({ type: "", text: "" });

        try {
            const res = await fetch(`${BASE_PATH}/api/user/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                await update(formData); // Update session client-side
                setMessage({ type: "success", text: "Profile updated successfully!" });
                router.refresh(); // Force refresh to ensure server components update too
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
                    </div>

                    {session.user.userType === 'BUSINESS' ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
                                <input
                                    type="text"
                                    name="ownerName"
                                    value={formData.ownerName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
                                    placeholder="Enter owner's name"
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                <select
                                    name="country"
                                    value={formData.country}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
                                >
                                    <option value="">Select Country</option>
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
                            </div>

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
                        </>
                    ) : (
                        <>
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                <select
                                    name="country"
                                    value={formData.country}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
                                >
                                    <option value="">Select Country</option>
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
                            </div>
                        </>
                    )}

                    <div>
                        <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer mt-4">
                            <input
                                type="checkbox"
                                name="marketingAgreed"
                                checked={formData.marketingAgreed}
                                onChange={handleChange}
                                className="mt-1 rounded text-purple-600 focus:ring-purple-500"
                            />
                            <span>
                                Keep me updated with exclusive offers and product updates from Bomee.
                            </span>
                        </label>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                    <div>
                        {/* Delete Account moved to separate section below */}
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

            {/* Password Change Section */}
            <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Change Password</h3>
                <PasswordChangeForm />
            </div>

            {/* Delete Account Section */}
            <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Delete Account</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <DeleteAccountButton />
            </div>
        </div>
    );
}

function DeleteAccountButton() {
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (confirmText !== "DELETE") {
            return;
        }

        setIsDeleting(true);

        try {
            const res = await fetch(`${BASE_PATH}/api/user/delete-account`, {
                method: "POST",
            });

            if (res.ok) {
                // Sign out and redirect
                await signOut({ callbackUrl: "/" });
            } else {
                alert("Failed to delete account. Please try again or contact support.");
                setIsDeleting(false);
            }
        } catch (error) {
            alert("An error occurred. Please try again.");
            setIsDeleting(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setShowConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
            >
                Delete Account
            </button>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Account Deletion</h3>

                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                            <p className="text-sm text-red-800 font-medium mb-2">⚠️ Warning: This action is permanent</p>
                            <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                                <li>All your generated images will be deleted</li>
                                <li>Your credit balance will be forfeited</li>
                                <li>Your account data will be anonymized</li>
                                <li>This action cannot be undone</li>
                            </ul>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">
                            Type <strong>DELETE</strong> to confirm:
                        </p>

                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 outline-none mb-4"
                            placeholder="Type DELETE"
                            disabled={isDeleting}
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowConfirm(false);
                                    setConfirmText("");
                                }}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={confirmText !== "DELETE" || isDeleting}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    "Delete My Account"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function PasswordChangeForm() {
    const [passwords, setPasswords] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ type: "", text: "" });

        if (passwords.newPassword.length < 6) {
            setMessage({ type: "error", text: "New password must be at least 6 characters." });
            return;
        }

        if (passwords.newPassword !== passwords.confirmPassword) {
            setMessage({ type: "error", text: "New passwords do not match." });
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${BASE_PATH}/api/user/password`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword: passwords.currentPassword,
                    newPassword: passwords.newPassword
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: "success", text: "Password changed successfully!" });
                setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
            } else {
                setMessage({ type: "error", text: data.error || "Failed to change password." });
            }
        } catch (error) {
            setMessage({ type: "error", text: "An error occurred." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {message.text && (
                <div className={cn("p-3 rounded-lg text-sm font-medium", message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
                    {message.text}
                </div>
            )}
            <div>
                <input
                    type="password"
                    name="currentPassword"
                    value={passwords.currentPassword}
                    onChange={handleChange}
                    required
                    placeholder="Current Password"
                    className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
                />
            </div>
            <div>
                <input
                    type="password"
                    name="newPassword"
                    value={passwords.newPassword}
                    onChange={handleChange}
                    required
                    placeholder="New Password (min 6 chars)"
                    className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
                />
            </div>
            <div>
                <input
                    type="password"
                    name="confirmPassword"
                    value={passwords.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Confirm New Password"
                    className="w-full px-4 py-2 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
                />
            </div>
            <button
                type="submit"
                disabled={loading}
                className="bg-gray-100 text-gray-900 px-6 py-2 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Update Password
            </button>
        </form>
    );
}

// Wrapper component with Suspense

// Wrapper component with Suspense
export default function Dashboard() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}
