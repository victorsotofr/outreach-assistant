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
    signIn: "/",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      return `${baseUrl}/dashboard`;
    },
    async session({ session }) {
      return session;
    },
  },
});

export { handler as GET, handler as POST };
