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
      username?: string; // Twitter username
      profilePicture?: string; // Twitter profile picture
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string; // Twitter username
    profilePicture?: string; // Twitter profile picture
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
      try {
        console.log('SignIn callback:', { user: user?.name, provider: account?.provider });
        return true;
      } catch (error) {
        console.error('SignIn callback error:', error);
        return false;
      }
    },
    async session({ session, token }) {
      try {
        console.log('Session callback - token:', token);
        if (token.username) {
          session.user.username = token.username;
          session.user.profilePicture = token.profilePicture;
        }
        return session;
      } catch (error) {
        console.error('Session callback error:', error);
        return session;
      }
    },
    async jwt({ token, account, profile }) {
      try {
        console.log('JWT callback - profile:', profile);
        console.log('JWT callback - account:', account);
        
        if (account?.provider === 'twitter' && profile) {
          // Handle the actual Twitter profile structure from logs
          let twitterUsername = '';
          let twitterProfilePicture = '';
          
          // The profile structure from logs shows: OAuthProfile.data.{username, profile_image_url}
          if (profile && typeof profile === 'object' && 'data' in profile) {
            const profileData = (profile as any).data;
            twitterUsername = profileData?.username || '';
            twitterProfilePicture = profileData?.profile_image_url || '';
          }
          
          console.log('Extracted Twitter data:', { username: twitterUsername, profilePicture: twitterProfilePicture });
          
          if (twitterUsername) {
            token.username = twitterUsername;
            token.profilePicture = twitterProfilePicture;
          }
        }
        return token;
      } catch (error) {
        console.error('JWT callback error:', error);
        return token;
      }
    },
  },
  session: {
    strategy: 'jwt',
  },
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
