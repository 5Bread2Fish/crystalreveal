"use client";

import { useState, useRef, DragEvent, useEffect } from "react";
import Image from "next/image";
import { Upload, Sparkles, Lock, Maximize2, X, ChevronLeft, ChevronRight, Zap, Users, TrendingUp, Star, Check, Download, Loader2, User as UserIcon, LogOut, HelpCircle, Crown, Timer, RefreshCcw, ArrowRight, CreditCard, ExternalLink, Settings } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { upload } from "@vercel/blob/client";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

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
        name: "Pay-As-You-Go",
        description: "Perfect for expectant mothers to enhance their own photos.",
        icon: Sparkles,
        features: ["1 High-Quality Image", "Instant 8K Upgrade"],
        lookupKey: "credit_payg",
        unitPrice: "$9.99/generation"
    },
    {
        credits: 20,
        price: 99,
        name: "Starter",
        description: "Best for studios testing demand with their clients.",
        icon: Zap,
        features: ["20 High-Quality Images", "Instant 8K Upgrade"],
        lookupKey: "credit_starter",
        unitPrice: "$4.95/generation"
    },
    {
        credits: 50,
        price: 199,
        name: "Basic",
        description: "Discounted rates for growing ultrasound businesses.",
        icon: UserIcon,
        features: ["50 High-Quality Images", "Instant 8K Upgrade"],
        lookupKey: "credit_basic",
        unitPrice: "$3.98/generation"
    },
    {
        credits: 100,
        price: 299,
        name: "Pro",
        description: "The go-to choice for high-volume 3D/4D clinics.",
        icon: Crown,
        popular: true,
        features: ["100 High-Quality Images", "Instant 8K Upgrade"],
        lookupKey: "credit_pro",
        unitPrice: "$2.99/generation"
    }
];

