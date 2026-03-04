import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const dynamic = 'force-dynamic';

// 1. Lookup Key Mapping Table (Constant)
const LOOKUP_KEY_MAPPING: Record<string, string> = {
    "1": "credit_payg19",
    "10": "credit_starter",
    "25": "credit_basic",
    "50": "credit_pro"
};

export async function POST(req: NextRequest) {
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            console.error("Stripe key is missing");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }


        const body = await req.json();
        const { credits, planName, userId, lookup_key } = body;

        let targetLookupKey = lookup_key;

        // Fallback or validation if credits are provided but lookup_key is not
        if (!targetLookupKey && credits) {
            const targetCredits = credits?.toString();
            targetLookupKey = LOOKUP_KEY_MAPPING[targetCredits];
        }

        if (!targetLookupKey) {
            console.error(`No lookup key found. Credits: ${credits}, Provided Key: ${lookup_key}`);
            return NextResponse.json({ error: "Invalid Credit Package Selected" }, { status: 400 });
        }

        console.log(`Mapping credits ${credits} -> lookup_key: ${targetLookupKey}`);

        // 3. Retrieve Price ID from Stripe
        const prices = await stripe.prices.list({
            lookup_keys: [targetLookupKey],
            expand: ['data.product']
        });

        if (prices.data.length === 0) {
            console.error(`Stripe Price not found for lookup_key: ${targetLookupKey}`);
            return NextResponse.json({ error: "Price not found in Stripe. Please contact support." }, { status: 400 });
        }

        const priceId = prices.data[0].id;

        // 4. Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: "payment",
            allow_promotion_codes: true,
            success_url: `${req.headers.get("origin")}/crystalreveal/api/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.get("origin")}/crystalreveal/?canceled=true`,
            metadata: {
                userId: userId || "",
                credits: credits?.toString(),
                planName: planName || "Credit Purchase",
                type: "CREDIT_PURCHASE"
            },
        });

        return NextResponse.json({ sessionId: session.id, url: session.url });

    } catch (err: any) {
        console.error("Stripe Checkout Error:", err);
        return NextResponse.json(
            { error: err.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
