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

        const { imageUrl } = await req.json();

        if (!imageUrl) {
            return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: "ClearFace AI - 8K Ultrasound Enhancement",
                            description: "High-definition restoration of your fetal ultrasound.",
                            images: ["https://bomee.io/images/logo.png"], // Placeholder logo
                        },
                        unit_amount: 499, // $4.99
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${req.headers.get("origin")}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.get("origin")}/?canceled=true`,
            metadata: {
                imageUrl: imageUrl.substring(0, 500), // Store ref to image if needed (truncated)
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
