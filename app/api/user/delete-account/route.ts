import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { del } from "@vercel/blob";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;

        // Get user data before deletion
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                images: true,
                transactions: true,
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Delete all user images from Vercel Blob
        for (const image of user.images) {
            try {
                if (image.originalUrl) await del(image.originalUrl);
                if (image.basicUrl) await del(image.basicUrl);
                if (image.advancedUrl) await del(image.advancedUrl);
            } catch (error) {
                console.error(`Failed to delete image ${image.id}:`, error);
            }
        }

        // Create deletion notification for admin
        try {
            await prisma.deletedAccountNotification.create({
                data: {
                    userId: user.id,
                    userEmail: user.email,
                    userType: user.userType,
                    businessName: user.businessName,
                    imageCount: user.images.length,
                    creditBalance: user.credits,
                }
            });
        } catch (error) {
            console.error("Failed to create deletion notification:", error);
            // Continue with deletion even if notification fails
        }

        // Anonymize user data instead of hard delete
        const anonymizedEmail = `deleted_${Date.now()}@deleted.bomee.io`;

        await prisma.user.update({
            where: { id: userId },
            data: {
                email: anonymizedEmail,
                password: "DELETED",
                businessName: null,
                ownerName: null,
                phoneNumber: null,
                website: null,
                pregnancyWeeks: null,
                monthlyScanVolume: null,
                country: null,
                marketingAgreed: false,
                status: "deleted",
                deletedAt: new Date(),
            }
        });

        // Delete all image records
        await prisma.imageGeneration.deleteMany({
            where: { userId }
        });

        return NextResponse.json({
            success: true,
            message: "Account deleted successfully"
        });

    } catch (error) {
        console.error("Account deletion error:", error);
        return NextResponse.json({
            error: "Failed to delete account"
        }, { status: 500 });
    }
}
