import { list, put, del } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function GET() {
    const checks = {
        hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
        tokenLength: process.env.BLOB_READ_WRITE_TOKEN?.length || 0,
        canList: false,
        canWrite: false,
        canDelete: false,
        error: null as string | null
    };

    try {
        // 1. List Check
        const { blobs } = await list({ limit: 1 });
        checks.canList = true;

        // 2. Write Check
        const testUrl = 'system/test_connectivity.txt';
        const blob = await put(testUrl, 'Connectivity verified', { access: 'public', addRandomSuffix: false });
        checks.canWrite = true;

        // 3. Delete Check
        await del(blob.url);
        checks.canDelete = true;

        return NextResponse.json({ success: true, checks });
    } catch (e: any) {
        checks.error = e.message;
        return NextResponse.json({ success: false, checks }, { status: 500 });
    }
}
