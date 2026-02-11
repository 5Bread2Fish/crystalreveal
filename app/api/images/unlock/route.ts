import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    console.log("=== UNLOCK API DEBUG ===");
    console.log("Session:", session);
    console.log("User email:", session?.user?.email);

    if (!session || !session.user?.email) {
        console.log("ERROR: No session or email");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { imageId } = await req.json();

        if (!imageId) {
            return NextResponse.json({ error: "Image ID is required" }, { status: 400 });
        }

        console.log("Looking up user with email:", session.user.email);

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        console.log("User found:", user ? `ID: ${user.id}, Credits: ${user.credits}` : "NOT FOUND");

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Start transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Check User Credits
            if (user.credits < 1) {
                throw new Error("Insufficient credits");
            }

            // 2. Find Image
            let image = await tx.imageGeneration.findUnique({
                where: { id: imageId },
            });

            if (!image) {
                throw new Error("Image not found");
            }

            // 3. CLAIM GUEST IMAGE: If image has no userId, claim it for this user
            if (!image.userId) {
                console.log(`Claiming guest image ${imageId} for user ${user.id}`);
                image = await tx.imageGeneration.update({
                    where: { id: imageId },
                    data: { userId: user.id, sessionId: null }
                });
            }

            // 4. Check Ownership (after potential claim)
            if (image.userId !== user.id) {
                throw new Error("Unauthorized access to image");
            }

            if (image.unlocked) {
                return { success: true, alreadyUnlocked: true, image };
            }

            // 5. Deduct Credit
            await tx.user.update({
                where: { id: user.id },
                data: { credits: { decrement: 1 } },
            });

            // 6. Update Image Status
            const updatedImage = await tx.imageGeneration.update({
                where: { id: imageId },
                data: {
                    unlocked: true,
                    unlockedAt: new Date()
                },
                select: { id: true, unlocked: true, basicUrl: true, advancedUrl: true, originalUrl: true }
            });

            // 7. Log Transaction
            await tx.creditTransaction.create({
                data: {
                    userId: user.id,
                    amountPaid: 0, // Used from balance
                    creditsChange: -1,
                    transactionType: "USE",
                },
            });

            console.log("SUCCESS: Image unlocked, credit deducted");
            return { success: true, image: updatedImage };
        });

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Unlock error:", error);
        if (error.message === "Insufficient credits") {
            return NextResponse.json({ error: "Insufficient credits" }, { status: 402 }); // Payment Required
        }
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

