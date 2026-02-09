import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    if (!process.env.DATABASE_URL) {
        console.error("Error: DATABASE_URL is not set in environment variables.");
    }

    return new PrismaClient({
        log: ['warn', 'error'],
    })
}

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
