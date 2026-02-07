
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
        const transactions = await prisma.creditTransaction.findMany({
            where: {
                userId: session.user.id
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return NextResponse.json({ transactions });
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
