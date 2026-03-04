import { NextRequest, NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BASE_PATH } from "@/lib/basepath";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    typescript: true,
});

// Shared function to process credit fulfillment
async function processCreditFulfillment(sessionId: string, userSession: any) {
    // 1. Retrieve Stripe Session with line items
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['total_details.breakdown', 'line_items.data.price.product']
    });

    if (!stripeSession) {
        return { error: "Invalid Session", status: 404 };
    }

    if (stripeSession.payment_status !== "paid") {
        return { error: "Payment not complete", status: 400 };
    }

    // 2. Extract Metadata & Discount Info
    const type = stripeSession.metadata?.type;
    const userId = userSession?.user?.id || stripeSession.metadata?.userId;

    console.log("=== DEBUG INFO ===");
    console.log("User Session:", JSON.stringify(userSession, null, 2));
    console.log("Stripe Metadata userId:", stripeSession.metadata?.userId);
    console.log("Final userId:", userId);
    console.log("==================");

    // Validate userId exists
    if (!userId) {
        console.error("No userId found in session or Stripe metadata");
        return { error: "User not authenticated", status: 401 };
    }

    // Verify user exists in database
    const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true }
    });

    if (!userExists) {
        console.error(`User with ID ${userId} does not exist in database`);
        return { error: "User not found in database", status: 404 };
    }

    console.log(`User verified: ${userExists.email} (${userExists.id})`);

    // 3. Get credits from Price metadata (dynamic allocation)
    let credits = 0;
    if (stripeSession.line_items && stripeSession.line_items.data.length > 0) {
        const lineItem = stripeSession.line_items.data[0];
        const price = lineItem.price;

        // Try to get credits from Price metadata
        if (price?.metadata?.credits) {
            credits = parseInt(price.metadata.credits);
            console.log(`Credits from Price metadata: ${credits}`);
        } else if (price?.product && typeof price.product === 'object' && 'metadata' in price.product && price.product.metadata?.credits) {
            // Fallback: try Product metadata (with type guard)
            credits = parseInt(price.product.metadata.credits);
            console.log(`Credits from Product metadata: ${credits}`);
        } else {
            // Final fallback: use session metadata (legacy)
            credits = parseInt(stripeSession.metadata?.credits || "0");
            console.log(`Credits from Session metadata (fallback): ${credits}`);
        }
    } else {
        // No line items, use session metadata
        credits = parseInt(stripeSession.metadata?.credits || "0");
        console.log(`Credits from Session metadata (no line items): ${credits}`);
    }

    const amountTotal = (stripeSession.amount_total || 0) / 100;
    const amountSubtotal = (stripeSession.amount_subtotal || 0) / 100;
    const discountAmount = amountSubtotal - amountTotal;
    const discountDetails = stripeSession.total_details?.breakdown?.discounts || [];
    const couponCode = discountDetails.length > 0 ? (discountDetails[0].discount as any).coupon.name || "PROMO" : null;

    if (type !== "CREDIT_PURCHASE" || credits <= 0 || !userId) {
        return { success: true, message: "Ignored non-credit purchase", alreadyProcessed: false };
    }

    // 4. Idempotency Check - CRITICAL for preventing duplicate credits
    const existingTx = await prisma.creditTransaction.findFirst({
        where: { stripeChargeId: stripeSession.id }
    });

    if (existingTx) {
        console.log(`Transaction already processed for session: ${sessionId}`);
        return { success: true, message: "Transaction already processed", alreadyProcessed: true, credits };
    }

    // 5. Fulfill Credits
    await prisma.$transaction([
        prisma.creditTransaction.create({
            data: {
                userId: userId,
                amountPaid: amountTotal,
                subtotal: amountSubtotal,
                discountAmount: discountAmount > 0 ? discountAmount : 0,
                couponCode: couponCode,
                creditsChange: credits,
                transactionType: "PURCHASE",
                stripeChargeId: stripeSession.id,
                expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) // 1 year from now
            }
        }),
        prisma.user.update({
            where: { id: userId },
            data: {
                credits: { increment: credits },
                creditExpiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) // 1 Year Validity
            }
        })
    ]);

    console.log(`Successfully processed ${credits} credits for user ${userId}`);
    return { success: true, newCredits: credits, alreadyProcessed: false };
}

// GET handler for redirect from Stripe (local testing without webhooks)
export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const sessionId = searchParams.get('session_id');
        const session = await getServerSession(authOptions);

        if (!sessionId) {
            // Redirect to home with error
            return NextResponse.redirect(new URL(`${BASE_PATH}/?error=missing_session`, req.url));
        }

        console.log(`GET request received for session: ${sessionId}`);

        const result = await processCreditFulfillment(sessionId, session);

        if ('error' in result) {
            // result.error가 없을 경우를 대비해 기본 메시지('Unknown Error')를 넣어줍니다.
            const errorMessage = result.error || 'Unknown Error';
            return NextResponse.redirect(new URL(`${BASE_PATH}/?error=${encodeURIComponent(errorMessage)}`, req.url));
        }

        // Redirect to home with success message
        const credits = result.newCredits || 0;
        const alreadyProcessed = result.alreadyProcessed ? 'true' : 'false';
        return NextResponse.redirect(new URL(`${BASE_PATH}/?success=true&credits=${credits}&processed=${alreadyProcessed}`, req.url));

    } catch (e) {
        console.error("GET Success Handler Error:", e);
        return NextResponse.redirect(new URL(`${BASE_PATH}/?error=internal_error`, req.url));
    }
}

// POST handler for webhook (production use)
export async function POST(req: Request) {
    try {
        const { sessionId } = await req.json();
        const session = await getServerSession(authOptions);

        if (!sessionId) {
            return NextResponse.json({ error: "Missing Session ID" }, { status: 400 });
        }

        console.log(`POST request received for session: ${sessionId}`);

        const result = await processCreditFulfillment(sessionId, session);

        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: result.status || 500 });
        }

        return NextResponse.json(result);

    } catch (e) {
        console.error("POST Success Handler Error:", e);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
