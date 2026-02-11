
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    console.log("=== GALLERY API DEBUG ===");
    console.log("Session:", session);
    console.log("User email:", session?.user?.email);

    if (!session || !session.user?.email) {
        console.log("ERROR: No session or email");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Get user from database using email
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        console.log("User found:", user ? `ID: ${user.id}` : "NOT FOUND");

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Get guest session ID from query params (if user just logged in and hasn't migrated yet)
        const guestSessionId = new URL(req.url).searchParams.get("guestSessionId");

        // Fetch images: both user's images AND any guest session images
        const whereClause: any = {
            OR: [
                { userId: user.id }, // User's images
            ]
        };

        // If guestSessionId provided, also fetch those images
        if (guestSessionId) {
            whereClause.OR.push({ sessionId: guestSessionId, userId: null });
        }

        const images = await prisma.imageGeneration.findMany({
            where: whereClause,
            orderBy: {
                createdAt: "desc"
            },
            select: {
                id: true,
                originalUrl: true,
                basicUrl: true,
                advancedUrl: true,
                unlocked: true,  // Changed from isUnlocked
                unlockedAt: true,
                createdAt: true
            }
        });

        console.log("Images found:", images.length);

        return NextResponse.json({ images });
    } catch (error) {
        console.error("Error fetching user gallery:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
