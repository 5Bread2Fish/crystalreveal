
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { businessName, phoneNumber, website, pregnancyWeeks, monthlyScanVolume, marketingAgreed, ownerName, country } = body;

        // Add validation logic here if needed

        const updatedUser = await prisma.user.update({
            where: {
                email: session.user.email,
            },
            data: {
                businessName,
                phoneNumber,
                website,
                pregnancyWeeks,
                monthlyScanVolume,
                marketingAgreed,
                ownerName,
                country,
            },
        });

        return NextResponse.json({ success: true, user: updatedUser });

    } catch (error) {
        console.error("Error updating settings:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
