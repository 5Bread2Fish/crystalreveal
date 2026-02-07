import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { put, list } from '@vercel/blob';
import { randomUUID } from 'crypto';
import { addRecord } from '@/lib/storage';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        // Analytics Data
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        const country = req.headers.get("x-vercel-ip-country") || "unknown"; // Vercel Header
        const requestId = randomUUID();

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
            model: "gemini-3-pro-image-preview",
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            ],
            generationConfig: {
                temperature: 0.15, // 원본 형태 유지를 위해 낮은 값 사용
                topP: 0.85, // (옵션) topP: 0.8~0.9 정도로 설정하면 엉뚱한 결과가 나오는 것을 막을 수 있습니다.
                topK: 40
            }
        });

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

        /* const advancedPrompt = `
        **Role & Task:**
        You are an expert medical illustrator and AI vision specialist. Convert this 3D ultrasound raw image into a hyper-realistic, high-definition fetal portrait.

        **1. [CRITICAL] Structural Anchoring & Pose Preservation:**
        * **Core Rule:** You must **STRICTLY PRESERVE** the original camera angle, head tilt, body position, and general facial structure.
        * **Identity Lock:** The facial features (nose shape, mouth width, cheek volume) must be retained 100% to preserve the baby's identity.

        **2. [MANDATORY] Force Sleeping State (Eyes Closed):**
        * **Override Rule:** Regardless of the input's appearance, **you must render the baby with EYES CLOSED.**
        * **Visual Detail:** Render delicate eyelids resting peacefully. Fine eyelashes touching the cheeks. The expression must be tranquil and sleeping.
        * **Negative Constraint:** **NEVER render open eyes, staring pupils, or a startled expression.** Interpret any dark shadows in the eye sockets as closed eyelids with deep shadows.

        **3. Smart Obstruction Clearance:**
        * **Analyze & Remove:** Detect and remove ONLY objects blocking the face (umbilical cords, placenta, hands covering face, noise).
        * **In-paint:** Reconstruct the hidden facial areas naturally, blending seamlessly with surrounding anatomy.

        **4. Ultrasound Color Fidelity & Bio-Interpretation (CRITICAL):**
        * **Color Constraint:** **Do NOT introduce standard human skin tones (pinks, peaches, terracotta).** You must strictly adhere to the overall hue and color palette of the source ultrasound image (e.g., monochromatic sepia, golden-orange, or greyscale hues).
        * **Bio-Interpretation:** Interpret these synthetic ultrasound colors as if they were real, translucent biological tissue lit by a strong colored light source matching the input hue.
        * **Realism through Texture, Not Color:** Achieve hyper-realism solely through **subsurface scattering, moisture, and fine details** (pores, fine lanugo hair) *within the original color bounds*. The result should look like a photorealistic sculpture made of amber or living golden tissue.

        **5. Lighting & Atmosphere:**
        * **Environment:** Clear amniotic fluid background, matching the original color tone.
        * **Lighting:** Volumetric lighting that enhances depth. Shadows must be soft and follow the monochrome color scheme of the input.

        **Output Goal:**
        A photorealistic portrait of a sleeping baby that retains the exact color and vibe of the original ultrasound, removing only the obstructions and noise to reveal the realistic texture underneath.
        `; */

        console.log(`Sending 'CrystalReveal' Dual Generation request (${requestId})...`);

        // Run in parallel
        const [basicResult, advancedResult] = await Promise.all([
            model.generateContent([basicPrompt, { inlineData: { data: base64Image, mimeType: fileType } }]),
            model.generateContent([advancedPrompt, { inlineData: { data: base64Image, mimeType: fileType } }])
        ]);

        const getBuffer = async (res: any) => {
            const response = await res.response;
            if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
                const part = response.candidates[0].content.parts[0];
                if (part.inlineData && part.inlineData.data) {
                    return Buffer.from(part.inlineData.data, 'base64');
                }
                // Text fallback not ideal for buffer but handling just in case logic needed? 
                // Gemini images usually return inlineData.
            }
            return null;
        };

        const basicBuffer = await getBuffer(basicResult);
        const advancedBuffer = await getBuffer(advancedResult);

        if (!basicBuffer || !advancedBuffer) {
            throw new Error("One or both images failed to generate due to safety filters.");
        }

        // Upload to Blob for Persistence & History
        // Upload to Blob for Persistence & History
        console.log("Uploading to Blob...");

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

        const [basicBlob, advancedBlob, originalBlob] = await Promise.all([
            put(`history/${requestId}_basic.png`, basicBuffer, { access: 'public', contentType: 'image/png' }),
            put(`history/${requestId}_advanced.png`, advancedBuffer, { access: 'public', contentType: 'image/png' }),
            put(`history/${requestId}_original.png`, buffer, { access: 'public', contentType: 'image/png' })
        ]);

        // Save to Central Database
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

        // Legacy support (optional, can remove later if clean break desired)
        // await put(`history/${requestId}_metadata.json`, JSON.stringify(record), { access: 'public', contentType: 'application/json' });

        return NextResponse.json({
            success: true,
            id: requestId,
            basic: basicBlob.url,
            advanced: advancedBlob.url
        });

    } catch (error: any) {
        console.error("Error:", error);
        return NextResponse.json(
            { error: error.message || "An unexpected error occurred." },
            { status: 500 }
        );
    }
}