import NextAuth, { NextAuthOptions } from 'next-auth';
import TwitterProvider from 'next-auth/providers/twitter';

// Twitter profile type
interface TwitterProfile {
  id: string;
  username: string;
  name: string;
  profile_image_url: string;
  verified: boolean;
}

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      twitterUsername?: string;
      twitterProfilePicture?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    twitterUsername?: string;
    twitterProfilePicture?: string;
  }
}

const authOptions: NextAuthOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2.0",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Just verify the user can authenticate with X
      // No database updates needed here
      return true;
    },
    async session({ session, token }) {
      if (token.twitterUsername) {
        session.user.twitterUsername = token.twitterUsername;
        session.user.twitterProfilePicture = token.twitterProfilePicture;
      }
      return session;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === 'twitter' && profile) {
        // Just store username and profile picture
        const twitterProfile = profile as TwitterProfile;
        token.twitterUsername = twitterProfile.username;
        token.twitterProfilePicture = twitterProfile.profile_image_url;
      }
      return token;
    },
  },
  session: {
    strategy: 'jwt',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
