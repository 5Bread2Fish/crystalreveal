import { list, del } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { confirm } = await request.json();

        if (!confirm) {
            return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
        }

        // List all blobs
        const { blobs } = await list({ prefix: "gallery/", limit: 5000 });

        // Filter for "advanced" style images
        // Regex: gallery/{id}_advanced_{type}.png
        const advancedRegex = /gallery\/\d+_advanced_(before|after)\.png/;

        const legacyBlobs = blobs.filter(blob => advancedRegex.test(blob.pathname));

        if (legacyBlobs.length === 0) {
            return NextResponse.json({ success: true, message: "No legacy advanced images found." });
        }

        // Delete them
        await Promise.all(legacyBlobs.map(blob => del(blob.url)));

        // Also try to find associated metadata? 
        // gallery/{id}_metadata.json -> we'd need to parse the JSON to know the style, OR 
        // if we can infer ID from the png, we can check the json.
        // For now, removing the PNGs removes them from the filename-based list/stats.

        return NextResponse.json({
            success: true,
            message: `Deleted ${legacyBlobs.length} legacy advanced images.`,
            deletedCount: legacyBlobs.length
        });

    } catch (error) {
        console.error("Cleanup error:", error);
        return NextResponse.json({ error: "Failed to cleanup images" }, { status: 500 });
    }
}
