import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const HUBSPOT_TICKET_PIPELINE_ID = process.env.HUBSPOT_TICKET_PIPELINE_ID;
const HUBSPOT_TICKET_STAGE_ID = process.env.HUBSPOT_TICKET_STAGE_ID;

const HUBSPOT_BASE = "https://api.hubapi.com";

async function hubspotFetch(path: string, options: RequestInit = {}) {
    const res = await fetch(`${HUBSPOT_BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${HUBSPOT_API_KEY}`,
            ...options.headers,
        },
    });
    const data = await res.json();
    if (!res.ok) {
        console.error("HubSpot API Error:", JSON.stringify(data));
        throw new Error(data.message || `HubSpot API error (${res.status})`);
    }
    return data;
}

// 1. Search for existing contact by email
async function searchContact(email: string): Promise<{ contactId: string; companyId?: string } | null> {
    try {
        const data = await hubspotFetch("/crm/v3/objects/contacts/search", {
            method: "POST",
            body: JSON.stringify({
                filterGroups: [{
                    filters: [{
                        propertyName: "email",
                        operator: "EQ",
                        value: email,
                    }],
                }],
                properties: ["email", "firstname", "lastname", "associatedcompanyid"],
            }),
        });

        if (data.total > 0) {
            const contact = data.results[0];
            const contactId = contact.id;

            // Try to get associated company
            let companyId: string | undefined;
            try {
                const assocData = await hubspotFetch(
                    `/crm/v3/objects/contacts/${contactId}/associations/companies`
                );
                if (assocData.results?.length > 0) {
                    companyId = assocData.results[0].id;
                }
            } catch {
                // No company association, that's fine
            }

            return { contactId, companyId };
        }

        return null;
    } catch (error) {
        console.error("Contact search failed:", error);
        return null;
    }
}

// 2. Create a new contact
async function createContact(email: string): Promise<string> {
    const data = await hubspotFetch("/crm/v3/objects/contacts", {
        method: "POST",
        body: JSON.stringify({
            properties: { email },
        }),
    });
    return data.id;
}

// 3. Create ticket and associate with contact (and optionally company)
async function createTicket(
    subject: string,
    content: string,
    contactId: string,
    companyId?: string
): Promise<string> {
    // Build associations array
    const associations: any[] = [
        {
            to: { id: contactId },
            types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 16 }], // ticket-to-contact
        },
    ];

    if (companyId) {
        associations.push({
            to: { id: companyId },
            types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 26 }], // ticket-to-company
        });
    }

    const data = await hubspotFetch("/crm/v3/objects/tickets", {
        method: "POST",
        body: JSON.stringify({
            properties: {
                hs_pipeline: HUBSPOT_TICKET_PIPELINE_ID,
                hs_pipeline_stage: HUBSPOT_TICKET_STAGE_ID,
                subject: `[CrystalReveal] ${subject}`,
                content,
            },
            associations,
        }),
    });

    return data.id;
}

export async function POST(req: Request) {
    try {
        if (!HUBSPOT_API_KEY || !HUBSPOT_TICKET_PIPELINE_ID || !HUBSPOT_TICKET_STAGE_ID) {
            console.error("❌ HubSpot environment variables not configured");
            return NextResponse.json(
                { error: "Server configuration error. Please contact support." },
                { status: 500 }
            );
        }

        const body = await req.json();
        const { subject, message, email } = body;

        if (!email || !subject || !message) {
            return NextResponse.json(
                { error: "Email, subject, and message are required." },
                { status: 400 }
            );
        }

        // Append user account info to ticket content if logged in
        const session = await getServerSession(authOptions);
        let ticketContent = message;

        if (session?.user?.id) {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: {
                    email: true,
                    userType: true,
                    credits: true,
                    creditExpiresAt: true,
                    createdAt: true,
                },
            });

            if (user) {
                ticketContent += `\n\n---\nAccount Information:\n- Email: ${user.email}\n- Account Type: ${user.userType || "Individual"}\n- Current Credits: ${user.credits}\n- Credit Expiration: ${user.creditExpiresAt ? new Date(user.creditExpiresAt).toLocaleDateString() : "N/A"}\n- Account Created: ${new Date(user.createdAt).toLocaleDateString()}\n- User ID: ${session.user.id}`;
            }
        }

        // Step 1: Search or create contact
        let contactId: string;
        let companyId: string | undefined;

        const existing = await searchContact(email);
        if (existing) {
            contactId = existing.contactId;
            companyId = existing.companyId;
            console.log(`✅ Found existing contact: ${contactId}${companyId ? `, company: ${companyId}` : ""}`);
        } else {
            contactId = await createContact(email);
            console.log(`✅ Created new contact: ${contactId}`);
        }

        // Step 2: Create ticket & associate
        const ticketId = await createTicket(subject, ticketContent, contactId, companyId);
        console.log(`✅ Created HubSpot ticket: ${ticketId}`);

        return NextResponse.json({ success: true, ticketId });
    } catch (error: any) {
        console.error("❌ Contact form error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create support ticket" },
            { status: 500 }
        );
    }
}
