
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const userId = params.id;

        // 1. Fetch User
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // 2. Fetch Gallery
        const images = await prisma.imageGeneration.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" }
        });

        // 3. Fetch Transactions
        const transactions = await prisma.creditTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" }
        });

        // Safe User
        const { password, ...safeUser } = user;

        return NextResponse.json({
            user: safeUser,
            images,
            transactions
        });

    } catch (error) {
        console.error("Error fetching user details:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
