import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const INPUT_DIR = 'test-input';
const OUTPUT_DIR = 'test-output';
const TARGET_DIRECTORIES = ['bvai_ghosted']; // Empty array = process all
const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
    console.error("❌ Error: GOOGLE_API_KEY is missing in .env.local");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-3-pro-image-preview",
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ],
    generationConfig: { temperature: 0.3 }
});

const PROMPT_BASIC = `
Denoise, sharpen, and enhance the resolution of this image, while preserving its original structure. If anything is obscuring the face in the image, remove the all obstruction while maintaining the image's composition, orientation, and pose. **Override Rule:** Regardless of the input's appearance, **you must render the baby with EYES CLOSED.**
`;

const PROMPT_ADVANCED = `
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
`;

async function generateImage(prompt: string, imageBuffer: Buffer, mimeType: string) {
    try {
        const result = await model.generateContent([
            prompt,
            { inlineData: { data: imageBuffer.toString('base64'), mimeType } }
        ]);
        const response = await result.response;
        if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
            const part = response.candidates[0].content.parts[0];
            if (part.inlineData && part.inlineData.data) {
                return Buffer.from(part.inlineData.data, 'base64');
            }
        }
        return null;
    } catch (e: any) {
        console.error(`  -> ❌ Error: ${e.message}`);
        // Quota 에러가 나면 프로세스 종료 (계속 시도해봤자 에러나므로)
        if (e.message.includes('429') || e.message.includes('Quota')) {
            console.error("  🚨 Quota Exceeded. Stopping process safely.");
            process.exit(1);
        }
        return null;
    }
}

const isImage = (fileName: string) => /\.(jpg|jpeg|png|webp)$/i.test(fileName);

async function processFile(filePath: string, outputDir: string, fileName: string) {
    // 🔥 [Resume Logic] 이미 결과 파일이 존재하면 건너뛰기
    const outputFilePath = path.join(outputDir, `compare_${fileName}`);
    if (fs.existsSync(outputFilePath)) {
        console.log(`  ⏭️  Skipping (Already exists): ${fileName}`);
        return;
    }

    const inputBuffer = fs.readFileSync(filePath);
    const ext = path.extname(fileName).toLowerCase().replace('.', '');
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    process.stdout.write(`  -> Generating Basic & Advanced... `);

    const [basicBuffer, advBuffer] = await Promise.all([
        generateImage(PROMPT_BASIC, inputBuffer, mimeType),
        generateImage(PROMPT_ADVANCED, inputBuffer, mimeType)
    ]);

    if (!basicBuffer || !advBuffer) {
        console.log("Skipped (One or both failed).");
        return;
    }
    console.log("Done.");

    try {
        const targetHeight = 1024;
        const imgOriginal = await sharp(inputBuffer).resize({ height: targetHeight }).toBuffer();
        const imgBasic = await sharp(basicBuffer).resize({ height: targetHeight }).toBuffer();
        const imgAdv = await sharp(advBuffer).resize({ height: targetHeight }).toBuffer();

        const metaOrig = await sharp(imgOriginal).metadata();
        const metaBasic = await sharp(imgBasic).metadata();
        const metaAdv = await sharp(imgAdv).metadata();

        const totalWidth = (metaOrig.width || 0) + (metaBasic.width || 0) + (metaAdv.width || 0);

        await sharp({
            create: {
                width: totalWidth,
                height: targetHeight,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            }
        })
            .composite([
                { input: imgOriginal, left: 0, top: 0 },
                { input: imgBasic, left: metaOrig.width || 0, top: 0 },
                { input: imgAdv, left: (metaOrig.width || 0) + (metaBasic.width || 0), top: 0 }
            ])
            .toFile(outputFilePath);

        console.log(`  ✅ Saved: compare_${fileName}\n`);

    } catch (err) {
        console.error("  ❌ Stitching failed:", err);
    }
}

async function main() {
    console.log(`🚀 Starting CrystalReveal Batch Test (Resume Mode)`);

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

    const entries = fs.readdirSync(INPUT_DIR, { withFileTypes: true });

    for (const entry of entries) {
        // 🎯 Filter: Check if we should process this entry
        if (TARGET_DIRECTORIES.length > 0 && !TARGET_DIRECTORIES.includes(entry.name)) {
            continue;
        }

        if (entry.isDirectory()) {
            const subDirName = entry.name;
            const subInputDir = path.join(INPUT_DIR, subDirName);
            const subOutputDir = path.join(OUTPUT_DIR, subDirName);
            if (!fs.existsSync(subOutputDir)) fs.mkdirSync(subOutputDir, { recursive: true });

            console.log(`\n📁 Entering: [${subDirName}]`);
            const files = fs.readdirSync(subInputDir).filter(f => isImage(f));

            for (const [index, file] of files.entries()) {
                console.log(`[${subDirName}] ${index + 1}/${files.length}: ${file}`);
                await processFile(path.join(subInputDir, file), subOutputDir, file);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        else if (entry.isFile() && isImage(entry.name)) {
            console.log(`\n📄 Processing Root File: ${entry.name}`);
            await processFile(path.join(INPUT_DIR, entry.name), OUTPUT_DIR, entry.name);
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    console.log("\n🎉 All processing complete!");
}

main();