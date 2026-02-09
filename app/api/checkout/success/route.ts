import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    typescript: true,
});

export async function POST(req: Request) {
    try {
        const { sessionId } = await req.json();
        const session = await getServerSession(authOptions);

        if (!sessionId) {
            return NextResponse.json({ error: "Missing Session ID" }, { status: 400 });
        }

        // 1. Retrieve Stripe Session
        const stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['total_details.breakdown']
        });

        if (!stripeSession) {
            return NextResponse.json({ error: "Invalid Session" }, { status: 404 });
        }

        if (stripeSession.payment_status !== "paid") {
            return NextResponse.json({ error: "Payment not complete" }, { status: 400 });
        }

        // 2. Extract Metadata & Discount Info
        const type = stripeSession.metadata?.type;
        const credits = parseInt(stripeSession.metadata?.credits || "0");
        const userId = stripeSession.metadata?.userId || session?.user?.id;

        const amountTotal = (stripeSession.amount_total || 0) / 100;
        const amountSubtotal = (stripeSession.amount_subtotal || 0) / 100;
        const discountAmount = amountSubtotal - amountTotal;
        const discountDetails = stripeSession.total_details?.breakdown?.discounts || [];
        const couponCode = discountDetails.length > 0 ? (discountDetails[0].discount as any).coupon.name || "PROMO" : null;

        if (type !== "CREDIT_PURCHASE" || credits <= 0 || !userId) {
            return NextResponse.json({ success: true, message: "Ignored non-credit purchase" });
        }

        // 3. Idempotency Check
        const existingTx = await prisma.creditTransaction.findFirst({
            where: { stripeChargeId: stripeSession.id }
        });

        if (existingTx) {
            return NextResponse.json({ success: true, message: "Transaction already processed" });
        }

        // 4. Fulfill Credits
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
                    stripeChargeId: stripeSession.id
                }
            }),
            prisma.user.update({
                where: { id: userId },
                data: { credits: { increment: credits } }
            })
        ]);

        return NextResponse.json({ success: true, newCredits: credits });

    } catch (e) {
        console.error("Success Handler Error:", e);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
