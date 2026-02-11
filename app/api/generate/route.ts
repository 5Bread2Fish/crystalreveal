import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { put, list } from '@vercel/blob';
import { randomUUID } from 'crypto';
import { addRecord } from '@/lib/storage';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
    console.log("=== GENERATE API START ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Environment:", process.env.VERCEL_ENV || 'local');

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        // Analytics Data
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        const country = req.headers.get("x-vercel-ip-country") || "unknown"; // Vercel Header
        const requestId = randomUUID();

        // Check Session
        const session = await getServerSession(authOptions);

        // Get guest session ID if provided
        const guestSessionId = formData.get("guestSessionId") as string | null;

        // API Key (AI Studio)
        const apiKey = process.env.GOOGLE_API_KEY || "AIzaSyAF9koxXcFabzhYTK9SE9N7guDtgHF86Ms";

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const base64Image = buffer.toString("base64");
        const fileType = file.type || "image/jpeg";

        const genAI = new GoogleGenerativeAI(apiKey);

        // [안전 설정] 최대한 풀어줍니다.
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-pro",
        });

        // Actually, to be safe, I'll use the EXACT original model string.
        const originalModel = "gemini-3-pro-image-preview";

        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        ];

        const generationConfig = {
            temperature: 0.15,
            topP: 0.85,
            topK: 40
        };

        // Definiing Prompts
        const basicPrompt = `
        Denoise, sharpen, and enhance the resolution of this image, while preserving its original structure. If anything is obscuring the face in the image, remove the all obstruction while maintaining the image's composition, orientation, and pose. **Override Rule:** Regardless of the input's appearance, **you must render the baby with EYES CLOSED.**
        [Strict Constraint] You must trace the exact facial geometry of the input. Do NOT generate a generic or idealized baby face. If the nose is wide, keep it wide. If the chin is small, keep it small.
        `;

        const advancedPrompt = `
        **Role & Task:**
        You are an expert forensic artist and medical illustrator. Your goal is to restore the *exact* identity of the fetus from this 3D ultrasound, NOT to create a generic cute baby.

        **1. [CRITICAL] Forensic Fidelity & Geometry Lock:**
        * **Trace, Don't Invent:** Treat the input image as a topography map. You must follow the exact curvature of the forehead, the specific width of the nose bridge, and the unique volume of the cheeks found in the source.
        * **Anti-Beautification:** **DO NOT** idealize or "fix" the facial features to make them look like a stock photo baby. Preserve unique asymmetries or specific feature shapes. 
        * **Strict Adherence:** The output face must align perfectly with the input's facial landmarks. If the input is blurry, infer details based strictly on the surrounding shadow cues, not by pasting a generic face.

        **2. [MANDATORY] Force Sleeping State (Eyes Closed):**
        * **Override Rule:** Regardless of the input's appearance, **render the baby with EYES CLOSED.**
        * **Visual Detail:** Render delicate eyelids resting peacefully. The expression must be tranquil.
        * **Negative Constraint:** **NEVER render open eyes.** Interpret dark eye sockets as deep shadows over closed lids.

        **3. Smart Obstruction Clearance:**
        * **Analyze & Remove:** Detect and remove ONLY objects blocking the face (cords, hands, noise).
        * **In-paint:** Reconstruct hidden areas naturally, blending with surrounding anatomy.

        **4. Ultrasound Color Fidelity & Bio-Interpretation:**
        * **Color Constraint:** **Do NOT use standard human skin tones.** Strictly adhere to the original monochromatic sepia/golden-orange palette.
        * **Materiality:** The result should look like a photorealistic sculpture made of translucent living tissue or amber, lit by volumetric light. Use subsurface scattering to show depth.

        **5. Lighting & Atmosphere:**
        * **Environment:** Clear amniotic fluid background.
        * **Lighting:** Enhance depth with volumetric lighting that matches the original shadow direction.

        **Output Goal:**
        A hyper-realistic restoration that looks exactly like *this specific baby* (not a generic one), retaining the original ultrasound's color and vibe, but with crystal-clear 8K definition.
        `;

        console.log(`Sending 'CrystalReveal' Dual Generation request (${requestId})...`);

        // Re-instantiate model with config
        const generativeModel = genAI.getGenerativeModel({
            model: originalModel,
            safetySettings,
            generationConfig
        });

        // Run in parallel
        const [basicResult, advancedResult] = await Promise.all([
            generativeModel.generateContent([basicPrompt, { inlineData: { data: base64Image, mimeType: fileType } }]),
            generativeModel.generateContent([advancedPrompt, { inlineData: { data: base64Image, mimeType: fileType } }])
        ]);

        const getBuffer = async (res: any) => {
            const response = await res.response;
            if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
                const part = response.candidates[0].content.parts[0];
                if (part.inlineData && part.inlineData.data) {
                    return Buffer.from(part.inlineData.data, 'base64');
                }
            }
            return null;
        };

        const basicBuffer = await getBuffer(basicResult);
        const advancedBuffer = await getBuffer(advancedResult);

        if (!basicBuffer || !advancedBuffer) {
            throw new Error("One or both images failed to generate due to safety filters.");
        }

        // Upload to Blob for Persistence & History
        console.log("=== BLOB UPLOAD START ===");
        console.log("Request ID:", requestId);
        console.log("Basic buffer size:", basicBuffer?.length);
        console.log("Advanced buffer size:", advancedBuffer?.length);
        console.log("Original buffer size:", buffer?.length);
        console.log("BLOB_READ_WRITE_TOKEN exists:", !!process.env.BLOB_READ_WRITE_TOKEN);

        // Fetch Settings for Auto-Publish
        let isHidden = false; // Default visible
        try {
            const { blobs } = await list({ prefix: 'config/settings.json', limit: 1 });
            if (blobs.length > 0) {
                const res = await fetch(blobs[0].url);
                const conf = await res.json();
                // If autoPublish is OFF, then hidden is TRUE
                if (conf.autoPublish === false) isHidden = true;
            }
        } catch (e) { console.error("Failed to read settings", e); }

        let basicBlob, advancedBlob, originalBlob;
        try {
            console.log("Starting Vercel Blob upload...");
            [basicBlob, advancedBlob, originalBlob] = await Promise.all([
                put(`history/${requestId}_basic.png`, basicBuffer, { access: 'public', contentType: 'image/png' }),
                put(`history/${requestId}_advanced.png`, advancedBuffer, { access: 'public', contentType: 'image/png' }),
                put(`history/${requestId}_original.png`, buffer, { access: 'public', contentType: 'image/png' })
            ]);
            console.log("✅ Blob upload successful");
            console.log("Basic URL:", basicBlob.url);
            console.log("Advanced URL:", advancedBlob.url);
            console.log("Original URL:", originalBlob.url);
            console.log("=== BLOB UPLOAD END ===");
        } catch (blobError: any) {
            console.error("❌ BLOB UPLOAD FAILED");
            console.error("Error type:", blobError?.constructor?.name);
            console.error("Error message:", blobError?.message);
            console.error("Error stack:", blobError?.stack);
            throw new Error(`Blob upload failed: ${blobError?.message}`);
        }

        // Save to Central Database (Legacy)
        const record = {
            id: requestId,
            timestamp: new Date().toISOString(),
            ip,
            country,
            basicUrl: basicBlob.url,
            advancedUrl: advancedBlob.url,
            originalUrl: originalBlob.url,
            ratings: { basic: 0, advanced: 0 },
            isPaid: false,
            downloaded: false,
            hidden: isHidden
        };

        await addRecord(record);

        // Save to Prisma (New Logic)
        try {
            await prisma.imageGeneration.create({
                data: {
                    id: requestId,
                    userId: session?.user?.id || null,
                    sessionId: session?.user?.id ? null : (guestSessionId || requestId), // Use provided guestSessionId or fallback to requestId
                    originalUrl: originalBlob.url,
                    basicUrl: basicBlob.url,
                    advancedUrl: advancedBlob.url,
                    unlocked: false,
                }
            });
        } catch (e) {
            console.error("Failed to save to Prisma:", e);
        }

        return NextResponse.json({
            success: true,
            id: requestId,
            basic: basicBlob.url,
            advanced: advancedBlob.url,
            isUnlocked: false
        });

    } catch (error: any) {
        console.error("Error:", error);
        return NextResponse.json(
            { error: error.message || "An unexpected error occurred." },
            { status: 500 }
        );
    }
}