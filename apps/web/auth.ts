import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@papertrader/database';
import Credentials from 'next-auth/providers/credentials';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // TODO: Implement proper authentication logic
        // For now, this is a placeholder
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // In production, verify password hash
        return {
          id: '1',
          email: credentials.email as string,
          name: 'Demo User',
        };
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
});
