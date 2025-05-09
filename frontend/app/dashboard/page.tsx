'use client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isWatching, setIsWatching] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  const handleStartWatching = async () => {
    try {
      const response = await fetch('/api/watcher/start', { method: 'POST' });
      if (response.ok) {
        setIsWatching(true);
        toast.success('Started watching for screenshots');
      }
    } catch (error) {
      toast.error('Failed to start watcher');
    }
  };

  const handleStopWatching = async () => {
    try {
      const response = await fetch('/api/watcher/stop', { method: 'POST' });
      if (response.ok) {
        setIsWatching(false);
        toast.success('Stopped watching for screenshots');
      }
    } catch (error) {
      toast.error('Failed to stop watcher');
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/contacts/download', { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        toast.success('Contact list downloaded successfully');
      } else {
        toast.error(data.error || 'Failed to download contact list');
      }
    } catch (error) {
      toast.error('Failed to download contact list');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmails = async () => {
    setIsSending(true);
    try {
      const response = await fetch('/api/emails/send', { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        toast.success('Emails sent successfully');
      } else {
        toast.error(data.error || 'Failed to send emails');
      }
    } catch (error) {
      toast.error('Failed to send emails');
    } finally {
      setIsSending(false);
    }
  };

  if (status === "loading") return <div>Loading...</div>;
  if (!session) return null;

  return (
    <main className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto px-6 py-8 flex justify-center">
        <div className="w-full max-w-4xl space-y-8">
          <h1 className="text-2xl font-semibold">⌟ Dashboard</h1>

          {/* Step 1: Watch Folder */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">1. Watch Screenshots</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Automatically process screenshots from your Downloads folder
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleStartWatching}
                    disabled={isWatching}
                    variant={isWatching ? "outline" : "default"}
                  >
                    {isWatching ? "◉ Watching..." : "◉ Start Watching"}
                  </Button>
                  <Button 
                    onClick={handleStopWatching}
                    disabled={!isWatching}
                    variant="destructive"
                  >
                    ◎ Stop
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Download Contact List */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">2. Download Contact List</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Get the latest contact list from your Google Sheet
                  </p>
                </div>
                <Button 
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  {isDownloading ? "↓ Downloading..." : "↓ Download List"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Send Emails */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">3. Send Outreach Emails</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Send personalized emails to your contacts
                  </p>
                </div>
                <Button 
                  onClick={handleSendEmails}
                  disabled={isSending}
                >
                  {isSending ? "➢ Sending..." : "➢ Send Emails"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Status Section */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">Status</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm text-gray-700">
                <div>
                  <span className="block text-xl font-bold text-[#1C65BD]">
                    {isWatching ? "Active" : "Inactive"}
                  </span>
                  Screenshot Watcher
                </div>
                <div>
                  <span className="block text-xl font-bold text-[#1C65BD]">0</span>
                  Contacts Processed
                </div>
                <div>
                  <span className="block text-xl font-bold text-[#1C65BD]">0</span>
                  Emails Sent
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
