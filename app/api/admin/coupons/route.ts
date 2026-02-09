
import { NextResponse } from 'next/server';
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    typescript: true,
});

// GET: List Coupons
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    // Add admin check if needed, but for now assuming admin page protects UI or shared password flow

    try {
        const coupons = await stripe.coupons.list({ limit: 100 });

        // Also fetch promotion codes for display if needed, but coupons are the base
        // For simple UI, we return coupon list including metadata

        return NextResponse.json({ coupons: coupons.data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST: Create Coupon
export async function POST(req: Request) {
    try {
        const body = await body_json(req);
        const { name, percent_off, amount_off, duration, max_redemptions, code } = body;

        // 1. Create Coupon
        const couponParams: Stripe.CouponCreateParams = {
            name: name,
            duration: duration, // 'once', 'repeating', 'forever'
        };

        if (percent_off) couponParams.percent_off = parseFloat(percent_off);
        if (amount_off) {
            couponParams.amount_off = parseInt(amount_off) * 100; // cents
            couponParams.currency = 'usd';
        }
        if (max_redemptions) couponParams.max_redemptions = parseInt(max_redemptions);

        const coupon = await stripe.coupons.create(couponParams);

        // 2. Create Promotion Code (Customer facing code)
        // If 'code' is provided, we create a promotion code linked to this coupon
        let promotionCode;
        if (code) {
            // as any를 붙여서 "타입 검사 하지 마"라고 알려줍니다.
            promotionCode = await stripe.promotionCodes.create({
                coupon: coupon.id,
                code: code,
            } as any);
        }

        return NextResponse.json({ coupon, promotionCode });

    } catch (e: any) {
        console.error("Create Coupon Error", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

async function body_json(req: Request) {
    try {
        return await req.json();
    } catch (e) {
        return {};
    }
}
