import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            email,
            password,
            userType,
            businessName,
            ownerName,
            phoneNumber,
            website,
            monthlyScanVolume,
            pregnancyWeeks,
            marketingAgreed
        } = body;

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);


        const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
        const detectedCountry = req.headers.get("x-vercel-ip-country");
        const detectedCity = req.headers.get("x-vercel-ip-city");

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                userType: userType || "INDIVIDUAL",
                businessName,
                ownerName,
                phoneNumber,
                website,
                monthlyScanVolume,
                pregnancyWeeks,
                marketingAgreed: marketingAgreed ?? true,
                marketingAgreedAt: marketingAgreed ? new Date() : null,
                credits: 0,
                // Geolocation fields
                ipAddress: ipAddress ? (Array.isArray(ipAddress) ? ipAddress[0] : ipAddress.split(',')[0]) : null,
                country: body.country || detectedCountry, // Use body country if provided, else detected
                city: detectedCity,
            },
        });

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        return NextResponse.json({ user: userWithoutPassword }, { status: 201 });
    } catch (error: any) {
        console.error("Signup error details:", {
            message: error.message,
            code: error.code,
            meta: error.meta,
            stack: error.stack
        });
        return NextResponse.json({ error: "Internal server error: " + error.message }, { status: 500 });
    }
}
