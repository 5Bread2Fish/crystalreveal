import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { subject, message, email } = body;

        // In a real app, you would use an email service like Resend, SendGrid, or AWS SES here.
        // For now, we simulate the email sending by logging to the console.

        console.log("---------------------------------------------------");
        console.log("📨 NEW CONTACT FORM SUBMISSION");
        console.log(`TO: us_support@bomee.io`);
        console.log(`FROM: ${email || "Anonymous"}`);
        console.log(`SUBJECT: ${subject}`);
        console.log(`MESSAGE: ${message}`);
        console.log("---------------------------------------------------");

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Contact form error:", error);
        return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }
}
