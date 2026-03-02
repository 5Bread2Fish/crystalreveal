import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        // Default to last 30 days if not specified
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        // Credits purchased in period
        const creditTransactions = await prisma.creditTransaction.findMany({
            where: {
                transactionType: "PURCHASE",
                createdAt: {
                    gte: start,
                    lte: end
                }
            },
            select: {
                creditsChange: true,
                amountPaid: true
            }
        });
        const creditsPurchased = creditTransactions.reduce((sum, tx) => sum + tx.creditsChange, 0);
        const revenue = creditTransactions.reduce((sum, tx) => sum + Number(tx.amountPaid || 0), 0);

        // Images generated in period
        const imagesGenerated = await prisma.imageGeneration.count({
            where: {
                createdAt: {
                    gte: start,
                    lte: end
                }
            }
        });

        // Images unlocked in period
        const imagesUnlocked = await prisma.imageGeneration.count({
            where: {
                unlocked: true,
                unlockedAt: {
                    gte: start,
                    lte: end
                }
            }
        });

        // Business signups in period
        const businessSignups = await prisma.user.count({
            where: {
                userType: "BUSINESS",
                createdAt: {
                    gte: start,
                    lte: end
                }
            }
        });

        // Individual signups in period
        const individualSignups = await prisma.user.count({
            where: {
                userType: "INDIVIDUAL",
                createdAt: {
                    gte: start,
                    lte: end
                }
            }
        });

        // Total remaining credits across all users
        const users = await prisma.user.findMany({
            select: {
                credits: true
            }
        });
        const totalRemainingCredits = users.reduce((sum, user) => sum + user.credits, 0);

        return NextResponse.json({
            period: {
                start: start.toISOString(),
                end: end.toISOString()
            },
            revenue,
            creditsPurchased,
            imagesGenerated,
            imagesUnlocked,
            businessSignups,
            individualSignups,
            totalRemainingCredits
        });
    } catch (error) {
        console.error("Admin overview error:", error);
        return NextResponse.json({ error: "Failed to fetch overview" }, { status: 500 });
    }
}
