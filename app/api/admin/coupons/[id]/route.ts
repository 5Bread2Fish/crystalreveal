
import { NextResponse } from 'next/server';
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    typescript: true,
});

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        if (!id) return NextResponse.json({ error: "No ID" }, { status: 400 });

        const deleted = await stripe.coupons.del(id);
        return NextResponse.json({ deleted });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
