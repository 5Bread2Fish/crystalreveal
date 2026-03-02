
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const featuredImages = await prisma.imageGeneration.findMany({
            where: {
                isFeatured: true,
                // Ensure we only show valid sets
                originalUrl: { not: null },
                basicUrl: { not: null },
                advancedUrl: { not: null }
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 10 // Limit to reasonable number for carousel
        });

        return NextResponse.json({ images: featuredImages });
    } catch (error) {
        console.error("Failed to fetch featured images:", error);
        return NextResponse.json({ images: [] }, { status: 500 });
    }
}
