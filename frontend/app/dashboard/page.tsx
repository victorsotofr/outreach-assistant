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
import { ArrowDownTrayIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import ContactPreviewDialog from "@/components/ContactPreviewDialog";

interface Session {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

interface UserSettings {
  google_sheet_url?: string;
  openai_api_key?: string;
  uiform_api_key?: string;
  smtp_pass?: string;
  watched_file_types?: string[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession() as { data: Session | null, status: string };
  const router = useRouter();

  const [isWatching, setIsWatching] = useState(false);
  const [watchFolder, setWatchFolder] = useState("");
  const [watcherSessionId, setWatcherSessionId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({});
  const [contactPreview, setContactPreview] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string[]>([]);
  const [contactsProcessed, setContactsProcessed] = useState(0);
  const [emailsSent, setEmailsSent] = useState(0);
  const [missingSettings, setMissingSettings] = useState<string[]>([]);
  const [isFolderValidated, setIsFolderValidated] = useState(false);
  const [statusMessages, setStatusMessages] = useState<string[]>([]);

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
        setIsFolderValidated(true);
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
      if (!config?.google_sheet_url) {
        throw new Error('Google Sheet URL not configured in settings');
      }

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
      
      // Update the contacts count after successful download
      fetchTotalContacts();
      
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to download contact list');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmails = async () => {
    if (!config?.google_sheet_url) {
      toast.error("Please set up your Google Sheet URL in the settings first");
      return;
    }

    try {
      setIsSending(true);
      setEmailStatus([]);

      const previewResponse = await fetch(`http://localhost:8000/sheet-preview?url=${encodeURIComponent(config.google_sheet_url)}`);

      if (!previewResponse.ok) {
        const errorText = await previewResponse.text();
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || "Failed to get preview";
        } catch {
          errorMessage = errorText || "Failed to get preview";
        }
        throw new Error(errorMessage);
      }

      const previewData = await previewResponse.json();
      if (!Array.isArray(previewData) || previewData.length === 0) {
        throw new Error("No data found in the Google Sheet");
      }

      setPreviewData(previewData);
      setShowPreviewDialog(true);
    } catch (error) {
      console.error("Error getting preview:", error);
      toast.error(error instanceof Error ? error.message : "Failed to get preview");
    } finally {
      setIsSending(false);
    }
  };

  const streamEmailSending = async () => {
    try {
      const response = await fetch("http://localhost:8000/send-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session?.user?.email,
          sheet_url: config?.google_sheet_url,
          confirmed: true,
        }),
      });

      if (!response.ok) throw new Error("Failed to send emails");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response stream");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(Boolean);

        for (const line of lines) {
          try {
            const cleanLine = line.replace(/^data: /, "").trim();
            if (!cleanLine) continue;
            
            // Handle both JSON and plain text messages
            let message;
            try {
              const parsed = JSON.parse(cleanLine);
              message = parsed.message;
            } catch {
              // If not JSON, use the line as is
              message = cleanLine;
            }

            if (message) {
              setEmailStatus(prev => [...prev, message]);
              if (message.includes("✓ Email sent to")) {
                setEmailsSent(prev => prev + 1);
              }
            }
          } catch (e) {
            console.warn("Stream parse error:", line);
          }
        }
      }
    } catch (err) {
      toast.error("Streaming error during email send");
    }
  };

  const checkMissingSettings = (config: any) => {
    const missing: string[] = [];
    if (!config?.openai_api_key) missing.push("OpenAI API Key");
    if (!config?.uiform_api_key) missing.push("UiForm API Key");
    if (!config?.google_sheet_url) missing.push("Google Sheet URL");
    if (!config?.smtp_user || !config?.smtp_pass || !config?.smtp_server || !config?.smtp_port) {
      missing.push("Email Settings");
    }
    setMissingSettings(missing);
  };

  const fetchTotalContacts = async () => {
    if (!config?.google_sheet_url) return;
    
    try {
      const response = await fetch(`http://localhost:8000/sheet-preview?url=${encodeURIComponent(config.google_sheet_url)}&rows=1000`);
      if (response.ok) {
        const data = await response.json();
        setContactsProcessed(data.length);
      }
    } catch (error) {
      console.error('Failed to fetch total contacts:', error);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    const fetchConfig = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch(`http://localhost:8000/config?email=${session.user.email}`);
          if (response.ok) {
            const data = await response.json();
            setConfig(data);
            checkMissingSettings(data);
            // Fetch total contacts when config is loaded
            if (data.google_sheet_url) {
              fetchTotalContacts();
            }
          }
        } catch (error) {
          console.error("Error fetching config:", error);
        }
      }
    };

    fetchConfig();
  }, [session?.user?.email]);

  if (status === "loading") return <div>Loading...</div>;
  if (!session) return null;

  return (
    <main className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto px-6 py-8 flex justify-center">
        <div className="w-full max-w-4xl space-y-8">
          <h1 className="text-2xl font-semibold">⌟ Dashboard</h1>

          {missingSettings.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-1 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-blue-700 font-medium">Configuration Required</p>
                  <p className="text-sm text-blue-600">
                    Please configure the following settings to use all features:
                  </p>
                  <ul className="text-sm text-blue-600 list-disc list-inside">
                    {missingSettings.map((setting, index) => (
                      <li key={index}>{setting}</li>
                    ))}
                  </ul>
                  <a
                    href="/settings"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    Go to Settings
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          )}

          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-8">
                <div className="flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                    isWatching ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <div className={`w-8 h-8 rounded-full ${
                      isWatching ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    }`} />
                  </div>
                  <span className="text-sm text-gray-600">Processing Status</span>
                  <span className={`text-lg font-semibold ${
                    isWatching ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {isWatching ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-600">Contacts in Active Sheet</span>
                  <span className="text-lg font-semibold text-blue-600">{contactsProcessed}</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-600">Emails</span>
                  <span className="text-lg font-semibold text-purple-600">{emailsSent}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Bucker Folder</h2>
                  {isFolderValidated && (
                    <span className="text-green-500">✓</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Process PNG files from your Selected Bucket Folder:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Off</span>
                    <Switch
                      checked={isWatching}
                      onCheckedChange={toggleWatcher}
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
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading || !config?.google_sheet_url || isWatching}
                  className={`flex flex-col items-center justify-center p-6 rounded-xl transition-all duration-200 ${
                    isDownloading
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <ArrowDownTrayIcon className={`h-12 w-12 mb-2 ${isDownloading ? 'text-blue-600' : 'text-gray-600'}`} />
                  <span className={`text-lg font-medium ${isDownloading ? 'text-blue-600' : 'text-gray-900'}`}>
                    Download
                  </span>
                </button>

                <button
                  onClick={handleSendEmails}
                  disabled={isSending || !config?.google_sheet_url || isWatching}
                  className={`flex flex-col items-center justify-center p-6 rounded-xl transition-all duration-200 ${
                    isSending
                      ? 'bg-purple-50 border-2 border-purple-500'
                      : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <PaperAirplaneIcon className={`h-12 w-12 mb-2 ${isSending ? 'text-purple-600' : 'text-gray-600'}`} />
                  <span className={`text-lg font-medium ${isSending ? 'text-purple-600' : 'text-gray-900'}`}>
                    Send
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Dialog */}
      {showPreviewDialog && (
        <ContactPreviewDialog
          data={previewData}
          onClose={() => setShowPreviewDialog(false)}
          email={session?.user?.email || ''}
          sheetUrl={config?.google_sheet_url || ''}
        />
      )}

      {/* Email Status */}
      {emailStatus.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-y-auto">
          <h4 className="font-semibold mb-2">Email Status</h4>
          <div className="space-y-1">
            {emailStatus.map((status, idx) => (
              <p key={idx} className="text-sm text-gray-600">{status}</p>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
