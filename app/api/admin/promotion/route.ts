import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// Get promotion status
export async function GET() {
    try {
        // Get or create promotion settings
        let settings = await prisma.promotionSettings.findFirst();

        if (!settings) {
            settings = await prisma.promotionSettings.create({
                data: {
                    freeUnlockMode: false
                }
            });
        }

        return NextResponse.json({ freeUnlockMode: settings.freeUnlockMode });
    } catch (error) {
        console.error("Get promotion error:", error);
        return NextResponse.json({ error: "Failed to get promotion status" }, { status: 500 });
    }
}

// Toggle promotion mode
export async function POST(req: Request) {
    try {
        const { freeUnlockMode, adminId } = await req.json();

        // Get or create settings
        let settings = await prisma.promotionSettings.findFirst();

        if (!settings) {
            settings = await prisma.promotionSettings.create({
                data: {
                    freeUnlockMode,
                    updatedBy: adminId || "admin"
                }
            });
        } else {
            settings = await prisma.promotionSettings.update({
                where: { id: settings.id },
                data: {
                    freeUnlockMode,
                    updatedBy: adminId || "admin"
                }
            });
        }

        console.log(`🎁 Free Promotion Mode ${freeUnlockMode ? 'ENABLED' : 'DISABLED'} by ${adminId || 'admin'}`);

        return NextResponse.json({ success: true, freeUnlockMode: settings.freeUnlockMode });
    } catch (error) {
        console.error("Toggle promotion error:", error);
        return NextResponse.json({ error: "Failed to toggle promotion" }, { status: 500 });
    }
}
