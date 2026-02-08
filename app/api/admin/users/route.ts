
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic'; // Ensure dynamic rendering

export async function GET() {
    try {
        const users = await prisma.user.findMany({
            orderBy: {
                createdAt: "desc"
            },
            include: {
                _count: {
                    select: {
                        images: true,
                        transactions: true
                    }
                }
            }
        });

        // Safe user object (omit password)
        const safeUsers = users.map((user: any) => ({
            id: user.id,
            email: user.email,
            userType: user.userType,
            credits: user.credits,
            businessName: user.businessName,
            createdAt: user.createdAt,
            imagesCount: user._count.images,
            transactionsCount: user._count.transactions
        }));

        return NextResponse.json({ users: safeUsers });
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
