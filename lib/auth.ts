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
            }

            // Always fetch fresh credits on token refresh/check
            try {
                if (token.id) {
                    const freshUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: { credits: true }
                    });
                    if (freshUser) {
                        token.credits = freshUser.credits;
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
            }
            return session
        }
    },
    pages: {
        signIn: "/auth/signin",
    }
}
