import { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      tenantId: string | null
      tenant?: {
        id: string
        name: string
        slug: string
      } | null
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    email: string
    name: string | null
    tenantId: string | null
    tenant?: {
      id: string
      name: string
      slug: string
    } | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    tenantId: string | null
    tenant?: {
      id: string
      name: string
      slug: string
    } | null
  }
}
