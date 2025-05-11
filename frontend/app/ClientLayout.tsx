"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { cn } from "@/app/lib/utils";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!session && status !== "loading" && pathname !== "/") {
      router.push("/");
    }
  }, [session, status, pathname, router]);

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={cn(
        "block px-3 py-2 rounded text-sm font-medium transition",
        pathname === href
          ? "bg-gray-100 text-gray-1500 font-bold"
          : "hover:bg-gray-50 text-gray-1000"
      )}
    >
      {label}
    </Link>
  );

  if (status === "loading") return null;

  if (!session && pathname === "/") {
    // Public homepage without sidebar
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen">
      <aside
        className={cn(
          "bg-[#F9FAFB] border-r p-4 flex flex-col justify-between transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="pl-2">
                <img
                  src="/uiform-logo.png"
                  alt="UiForm Logo"
                  className="h-8 w-auto"
                />
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-gray-400 hover:text-gray-700 transition text-sm"
            >
              {collapsed ? "→" : "←"}
            </button>
          </div>

          {!collapsed && (
            <>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                  ASSISTANT
                </p>
                <nav className="space-y-1 pl-2">
                  {navLink("/dashboard", "⌟ Dashboard")}
                </nav>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                  USEFUL
                </p>
                <nav className="space-y-1 pl-2">
                  {navLink("/demo", "⌟ Demo")}
                  {navLink("/templates", "⌟ Templates")}
                  {navLink("/settings", "Settings")}
                </nav>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          {!collapsed && (
            <>
              <button
                onClick={() => signOut()}
                className="w-full px-3 py-2 rounded text-sm font-semibold text-red-600 bg-gray-100 hover:bg-red-100 hover:text-red-700 transition"
              >
                ⇤ Sign Out
              </button>
              <div className="text-xs text-gray-400 text-center">
                Built with 🖤 for UiForm.com
              </div>
            </>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isModalPreview = pathname.startsWith("/uploads");

  return (
    <SessionProvider>
      {!isModalPreview && <Navbar />}
      {pathname === "/" || isModalPreview ? (
        <>{children}</>
      ) : (
        <AuthenticatedLayout>{children}</AuthenticatedLayout>
      )}
    </SessionProvider>
  );
}
