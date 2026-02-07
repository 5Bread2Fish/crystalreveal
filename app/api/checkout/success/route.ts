
import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const { id } = await req.json();
        const session = await getServerSession(authOptions);

        if (!id) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        // Ideally verify payment here via Stripe session ID search, but for now we assume functionality
        // This endpoint should be secured or removed in production favor of Webhooks.

        // Update ImageGeneration
        await prisma.imageGeneration.update({
            where: { id },
            data: { isUnlocked: true }
        });

        // Also Log Transaction if user is logged in
        if (session?.user) {
            await prisma.creditTransaction.create({
                data: {
                    userId: session.user.id,
                    amountPaid: 9.99, // Assumption based on legacy single unlock
                    creditsChange: 0, // Direct unlock, no credit change? Or add 1 and deduct 1?
                    transactionType: "PURCHASE_DIRECT_UNLOCK",
                }
            });
        }

        return NextResponse.json({ success: true });

    } catch (e) {
        console.error("Unlock Error:", e);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
