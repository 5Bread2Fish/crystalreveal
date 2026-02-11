// Script to apply manual migration
import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

async function applyManualMigration() {
    console.log('Applying manual migration...');

    try {
        // Add unlock field to ImageGeneration
        console.log('Adding unlocked field...');
        await prisma.$executeRaw`
            ALTER TABLE "ImageGeneration" 
            ADD COLUMN IF NOT EXISTS "unlocked" BOOLEAN NOT NULL DEFAULT false
        `;

        console.log('Adding unlockedAt field...');
        await prisma.$executeRaw`
            ALTER TABLE "ImageGeneration"
            ADD COLUMN IF NOT EXISTS "unlockedAt" TIMESTAMP(3)
        `;

        // Drop old isUnlocked column if exists
        console.log('Checking for old isUnlocked column...');
        const hasOldColumn = await prisma.$queryRaw`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='ImageGeneration' AND column_name='isUnlocked'
        `;

        if (Array.isArray(hasOldColumn) && hasOldColumn.length > 0) {
            console.log('Dropping old isUnlocked column...');
            await prisma.$executeRaw`ALTER TABLE "ImageGeneration" DROP COLUMN "isUnlocked"`;
        }

        // Add expiration fields to CreditTransaction
        console.log('Adding expiresAt field...');
        await prisma.$executeRaw`
            ALTER TABLE "CreditTransaction"
            ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3)
        `;

        console.log('Adding isExpired field...');
        await prisma.$executeRaw`
            ALTER TABLE "CreditTransaction"
            ADD COLUMN IF NOT EXISTS "isExpired" BOOLEAN NOT NULL DEFAULT false
        `;

        // Update existing PURCHASE transactions
        console.log('Setting expiration dates for existing purchases...');
        await prisma.$executeRaw`
            UPDATE "CreditTransaction"
            SET "expiresAt" = "createdAt" + INTERVAL '1 year'
            WHERE "transactionType" = 'PURCHASE' AND "expiresAt" IS NULL
        `;

        console.log('✓ Migration applied successfully');

    } catch (error) {
        console.error('Error applying migration:', error);
    } finally {
        await prisma.$disconnect();
    }
}

applyManualMigration();
