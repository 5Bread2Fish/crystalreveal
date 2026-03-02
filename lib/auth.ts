import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email }
                })

                if (!user) {
                    return null
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                )

                if (!isPasswordValid) {
                    return null
                }

                return {
                    id: user.id,
                    email: user.email,
                    userType: user.userType,
                    credits: user.credits,
                    creditExpiresAt: user.creditExpiresAt,
                }
            }
        })
    ],
    session: {
        strategy: "jwt"
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (trigger === "update" && session?.credits) {
                token.credits = session.credits
            }

            if (user) {
                token.id = user.id
                token.userType = user.userType
                token.credits = user.credits
                token.creditExpiresAt = user.creditExpiresAt
            }

            // Always fetch fresh credits on token refresh/check
            try {
                if (token.id) {
                    const freshUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: { credits: true, creditExpiresAt: true }
                    });
                    if (freshUser) {
                        token.credits = freshUser.credits;
                        token.creditExpiresAt = freshUser.creditExpiresAt;
                    }
                }
            } catch (e) {
                // ignore
            }

            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string
                session.user.userType = token.userType as string
                session.user.credits = token.credits as number
                session.user.creditExpiresAt = token.creditExpiresAt as Date
            }

            // Critical: Fetch latest profile data from DB to ensure settings updates persist
            // The token might be stale if jwt callback didn't run or update trigger wasn't fully effective
            if (session.user?.email) {
                try {
                    const freshUser = await prisma.user.findUnique({
                        where: { email: session.user.email },
                        select: {
                            businessName: true,
                            ownerName: true,
                            phoneNumber: true,
                            website: true,
                            country: true,
                            pregnancyWeeks: true,
                            monthlyScanVolume: true,
                            marketingAgreed: true
                        }
                    });

                    if (freshUser) {
                        (session.user as any).businessName = freshUser.businessName;
                        (session.user as any).ownerName = freshUser.ownerName;
                        (session.user as any).phoneNumber = freshUser.phoneNumber;
                        (session.user as any).website = freshUser.website;
                        (session.user as any).country = freshUser.country;
                        (session.user as any).pregnancyWeeks = freshUser.pregnancyWeeks;
                        (session.user as any).monthlyScanVolume = freshUser.monthlyScanVolume;
                        (session.user as any).marketingAgreed = freshUser.marketingAgreed;
                    }
                } catch (e) {
                    console.error("Failed to refresh session user data", e);
                }
            }

            return session
        }
    },
    pages: {
        signIn: "/auth/signin",
    }
}
