'use client';

import { useSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { data: session, status } = useSession();

  if (status === "authenticated") {
    return null;
  }

  return (
    <nav className="absolute top-0 left-0 right-0 z-50 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-end h-16">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="text-white hover:text-white/80 font-semibold text-base sm:text-lg transition-colors bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20"
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
