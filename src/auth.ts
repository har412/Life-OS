import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"
import { BUILT_IN_CATEGORIES, PRESET_SAVED_VIEWS } from "@/lib/taskData"


export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.hashedPassword) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        );

        if (!isPasswordValid) {
          return null;
        }

        return user;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      
      // Seed categories
      await Promise.all(
        BUILT_IN_CATEGORIES.map(cat => 
          prisma.category.create({
            data: {
              id: cat.id,
              label: cat.label,
              colorCode: JSON.stringify({ dot: cat.dot, badge: cat.badge, text: cat.text }),
              userId: user.id!,
            }
          })
        )
      );

      // Seed views
      await Promise.all(
        PRESET_SAVED_VIEWS.map(view =>
          prisma.savedView.create({
            data: {
              name: view.name,
              emoji: view.emoji,
              filters: view.filters as any,
              isDefault: view.name === "Today",
              userId: user.id!,
            }
          })
        )
      );
    }
  }
})

