'use client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { FolderOpen } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Session {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

interface UserSettings {
  googleSheetUrl?: string;
  openai_api_key?: string;
  uiform_api_key?: string;
  smtp_pass?: string;
  watched_file_types?: string[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession() as { data: Session | null, status: string };
  const router = useRouter();

  const [isWatching, setIsWatching] = useState(false);
  const [watchFolder, setWatchFolder] = useState("/Users/victorsoto/Downloads");
  const [watcherSessionId, setWatcherSessionId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({});
  const [contactPreview, setContactPreview] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const toggleWatcher = async (checked: boolean) => {
    const endpoint = checked ? "/watcher/start" : "/watcher/stop";
    const payload = {
      email: session?.user?.email,
      ...(checked
        ? { 
            watchFolder, 
            fileTypes: ["png"],
            extensions: [".png"]
          }
        : { sessionId: watcherSessionId }),
    };

    try {
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      
      const data = await res.json();

      if (checked) {
        setWatcherSessionId(data.sessionId);
        setIsWatching(true);
        toast.success("PNG file watcher started");
      } else {
        setWatcherSessionId(null);
        setIsWatching(false);
        toast.success("PNG file watcher stopped");
      }
    } catch (err) {
      console.error("Watcher error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to toggle watcher");
      // Revert the switch state if there was an error
      setIsWatching(!checked);
    }
  };

  const handleSelectFolder = async () => {
    if (isWatching) {
      toast.error("Stop the watcher first");
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/select-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok && data.folder) {
        setWatchFolder(data.folder);
        toast.success("Folder selected");
      } else {
        toast.error(data.error || "Failed to select folder");
      }
    } catch (err) {
      console.error("Folder selection error:", err);
      toast.error("Failed to select folder");
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // First get the user's Google Sheet URL from config
      const configResponse = await fetch(`http://localhost:8000/config?email=${session?.user?.email}`);
      if (!configResponse.ok) {
        throw new Error('Failed to fetch configuration');
      }
      const config = await configResponse.json();

      if (!config.google_sheet_url) {
        throw new Error('Google Sheet URL not configured');
      }

      // Then download the contacts
      const response = await fetch('http://localhost:8000/download-contacts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: session?.user?.email,
          sheet_url: config.google_sheet_url
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = await response.json();
      toast.success('Contact list downloaded successfully');
      
      // Refresh the contact preview
      if (config.google_sheet_url) {
        setIsLoadingPreview(true);
        try {
          const previewResponse = await fetch(`http://localhost:8000/sheet-preview?url=${encodeURIComponent(config.google_sheet_url)}`);
          if (previewResponse.ok) {
            const previewData = await previewResponse.json();
            setContactPreview(previewData || []);
          }
        } catch (error) {
          console.error('Failed to refresh preview:', error);
        } finally {
          setIsLoadingPreview(false);
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to download contact list');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmails = async () => {
    setIsSending(true);
    try {
      const response = await fetch('http://localhost:8000/send-emails', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: session?.user?.email
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = await response.json();
      toast.success('Emails sent successfully');
    } catch (error) {
      console.error('Send emails error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send emails');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  if (status === "loading") return <div>Loading...</div>;
  if (!session) return null;

  return (
    <main className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto px-6 py-8 flex justify-center">
        <div className="w-full max-w-4xl space-y-8">
          <h1 className="text-2xl font-semibold">⌟ Dashboard</h1>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm text-gray-700">
                <div>
                  <h2 className="block text-l font-light text-black">
                    Bucket Folder Watcher
                  </h2>
                  <span className="block text-xl font-bold text-[#1C65BD]">
                    {isWatching ? "Active" : "Inactive"}
                  </span>
                </div>
                <div>
                  <h2 className="block text-l font-light text-black">
                    Contacts Processed
                  </h2>
                  <span className="block text-xl font-bold text-[#1C65BD]">0</span>
                </div>
                <div>
                  <h2 className="block text-l font-light text-black">
                    Emails Sent
                  </h2>
                  <span className="block text-xl font-bold text-[#1C65BD]">0</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">1. PNG File Watcher</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Automatically process PNG files from your selected folder:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Off</span>
                    <Switch
                      checked={isWatching}
                      onCheckedChange={toggleWatcher}
                      disabled={isWatching && !watcherSessionId}
                    />
                    <span className="text-sm text-gray-500">On</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-gray-500" />
                <Input
                  value={watchFolder}
                  readOnly
                  placeholder="Select a folder to watch"
                  className="flex-1"
                  disabled={isWatching}
                />
                <Button
                  onClick={handleSelectFolder}
                  disabled={isWatching}
                  variant="outline"
                >
                  Select
                </Button>
              </div>
              {isWatching && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <div className="bg-blue-100 p-1 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4" />
                        <path d="M12 8h.01" />
                      </svg>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-blue-700 font-medium">Watcher is active</p>
                      <p className="text-sm text-blue-600">
                        Drop your documents (e.g. Screenshots) in the selected folder to process them automatically.
                      </p>
                      <p className="text-sm text-blue-600">
                        Supported formats: PNG
                      </p>
                      <div className="text-sm text-blue-600 space-y-1">
                        <p>
                          • View your processing schema at{" "}
                          <a 
                            href="https://www.uiform.com/dashboard/deployments" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="underline hover:text-blue-800"
                          >
                            UiForm Deployments
                          </a>
                        </p>
                        <p>
                          • View your extractions in your configured Google Sheet. See the link in{" "}
                          <a 
                            href="/settings"
                            className="underline hover:text-blue-800"
                          >
                            Settings
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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
                  variant="outline"
                  className="border-2 hover:bg-gray-50"
                >
                  {isDownloading ? "Downloading..." : "Download List ↓"}
                </Button>
              </div>
              {settings.googleSheetUrl && (
                <div className="mt-4 border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-700">Contact List Preview (First 5 rows)</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {}}
                      disabled={isLoadingPreview}
                    >
                      {isLoadingPreview ? "Refreshing..." : "Refresh"}
                    </Button>
                  </div>
                  {isLoadingPreview ? (
                    <div className="p-4 text-center text-gray-500">Loading preview...</div>
                  ) : contactPreview.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {Object.keys(contactPreview[0]).map((header) => (
                              <th key={header} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {contactPreview.map((row, idx) => (
                            <tr key={idx}>
                              {Object.values(row).map((value: any, cellIdx) => (
                                <td key={cellIdx} className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
                                  {value}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">No contacts available</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

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
                  variant="outline"
                  className="border-2 hover:bg-gray-50"
                >
                  {isSending ? "Sending..." : "Send Emails ➢"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
