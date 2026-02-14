import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

        // Build where clause based on search
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
                case "unlocked":
                    where.unlocked = value === "true";
                    break;
                case "ip":
                    where.ip = {
                        contains: value
                    };
                    break;
                case "country":
                    where.country = {
                        contains: value,
                        mode: "insensitive"
                    };
                    break;
            }
        }

        const [generations, total] = await Promise.all([
            prisma.imageGeneration.findMany({
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
            prisma.imageGeneration.count({ where })
        ]);

        return NextResponse.json({
            generations,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Admin generations error:", error);
        return NextResponse.json({ error: "Failed to fetch generations" }, { status: 500 });
    }
}
