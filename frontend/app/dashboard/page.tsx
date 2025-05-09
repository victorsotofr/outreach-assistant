'use client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { FolderOpen } from "lucide-react";

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
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [watchFolder, setWatchFolder] = useState("/Users/victorsoto/Downloads");
  const [settings, setSettings] = useState<UserSettings>({});
  const [contactPreview, setContactPreview] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>(["png"]);
  const [savedSection, setSavedSection] = useState<null | string>(null);
  const [isFileTypesExpanded, setIsFileTypesExpanded] = useState(false);

  const fileTypes = [
    { id: "png", label: "PNG" },
    { id: "jpg", label: "JPG" },
    { id: "jpeg", label: "JPEG" }
  ];

  const toggleFileType = (type: string) => {
    setSelectedFileTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const saveFileTypes = async () => {
    if (!session?.user?.email) return;

    try {
      const res = await fetch("http://localhost:8000/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.user.email,
          config: {
            ...settings,
            watched_file_types: selectedFileTypes,
          },
        }),
      });

      if (!res.ok) throw new Error("Save failed");
      setSavedSection("File Types");
      setTimeout(() => setSavedSection(null), 3000);
      toast.success("✓ File types saved");
      setSettings(prev => ({ ...prev, watched_file_types: selectedFileTypes }));
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save file types");
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    if (session?.user?.email) {
      fetchSettings();
    }
  }, [status, router, session]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`http://localhost:8000/config?email=${session?.user?.email}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched settings:', data);
        setSettings(data);
        setSelectedFileTypes(data.watched_file_types || ["png"]);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const fetchContactPreview = async () => {
    if (!settings.googleSheetUrl) return;
    setIsLoadingPreview(true);
    try {
      const response = await fetch(`http://localhost:8000/sheet-preview?url=${encodeURIComponent(settings.googleSheetUrl)}`);
      if (response.ok) {
        const data = await response.json();
        setContactPreview(data);
      }
    } catch (error) {
      console.error('Failed to fetch contact preview:', error);
      toast.error('Failed to load contact preview');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (settings.googleSheetUrl) {
      fetchContactPreview();
    }
  }, [settings.googleSheetUrl]);

  const startWatcher = async () => {
    try {
      const response = await fetch("http://localhost:8000/watcher/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          watchFolder: watchFolder,
          email: session?.user?.email,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start watcher");
      }

      setIsWatching(true);
      toast.success("Watcher started successfully");
    } catch (error) {
      console.error("Error starting watcher:", error);
      toast.error("Failed to start watcher");
    }
  };

  const handleStopWatching = async () => {
    try {
      const response = await fetch('http://localhost:8000/watcher/stop', { method: 'POST' });
      if (response.ok) {
        setIsWatching(false);
        toast.success('Stopped watching for screenshots');
      }
    } catch (error) {
      toast.error('Failed to stop watcher');
    }
  };

  const handleSelectFolder = async () => {
    try {
      const response = await fetch('http://localhost:8000/select-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      
      if (response.ok && data.folder) {
        setWatchFolder(data.folder);
        toast.success('Folder selected successfully');
      } else {
        toast.error(data.error || 'Failed to select folder');
      }
    } catch (error) {
      console.error('Folder selection error:', error);
      toast.error('Failed to select folder');
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
          
          {/* Step 1: Watch Screenshots */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">1. Watch Screenshots</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Automatically process screenshots from your selected folder
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={startWatcher}
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
                        Supported formats: PNG, JPG, JPEG
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
              <section className="bg-white border border-gray-200 rounded-xl p-6 shadow space-y-4">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setIsFileTypesExpanded(!isFileTypesExpanded)}
                >
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    ❏ File Types To Process
                  </h2>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transform transition-transform ${isFileTypesExpanded ? 'rotate-180' : ''}`}
                  >
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </div>
                {isFileTypesExpanded && (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-4">
                      <p className="text-sm text-gray-600 whitespace-nowrap">
                        Select the file types to watch for in your selected folder:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {fileTypes.map((type) => (
                          <button
                            key={type.id}
                            onClick={() => toggleFileType(type.id)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                              selectedFileTypes.includes(type.id)
                                ? "bg-blue-500 text-white border border-blue-600"
                                : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {selectedFileTypes.length === 0 && (
                      <p className="text-sm text-red-500">Please select at least one file type</p>
                    )}
                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={saveFileTypes}
                        disabled={selectedFileTypes.length === 0}
                        className="mt-2"
                      >
                        Save File Types
                      </Button>
                      {savedSection === "File Types" && (
                        <span className="text-sm text-green-600">✓ Saved</span>
                      )}
                    </div>
                  </div>
                )}
              </section>
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
              {settings.googleSheetUrl && (
                <div className="mt-4 border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-700">Contact List Preview (First 5 rows)</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchContactPreview}
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
        </div>
      </div>
    </main>
  );
}
