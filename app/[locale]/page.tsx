"use client";

import { useState, useRef, DragEvent, useEffect } from "react";
import Image from "next/image";
import { Upload, Sparkles, Lock, Maximize2, X, ChevronLeft, ChevronRight, Zap, Users, TrendingUp, Star, Check, Download, Loader2, User as UserIcon, LogOut, HelpCircle, Crown, Timer, RefreshCcw, ArrowRight, CreditCard, ExternalLink, Settings } from "lucide-react";
import Link from "next/link";
import { FeaturedCarousel } from "@/app/components/FeaturedCarousel";
import { cn } from "@/lib/utils";
import { upload } from "@vercel/blob/client";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// Helper to convert file to base64 for storage
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

interface GeneratedImages {
    basic: string;
    advanced: string;
    original: string;
    id: string;
    isUnlocked: boolean;
}

const packages = [
    {
        credits: 1,
        price: 9.99,
        originalPrice: 9.99, // No discount shown for single
        name: "Pay-As-You-Go",
        description: "Perfect for expectant mothers to enhance their own photos.",
        icon: Sparkles,
        features: ["1 High-Quality Image", "Instant 8K Upgrade"],
        lookupKey: "credit_payg19",
        unitPrice: "$9.99/generation"
    },
    {
        credits: 20,
        price: 99,
        originalPrice: 199.8,
        name: "Starter",
        description: "Best for studios testing demand with their clients.",
        icon: Zap,
        features: ["10 High-Quality Images", "Instant 8K Upgrade"],
        lookupKey: "credit_starter",
        unitPrice: "$9.99/generation"
    },
    {
        credits: 50,
        price: 199,
        originalPrice: 499.5,
        name: "Basic",
        description: "Discounted rates for growing ultrasound businesses.",
        icon: UserIcon,
        features: ["25 High-Quality Images", "Instant 8K Upgrade"],
        lookupKey: "credit_basic",
        unitPrice: "$7.99/generation"
    },
    {
        credits: 100,
        price: 299,
        originalPrice: 999,
        name: "Pro",
        description: "The go-to choice for high-volume 3D/4D clinics.",
        icon: Crown,
        popular: true,
        features: ["50 High-Quality Images", "Instant 8K Upgrade"],
        lookupKey: "credit_pro",
        unitPrice: "$5.99/generation"
    }
];

