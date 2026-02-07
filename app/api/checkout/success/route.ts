import { list, put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        const { blobs } = await list({ prefix: `history/${id}_metadata.json`, limit: 1 });
        if (blobs.length === 0) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const metaBlob = blobs[0];
        const res = await fetch(metaBlob.url);
        const data = await res.json();

        // Mark as Paid
        data.isPaid = true;

        await put(metaBlob.pathname, JSON.stringify(data, null, 2), { access: 'public', contentType: 'application/json', addRandomSuffix: false });

        return NextResponse.json({ success: true });

    } catch (e) {
        console.error("Mark Paid Error:", e);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
