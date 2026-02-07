import { NextResponse } from 'next/server';
import { updateRecord, deleteRecord } from '@/lib/storage';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, action } = body;

        console.log(`[AdminAction] Request: ${action} on ID: ${id}`);

        if (!id || !action) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        if (action === "hide" || action === "unhide") {
            const success = await updateRecord(id, { hidden: (action === "hide") });
            if (!success) return NextResponse.json({ error: "Record not found" }, { status: 404 });
            return NextResponse.json({ success: true, mode: action });
        }

        if (action === "delete") {
            const success = await deleteRecord(id);
            if (!success) return NextResponse.json({ error: "Record not found" }, { status: 404 });
            return NextResponse.json({ success: true, mode: "deleted" });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (e: any) {
        console.error("[AdminAction] Error:", e);
        return NextResponse.json({ error: e.message || "Internal Error" }, { status: 500 });
    }
}
