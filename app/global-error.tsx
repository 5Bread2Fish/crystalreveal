"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <html>
            <body>
                <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 font-sans text-center">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong!</h2>
                        <p className="text-gray-500 mb-8">
                            A critical error occurred. Please try refreshing the page.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => reset()}
                                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all"
                            >
                                Try again
                            </button>
                            <button onClick={() => window.location.reload()} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all">
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
