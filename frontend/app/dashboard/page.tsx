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

  if (status === "loading") return <div>Loading...</div>;
  if (!session) return null;

  return (
    <main className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto px-6 py-8 flex justify-center">
        <div className="w-full max-w-4xl space-y-6">
          <h1 className="text-2xl font-semibold">⌟ Dashboard</h1>

          {/* Progress Section */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">Your Progress</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm text-gray-700">
                <div>
                  <span className="block text-xl font-bold text-[#1C65BD]">76%</span>
                  Quiz Accuracy
                </div>
                <div>
                  <span className="block text-xl font-bold text-[#1C65BD]">14</span>
                  Quizzes Completed
                </div>
                <div>
                  <span className="block text-xl font-bold text-[#1C65BD]">3h 25m</span>
                  Study Time
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credits */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">Credits</h2>
              <p className="text-sm text-gray-600">You have <strong>18</strong> credits remaining this month.</p>
              <Button variant="outline">Manage Subscription</Button>
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">Latest Activity</h2>
              <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1">
                <li>📘 Finished 10-question Valuation quiz (8/10 correct)</li>
                <li>🗓️ Last active: May 4, 2025 – 3:42 PM</li>
                <li>🌐 Started Internet-augmented Free Answer session</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
