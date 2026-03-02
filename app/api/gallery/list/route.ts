import { list } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // List blobs from the history folder
        // We only want metadata files to determine entry existence + hidden status
        // Strict filtering: OLD gallery items are ignored as requested because they don't have 'originalUrl'.
        const { blobs } = await list({ prefix: "history/", limit: 1000 });
        console.log(`[Gallery Debug] Found ${blobs.length} blobs in history/`);


        const metaBlobs = blobs
            .filter(b => b.pathname.endsWith('_metadata.json'))
            .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
            .slice(0, 50);

        // Resolve them in parallel to check hidden status
        const items = await Promise.all(metaBlobs.map(async (blob) => {
            try {
                const res = await fetch(blob.url);
                const data = await res.json();

                // Strict visibility filter
                if (data.hidden) return null;

                // Strict completion filter (Must have original, basic, advanced)
                if (!data.originalUrl || !data.basicUrl || !data.advancedUrl) return null;

                return {
                    original: data.originalUrl,
                    basic: data.basicUrl,
                    advanced: data.advancedUrl,
                    uploadedAt: blob.uploadedAt
                };
            } catch (e) { return null; }
        }));

        const gallery = items.filter(i => i !== null).slice(0, 30);
        console.log(`[Gallery Debug] Returning ${gallery.length} valid gallery items`);


        return NextResponse.json({ gallery: gallery });


    } catch (error) {
        console.error("Gallery list error:", error);
        return NextResponse.json({ gallery: [] });
    }
}
export const dynamic = 'force-dynamic';
