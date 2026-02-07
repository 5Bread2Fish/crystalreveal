
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const images = await prisma.imageGeneration.findMany({
            where: {
                userId: session.user.id
            },
            orderBy: {
                createdAt: "desc"
            },
            select: {
                id: true,
                originalUrl: true,
                basicUrl: true,
                advancedUrl: true,
                isUnlocked: true,
                createdAt: true
            }
        });

        return NextResponse.json({ images });
    } catch (error) {
        console.error("Error fetching user gallery:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
