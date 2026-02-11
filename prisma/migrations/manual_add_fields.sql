-- Manual migration to add unlock and expiration fields
-- This preserves existing data

-- Add unlock fields to ImageGeneration
ALTER TABLE "ImageGeneration" 
ADD COLUMN IF NOT EXISTS "unlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "unlockedAt" TIMESTAMP(3);

-- Rename isUnlocked to unlocked if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='ImageGeneration' AND column_name='isUnlocked') THEN
        ALTER TABLE "ImageGeneration" DROP COLUMN "isUnlocked";
    END IF;
END $$;

-- Add expiration fields to CreditTransaction
ALTER TABLE "CreditTransaction"
ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "isExpired" BOOLEAN NOT NULL DEFAULT false;

-- Update existing PURCHASE transactions to have expiration date (1 year from creation)
UPDATE "CreditTransaction"
SET "expiresAt" = "createdAt" + INTERVAL '1 year'
WHERE "transactionType" = 'PURCHASE' AND "expiresAt" IS NULL;
