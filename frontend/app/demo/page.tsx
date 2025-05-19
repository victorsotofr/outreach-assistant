'use client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  if (status === "loading") return (
    <main className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto px-6 py-8 flex justify-center">
        <div className="w-full max-w-4xl space-y-6">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
          
          <div className="border rounded-lg p-6">
            <div className="space-y-4">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
              
              <div className="aspect-video w-full bg-gray-100 rounded-lg animate-pulse"></div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-lg space-y-2">
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
  if (!session) return null;

  return (
    <main className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto px-6 py-8 flex justify-center">
        <div className="w-full max-w-4xl space-y-6">
          <h1 className="text-2xl font-semibold">⌟ Demo</h1>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">How It Works</h2>
                <p className="text-gray-600">
                  From your favorite LinkedIn profiles to automated email outreach, we've got you covered.
                </p>
                
                <div className="aspect-video w-full">
                  <video 
                    className="w-full h-full rounded-lg shadow-lg"
                    controls
                    poster="/uiform-logo.png"
                  >
                    <source src="/outreach-demo.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-2">1. Import Contacts</h3>
                    <p className="text-sm text-gray-600">Connect UiForm and your Google Sheet to import your contact list in seconds.</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-2">2. AI Enrichment</h3>
                    <p className="text-sm text-gray-600">Our AI automatically enriches contact data with company information and personalization.</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-2">3. Send & Track</h3>
                    <p className="text-sm text-gray-600">Send personalized emails and track responses all in one place.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
