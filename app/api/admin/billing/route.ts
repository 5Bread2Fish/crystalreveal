import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const revalidate = 0;

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";
        const value = searchParams.get("value") || "";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");

        const skip = (page - 1) * limit;


        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        // Build where clause
        let where: any = {};

        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate),
                lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
            };
        }
        if (search && value) {
            switch (search) {
                case "email":
                    where.user = {
                        email: {
                            contains: value,
                            mode: "insensitive"
                        }
                    };
                    break;
                case "userId":
                    where.userId = value;
                    break;
                case "transactionType":
                    where.transactionType = value;
                    break;
            }
        }

        const [transactions, total] = await Promise.all([
            prisma.creditTransaction.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            userType: true
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                },
                skip,
                take: limit
            }),
            prisma.creditTransaction.count({ where })
        ]);

        return NextResponse.json({
            transactions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Admin billing error:", error);
        return NextResponse.json({ error: "Failed to fetch billing" }, { status: 500 });
    }
}
