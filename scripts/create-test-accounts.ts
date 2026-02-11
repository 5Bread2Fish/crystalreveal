// Script to create test accounts for development
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestAccounts() {
    console.log('Creating test accounts...');

    // Hash password for both accounts
    const hashedPassword = await bcrypt.hash('test123', 10);

    try {
        // Create Business Account
        const businessUser = await prisma.user.upsert({
            where: { email: 'business@test.com' },
            update: {},
            create: {
                email: 'business@test.com',
                password: hashedPassword,
                businessName: 'Test Business Clinic',
                ownerName: 'Business Owner',
                userType: 'BUSINESS',
                credits: 100
            }
        });
        console.log('✓ Business account created:', businessUser.email);

        // Create Individual Account
        const individualUser = await prisma.user.upsert({
            where: { email: 'individual@test.com' },
            update: {},
            create: {
                email: 'individual@test.com',
                password: hashedPassword,
                ownerName: 'Individual User',
                userType: 'INDIVIDUAL',
                credits: 50
            }
        });
        console.log('✓ Individual account created:', individualUser.email);

        console.log('\n=== Test Accounts Created ===');
        console.log('Business Account:');
        console.log('  Email: business@test.com');
        console.log('  Password: test123');
        console.log('  Credits: 100');
        console.log('\nIndividual Account:');
        console.log('  Email: individual@test.com');
        console.log('  Password: test123');
        console.log('  Credits: 50');
        console.log('=============================\n');

    } catch (error) {
        console.error('Error creating test accounts:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createTestAccounts();
