import { list, put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { id, style, rating } = await req.json();

        if (!id || !style || !rating) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        // Fetch DB to get current ratings to merge? No, updateRecord handles partials, 
        // but we need to merge the ratings object.
        // Actually updateRecord does a shallow merge of the RECORD. 
        // So { ratings: ... } would overwrite the whole ratings object if we aren't careful.
        // Let's modify updateRecord or handle it here. 
        // The storage `updateRecord` does `...db[index], ...updates`. 
        // This means `ratings` will be replaced entirely if we pass `{ ratings: ... }`.
        // So we need to fetch first.

        const { getDatabase, updateRecord } = await import('@/lib/storage');
        const db = await getDatabase();
        const existing = db.find(r => r.id === id);

        if (!existing) {
            return NextResponse.json({ error: "Record not found" }, { status: 404 });
        }

        const newRatings = { ...existing.ratings, [style]: rating };
        await updateRecord(id, { ratings: newRatings });

        return NextResponse.json({ success: true, ratings: newRatings });

    } catch (e) {
        console.error("Feedback error:", e);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
