"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Send, CheckCircle2, AlertCircle } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function HelpPage() {
    const { data: session } = useSession();

    // Contact Form State
    const [contactForm, setContactForm] = useState({ subject: "", message: "", email: "" });
    const [contactStatus, setContactStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

    useEffect(() => {
        if (session?.user?.email) {
            setContactForm(prev => ({ ...prev, email: session.user.email || "" }));
        }
    }, [session]);

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setContactStatus("sending");
        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(contactForm)
            });
            if (res.ok) {
                setContactStatus("success");
                setContactForm(prev => ({ ...prev, subject: "", message: "" }));
            } else {
                setContactStatus("error");
            }
        } catch (e) {
            setContactStatus("error");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-purple-100 selection:text-purple-900">
            {/* Simple Navbar */}
            <nav className="w-full bg-white/80 backdrop-blur-md border-b border-purple-100">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/">
                        <div className="relative h-8 w-32">
                            <Image src="/bomee-logo.png" alt="Bomee" fill className="object-contain object-left" />
                        </div>
                    </Link>
                    <Link href="/" className="text-sm font-medium text-gray-600 hover:text-purple-600 flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </Link>
                </div>
            </nav>

            <div className="flex-1 flex flex-col items-center justify-center p-6">
                <div className="max-w-2xl w-full bg-white rounded-3xl p-8 border border-gray-200 shadow-xl">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">Need Help?</h1>
                        <p className="text-gray-500 text-sm mt-2">Send us a message and we'll get back to you shortly.</p>
                    </div>

                    {contactStatus === "success" ? (
                        <div className="bg-green-50 border border-green-100 rounded-2xl p-8 text-center animate-in fade-in zoom-in">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Message Sent!</h3>
                            <p className="text-gray-500 text-sm mt-2">Thanks for reaching out. Our support team has received your message.</p>
                            <button onClick={() => setContactStatus("idle")} className="mt-6 text-purple-600 text-sm font-medium hover:underline">Send another message</button>
                        </div>
                    ) : (
                        <form onSubmit={handleContactSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Your Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                    placeholder="your@email.com"
                                    value={contactForm.email}
                                    onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                    placeholder="e.g. Billing Issue"
                                    value={contactForm.subject}
                                    onChange={e => setContactForm({ ...contactForm, subject: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                <textarea
                                    required
                                    rows={5}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none"
                                    placeholder="How can we help you?"
                                    value={contactForm.message}
                                    onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                                />
                            </div>

                            {contactStatus === "error" && (
                                <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>Failed to send message. Please try again.</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={contactStatus === "sending"}
                                className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                                {contactStatus === "sending" ? "Sending..." : <> <Send className="w-4 h-4" /> Send Message </>}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
