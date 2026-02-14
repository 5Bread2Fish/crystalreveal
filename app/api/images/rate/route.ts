import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { imageId, type, rating } = await req.json();

        if (!imageId || !type || !rating) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (rating < 1 || rating > 5) {
            return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
        }

        // Determine which field to update based on type
        const updateData: any = {};
        if (type === 'basic') {
            updateData.basicRating = rating;
        } else if (type === 'advanced') {
            updateData.advancedRating = rating;
        } else {
            return NextResponse.json({ error: "Invalid rating type" }, { status: 400 });
        }

        // Update the image generation record
        const updatedImage = await prisma.imageGeneration.update({
            where: {
                id: imageId,
                userId: session.user.id // Ensure user owns the image
            },
            data: updateData
        });

        return NextResponse.json({ success: true, image: updatedImage });

    } catch (error) {
        console.error("Rating error:", error);
        return NextResponse.json({ error: "Failed to submit rating" }, { status: 500 });
    }
}
