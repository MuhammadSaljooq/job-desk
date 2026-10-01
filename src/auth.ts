import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"
import { verifyCredentials } from "@/features/auth/credentials"

// Auth.js v5. Email + password today (credentials, JWT sessions); the Prisma adapter and
// its tables are in place so a magic-link provider can be added later.
// The session only carries the user id. requireUser() (src/lib/auth.ts) loads the user,
// business and role fresh from the database on every request.

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => verifyCredentials(credentials),
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.uid = user.id
      return token
    },
    session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid
      return session
    },
  },
})
