import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export const dynamic = 'force-dynamic'; // Prevent static caching
export const maxDuration = 60; // Allow long running for complex queries

const TIME_ZONE = 'America/Los_Angeles';

export async function GET(req: NextRequest) {
    // 1. Security Check
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'daily'; // daily, weekly, monthly

    try {
        // 2. Date Calculation (PT)
        const now = new Date();
        const zonedNow = toZonedTime(now, TIME_ZONE);

        let startDate: Date;
        let endDate: Date;
        let titlePeriod = '';

        if (period === 'daily') {
            // Daily: Yesterday (since it runs at start of next day usually, or usually captured for "today" if run at 11:59PM)
            // But if we run at 11:59 PM PT, we want "Today".
            // Let's assume the cron runs at 11:59 PM PT, so we want the current day's data.
            startDate = startOfDay(zonedNow);
            endDate = endOfDay(zonedNow);
            titlePeriod = format(startDate, 'yyyy-MM-dd');
        } else if (period === 'weekly') {
            // Weekly: This Week (Mon-Sun) or Last Week?
            // If run on Sunday 11:59 PM PT, it's "This Week".
            // startOfWeek defaults to Sunday unless configured. Let's use Monday start for business logic usually, 
            // but if cron is Sunday night, standard startOfWeek (Sunday) matches "Current Week".
            // Let's stick to standard ISO week if possible, but date-fns defaults to local week.
            // Let's explicit: Sunday 11:59 PM run -> Start of Week (Sunday) to End of Week (Sunday)
            startDate = startOfWeek(zonedNow, { weekStartsOn: 1 }); // Monday start?
            // User asked for "Every Sunday PT 11:59 PM".
            // If we start week on Monday, Sunday is the last day.
            startDate = startOfWeek(zonedNow, { weekStartsOn: 1 });
            endDate = endOfWeek(zonedNow, { weekStartsOn: 1 });
            titlePeriod = `Weekly (${format(startDate, 'MM/dd')} - ${format(endDate, 'MM/dd')})`;
        } else if (period === 'monthly') {
            // Monthly: This Month
            // If run on Last Day of Month 11:59 PM.
            startDate = startOfMonth(zonedNow);
            endDate = endOfMonth(zonedNow);
            titlePeriod = `Monthly (${format(startDate, 'MMM yyyy')})`;
        } else {
            return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
        }

        // Convert back to UTC for Prisma query
        // "fromZonedTime" takes the wall-clock time in the time zone and gives back UTC Date object
        const utcStartDate = fromZonedTime(startDate, TIME_ZONE);
        const utcEndDate = fromZonedTime(endDate, TIME_ZONE);

        console.log(`[Slack Report] Period: ${period}, PT: ${format(startDate, 'Pp')} - ${format(endDate, 'Pp')}`);
        console.log(`[Slack Report] UTC: ${utcStartDate.toISOString()} - ${utcEndDate.toISOString()}`);

        // 3. Prisma Queries
        const [
            revenueResult,
            creditsPurchasedResult,
            imagesGenerated,
            imagesUnlocked,
            businessSignups,
            individualSignups,
            totalRemainingCreditsResult
        ] = await Promise.all([
            // Total Revenue
            prisma.creditTransaction.aggregate({
                _sum: { amountPaid: true },
                where: {
                    createdAt: { gte: utcStartDate, lte: utcEndDate },
                    transactionType: 'PURCHASE', // Only count purchases
                    amountPaid: { gt: 0 } // Double check
                }
            }),
            // Credits Purchased
            prisma.creditTransaction.aggregate({
                _sum: { creditsChange: true },
                where: {
                    createdAt: { gte: utcStartDate, lte: utcEndDate },
                    transactionType: 'PURCHASE'
                }
            }),
            // Images Generated
            prisma.imageGeneration.count({
                where: { createdAt: { gte: utcStartDate, lte: utcEndDate } }
            }),
            // Images Unlocked
            prisma.imageGeneration.count({
                where: {
                    unlockedAt: { gte: utcStartDate, lte: utcEndDate }, // Use unlockedAt if available, else fallback?
                    // Schema has unlockedAt.
                    unlocked: true
                }
            }),
            // Business Signups
            prisma.user.count({
                where: {
                    createdAt: { gte: utcStartDate, lte: utcEndDate },
                    userType: 'BUSINESS'
                }
            }),
            // Individual Signups
            prisma.user.count({
                where: {
                    createdAt: { gte: utcStartDate, lte: utcEndDate },
                    userType: { not: 'BUSINESS' } // Catch INDIVIDUAL and nulls/others
                }
            }),
            // Total Remaining Credits (Global)
            prisma.user.aggregate({
                _sum: { credits: true },
                where: { status: 'active' } // Optional: only active users?
            })
        ]);

        const revenue = revenueResult._sum.amountPaid || 0;
        const creditsPurchased = creditsPurchasedResult._sum.creditsChange || 0;
        const totalRemainingCredits = totalRemainingCreditsResult._sum.credits || 0;

        // 4. Slack Formatting
        const message = {
            text: `📊 Bomee ${period.charAt(0).toUpperCase() + period.slice(1)} Report (${titlePeriod})`,
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: `📊 Bomee ${period.charAt(0).toUpperCase() + period.slice(1)} Report`,
                        emoji: true
                    }
                },
                {
                    type: "context",
                    elements: [
                        {
                            type: "mrkdwn",
                            text: `📅 *Period:* ${titlePeriod} (PT)\n🕒 *Generated:* ${format(zonedNow, 'MMM dd, HH:mm')} PT`
                        }
                    ]
                },
                {
                    type: "divider"
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `💰 *Total Revenue:*\n$${Number(revenue).toLocaleString()}`
                        },
                        {
                            type: "mrkdwn",
                            text: `💎 *Credits Purchased:*\n${creditsPurchased.toLocaleString()}`
                        }
                    ]
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `🖼️ *Images Generated:*\n${imagesGenerated.toLocaleString()}`
                        },
                        {
                            type: "mrkdwn",
                            text: `🔓 *Images Unlocked:*\n${imagesUnlocked.toLocaleString()}`
                        }
                    ]
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `🏢 *Business Signups:*\n${businessSignups.toLocaleString()}`
                        },
                        {
                            type: "mrkdwn",
                            text: `👤 *Individual Signups:*\n${individualSignups.toLocaleString()}`
                        }
                    ]
                },
                {
                    type: "divider"
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `💳 *Total User Credits (Global):* ${totalRemainingCredits.toLocaleString()}`
                    }
                }
            ]
        };

        // 5. Send to Slack
        const slackWebhookUrl = process.env.SLACK_REPORT_WEBHOOK_URL;
        if (slackWebhookUrl) {
            await fetch(slackWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message)
            });
            return NextResponse.json({ success: true, revenue, period });
        } else {
            console.warn('SLACK_REPORT_WEBHOOK_URL not set');
            return NextResponse.json({ success: false, error: 'Webhook URL missing', data: message });
        }

    } catch (error: any) {
        console.error('Slack Report Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
