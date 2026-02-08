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
        const { imageId } = await req.json();

        if (!imageId) {
            return NextResponse.json({ error: "Image ID is required" }, { status: 400 });
        }

        // Start transaction
        const result = await prisma.$transaction(async (tx: any) => {
            // 1. Check User Credits
            const user = await tx.user.findUnique({
                where: { id: session.user.id },
            });

            if (!user || user.credits < 1) {
                throw new Error("Insufficient credits");
            }

            // 2. Check Image Ownership and Status
            const image = await tx.imageGeneration.findUnique({
                where: { id: imageId },
            });

            if (!image) {
                throw new Error("Image not found");
            }

            if (image.userId !== user.id) {
                throw new Error("Unauthorized access to image");
            }

            if (image.isUnlocked) {
                return { success: true, alreadyUnlocked: true, image };
            }

            // 3. Deduct Credit
            await tx.user.update({
                where: { id: user.id },
                data: { credits: { decrement: 1 } },
            });

            // 4. Update Image Status
            const updatedImage = await tx.imageGeneration.update({
                where: { id: imageId },
                data: { isUnlocked: true },
                select: { id: true, isUnlocked: true, basicUrl: true, advancedUrl: true, originalUrl: true }
            });

            // 5. Log Transaction
            await tx.creditTransaction.create({
                data: {
                    userId: user.id,
                    amountPaid: 0, // Used from balance
                    creditsChange: -1,
                    transactionType: "USE",
                },
            });

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
