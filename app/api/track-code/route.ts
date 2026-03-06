import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function GET(req: NextRequest) {
    try {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) {
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 500 }
            );
        }

        const stripe = new Stripe(stripeKey, { typescript: true });

        const code = req.nextUrl.searchParams.get("code");
        if (!code || code.trim() === "") {
            return NextResponse.json(
                { error: "Promo code is required." },
                { status: 400 }
            );
        }

        // Look up the promotion code in Stripe
        const promotionCodes = await stripe.promotionCodes.list({
            code: code.toUpperCase(),
            limit: 1,
        });

        if (promotionCodes.data.length === 0) {
            return NextResponse.json(
                { error: "Invalid promo code. Please check and try again." },
                { status: 404 }
            );
        }

        const promoCode = promotionCodes.data[0];
        const timesRedeemed = promoCode.times_redeemed || 0;

        // Commission: $5 per sale after the first 10 sales
        const eligibleSales = Math.max(0, timesRedeemed - 10);
        const earnings = eligibleSales * 5;

        return NextResponse.json({
            code: promoCode.code,
            timesRedeemed,
            eligibleSales,
            earnings,
            active: promoCode.active,
        });
    } catch (err: any) {
        console.error("Track Code API Error:", err);
        return NextResponse.json(
            { error: err.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
