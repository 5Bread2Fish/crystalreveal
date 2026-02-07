"use client";

import { useState, useRef, DragEvent, useEffect } from "react";
import Image from "next/image";
import { Upload, Download, Loader2, Sparkles, ExternalLink, ArrowRight, CreditCard, Lock, RefreshCcw, Maximize2, X, Timer, User as UserIcon, LogOut } from "lucide-react";
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


    const handleUnlock = async () => {
        if (!generatedImages?.id) return;

        if (!session) {
            // Guest Flow: Save to LocalStorage and redirect to Signup
            localStorage.setItem("bomee_pending_claim", JSON.stringify({
                id: generatedImages.id,
                basic: generatedImages.basic,
                advanced: generatedImages.advanced,
                original: generatedImages.original
            }));
            router.push("/auth/signup?callbackUrl=/");
            return;
        }

        // User Flow: Check Credits
        const credits = session.user.credits || 0;
        if (credits < 1) {
            if (confirm("You need 1 credit to unlock this result. Go to Pricing?")) {
                router.push("/pricing");
            }
            return;
        }

        if (!confirm(`Unlock this result for 1 Credit? (Balance: ${credits})`)) return;

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
                router.refresh(); // Refresh to update server-side session credits if needed, though we track optimistically

                // Hack to update session client side? NextAuth automatically updates on focus/activity usually.
                // We can force a reload or just let it be.
            } else {
                if (res.status === 402) {
                    if (confirm("Insufficient credits. Go to Pricing?")) router.push("/pricing");
                } else {
                    alert(data.error || "Failed to unlock");
                }
            }
        } catch (e) {
            console.error("Unlock failed", e);
            alert("Error unlocking image");
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
            await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: generatedImages.id,
                    style,
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
                                <div className="absolute inset-0 z-10 pointer-events-none bg-black/10 overflow-hidden flex flex-col justify-center gap-24 -rotate-12 scale-150 backdrop-blur-sm">
                                    {Array.from({ length: 5 }).map((_, row) => (
                                        <div key={row} className="flex justify-center gap-12 items-center bg-transparent whitespace-nowrap opacity-30 font-bold text-white text-xl uppercase tracking-widest select-none" style={{ transform: row % 2 === 0 ? 'translateX(40px)' : 'translateX(-40px)' }}>
                                            {Array.from({ length: 5 }).map((_, col) => (
                                                <span key={col}>Preview Only</span>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Advanced */}
                        <div className="relative h-full bg-black/50 group">
                            <div className="absolute top-4 left-4 z-10 bg-purple-500/80 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wider">Advanced</div>
                            <Image src={generatedImages.advanced} alt="Advanced" fill className="object-contain" />
                            {!generatedImages.isUnlocked && (
                                <div className="absolute inset-0 z-10 pointer-events-none bg-black/10 overflow-hidden flex flex-col justify-center gap-24 -rotate-12 scale-150 backdrop-blur-sm">
                                    {Array.from({ length: 5 }).map((_, row) => (
                                        <div key={row} className="flex justify-center gap-12 items-center bg-transparent whitespace-nowrap opacity-30 font-bold text-white text-xl uppercase tracking-widest select-none" style={{ transform: row % 2 === 0 ? 'translateX(40px)' : 'translateX(-40px)' }}>
                                            {Array.from({ length: 5 }).map((_, col) => (
                                                <span key={col}>Preview Only</span>
                                            ))}
                                        </div>
                                    ))}
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
                        {status === "loading" ? (
                            <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                        ) : session ? (
                            <div className="flex items-center gap-4">
                                <Link href="/pricing" className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100 hover:bg-purple-100 transition-colors">
                                    {session.user.credits} Credits
                                </Link>
                                <div className="relative group">
                                    <button className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-purple-600">
                                        <UserIcon className="w-5 h-5" />
                                        <span>{session.user.email?.split('@')[0]}</span>
                                    </button>
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 z-50">
                                        <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Dashboard</Link>
                                        <Link href="/pricing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Buy Credits</Link>
                                        <Link href="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Admin</Link>
                                        <button onClick={() => signOut()} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2">
                                            <LogOut className="w-4 h-4" /> Sign Out
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
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
            <section className="relative pt-32 pb-20 overflow-hidden">
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
                            <strong className="text-xl font-extrabold text-purple-700">Launch Special: $9.99</strong> <span className="text-gray-500 text-sm">(Launch Promo: Use code <strong className="text-purple-600">FREEUPGRADE</strong> for $0 checkout until Feb 15)</span>
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
                                        <div className="relative w-full h-full bg-black">
                                            <Image src={generatedImages.basic} alt="Basic" fill className="object-contain" />
                                            {!generatedImages.isUnlocked && (
                                                <div className="absolute inset-0 z-10 pointer-events-none bg-black/10 overflow-hidden flex flex-col justify-center gap-12 -rotate-12 scale-150 backdrop-blur-sm">
                                                    {Array.from({ length: 10 }).map((_, row) => (
                                                        <div key={row} className="flex justify-center gap-8 items-center bg-transparent whitespace-nowrap opacity-40 font-bold text-white text-xs uppercase tracking-widest select-none" style={{ transform: row % 2 === 0 ? 'translateX(20px)' : 'translateX(-20px)' }}>
                                                            {Array.from({ length: 8 }).map((_, col) => (
                                                                <div key={col} className="flex items-center gap-2">
                                                                    <span>Preview Only</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
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
                                        <div className="relative w-full h-full bg-black">
                                            <Image src={generatedImages.advanced} alt="Advanced" fill className="object-contain" />
                                            {!generatedImages.isUnlocked && (
                                                <div className="absolute inset-0 z-10 pointer-events-none bg-black/10 overflow-hidden flex flex-col justify-center gap-12 -rotate-12 scale-150 backdrop-blur-sm">
                                                    {Array.from({ length: 10 }).map((_, row) => (
                                                        <div key={row} className="flex justify-center gap-8 items-center bg-transparent whitespace-nowrap opacity-40 font-bold text-white text-xs uppercase tracking-widest select-none" style={{ transform: row % 2 === 0 ? 'translateX(20px)' : 'translateX(-20px)' }}>
                                                            {Array.from({ length: 8 }).map((_, col) => (
                                                                <div key={col} className="flex items-center gap-2">
                                                                    <span>Preview Only</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
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
                                        className="flex-[1.5] py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md shadow-purple-200 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
                                    >
                                        <Lock className="w-5 h-5" />
                                        <span>Unlock Result (1 Credit)</span>
                                    </button>
                                </div>
                            </div>
                        )}
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
                                <div key={idx} className="bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="grid grid-cols-3 gap-1 h-32">
                                        <div className="relative rounded overflow-hidden bg-gray-100"><Image src={item.original || item.before} alt="Orig" fill className="object-cover" /></div>
                                        <div className="relative rounded overflow-hidden bg-gray-100"><Image src={item.basic || item.before} alt="Basic" fill className="object-cover" /></div>
                                        <div className="relative rounded overflow-hidden bg-purple-50"><Image src={item.advanced || item.after} alt="Adv" fill className="object-cover" /></div>
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

            {/* Bomee Enterprise Section */}
            <section className="bg-purple-600 py-24 text-white relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[100px]" />
                </div>

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">Are You an Ultrasound Studio Owner?</h2>
                        <p className="text-xl text-purple-100">Elevate your studio with Bomee Partnership.<br />Transform your workflow, delight your clients, and boost your revenue—all in one platform.</p>

                        {/* Manufacturer Marquee */}
                        <div className="mt-8 overflow-hidden relative max-w-4xl mx-auto mask-linear-fade">
                            <div className="flex whitespace-nowrap animate-scroll gap-12 text-purple-200/80 hover:text-white transition-colors">
                                <span className="text-lg font-bold tracking-wider">GE HealthCare</span>
                                <span className="text-lg font-bold tracking-wider">Samsung Medison</span>
                                <span className="text-lg font-bold tracking-wider">Philips</span>
                                <span className="text-lg font-bold tracking-wider">Siemens Healthineers</span>
                                <span className="text-lg font-bold tracking-wider">Canon Medical Systems</span>
                                <span className="text-lg font-bold tracking-wider">Mindray</span>
                                <span className="text-lg font-bold tracking-wider">SonoScape</span>
                                <span className="text-lg font-bold tracking-wider">Chison</span>
                                {/* Duplicate for smooth loop */}
                                <span className="text-lg font-bold tracking-wider">GE HealthCare</span>
                                <span className="text-lg font-bold tracking-wider">Samsung Medison</span>
                                <span className="text-lg font-bold tracking-wider">Philips</span>
                                <span className="text-lg font-bold tracking-wider">Siemens Healthineers</span>
                                <span className="text-lg font-bold tracking-wider">Canon Medical Systems</span>
                                <span className="text-lg font-bold tracking-wider">Mindray</span>
                                <span className="text-lg font-bold tracking-wider">SonoScape</span>
                                <span className="text-lg font-bold tracking-wider">Chison</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Benefit 1 */}
                        <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20 hover:bg-white/20 transition-colors shadow-lg">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-md">
                                <Sparkles className="w-6 h-6 text-purple-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-4 text-white">1. Upgrade Your Output, Not Your Machine</h3>
                            <p className="text-purple-100 text-sm mb-4">
                                Don't spend $100k on new equipment. As an official partner, you gain exclusive access to CrystalReveal™ AI at special partner rates.
                            </p>
                            <ul className="space-y-2 text-sm text-purple-200">
                                <li className="flex gap-2">
                                    <span className="text-white">💎</span>
                                    <span><strong className="text-white">Medical-Grade Clarity:</strong> Deliver 8K, crystal-clear images that rival the latest high-end ultrasound systems.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-white">📉</span>
                                    <span><strong className="text-white">Slash Rescan Rates:</strong> Save blurry or obstructed shots instantly. Drastically reduce free "rescan" appointments.</span>
                                </li>
                            </ul>
                        </div>

                        {/* Benefit 2 */}
                        <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20 hover:bg-white/20 transition-colors shadow-lg">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-md">
                                <Upload className="w-6 h-6 text-blue-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-4 text-white">2. Ditch the USBs & Emails</h3>
                            <p className="text-purple-100 text-sm mb-4">
                                Modernize your client experience with our Seamless Cloud Integration.
                            </p>
                            <ul className="space-y-2 text-sm text-purple-200">
                                <li className="flex gap-2">
                                    <span className="text-blue-200">🔌</span>
                                    <span><strong className="text-white">Universal Compatibility:</strong> Works flawlessly with your existing ultrasound machines (GE, Samsung, Mindray, etc.).</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-white">📱</span>
                                    <span><strong className="text-white">Instant Delivery:</strong> Parents receive their photos via SMS/Email instantly. No more USB drives.</span>
                                </li>
                            </ul>
                        </div>

                        {/* Benefit 3 */}
                        <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20 hover:bg-white/20 transition-colors shadow-lg">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-md">
                                <ArrowRight className="w-6 h-6 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-4 text-white">3. New Revenue Stream</h3>
                            <p className="text-purple-100 text-sm mb-4">
                                Turn your ultrasound service into a premium art experience.
                            </p>
                            <ul className="space-y-2 text-sm text-purple-200">
                                <li className="flex gap-2">
                                    <span className="text-green-300">💰</span>
                                    <span><strong className="text-white">Upsell Opportunity:</strong> Offer "8K AI Enhancement" as a premium add-on to your existing packages.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-white">🚀</span>
                                    <span><strong className="text-white">Zero Overhead:</strong> No new hardware. Pay-per-use model. You keep the margin.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
