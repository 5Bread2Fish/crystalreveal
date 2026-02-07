import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { imageId, sessionId } = await req.json();

        if (!imageId) {
            return NextResponse.json({ error: "Image ID is required" }, { status: 400 });
        }

        const image = await prisma.imageGeneration.findUnique({
            where: { id: imageId },
        });

        if (!image) {
            return NextResponse.json({ error: "Image not found" }, { status: 404 });
        }

        if (image.userId) {
            // Already claimed
            if (image.userId === session.user.id) {
                return NextResponse.json({ success: true, message: "Already claimed" });
            }
            return NextResponse.json({ error: "Image already claimed by another user" }, { status: 403 });
        }

        // Optional: Verify sessionId if we stored it
        // if (image.sessionId && image.sessionId !== sessionId) ...

        await prisma.imageGeneration.update({
            where: { id: imageId },
            data: { userId: session.user.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Claim error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