export default function Home() {
    const locale = useLocale();
    const t = useTranslations();
    const { data: session, status, update } = useSession();
    const router = useRouter();

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    // Restore generated images from sessionStorage on mount
    useEffect(() => {
        const saved = sessionStorage.getItem('bomee_generated_images');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setGeneratedImages(parsed);
                if (parsed.original && !preview) {
                    setPreview(parsed.original);
                }
            } catch (e) {
                console.error('Failed to restore images:', e);
                sessionStorage.removeItem('bomee_generated_images');
            }
        }
    }, []);

    const [loading, setLoading] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImages | null>(null);
    const [ratings, setRatings] = useState<{ basic: number; advanced: number }>({ basic: 0, advanced: 0 });
    const [isCompareMode, setIsCompareMode] = useState(false);
    const [error, setError] = useState("");

    const [dragActive, setDragActive] = useState(false);
    const [gallery, setGallery] = useState<{ before: string; after: string }[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // TOS State
    const [tosAgreed, setTosAgreed] = useState(false);

    // Unlock Error State
    const [unlockError, setUnlockError] = useState("");
    const [creditUsedNotification, setCreditUsedNotification] = useState(false);

    // Persist generated images to sessionStorage
    useEffect(() => {
        if (generatedImages) {
            sessionStorage.setItem('bomee_generated_images', JSON.stringify(generatedImages));
        }
    }, [generatedImages]);

    // Restore generated images from sessionStorage on mount
    useEffect(() => {
        const saved = sessionStorage.getItem('bomee_generated_images');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setGeneratedImages(parsed);
            } catch (e) {
                console.error('Failed to restore images:', e);
                sessionStorage.removeItem('bomee_generated_images');
            }
        }
    }, []);

    // Load global gallery on mount
    useEffect(() => {
        const fetchGallery = async () => {
            try {
                const res = await fetch("/api/gallery/list");
                if (res.ok) {
                    const data = await res.json();
                    let items = data.gallery || [];
                    setGallery(items);
                }
            } catch (e) {
                console.error("Failed to load gallery", e);
            }
        };
        fetchGallery();
    }, []);

    // Guest Session ID Management
    const [guestSessionId, setGuestSessionId] = useState<string | null>(null);

    useEffect(() => {
        // Get or create guest session ID
        let sessionId = localStorage.getItem("bomee_guest_session");
        if (!sessionId) {
            sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem("bomee_guest_session", sessionId);
        }
        setGuestSessionId(sessionId);
    }, []);

    // Migrate guest images to user account after login
    useEffect(() => {
        if (status === "authenticated" && session?.user && guestSessionId) {
            // Call migration API
            fetch("/api/user/migrate-images", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ guestSessionId })
            }).then(res => res.json()).then(data => {
                if (data.success && data.migratedCount > 0) {
                    console.log(`Migrated ${data.migratedCount} images to user account`);
                    // Clear guest session ID since images are now migrated
                    localStorage.removeItem("bomee_guest_session");
                    setGuestSessionId(null);
                }
            }).catch(e => console.error("Migration failed:", e));
        }
    }, [status, session, guestSessionId]);

    const handleDrag = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFile = (file: File) => {
        if (!file.type.startsWith("image/")) {
            setError("Please upload an image file.");
            return;
        }
        setFile(file);
        setPreview(URL.createObjectURL(file));
        setError("");
        setGeneratedImages(null);
        setRatings({ basic: 0, advanced: 0 }); // Reset ratings
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    // State for Config
    const [timeLeft, setTimeLeft] = useState(0);

    const handleSubmit = async () => {
        if (!file) {
            setError("Please upload an ultrasound image.");
            return;
        }

        // Countdown Start
        let count = 10;
        setTimeLeft(count);
        setLoading(true);
        setError("");
        setGeneratedImages(null);

        // Timer interval
        const timer = setInterval(() => {
            count--;
            setTimeLeft(count);
            if (count <= 0) clearInterval(timer);
        }, 1000);

        const formData = new FormData();
        formData.append("file", file);

        // Add guest session ID if not logged in
        if (!session && guestSessionId) {
            formData.append("guestSessionId", guestSessionId);
        }

        try {
            const res = await fetch("/api/generate", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            clearInterval(timer); // Clear timer if done early

            if (!res.ok) {
                throw new Error(data.error || "Failed to generate image.");
            }

            if (data.basic && data.advanced) {
                setGeneratedImages({
                    basic: data.basic,
                    advanced: data.advanced,
                    original: data.original || preview || "", // Prefer server URL
                    id: data.id,
                    isUnlocked: data.isUnlocked || false
                });
            } else {
                setError("No image received from server.");
            }

        } catch (err: any) {
            clearInterval(timer);
            setError(err.message);
        } finally {
            setLoading(false);
            setTimeLeft(0);
        }
    };

    // Promo Countdown Logic
    const [timeLeftToPromo, setTimeLeftToPromo] = useState("");

    useEffect(() => {
        const targetDate = new Date("2026-02-28T23:59:59-08:00"); // Feb 28 PT

        const updateCountdown = () => {
            const now = new Date();
            const difference = targetDate.getTime() - now.getTime();

            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);
                setTimeLeftToPromo(`${days}d ${hours}h ${minutes}m ${seconds}s`);
            } else {
                setTimeLeftToPromo("Promo Ended");
            }
        };

        const interval = setInterval(updateCountdown, 1000);
        updateCountdown(); // Initial call
        return () => clearInterval(interval);
    }, []);

    // Verify Payment Success
    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        if (query.get("success") === "true" && query.get("session_id")) {
            const sessionId = query.get("session_id");

            // Clear URL
            window.history.replaceState({}, document.title, "/");

            // Call Success API
            fetch("/api/checkout/success", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId })
            }).then(async (res) => {
                if (res.ok) {
                    alert("Credit purchase successful! Your balance has been updated.");
                    // Instant Credit Update
                    await update(); // Force session refresh to get new credits

                    const event = new Event("visibilitychange");
                    document.dispatchEvent(event);
                    router.refresh();
                }
            });
        }
    }, [router]);

    const handleBuyCredits = async (credits: number, planName: string) => {
        if (!session) {
            router.push(`/auth/signin?callbackUrl=${encodeURIComponent("/")}`);
            return;
        }

        // Stripe Checkout API (All Environments)

        // Dev/Local: Stripe Checkout API
        try {
            setLoading(true);

            // Determine lookup_key
            let lookupKey = "";
            switch (credits) {
                case 1: lookupKey = "credit_payg19"; break;
                case 20: lookupKey = "credit_starter"; break;
                case 50: lookupKey = "credit_basic"; break;
                case 100: lookupKey = "credit_pro"; break;
                default: lookupKey = "credit_payg19";
            }

            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    lookup_key: lookupKey, // User requested sending lookup_key
                    credits, // Sending credits too for backward compatibility/metadata if needed
                    planName,
                    userId: session.user.id
                })
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert("Failed to start checkout: " + (data.error || "Unknown error"));
            }
        } catch (e) {
            console.error("Checkout Error", e);
            alert("Checkout failed");
        } finally {
            setLoading(false);
        }
    };


    const handleUnlock = async () => {
        if (!generatedImages?.id) return;

        setUnlockError(""); // Clear previous errors
        setCreditUsedNotification(false); // Clear previous notification

        if (!session) {
            // Guest Flow: Save to LocalStorage and redirect to Signup
            localStorage.setItem("bomee_pending_claim", JSON.stringify({
                id: generatedImages.id,
                basic: generatedImages.basic,
                advanced: generatedImages.advanced,
                original: generatedImages.original
            }));
            router.push("/auth/signin?callbackUrl=/");
            return;
        }

        // User Flow: Check Credits (Server handles validation & promotion logic)
        // const credits = session.user.credits || 0;
        // if (credits < 1) {
        //     setUnlockError("Insufficient credits.");
        //     return;
        // }

        // Remove popup confirmation - unlock immediately
        try {
            setLoading(true);
            const res = await fetch("/api/images/unlock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageId: generatedImages.id })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setGeneratedImages(prev => prev ? { ...prev, isUnlocked: true } : null);
                setCreditUsedNotification(true); // Show inline notification
                router.refresh();

                // Auto-hide notification after 3 seconds
                setTimeout(() => setCreditUsedNotification(false), 3000);
            } else {
                if (res.status === 402) {
                    setUnlockError("Insufficient credits.");
                } else {
                    setUnlockError(data.error || "Failed to unlock");
                }
            }
        } catch (e) {
            console.error("Unlock failed", e);
            setUnlockError("Error unlocking image");
        } finally {
            setLoading(false);
        }
    };

    // Auto-claim guest images on login
    useEffect(() => {
        if (status === "authenticated" && session?.user) {
            const pending = localStorage.getItem("bomee_pending_claim");
            if (pending) {
                try {
                    const { id } = JSON.parse(pending);
                    fetch("/api/images/claim", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ imageId: id })
                    }).then(res => res.json()).then(data => {
                        if (data.success) {
                            localStorage.removeItem("bomee_pending_claim");
                        }
                    });
                } catch (e) { }
            }
        }
    }, [status, session]);

    const handleRate = async (style: "basic" | "advanced", score: number) => {
        setRatings(prev => ({ ...prev, [style]: score }));

        if (!generatedImages?.id) return;

        try {
            await fetch("/api/images/rate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageId: generatedImages.id,
                    type: style,
                    rating: score,
                })
            });
        } catch (e) {
            console.error("Failed to submit rating", e);
        }
    };

    const [hoveredRating, setHoveredRating] = useState<{ basic: number; advanced: number }>({ basic: 0, advanced: 0 });

    const handleDownloadAll = async () => {
        if (!generatedImages) return;

        // Trigger Google Ads Conversion
        if (typeof window !== "undefined" && (window as any).gtag_report_conversion) {
            (window as any).gtag_report_conversion();
        }

        // Helper to force download via Blob
        const triggerDownload = async (url: string, filename: string) => {
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
            } catch (e) {
                console.error("Download failed", e);
                window.open(url, '_blank');
            }
        };

        // Download Basic
        await triggerDownload(generatedImages.basic, 'bomee_basic.png');
        // Small delay
        await new Promise(r => setTimeout(r, 800));
        // Download Advanced
        await triggerDownload(generatedImages.advanced, 'bomee_advanced.png');
    };

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-purple-100 selection:text-purple-900">
            {/* Fullscreen Compare Mode */}
            {isCompareMode && generatedImages && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col">
                    <div className="absolute top-6 right-6 z-50">
                        <button
                            onClick={() => setIsCompareMode(false)}
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-2 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 grid grid-cols-3 h-full gap-1 p-1">
                        {/* Original */}
                        <div className="relative h-full bg-black/50 group">
                            <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wider">Original</div>
                            <Image
                                src={generatedImages.original}
                                alt="Original"
                                fill
                                className="object-contain"
                                draggable={false}
                                onDragStart={(e) => e.preventDefault()}
                                onContextMenu={(e) => e.preventDefault()}
                            />
                        </div>

                        {/* Basic */}
                        <div className="relative h-full bg-black/50 group">
                            <div className="absolute top-4 left-4 z-10 bg-blue-500/80 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wider">Basic</div>
                            <Image
                                src={generatedImages.basic}
                                alt="Basic"
                                fill
                                className="object-contain"
                                draggable={false}
                                onDragStart={(e) => e.preventDefault()}
                                onContextMenu={(e) => e.preventDefault()}
                            />
                            {!generatedImages.isUnlocked && (
                                <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                                    <div className="absolute inset-0 flex flex-col justify-between p-0 opacity-40 transform -rotate-12 pointer-events-none select-none overflow-hidden">
                                        {[...Array(10)].map((_, rowIdx) => (
                                            <div key={rowIdx} className="flex justify-center gap-4 whitespace-nowrap -ml-20">
                                                {[...Array(10)].map((_, colIdx) => (
                                                    <div key={colIdx} className="flex flex-col items-center justify-center shrink-0 w-24">
                                                        <div className="relative w-16 h-8 mb-0.5">
                                                            <Image
                                                                src="/bomee-logo.png"
                                                                alt="Watermark"
                                                                fill
                                                                className="object-contain"
                                                            />
                                                        </div>
                                                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none" style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}>CrystalReveal</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Advanced */}
                        <div className="relative h-full bg-black/50 group">
                            <div className="absolute top-4 left-4 z-10 bg-purple-500/80 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wider">Advanced</div>
                            <Image
                                src={generatedImages.advanced}
                                alt="Advanced"
                                fill
                                className="object-contain"
                                draggable={false}
                                onDragStart={(e) => e.preventDefault()}
                                onContextMenu={(e) => e.preventDefault()}
                            />
                            {!generatedImages.isUnlocked && (
                                <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                                    <div className="absolute inset-0 flex flex-col justify-between p-0 opacity-40 transform -rotate-12 pointer-events-none select-none overflow-hidden">
                                        {[...Array(10)].map((_, rowIdx) => (
                                            <div key={rowIdx} className="flex justify-center gap-4 whitespace-nowrap -ml-20">
                                                {[...Array(10)].map((_, colIdx) => (
                                                    <div key={colIdx} className="flex flex-col items-center justify-center shrink-0 w-24">
                                                        <div className="relative w-16 h-8 mb-0.5">
                                                            <Image
                                                                src="/bomee-logo.png"
                                                                alt="Watermark"
                                                                fill
                                                                className="object-contain"
                                                            />
                                                        </div>
                                                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none" style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}>CrystalReveal</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
                        <Link href="/admin" className="p-2 text-gray-500 hover:text-purple-600 transition-colors" title="Admin">
                            <Settings className="w-5 h-5" />
                        </Link>
                        <Link href="/help" className="p-2 text-gray-500 hover:text-purple-600 transition-colors" title="Need Help?">
                            <HelpCircle className="w-5 h-5" />
                        </Link>
                        {status === "loading" ? (
                            <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                        ) : session ? (
                            <div className="flex items-center gap-4">
                                <Link href="/dashboard?tab=billing" className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100 hover:bg-purple-100 transition-colors">
                                    {session.user.credits} Credits
                                </Link>
                                <div className="relative group">
                                    <button className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-purple-600">
                                        <UserIcon className="w-5 h-5" />
                                        <span>{session.user.email?.split('@')[0]}</span>
                                    </button>
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 z-50">
                                        <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Dashboard</Link>
                                        <Link href="#pricing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Buy Credits</Link>
                                        <button onClick={() => signOut({ callbackUrl: '/' })} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2">
                                            <LogOut className="w-4 h-4" /> Sign Out
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Link href="#pricing" className="text-sm font-medium text-gray-600 hover:text-purple-600">Pricing</Link>
                                <Link href="/auth/signin" className="text-sm font-medium text-gray-600 hover:text-purple-600">Sign In</Link>
                                <Link href="/auth/signup" className="text-sm font-medium text-white bg-purple-600 px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-sm shadow-purple-200">
                                    Sign Up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-48 pb-20 overflow-hidden">
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-purple-100/50 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/4" />
                <div className="absolute top-20 left-10 w-[20%] h-[20%] bg-purple-200/30 rounded-full blur-[80px] pointer-events-none" />

                <div className="max-w-[1600px] mx-auto px-6 grid lg:grid-cols-12 gap-8 items-start relative z-10">
                    <div className="lg:col-span-3 space-y-6 pt-8">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-100 text-xs font-semibold text-purple-700 shadow-sm">
                            <Sparkles className="w-4 h-4" />
                            <span>{t('hero.badge')}</span>
                        </div>

                        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 leading-tight">
                            {t('hero.title').split('\n').map((line, i) => (<span key={i}>{line}<br /></span>))}
                        </h1>

                        <p className="text-sm text-gray-600 leading-relaxed">
                            {t('hero.desc')}
                        </p>
                    </div>

                    {/* Interactive Demo Area - 3 Column Layout */}
                    <div className="lg:col-span-9 bg-white rounded-3xl p-4 md:p-6 shadow-2xl shadow-purple-900/10 border border-purple-50">
                        <div className="grid md:grid-cols-3 gap-6 min-h-[500px]">

                            {/* 1. Input Column */}
                            <div className="flex flex-col gap-4">
                                <div className="text-sm font-bold text-gray-500 uppercase tracking-wider text-center">{t('upload.originalScan')}</div>
                                <div
                                    className={cn(
                                        "flex-1 relative group border-2 border-dashed rounded-2xl p-4 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden h-[400px]",
                                        dragActive ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-purple-300",
                                        preview ? "border-solid border-purple-200 bg-white" : "bg-gray-50"
                                    )}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />

                                    {/* Preset Background for Input */}
                                    {!preview && (
                                        <div className="absolute inset-0 z-0 opacity-40 blur-[2px] transition-opacity group-hover:opacity-30">
                                            <Image src="/presets/original.png" alt="Example" fill className="object-cover" />
                                            <div className="absolute inset-0 bg-white/60" />
                                        </div>
                                    )}

                                    {preview ? (
                                        <div className="relative w-full h-full rounded-xl overflow-hidden z-10">
                                            <Image src={preview} alt="Original" fill className="object-contain" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <p className="text-white font-medium text-sm">{t('upload.changeImage')}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 relative z-10">
                                            <div className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center mx-auto text-purple-600"><Upload className="w-6 h-6" /></div>
                                            <p className="text-sm font-semibold text-gray-900 bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full">{t('upload.uploadScan')}</p>
                                        </div>
                                    )}
                                </div>
                                <label className="flex items-start gap-2 cursor-pointer group px-1">
                                    <input type="checkbox" checked={tosAgreed} onChange={(e) => setTosAgreed(e.target.checked)} className="mt-1 peer h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600" />
                                    <span className="text-[10px] text-gray-500 leading-tight">
                                        {t('upload.tosAgree')} <a href="/terms" className="underline hover:text-purple-600" target="_blank">{t('upload.termsPrivacy')}</a>.
                                    </span>
                                </label>
                                <p className="text-[10px] text-gray-400 ml-7 mt-0.5">{t('upload.inputsHelp')}</p>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || !file || !tosAgreed}
                                    className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>{timeLeft > 0 ? t('upload.generating', { seconds: timeLeft }) : t('upload.finalizing')}</span>
                                        </>
                                    ) : generatedImages ? (
                                        <> <RefreshCcw className="w-4 h-4" /> <span>{t('upload.regenerate')}</span> </>
                                    ) : (
                                        <> <span>{t('upload.freeGenerate')}</span> <Sparkles className="w-4 h-4 text-purple-300" /> </>
                                    )}
                                </button>
                            </div>

                            {/* 2. Basic Result */}
                            <div className="flex flex-col gap-4">
                                <div className="text-sm font-bold text-gray-500 tracking-wider text-center">{t('results.basic')}</div>
                                <div className="flex-1 bg-white rounded-2xl border border-gray-100 relative overflow-hidden h-[400px]">
                                    {generatedImages ? (
                                        <div className="relative w-full h-full bg-black group" onContextMenu={(e) => !generatedImages?.isUnlocked && e.preventDefault()} onDragStart={(e) => !generatedImages?.isUnlocked && e.preventDefault()}>
                                            <Image src={generatedImages.basic} alt="Basic" fill className={`object-contain ${!generatedImages.isUnlocked ? 'pointer-events-none select-none' : ''}`} draggable={generatedImages.isUnlocked ? undefined : false} onDragStart={(e) => !generatedImages.isUnlocked && e.preventDefault()} />
                                            {!generatedImages.isUnlocked && (
                                                <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                                                    {/* Dense repeating logo watermark */}
                                                    {/* Dense repeating logo watermark - Louis Vuitton Style */}
                                                    <div className="absolute inset-0 flex flex-col justify-between p-4 opacity-30 transform -rotate-12 pointer-events-none select-none overflow-hidden">
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
                                                </div>
                                            )}
                                            {/* Top Right Download Button (Only if Unlocked) */}
                                            {generatedImages.isUnlocked && (
                                                <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const response = await fetch(generatedImages.basic);
                                                                const blob = await response.blob();
                                                                const url = window.URL.createObjectURL(blob);
                                                                const a = document.createElement('a');
                                                                a.href = url;
                                                                a.download = `crystalreveal-basic-${Date.now()}.png`;
                                                                document.body.appendChild(a);
                                                                a.click();
                                                                window.URL.revokeObjectURL(url);
                                                                document.body.removeChild(a);
                                                            } catch (error) {
                                                                console.error('Download failed:', error);
                                                            }
                                                        }}
                                                        className="p-3 bg-white/90 backdrop-blur-md hover:bg-white text-gray-900 rounded-full shadow-lg transition-all transform hover:scale-105"
                                                        title="Download Image"
                                                    >
                                                        <Download className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {/* Preset Background for Basic */}
                                            <div className="absolute inset-0 z-0 opacity-50 blur-[2px]">
                                                <Image src="/presets/basic.jpg" alt="Example" fill className="object-cover" />
                                                <div className="absolute inset-0 bg-white/40" />
                                            </div>

                                            <div className="absolute inset-0 flex items-center justify-center text-center p-6 z-10">
                                                <div className="bg-white/60 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white/50">
                                                    <p className="text-sm text-gray-600 font-medium">{t('results.standardClarity')}<br /><span className="text-xs text-gray-500">{t('results.resultHere')}</span></p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-500 leading-tight px-1 min-h-[2.5rem]">
                                    {t('results.basicDesc')}
                                </p>
                                {generatedImages && (
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-xs font-medium text-gray-600">{t('results.rateResult')}</span>
                                        <div className="flex gap-1" onMouseLeave={() => setHoveredRating(prev => ({ ...prev, basic: 0 }))}>
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => handleRate('basic', s)}
                                                    onMouseEnter={() => setHoveredRating(prev => ({ ...prev, basic: s }))}
                                                    className={cn("w-6 h-6 transition-colors text-2xl leading-none", s <= (hoveredRating.basic || ratings.basic) ? "text-yellow-400" : "text-gray-300")}
                                                >
                                                    ★
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 3. Advanced Result */}
                            <div className="flex flex-col gap-4">
                                <div className="text-sm font-bold text-gray-500 tracking-wider text-center">{t('results.advanced')}</div>
                                <div className="flex-1 bg-white rounded-2xl border border-gray-100 relative overflow-hidden h-[400px]">
                                    {generatedImages ? (
                                        <div className="relative w-full h-full bg-black group" onContextMenu={(e) => !generatedImages?.isUnlocked && e.preventDefault()} onDragStart={(e) => !generatedImages?.isUnlocked && e.preventDefault()}>
                                            <Image src={generatedImages.advanced} alt="Advanced" fill className={`object-contain ${!generatedImages.isUnlocked ? 'pointer-events-none select-none' : ''}`} draggable={generatedImages.isUnlocked ? undefined : false} onDragStart={(e) => !generatedImages.isUnlocked && e.preventDefault()} />
                                            {!generatedImages.isUnlocked && (
                                                <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                                                    {/* Dense repeating logo watermark */}
                                                    <div className="absolute inset-0 flex flex-col justify-between p-0 opacity-40 transform -rotate-12 pointer-events-none select-none overflow-hidden">
                                                        {[...Array(10)].map((_, rowIdx) => (
                                                            <div key={rowIdx} className="flex justify-center gap-4 whitespace-nowrap -ml-20">
                                                                {[...Array(10)].map((_, colIdx) => (
                                                                    <div key={colIdx} className="flex flex-col items-center justify-center shrink-0 w-24">
                                                                        <div className="relative w-16 h-8 mb-0.5">
                                                                            <Image
                                                                                src="/bomee-logo.png"
                                                                                alt="Watermark"
                                                                                fill
                                                                                className="object-contain"
                                                                            />
                                                                        </div>
                                                                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none" style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}>CrystalReveal</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Top Right Download Button (Only if Unlocked) */}
                                            {generatedImages.isUnlocked && (
                                                <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const response = await fetch(generatedImages.advanced);
                                                                const blob = await response.blob();
                                                                const url = window.URL.createObjectURL(blob);
                                                                const a = document.createElement('a');
                                                                a.href = url;
                                                                a.download = `crystalreveal-advanced-${Date.now()}.png`;
                                                                document.body.appendChild(a);
                                                                a.click();
                                                                window.URL.revokeObjectURL(url);
                                                                document.body.removeChild(a);
                                                            } catch (error) {
                                                                console.error('Download failed:', error);
                                                            }
                                                        }}
                                                        className="p-3 bg-white/90 backdrop-blur-md hover:bg-white text-gray-900 rounded-full shadow-lg transition-all transform hover:scale-105"
                                                        title="Download Image"
                                                    >
                                                        <Download className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {/* Preset Background for Advanced */}
                                            <div className="absolute inset-0 z-0 opacity-50 blur-[2px]">
                                                <Image src="/presets/advanced.jpg" alt="Example" fill className="object-cover" />
                                                <div className="absolute inset-0 bg-white/40" />
                                            </div>

                                            <div className="absolute inset-0 flex items-center justify-center text-center p-6 z-10">
                                                <div className="bg-white/60 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white/50">
                                                    <p className="text-sm text-gray-600 font-medium">{t('results.highFidelity')}<br /><span className="text-xs text-gray-500">{t('results.resultHere')}</span></p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-500 leading-tight px-1 min-h-[2.5rem]">
                                    {t('results.advancedDesc')}
                                </p>
                                {generatedImages && (
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-xs font-medium text-gray-600">{t('results.rateResult')}</span>
                                        <div className="flex gap-1" onMouseLeave={() => setHoveredRating(prev => ({ ...prev, advanced: 0 }))}>
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => handleRate('advanced', s)}
                                                    onMouseEnter={() => setHoveredRating(prev => ({ ...prev, advanced: s }))}
                                                    className={cn("w-6 h-6 transition-colors text-2xl leading-none", s <= (hoveredRating.advanced || ratings.advanced) ? "text-yellow-400" : "text-gray-300")}
                                                >
                                                    ★
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Download All Button (Aligned with Regenerate Row) */}
                                {generatedImages && generatedImages.isUnlocked && (
                                    <div className="h-12"></div>
                                )}
                            </div>
                        </div>

                        {/* Unlock Result Footer */}
                        {generatedImages && !generatedImages.isUnlocked && (
                            <div className="mt-8 w-full max-w-lg mx-auto">
                                <div className="flex gap-3 p-2 bg-white rounded-2xl border border-gray-100 shadow-xl shadow-purple-900/5">
                                    <button
                                        onClick={() => setIsCompareMode(true)}
                                        className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-semibold border border-gray-200 flex items-center justify-center gap-2 transition-all hover:border-gray-300"
                                    >
                                        <Maximize2 className="w-4 h-4" />
                                        <span className="text-sm">{t('results.compare')}</span>
                                    </button>
                                    <button
                                        onClick={handleUnlock}
                                        disabled={loading}
                                        className="flex-[1.5] py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md shadow-purple-200 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Lock className="w-5 h-5" />
                                        <span>{t('results.unlock')}</span>
                                    </button>
                                </div>

                                {/* Credit Used Notification */}
                                {creditUsedNotification && (
                                    <div className="mt-3 text-center bg-green-50 text-green-700 text-sm py-2 px-4 rounded-lg border border-green-200 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1">
                                        <span className="font-semibold">{t('results.creditUsed')}</span>
                                    </div>
                                )}

                                {unlockError && (
                                    <div className="mt-3 text-center bg-red-50 text-red-600 text-sm py-3 px-4 rounded-lg border border-red-100 animate-in fade-in slide-in-from-top-1">
                                        <p className="font-semibold mb-2">{unlockError}</p>
                                        {unlockError.includes("credits") && (
                                            <a
                                                href="#pricing"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                                            >
                                                <CreditCard className="w-4 h-4" />
                                                {t('results.goToPricing')}
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Download Button (After Unlock) */}
                        {generatedImages && generatedImages.isUnlocked && (
                            <div className="mt-8 w-full max-w-lg mx-auto">
                                <div className="flex gap-3 p-2 bg-white rounded-2xl border border-gray-100 shadow-xl shadow-purple-900/5">
                                    <button
                                        onClick={() => setIsCompareMode(true)}
                                        className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-semibold border border-gray-200 flex items-center justify-center gap-2 transition-all hover:border-gray-300"
                                    >
                                        <Maximize2 className="w-4 h-4" />
                                        <span className="text-sm">{t('results.compare')}</span>
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const downloadImage = async (url: string, suffix: string) => {
                                                try {
                                                    const response = await fetch(url);
                                                    const blob = await response.blob();
                                                    const blobUrl = window.URL.createObjectURL(blob);
                                                    const link = document.createElement('a');
                                                    link.href = blobUrl;
                                                    link.download = `bomee-crystalreveal-${suffix}.png`;
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    document.body.removeChild(link);
                                                    window.URL.revokeObjectURL(blobUrl);
                                                } catch (e) {
                                                    console.error(`Download failed for ${suffix}`, e);
                                                }
                                            };

                                            await downloadImage(generatedImages.basic, 'basic');
                                            // Small delay to ensure browser handles both
                                            setTimeout(() => downloadImage(generatedImages.advanced, 'advanced'), 500);
                                        }}
                                        className="flex-[1.5] py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold shadow-md shadow-green-200 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
                                    >
                                        <Download className="w-5 h-5" />
                                        <span>{t('results.download')}</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Revenue / Upgrade Section (Moved from Owner Section) */}
            <section className="bg-gradient-to-br from-gray-900 to-black py-24 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[100px]" />
                </div>

                <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-900/50 border border-purple-800 text-xs font-semibold text-purple-300 mb-6">
                            <Sparkles className="w-4 h-4" />
                            <span>{t('whyAdopt.badge')}</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                            {t('whyAdopt.title')} <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">{t('whyAdopt.titleHighlight')}</span>
                        </h2>
                        <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                            {t('whyAdopt.desc')}
                        </p>

                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                    <span className="text-2xl">💎</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-lg">{t('whyAdopt.benefit1Title')}</h4>
                                    <p className="text-gray-400 text-sm">{t('whyAdopt.benefit1Desc')}</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                    <span className="text-2xl">📉</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-lg">{t('whyAdopt.benefit2Title')}</h4>
                                    <p className="text-gray-400 text-sm">{t('whyAdopt.benefit2Desc')}</p>
                                </div>
                            </div>


                            {/* New Process Guide */}
                            <div className="pt-6 border-t border-white/10 mt-6">
                                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="bg-purple-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">AI</span>
                                    {t('whyAdopt.howItWorks')}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 relative">
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-800 text-xs px-2 py-0.5 rounded-full border border-gray-700">{t('whyAdopt.step1')}</div>
                                        <Upload className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-white">{t('whyAdopt.step1Title')}</p>
                                        <p className="text-xs text-gray-500 mt-1">{t('whyAdopt.step1Desc')}</p>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 relative">
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-800 text-xs px-2 py-0.5 rounded-full border border-gray-700">{t('whyAdopt.step2')}</div>
                                        <Sparkles className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-white">{t('whyAdopt.step2Title')}</p>
                                        <p className="text-xs text-gray-500 mt-1">{t('whyAdopt.step2Desc')}</p>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 relative">
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-800 text-xs px-2 py-0.5 rounded-full border border-gray-700">{t('whyAdopt.step3')}</div>
                                        <Lock className="w-5 h-5 text-green-400 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-white">{t('whyAdopt.step3Title')}</p>
                                        <p className="text-xs text-gray-500 mt-1">{t('whyAdopt.step3Desc')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="relative h-[400px] md:h-[500px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                        <Image src="/bomee_studio_session.png" alt="Clear Difference" fill className="object-cover opacity-80" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-8">
                            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 w-full">
                                <p className="text-white font-medium">{t('whyAdopt.testimonial')}</p>
                                <p className="text-purple-300 text-sm mt-2">{t('whyAdopt.testimonialAuthor')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 bg-white relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16 space-y-4">
                        <div className="inline-block bg-purple-100 text-purple-700 px-4 py-1 rounded-full text-sm font-bold mb-4">
                            {t('pricing.limitedDeal')}
                        </div>
                        <div className="flex justify-center items-center gap-2 text-sm text-red-500 font-bold bg-red-50 py-1 px-3 rounded-lg w-fit mx-auto mb-2 animate-pulse">
                            <Timer className="w-4 h-4" />
                            <span>{t('pricing.promoEnds', { time: timeLeftToPromo })}</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900">{t('pricing.title')}</h2>
                        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                            {t('pricing.subtitle').split('\n').map((line, i) => (<span key={i}>{line}<br /></span>))}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-20">
                        {packages.map((pkg, idx) => (
                            <div key={idx} className={`relative bg-white rounded-3xl p-6 border flex flex-col ${pkg.popular ? "border-purple-500 shadow-xl ring-4 ring-purple-50 z-10" : "border-gray-200 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"}`}>
                                {pkg.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold uppercase tracking-widest py-1.5 px-4 rounded-full shadow-lg whitespace-nowrap">
                                        {t('pricing.bestValue')}
                                    </div>
                                )}

                                <div className="flex-1">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${pkg.popular ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-600"}`}>
                                        <pkg.icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">{pkg.name}</h3>
                                    <p className="text-gray-500 text-sm mt-1 min-h-[48px]">{pkg.description}</p>

                                    <div className="mt-auto mb-6">
                                        <div className="flex items-baseline gap-2">
                                            {/* Force height for alignment even if originalPrice is missing */}
                                            <div className="h-7 flex items-end">
                                                {pkg.originalPrice && pkg.originalPrice > pkg.price ? (
                                                    <span className="text-lg text-gray-400 line-through decoration-red-500 decoration-2">${pkg.originalPrice}</span>
                                                ) : null}
                                            </div>
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

                                <button
                                    onClick={() => handleBuyCredits(pkg.credits, pkg.name)}
                                    disabled={loading}
                                    className={`w-full py-3 rounded-xl font-bold text-sm text-center transition-all ${pkg.popular ? "bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200" : "bg-gray-900 hover:bg-gray-800 text-white"} disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {loading ? t('pricing.processing') : t('pricing.buyCredits', { count: pkg.credits })}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="text-center text-sm text-gray-500 mt-4">
                        <p>
                            {t('pricing.creditsValid')}
                            <br />
                            <span className="text-xs text-gray-400">
                                {t('pricing.qualityNote')}
                            </span>
                        </p>
                    </div>
                </div>
            </section>

            {/* Live Generations (Gallery) */}
            <section className="py-20 bg-gray-50 border-y border-gray-200">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('gallery.title')}</h2>
                        <p className="text-gray-500 max-w-2xl mx-auto text-sm">
                            {t('gallery.desc')}
                        </p>
                    </div>
                </div>

                {/* Featured Carousel */}
                <div className="mt-8">
                    <FeaturedCarousel />
                </div>

            </section>

            {/* Revenue / Upgrade Section (Moved from Owner Section) */}
            <section className="bg-gradient-to-br from-gray-900 to-black py-24 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[100px]" />
                </div>

                <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-900/50 border border-purple-800 text-xs font-semibold text-purple-300 mb-6">
                            <Sparkles className="w-4 h-4" />
                            <span>{t('studio.badge')}</span>
                        </div>
                        <h2 className="text-4xl font-extrabold mb-6">{t('studio.title')}</h2>
                        <p className="text-xl text-gray-300 mb-8 max-w-lg">

                            <br /><br />
                            {t('studio.desc')}
                        </p>
                        <div className="space-y-4 mb-8">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-xl bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                                    <Zap className="w-6 h-6 text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{t('studio.feature1Title')}</h3>
                                    <p className="text-gray-400 text-sm">{t('studio.feature1Desc')}</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                                    <Crown className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{t('studio.feature2Title')}</h3>
                                    <p className="text-gray-400 text-sm">{t('studio.feature2Desc')}</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-xl bg-green-900/50 flex items-center justify-center flex-shrink-0">
                                    <UserIcon className="w-6 h-6 text-green-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{t('studio.feature3Title')}</h3>
                                    <p className="text-gray-400 text-sm">{t('studio.feature3Desc')}</p>
                                </div>
                            </div>
                        </div>

                        <Link
                            href="https://www.bomee.io/?lb=contact"
                            target="_blank"
                            className="inline-flex items-center gap-2 bg-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-900/20"
                        >
                            <span>{t('studio.bookConsultation')}</span>
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                    <div className="relative h-[600px] w-full hidden lg:block animate-in fade-in slide-in-from-right duration-1000">
                        {/* Glow Effect behind phones */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/20 rounded-full blur-[80px]" />
                        <Image
                            src="/bomee_core_mockup_v2.png"
                            alt="Bomee Core App Interface"
                            fill
                            className="object-contain drop-shadow-2xl"
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}
