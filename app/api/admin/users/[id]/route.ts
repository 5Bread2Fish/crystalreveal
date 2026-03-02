import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// Get single user details
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: params.id },
            select: {
                id: true,
                email: true,
                userType: true,
                businessName: true,
                ownerName: true,
                phoneNumber: true,
                pregnancyWeeks: true,
                monthlyScanVolume: true,
                website: true,
                credits: true,
                creditExpiresAt: true,
                createdAt: true,

                updatedAt: true,
                status: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ user });
    } catch (error) {
        console.error("Get user error:", error);
        return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }
}

// Update user details
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await req.json();
        const { credits, creditExpiresAt, userType, businessName, phoneNumber } = body;

        const updateData: any = {};

        if (credits !== undefined) updateData.credits = parseInt(credits);
        if (creditExpiresAt !== undefined) updateData.creditExpiresAt = creditExpiresAt ? new Date(creditExpiresAt) : null;
        if (userType) updateData.userType = userType;
        if (businessName !== undefined) updateData.businessName = businessName;

        if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
        if (body.ownerName !== undefined) updateData.ownerName = body.ownerName;
        if (body.website !== undefined) updateData.website = body.website;
        if (body.monthlyScanVolume !== undefined) updateData.monthlyScanVolume = body.monthlyScanVolume;
        if (body.country !== undefined) updateData.country = body.country;
        // Allow status update (active, deleted, suspended)
        if (body.status) updateData.status = body.status;

        const user = await prisma.user.update({
            where: { id: params.id },
            data: updateData,
            select: {
                id: true,
                email: true,
                userType: true,
                businessName: true,
                credits: true,
                creditExpiresAt: true,
                phoneNumber: true
            }
        });

        console.log(`✏️ User ${user.email} updated by admin`);

        return NextResponse.json({ success: true, user });
    } catch (error) {
        console.error("Update user error:", error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}
