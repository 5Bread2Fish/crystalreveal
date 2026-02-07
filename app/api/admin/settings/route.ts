import { list, put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const { blobs } = await list({ prefix: 'config/settings.json', limit: 1 });
        if (blobs.length > 0) {
            const res = await fetch(blobs[0].url);
            const data = await res.json();
            return NextResponse.json(data);
        }
        return NextResponse.json({ autoPublish: true }); // Default
    } catch (e) {
        return NextResponse.json({ autoPublish: true });
    }
}

export async function POST(req: Request) {
    try {
        const data = await req.json();
        console.log("[AdminSettings] Saving settings:", data);

        // Validate
        if (typeof data.autoPublish !== 'boolean') {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        // Check Token
        const token = process.env.BLOB_READ_WRITE_TOKEN;
        if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is not configured");

        // Overwrite
        // CRITICAL FIX: allowOverwrite: true is required to update existing blobs
        await put('config/settings.json', JSON.stringify(data), {
            access: 'public',
            contentType: 'application/json',
            addRandomSuffix: false,
            token: token,
            // @ts-ignore
            allowOverwrite: true
        });

        return NextResponse.json({ success: true, saved: data });
    } catch (e: any) {
        console.error("[AdminSettings] Save Error:", e);
        return NextResponse.json({ error: "Failed to save settings: " + e.message }, { status: 500 });
    }
}
