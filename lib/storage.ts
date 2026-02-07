import { list, put, del } from '@vercel/blob';

const DB_PATH = 'database/db.json';

export interface RecordData {
    id: string;
    timestamp: string;
    ip: string;
    country: string;
    originalUrl: string;
    basicUrl: string;
    advancedUrl: string;
    ratings: { basic: number; advanced: number };
    isPaid: boolean;
    downloaded: boolean;
    hidden: boolean;
}

export async function getDatabase(): Promise<RecordData[]> {
    try {
        const { blobs } = await list({ prefix: DB_PATH, limit: 1 });
        if (blobs.length > 0) {
            const res = await fetch(blobs[0].url, { cache: 'no-store' }); // Ensure fresh data
            if (res.ok) {
                return await res.json();
            }
        }
    } catch (e) {
        console.error("Failed to fetch DB:", e);
    }
    return [];
}

export async function saveDatabase(data: RecordData[]) {
    await put(DB_PATH, JSON.stringify(data, null, 2), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false, // Overwrite
        token: process.env.BLOB_READ_WRITE_TOKEN,
        // @ts-ignore
        allowOverwrite: true
    });
}

export async function addRecord(record: RecordData) {
    const db = await getDatabase();
    // Prepend new record
    const newDb = [record, ...db];
    await saveDatabase(newDb);
    return newDb;
}

export async function updateRecord(id: string, updates: Partial<RecordData>) {
    const db = await getDatabase();
    const index = db.findIndex(r => r.id === id);
    if (index !== -1) {
        db[index] = { ...db[index], ...updates };
        await saveDatabase(db);
        return true;
    }
    return false;
}

export async function deleteRecord(id: string) {
    const db = await getDatabase();
    const record = db.find(r => r.id === id);
    if (!record) return false;

    // Delete associated blobs first to clean up
    const blobsToDelete = [record.originalUrl, record.basicUrl, record.advancedUrl].filter(Boolean);
    if (blobsToDelete.length > 0) {
        try {
            await del(blobsToDelete);
        } catch (e) {
            console.error("Failed to delete blobs:", e);
        }
    }

    const newDb = db.filter(r => r.id !== id);
    await saveDatabase(newDb);
    return true;
}
