import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Create Stripe instance
// Note: In production, always use process.env.STRIPE_SECRET_KEY
// The user provided a truncated key, so we rely on the environment variable.
export async function POST(req: NextRequest) {
    try {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) {
            console.error("Stripe key is missing");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }
        const stripe = new Stripe(stripeKey, {
            typescript: true,
        });

        const body = await req.json();
        const { priceId, userId } = body;

        if (!priceId) {
            return NextResponse.json({ error: "Price ID is required" }, { status: 400 });
        }

        // Map Price IDs to Credits for Metadata Validation
        const PRICE_ID_MAP: Record<string, number> = {
            "price_1Sy5AwFC7UyjtHU9FMagFXzD": 1,
            "price_1Sy4thFC7UyjtHU9HqyK1sT9": 20,
            "price_1Sy518FC7UyjtHU947153HIV": 50,
            "price_1Sy53vFC7UyjtHU9qSEPVP33": 100
        };

        const credits = PRICE_ID_MAP[priceId];

        if (!credits) {
            return NextResponse.json({ error: "Invalid Price ID" }, { status: 400 });
        }

        // Create Checkout Session
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
            success_url: `${req.headers.get("origin")}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.get("origin")}/?canceled=true`,
            metadata: {
                userId: userId || "", // Might be empty if guest, but usually we require login to buy
                credits: credits.toString(),
                type: "CREDIT_PURCHASE"
            },
        });

        return NextResponse.json({ sessionId: session.id, url: session.url });
    } catch (err: any) {
        console.error("Stripe Error:", err);
        return NextResponse.json(
            { error: err.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