export default function Home() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
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
                    setGallery(data.gallery || []);
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
                    original: preview || "",
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
        const targetDate = new Date("2026-02-15T23:59:59-08:00"); // Feb 15 PT

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
                    // Refresh session to show new credits
                    const event = new Event("visibilitychange");
                    document.dispatchEvent(event);
                    router.refresh();
                }
            });
        }
    }, [router]);

    // Environment Check
    const isProduction = process.env.NEXT_PUBLIC_IS_PRODUCTION === 'true';

    // Stripe Payment Links (Production)
    const STRIPE_LINKS: Record<number, string> = {
        1: "https://buy.stripe.com/4gM9ATdhx3k89jHbtmdEs03",
        20: "https://buy.stripe.com/4gM9ATdhx3k89jHbtmdEs03",
        50: "https://buy.stripe.com/4gM9ATdhx3k89jHbtmdEs03",
        100: "https://buy.stripe.com/4gM9ATdhx3k89jHbtmdEs03"
    };

    const handleBuyCredits = async (credits: number, planName: string) => {
        if (!session) {
            router.push(`/auth/signin?callbackUrl=${encodeURIComponent("/")}`);
            return;
        }

        // Production: Redirect to Stripe Payment Link
        if (isProduction) {
            const stripeLink = STRIPE_LINKS[credits];
            if (stripeLink) {
                window.location.href = stripeLink;
            } else {
                alert("Payment link not found for this package.");
            }
            return;
        }

        // Dev/Local: Stripe Checkout API
        try {
            setLoading(true);

            // Determine lookup_key
            let lookupKey = "";
            switch (credits) {
                case 1: lookupKey = "credit_payg"; break;
                case 20: lookupKey = "credit_starter"; break;
                case 50: lookupKey = "credit_basic"; break;
                case 100: lookupKey = "credit_pro"; break;
                default: lookupKey = "credit_payg";
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

        // User Flow: Check Credits
        const credits = session.user.credits || 0;
        if (credits < 1) {
            setUnlockError("Insufficient credits.");
            return;
        }

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
                            <Image src={generatedImages.original} alt="Original" fill className="object-contain" />
                        </div>

                        {/* Basic */}
                        <div className="relative h-full bg-black/50 group">
                            <div className="absolute top-4 left-4 z-10 bg-blue-500/80 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wider">Basic</div>
                            <Image src={generatedImages.basic} alt="Basic" fill className="object-contain" />
                            {!generatedImages.isUnlocked && (
                                <div className="absolute inset-0 z-10 pointer-events-none bg-black/20 overflow-hidden flex flex-col justify-center items-center gap-4">
                                    <div className="relative w-48 h-12 opacity-50">
                                        <Image src="/bomee-logo.png" alt="Bomee" fill className="object-contain" />
                                    </div>
                                    <span className="text-white text-2xl font-bold opacity-50 uppercase tracking-widest">CrystalReveal</span>
                                </div>
                            )}
                        </div>

                        {/* Advanced */}
                        <div className="relative h-full bg-black/50 group">
                            <div className="absolute top-4 left-4 z-10 bg-purple-500/80 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wider">Advanced</div>
                            <Image src={generatedImages.advanced} alt="Advanced" fill className="object-contain" />
                            {!generatedImages.isUnlocked && (
                                <div className="absolute inset-0 z-10 pointer-events-none bg-black/20 overflow-hidden flex flex-col justify-center items-center gap-4">
                                    <div className="relative w-48 h-12 opacity-50">
                                        <Image src="/bomee-logo.png" alt="Bomee" fill className="object-contain" />
                                    </div>
                                    <span className="text-white text-2xl font-bold opacity-50 uppercase tracking-widest">CrystalReveal</span>
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
                            <span>CrystalReveal AI</span>
                        </div>

                        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 leading-tight">
                            The "Perfect Shot" <br />
                            You Missed <br />
                            Recreated in 8K.
                        </h1>

                        <p className="text-sm text-gray-600 leading-relaxed">
                            Transform your blurry ultrasound into a crystal-clear masterpiece. Our AI simulates the clarity of high-end studio equipment, recreating your baby’s face as if it were captured on the luckiest day possible.
                            <br /><br />
                            <strong className="text-xl font-extrabold text-purple-700">Limited Time Launch Special: $9.99</strong>
                        </p>

                        <div className="flex items-center gap-2 text-sm text-red-500 font-semibold bg-red-50 border border-red-100 py-2 px-4 rounded-lg w-fit animate-pulse">
                            <Timer className="w-4 h-4" />
                            <span>Ends in: {timeLeftToPromo} (PST)</span>
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                <span>Free to Generate</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                <span>Pay only to Download</span>
                            </div>
                        </div>
                    </div>

                    {/* Interactive Demo Area - 3 Column Layout */}
                    <div className="lg:col-span-9 bg-white rounded-3xl p-4 md:p-6 shadow-2xl shadow-purple-900/10 border border-purple-50">
                        <div className="grid md:grid-cols-3 gap-6 min-h-[500px]">

                            {/* 1. Input Column */}
                            <div className="flex flex-col gap-4">
                                <div className="text-sm font-bold text-gray-500 uppercase tracking-wider text-center">Original Scan</div>
                                <div
                                    className={cn(
                                        "flex-1 relative group border-2 border-dashed rounded-2xl p-4 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden min-h-[300px]",
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
                                                <p className="text-white font-medium text-sm">Change Image</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 relative z-10">
                                            <div className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center mx-auto text-purple-600"><Upload className="w-6 h-6" /></div>
                                            <p className="text-sm font-semibold text-gray-900 bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full">Upload Scan</p>
                                        </div>
                                    )}
                                </div>
                                <label className="flex items-start gap-2 cursor-pointer group px-1">
                                    <input type="checkbox" checked={tosAgreed} onChange={(e) => setTosAgreed(e.target.checked)} className="mt-1 peer h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600" />
                                    <span className="text-[10px] text-gray-500 leading-tight">
                                        I agree this is for entertainment only and accept the <a href="/terms" className="underline hover:text-purple-600" target="_blank">Terms & Privacy</a>.
                                    </span>
                                </label>
                                <p className="text-[10px] text-gray-400 ml-7 mt-0.5">Inputs help improve AI accuracy.</p>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || !file || !tosAgreed}
                                    className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>{timeLeft > 0 ? `Generating... ${timeLeft}s` : "Finalizing..."}</span>
                                        </>
                                    ) : generatedImages ? (
                                        <> <RefreshCcw className="w-4 h-4" /> <span>Regenerate (FREE)</span> </>
                                    ) : (
                                        <> <span>Generate</span> <Sparkles className="w-4 h-4 text-purple-300" /> </>
                                    )}
                                </button>
                            </div>

                            {/* 2. Basic Result */}
                            <div className="flex flex-col gap-4">
                                <div className="text-sm font-bold text-gray-500 tracking-wider text-center">CrystalReveal™ Basic</div>
                                <div className="flex-1 bg-white rounded-2xl border border-gray-100 relative overflow-hidden min-h-[300px]">
                                    {generatedImages ? (
                                        <div className="relative w-full h-full bg-black group">
                                            <Image src={generatedImages.basic} alt="Basic" fill className="object-contain" />
                                            {!generatedImages.isUnlocked && (
                                                <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                                                    {/* Diagonal repeating watermark pattern */}
                                                    <div className="absolute inset-0" style={{
                                                        backgroundImage: `repeating-linear-gradient(
                                                            45deg,
                                                            transparent,
                                                            transparent 150px,
                                                            rgba(255,255,255,0.03) 150px,
                                                            rgba(255,255,255,0.03) 151px
                                                        )`,
                                                    }}>
                                                        {[...Array(20)].map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className="absolute text-white/20 font-bold text-xl uppercase tracking-widest whitespace-nowrap"
                                                                style={{
                                                                    transform: `rotate(-45deg) translate(${(i % 4) * 250}px, ${Math.floor(i / 4) * 200 - 200}px)`,
                                                                    left: '-10%',
                                                                    top: `${(i % 4) * 25}%`,
                                                                }}
                                                            >
                                                                CrystalReveal
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Hover Download Button (Only if Unlocked) */}
                                            {generatedImages.isUnlocked && (
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
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
                                                        className="p-4 bg-white rounded-full text-gray-900 hover:bg-gray-100 transition-colors shadow-lg"
                                                    >
                                                        <Download className="w-6 h-6" />
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
                                                    <p className="text-sm text-gray-600 font-medium">Standard Clarity<br /><span className="text-xs text-gray-500">Result will appear here</span></p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-500 leading-tight px-1 min-h-[2.5rem]">
                                    Basic Filter preserves the original ultrasound integrity while removing obstructions.
                                </p>
                                {generatedImages && (
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-xs font-medium text-gray-600">How do you like this result?</span>
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
                                <div className="text-sm font-bold text-gray-500 tracking-wider text-center">CrystalReveal™ Advanced</div>
                                <div className="flex-1 bg-white rounded-2xl border border-gray-100 relative overflow-hidden min-h-[300px]">
                                    {generatedImages ? (
                                        <div className="relative w-full h-full bg-black group">
                                            <Image src={generatedImages.advanced} alt="Advanced" fill className="object-contain" />
                                            {!generatedImages.isUnlocked && (
                                                <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                                                    {/* Diagonal repeating watermark pattern */}
                                                    <div className="absolute inset-0" style={{
                                                        backgroundImage: `repeating-linear-gradient(
                                                            45deg,
                                                            transparent,
                                                            transparent 150px,
                                                            rgba(255,255,255,0.03) 150px,
                                                            rgba(255,255,255,0.03) 151px
                                                        )`,
                                                    }}>
                                                        {[...Array(20)].map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className="absolute text-white/20 font-bold text-xl uppercase tracking-widest whitespace-nowrap"
                                                                style={{
                                                                    transform: `rotate(-45deg) translate(${(i % 4) * 250}px, ${Math.floor(i / 4) * 200 - 200}px)`,
                                                                    left: '-10%',
                                                                    top: `${(i % 4) * 25}%`,
                                                                }}
                                                            >
                                                                CrystalReveal
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Hover Download Button (Only if Unlocked) */}
                                            {generatedImages.isUnlocked && (
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
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
                                                        className="p-4 bg-white rounded-full text-gray-900 hover:bg-gray-100 transition-colors shadow-lg"
                                                    >
                                                        <Download className="w-6 h-6" />
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
                                                    <p className="text-sm text-gray-600 font-medium">High-Fidelity AI<br /><span className="text-xs text-gray-500">Result will appear here</span></p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-500 leading-tight px-1 min-h-[2.5rem]">
                                    Advanced Filter actively reconstructs realistic skin texture and facial features.
                                </p>
                                {generatedImages && (
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-xs font-medium text-gray-600">How do you like this result?</span>
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
                                    <button
                                        onClick={handleDownloadAll}
                                        className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium shadow-lg flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Download className="w-5 h-5" /> <span>Download All</span>
                                    </button>
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
                                        <span className="text-sm">Compare</span>
                                    </button>
                                    <button
                                        onClick={handleUnlock}
                                        disabled={loading}
                                        className="flex-[1.5] py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md shadow-purple-200 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Lock className="w-5 h-5" />
                                        <span>Unlock Result (1 Credit)</span>
                                    </button>
                                </div>

                                {/* Credit Used Notification */}
                                {creditUsedNotification && (
                                    <div className="mt-3 text-center bg-green-50 text-green-700 text-sm py-2 px-4 rounded-lg border border-green-200 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1">
                                        <span className="font-semibold">✓ 1 Credit Used</span>
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
                                                Go to Pricing
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
                                        <span className="text-sm">Compare</span>
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const url = generatedImages.advanced;
                                            const filename = 'bomee-crystalreveal-advanced.png';
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
                                            }
                                        }}
                                        className="flex-[1.5] py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold shadow-md shadow-green-200 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
                                    >
                                        <Download className="w-5 h-5" />
                                        <span>Download</span>
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
                            <span>Why Adopt CrystalReveal</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                            Upgrade Your Output, <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Not Your Machine.</span>
                        </h2>
                        <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                            Don't spend $100k on new equipment. As an official partner, you gain exclusive access to CrystalReveal™ AI at special partner rates, instantly transforming your standard ultrasound results into 8K masterpieces.
                        </p>

                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                    <span className="text-2xl">💎</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-lg">Premium Equipment Clarity</h4>
                                    <p className="text-gray-400 text-sm">Deliver crystal-clear images that rival the latest high-end systems.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                    <span className="text-2xl">📉</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-lg">Slash Rescan Rates</h4>
                                    <p className="text-gray-400 text-sm">Save blurry or obstructed shots instantly. Reduce free "rescan" appointments.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="relative h-[400px] md:h-[500px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                        <Image src="/bomee_studio_session.png" alt="Clear Difference" fill className="object-cover opacity-80" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-8">
                            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 w-full">
                                <p className="text-white font-medium">"My clients are amazed. It looks like I bought a $100k machine."</p>
                                <p className="text-purple-300 text-sm mt-2">- Sarah J., Studio Owner</p>
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
                            Limited Time Launch Special
                        </div>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900">Purchase Credits</h2>
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

                                <button
                                    onClick={() => handleBuyCredits(pkg.credits, pkg.name)}
                                    disabled={loading}
                                    className={`w-full py-3 rounded-xl font-bold text-sm text-center transition-all ${pkg.popular ? "bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200" : "bg-gray-900 hover:bg-gray-800 text-white"} disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {loading ? "Processing..." : `Buy ${pkg.credits} Credits`}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="text-center text-sm text-gray-400">
                        <p>Credits are valid for up to 1 year from the date of purchase.</p>
                    </div>
                </div>
            </section>

            {/* Live Generations (Gallery) */}
            {gallery.length > 0 && (
                <section className="py-20 bg-gray-50 border-y border-gray-200">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Any Device. Every Detail. Perfectly Restored.</h2>
                            <p className="text-gray-500 max-w-2xl mx-auto text-sm">
                                See the proof. We transform low-quality, obstructed scans from all ultrasound manufacturers into crystal-clear moments.
                            </p>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {gallery.map((item: any, idx) => (
                                <div
                                    key={idx}
                                    className="bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow"
                                    onError={(e) => {
                                        // Hide element if image fails
                                        e.currentTarget.style.display = 'none';
                                    }}
                                >
                                    <div className="grid grid-cols-3 gap-1 h-32">
                                        <div className="relative rounded overflow-hidden bg-gray-100">
                                            <Image
                                                src={item.original || item.before}
                                                alt="Orig"
                                                fill
                                                className="object-cover"
                                                onError={(e) => {
                                                    // Hide the entire card if any image fails
                                                    const card = e.currentTarget.closest('.bg-white') as HTMLElement;
                                                    if (card) card.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                        <div className="relative rounded overflow-hidden bg-gray-100">
                                            <Image
                                                src={item.basic || item.before}
                                                alt="Basic"
                                                fill
                                                className="object-cover"
                                                onError={(e) => {
                                                    const card = e.currentTarget.closest('.bg-white') as HTMLElement;
                                                    if (card) card.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                        <div className="relative rounded overflow-hidden bg-purple-50">
                                            <Image
                                                src={item.advanced || item.after}
                                                alt="Adv"
                                                fill
                                                className="object-cover"
                                                onError={(e) => {
                                                    const card = e.currentTarget.closest('.bg-white') as HTMLElement;
                                                    if (card) card.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-gray-400 mt-2 px-1">
                                        <span>Original</span>
                                        <span>Basic</span>
                                        <span>Advanced</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Revenue / Upgrade Section (Moved from Owner Section) */}
            <section className="bg-gradient-to-br from-gray-900 to-black py-24 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[100px]" />
                </div>

                <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-900/50 border border-purple-800 text-xs font-semibold text-purple-300 mb-6">
                            <Sparkles className="w-4 h-4" />
                            <span>Why Adopt Bomee Core</span>
                        </div>
                        <h2 className="text-4xl font-extrabold mb-6">Elevate Your Ultrasound Business with Bomee Core</h2>
                        <p className="text-xl text-gray-300 mb-8 max-w-lg">
                            An essential companion to CrystalReveal.
                            <br /><br />
                            Already trusted by hundreds of top-tier US studios and clinics, Bomee Core is the engine that powers your digital workflow and client loyalty.
                        </p>
                        <div className="space-y-4 mb-8">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-xl bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                                    <Zap className="w-6 h-6 text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Effortless Digital Delivery</h3>
                                    <p className="text-gray-400 text-sm">Replace outdated USBs with instant cloud syncing. Compatible with all major hardware (GE, Samsung, Mindray).</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                                    <Crown className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Exclusive Premium Access</h3>
                                    <p className="text-gray-400 text-sm">Offer your clients a high-end alternative to paid apps like Flo. Your partnership grants them free access to our premium maternity suite, AI-driven health insights, and community features.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-xl bg-green-900/50 flex items-center justify-center flex-shrink-0">
                                    <UserIcon className="w-6 h-6 text-green-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">The Ultimate Retention Engine</h3>
                                    <p className="text-gray-400 text-sm">Our smart notifications act as your personal marketing team, reminding clients to book their next Gender Reveal or 4D appointment directly through your portal.</p>
                                </div>
                            </div>
                        </div>

                        <Link
                            href="https://www.bomee.io/?lb=contact"
                            target="_blank"
                            className="inline-flex items-center gap-2 bg-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-900/20"
                        >
                            <span>Book a Free Consultation</span>
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
