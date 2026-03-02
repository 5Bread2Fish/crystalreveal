import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import Stripe from "stripe";

// Next.js App Router: No bodyParser config needed.
// We read the raw body via req.text() for Stripe signature verification.

export async function POST(req: Request) {
    let body: string;
    try {
        body = await req.text();
    } catch (err) {
        console.error("Failed to read request body:", err);
        return new NextResponse("Bad Request: Could not read body", { status: 400 });
    }

    const signature = headers().get("Stripe-Signature");

    if (!signature) {
        console.error("Missing Stripe-Signature header");
        return new NextResponse("Bad Request: Missing Stripe-Signature", { status: 400 });
    }

    let event: Stripe.Event;

    console.log('--- Webhook Received ---');

    // 1. Stripe Signature Verification
    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
        console.log('Received Event Type:', event.type);
    } catch (error: any) {
        console.error("Webhook signature verification failed.", error.message);
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }

    // 2. Handle the event — Always return 200 to Stripe after signature is verified
    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;

        try {
            await handleCheckoutSessionCompleted(session);
        } catch (error) {
            // Log the error but still return 200 to avoid Stripe retry loops
            console.error("Failed to handle checkout session:", error);
        }
    }

    // 3. Always return 200 after successful signature verification
    return NextResponse.json({ received: true }, { status: 200 });
}

async function handleCheckoutSessionCompleted(stripeSession: Stripe.Checkout.Session) {
    console.log(`Processing webhook for session: ${stripeSession.id}`);

    // 1. Expand line items if needed
    let sessionWithLineItems = stripeSession;
    if (!stripeSession.line_items) {
        sessionWithLineItems = await stripe.checkout.sessions.retrieve(stripeSession.id, {
            expand: ['line_items.data.price.product']
        });
    }

    const { metadata, payment_status, amount_total, amount_subtotal, total_details, id: sessionId } = sessionWithLineItems;

    if (payment_status !== "paid") {
        console.log("Payment not paid, ignoring.");
        return;
    }

    const userId = metadata?.userId;
    const type = metadata?.type;

    if (!userId) {
        console.error("No userId found in Stripe metadata");
        throw new Error("Missing userId in metadata");
    }

    // 2. Calculate Credits
    let credits = 0;
    if (sessionWithLineItems.line_items && sessionWithLineItems.line_items.data.length > 0) {
        const lineItem = sessionWithLineItems.line_items.data[0];
        const price = lineItem.price;

        if (price?.metadata?.credits) {
            credits = parseInt(price.metadata.credits);
        } else if (price?.product && typeof price.product === 'object' && 'metadata' in price.product && price.product.metadata?.credits) {
            credits = parseInt(price.product.metadata.credits);
        } else {
            credits = parseInt(metadata?.credits || "0");
        }
    } else {
        credits = parseInt(metadata?.credits || "0");
    }

    if (type !== "CREDIT_PURCHASE" || credits <= 0) {
        console.log("Ignored non-credit purchase or 0 credits.");
        return;
    }

    // 3. Idempotency Check
    const existingTx = await prisma.creditTransaction.findFirst({
        where: { stripeChargeId: sessionId }
    });

    if (existingTx) {
        console.log(`Transaction already processed: ${sessionId}`);
        return;
    }

    // 4. Update Database
    const amountTotalVal = (amount_total || 0) / 100;
    const amountSubtotalVal = (amount_subtotal || 0) / 100;
    const discountAmount = amountSubtotalVal - amountTotalVal;

    // Extract coupon if any
    const discountDetails = total_details?.breakdown?.discounts || [];
    const couponCode = discountDetails.length > 0 ? (discountDetails[0].discount as any).coupon?.name || "PROMO" : null;

    await prisma.$transaction([
        prisma.creditTransaction.create({
            data: {
                userId: userId,
                amountPaid: amountTotalVal,
                subtotal: amountSubtotalVal,
                discountAmount: discountAmount > 0 ? discountAmount : 0,
                couponCode: couponCode,
                creditsChange: credits,
                transactionType: "PURCHASE",
                stripeChargeId: sessionId,
                expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
            }
        }),
        prisma.user.update({
            where: { id: userId },
            data: {
                credits: { increment: credits },
                creditExpiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
            }
        })
    ]);

    console.log(`Successfully fulfilled ${credits} credits for user ${userId} via webhook.`);

    // 5. Slack Notification — Fire-and-forget, never blocks or throws
    sendSlackNotification(userId, amountTotalVal, credits, couponCode);
}

/**
 * Sends Slack notification as fire-and-forget.
 * Never throws, never blocks the webhook response.
 */
function sendSlackNotification(userId: string, amount: number, credits: number, couponCode: string | null) {
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!slackWebhookUrl) {
        console.warn('Skipping Slack notification: SLACK_WEBHOOK_URL is missing.');
        return;
    }

    // Fire-and-forget: do NOT await — let it run in background
    fetch(slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            text: `💰 *Payment Received*\nUser: ${userId}\nAmount: $${amount}\nCredits: ${credits}\nCoupon: ${couponCode || "None"}`
        }),
        // 5 second timeout via AbortController to prevent hanging
        signal: AbortSignal.timeout(5000),
    })
        .then(res => {
            if (!res.ok) {
                res.text().then(t => console.error('Slack API error:', res.status, t)).catch(() => { });
            } else {
                console.log('Slack notification sent successfully.');
            }
        })
        .catch(err => {
            console.error('Slack notification failed (non-blocking):', err.message || err);
        });
}
