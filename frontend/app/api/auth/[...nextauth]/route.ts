import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/", // custom sign-in page (landing page)
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      return `${baseUrl}/chat`; // Always redirect to /chat after login
    },
    async session({ session }) {
      return session;
    },
  },
});

export { handler as GET, handler as POST };
