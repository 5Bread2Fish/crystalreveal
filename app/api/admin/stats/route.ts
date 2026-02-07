import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const history = await getDatabase();

        // Calculate Stats
        const stats = {
            total: history.length,
            // Additional stats calc happens on frontend or here. 
            // Let's just return history and let frontend do the heavy lifting for display stats.
        };

        return NextResponse.json({
            stats,
            history
        });

    } catch (e: any) {
        console.error("Stats Error:", e);
        return NextResponse.json({ error: "Internal Error: " + e.message }, { status: 500 });
    }
}
