import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

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
                    where.email = {
                        contains: value,
                        mode: "insensitive"
                    };
                    break;
                case "userType":
                    where.userType = value;
                    break;
                case "businessName":
                    where.businessName = {
                        contains: value,
                        mode: "insensitive"
                    };
                    break;
            }
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    userType: true,
                    businessName: true,
                    credits: true,
                    creditExpiresAt: true,
                    createdAt: true,
                    website: true,
                    ownerName: true,
                    country: true,
                    monthlyScanVolume: true,

                    phoneNumber: true,
                    marketingAgreed: true,
                    status: true
                },
                orderBy: {
                    createdAt: "desc"
                },
                skip,
                take: limit
            }),
            prisma.user.count({ where })
        ]);

        return NextResponse.json({
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Admin users error:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}
