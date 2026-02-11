import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// This API endpoint should be called by a cron job (e.g., Vercel Cron)
// to automatically expire credits after 1 year
export async function GET(req: Request) {
    try {
        // Verify this is a legitimate cron request (optional: add auth header check)
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        console.log(`[Cron] Starting credit expiration check at ${now.toISOString()}`);

        // Find all PURCHASE transactions that have expired but not yet processed
        const expiredTransactions = await prisma.creditTransaction.findMany({
            where: {
                transactionType: 'PURCHASE',
                expiresAt: {
                    lte: now
                },
                isExpired: false
            },
            include: {
                user: true
            }
        });

        console.log(`[Cron] Found ${expiredTransactions.length} expired transactions`);

        let totalCreditsExpired = 0;
        let usersAffected = 0;

        // Process each expired transaction
        for (const transaction of expiredTransactions) {
            // Calculate how many credits from this purchase are still remaining
            // This is a simplified approach - we assume credits are used FIFO
            const user = transaction.user;
            const creditsToExpire = Math.min(transaction.creditsChange, user.credits);

            if (creditsToExpire > 0) {
                // Create negative transaction record for expiration
                await prisma.$transaction([
                    // Create expiration record
                    prisma.creditTransaction.create({
                        data: {
                            userId: user.id,
                            creditsChange: -creditsToExpire,
                            amountPaid: 0,
                            transactionType: 'EXPIRATION',
                            stripeChargeId: `EXPIRATION_${transaction.id}`
                        }
                    }),
                    // Deduct credits from user
                    prisma.user.update({
                        where: { id: user.id },
                        data: {
                            credits: {
                                decrement: creditsToExpire
                            }
                        }
                    }),
                    // Mark original transaction as expired
                    prisma.creditTransaction.update({
                        where: { id: transaction.id },
                        data: { isExpired: true }
                    })
                ]);

                totalCreditsExpired += creditsToExpire;
                usersAffected++;

                console.log(`[Cron] Expired ${creditsToExpire} credits for user ${user.email} (transaction ${transaction.id})`);
            } else {
                // No credits to expire, just mark as expired
                await prisma.creditTransaction.update({
                    where: { id: transaction.id },
                    data: { isExpired: true }
                });
            }
        }

        console.log(`[Cron] Completed: ${totalCreditsExpired} credits expired for ${usersAffected} users`);

        return NextResponse.json({
            success: true,
            creditsExpired: totalCreditsExpired,
            usersAffected,
            transactionsProcessed: expiredTransactions.length
        });

    } catch (error) {
        console.error('[Cron] Error expiring credits:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
