'use client';

import { useSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { data: session, status } = useSession();

  if (status === "authenticated") {
    return null;
  }

  return (
    <nav className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-end h-16">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="text-gray-900 hover:text-gray-600 font-semibold text-base sm:text-lg transition-colors"
            >
              ⇥ Sign In
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
