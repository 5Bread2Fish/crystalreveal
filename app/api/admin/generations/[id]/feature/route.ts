
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> } // Correct type for Next.js 15+ dynamic routes
) {
    try {
        const { id } = await context.params;
        const { isFeatured } = await req.json();

        const updated = await prisma.imageGeneration.update({
            where: { id },
            data: { isFeatured }
        });

        return NextResponse.json({ success: true, isFeatured: updated.isFeatured });
    } catch (error) {
        console.error("Failed to toggle feature:", error);
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
}
