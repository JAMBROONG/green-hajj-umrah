import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import prisma from "@/lib/prisma"
import { rateLimiter } from "@/lib/rate-limiter"

class TenantInactiveError extends CredentialsSignin {
  code = 'TENANT_INACTIVE'
}

class LoginRateLimitError extends CredentialsSignin {
  code = 'TOO_MANY_ATTEMPTS'
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials, request) => {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = (credentials.email as string).toLowerCase().trim();

        // Extract IP for IP-based rate limiting
        const ip =
          request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          request?.headers?.get('x-real-ip') ||
          'unknown';

        const emailKey = `login:email:${email}`;
        const ipKey    = `login:ip:${ip}`;

        // Check rate limits — 5 attempts per email / 15 per IP, per 15-minute window
        const emailLimit = rateLimiter.check(emailKey, 5, 15 * 60 * 1000);
        const ipLimit    = rateLimiter.check(ipKey,    15, 15 * 60 * 1000);

        if (!emailLimit.allowed || !ipLimit.allowed) {
          throw new LoginRateLimitError()
        }

        const user = await prisma.profiles.findUnique({
          where: { email },
          include: { tenant: true }
        })

        if (!user || user.role !== 'jemaah') {
          return null
        }

        // Check if tenant is active
        if (!user.tenant || !user.tenant.is_active) {
          throw new TenantInactiveError()
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        // Successful login — reset rate limit counters
        rateLimiter.reset(emailKey)
        rateLimiter.reset(ipKey)

        return {
          id: user.id,
          email: user.email,
          name: user.full_name,
          tenantId: user.tenant_id,
          tenant: user.tenant
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id
        token.tenantId = user.tenantId
        token.tenant = user.tenant
        // @ts-ignore - Add role to token for middleware check
        token.role = 'jemaah'
      }
      return token
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id
        session.user.tenantId = token.tenantId
        session.user.tenant = token.tenant
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
})
