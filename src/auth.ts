import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import prisma from "@/lib/prisma"

class TenantInactiveError extends CredentialsSignin {
  code = 'TENANT_INACTIVE'
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        console.log('🔐 Login attempt:', credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials');
          return null
        }

        const user = await prisma.profiles.findUnique({
          where: { email: credentials.email as string },
          include: { tenant: true }
        })

        console.log('👤 User found:', user ? `Yes (${user.email})` : 'No');

        if (!user) {
          console.log('❌ User not found in database');
          return null
        }

        // Check if user is jemaah
        if (user.role !== 'jemaah') {
          console.log('❌ Access denied: User is not a jemaah (role:', user.role, ')');
          return null
        }

        // Check if tenant is active
        if (!user.tenant || !user.tenant.is_active) {
          console.log('❌ Tenant inactive for user:', user.email);
          throw new TenantInactiveError();
        }

        console.log('🔑 Comparing password...');
        const isPasswordValid = await compare(
          credentials.password as string,
          user.password
        )

        console.log('✅ Password valid:', isPasswordValid);

        if (!isPasswordValid) {
          console.log('❌ Invalid password');
          return null
        }

        console.log('✅ Login successful');
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
  },
})
