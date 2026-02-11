import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { guestSessionId } = await req.json();

        if (!guestSessionId) {
            return NextResponse.json({ error: "Guest session ID required" }, { status: 400 });
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Find all images with matching sessionId and null userId
        const guestImages = await prisma.imageGeneration.findMany({
            where: {
                sessionId: guestSessionId,
                userId: null
            }
        });

        if (guestImages.length === 0) {
            return NextResponse.json({ success: true, migratedCount: 0 });
        }

        // Update all guest images to belong to this user
        const result = await prisma.imageGeneration.updateMany({
            where: {
                sessionId: guestSessionId,
                userId: null
            },
            data: {
                userId: user.id,
                sessionId: null // Clear sessionId since it's now associated with a user
            }
        });

        console.log(`Migrated ${result.count} images from guest session ${guestSessionId} to user ${user.id}`);

        return NextResponse.json({
            success: true,
            migratedCount: result.count
        });

    } catch (error) {
        console.error("Error migrating images:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
