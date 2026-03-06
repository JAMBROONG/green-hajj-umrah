import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import prisma from "@/lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.profile.findUnique({
          where: { email: credentials.email as string },
          include: { tenant: true }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          tenantId: user.tenantId,
          tenant: user.tenant
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id as string
        token.tenantId = (user as any).tenantId
        token.tenant = (user as any).tenant
      }
      return token
    },
    session: async ({ session, token }) => {
      if (session.user) {
        (session.user as any).id = token.id as string
        (session.user as any).tenantId = token.tenantId as string | null
        (session.user as any).tenant = token.tenant
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
})
