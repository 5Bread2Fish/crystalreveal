import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // Fetch Data via Prisma
        const [
            totalUsers,
            paidUsersCount,
            totalRevenueResult,
            totalOutstandingCreditsResult,
            recentGenerations
        ] = await prisma.$transaction([
            // 1. Total Users
            prisma.user.count(),

            // 2. Paid Users (Users who have at least one transaction of type 'CHARGE' or 'PURCHASE')
            prisma.user.count({
                where: {
                    transactions: {
                        some: {
                            transactionType: 'CHARGE' // Assuming CHARGE is the type for purchases
                        }
                    }
                }
            }),

            // 3. Total Revenue (Sum of amountPaid)
            prisma.creditTransaction.aggregate({
                _sum: {
                    amountPaid: true
                },
                where: {
                    transactionType: 'CHARGE'
                }
            }),

            // 4. Total Outstanding Credits
            prisma.user.aggregate({
                _sum: {
                    credits: true
                }
            }),

            // 5. Recent Generations (Limit 100 for now)
            prisma.imageGeneration.findMany({
                take: 100,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { email: true, userType: true }
                    }
                }
            })
        ]);

        const totalRevenue = totalRevenueResult._sum.amountPaid || 0;
        const totalOutstandingCredits = totalOutstandingCreditsResult._sum.credits || 0;

        // Map Prisma Generations to "Log" format expected by Admin Frontend
        // Log Interface: id, timestamp, ip, country, originalUrl, basicUrl, advancedUrl, ratings, isPaid, downloaded, hidden
        // Note: isPaid is approximated by "unlocked" status for now, or we can check simple logic. 
        // Admin UI uses "isPaid" to show green badge. In our new system "unlocked" means they paid credits.
        const history = recentGenerations.map(gen => ({
            id: gen.id,
            timestamp: gen.createdAt.toISOString(),
            ip: gen.ip || "N/A",
            country: gen.country || "Unknown",
            originalUrl: gen.originalUrl,
            basicUrl: gen.basicUrl,
            advancedUrl: gen.advancedUrl,
            ratings: { basic: 0, advanced: 0 }, // Not yet implemented in DB
            isPaid: gen.unlocked, // Unlocked = Paid/Used Credits
            downloaded: false, // Not tracked in DB yet
            hidden: false, // Not tracked in DB yet (unless we add 'hidden' field, but user didn't explicitly ask for hiding logic migration yet, just transparency)
            userEmail: gen.user?.email
        }));

        // Calculate Conversion Rate (Paid Users / Total Users)
        const conversionRate = totalUsers > 0 ? ((paidUsersCount / totalUsers) * 100).toFixed(1) : "0.0";

        const stats = {
            total: recentGenerations.length, // Total in view
            totalUsers,
            totalPaid: paidUsersCount,
            totalRevenue: totalRevenue.toString(),
            totalOutstandingCredits,
            conversionRate,
            // Legacy fields to prevent UI crash until fully updated
            historyCount: recentGenerations.length
        };

        return NextResponse.json({
            stats,
            history
        });

    } catch (e: any) {
        console.error("Stats Error:", e);
        return NextResponse.json({ error: "Internal Error: " + e.message }, { status: 500 });
    }
}
