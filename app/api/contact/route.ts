import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { subject, message, email } = body;

        // Get session to include user info
        const session = await getServerSession(authOptions);

        // Get user details if logged in
        let userInfo = "";
        if (session?.user?.id) {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: {
                    email: true,
                    userType: true,
                    credits: true,
                    creditExpiresAt: true,
                    createdAt: true,
                }
            });

            if (user) {
                userInfo = `

---
**Account Information:**
- Email: ${user.email}
- Account Type: ${user.userType || 'Individual'}
- Current Credits: ${user.credits}
- Credit Expiration: ${user.creditExpiresAt ? new Date(user.creditExpiresAt).toLocaleDateString() : 'N/A'}
- Account Created: ${new Date(user.createdAt).toLocaleDateString()}
- User ID: ${session.user.id}
`;
            }
        }

        // Send email using Resend
        if (!resend) {
            console.log("⚠️ RESEND_API_KEY not configured. Email would be sent to:", "us_help@humanscape.io");
            console.log("Subject:", `[CrystalReveal Help] ${subject}`);
            console.log("From:", email);
            console.log("Message:", message);
            console.log("User Info:", userInfo);
            return NextResponse.json({ success: true, note: "Email service not configured" });
        }

        const emailResult = await resend.emails.send({
            from: 'noreply@send.humanscape.io',
            to: 'us_help@humanscape.io',
            replyTo: email,
            subject: `[CrystalReveal Help] ${subject}`,
            text: `${message}${userInfo}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #7c3aed;">New Help Request</h2>
                    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${email}</p>
                        <p style="margin: 0;"><strong>Subject:</strong> ${subject}</p>
                    </div>
                    <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                        <h3 style="margin-top: 0;">Message:</h3>
                        <p style="white-space: pre-wrap;">${message}</p>
                    </div>
                    ${userInfo ? `
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 12px;">
                        <h4 style="margin-top: 0; color: #6b7280;">Account Information</h4>
                        <pre style="margin: 0; font-family: monospace; white-space: pre-wrap;">${userInfo.trim()}</pre>
                    </div>
                    ` : ''}
                </div>
            `
        });

        console.log("✅ Email sent successfully:", emailResult);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("❌ Contact form error:", error);
        return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }
}
