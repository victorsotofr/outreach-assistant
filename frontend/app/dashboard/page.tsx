'use client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { FolderOpen } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ArrowDownTrayIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import ContactPreviewDialog from "@/components/ContactPreviewDialog";
import { useDropzone } from "react-dropzone";

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: string}>({});

  // Load persisted values from localStorage on component mount
  useEffect(() => {
    const storedEmailsSent = localStorage.getItem('emailsSent');
    if (storedEmailsSent) {
      setEmailsSent(parseInt(storedEmailsSent, 10));
    }
  }, []);

  // Update localStorage when emailsSent changes
  useEffect(() => {
    localStorage.setItem('emailsSent', emailsSent.toString());
  }, [emailsSent]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      if (!config?.google_sheet_url) {
        throw new Error('Google Sheet URL not configured in settings');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/download-contacts`, {
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
        const error = await response.json();
        throw new Error(error.detail || 'Failed to download contact list');
      }

      const data = await response.json();
      
      // Create a download link
      const downloadLink = document.createElement('a');
      downloadLink.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/download-file?path=${encodeURIComponent(data.file_path)}`;
      downloadLink.download = 'contact_list.xlsx';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
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

      const previewResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/sheet-preview?url=${encodeURIComponent(config.google_sheet_url)}`);

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/send-emails`, {
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/sheet-preview?url=${encodeURIComponent(config.google_sheet_url)}&rows=1000`);
      if (response.ok) {
        const data = await response.json();
        setContactsProcessed(data.length);
      }
    } catch (error) {
      console.error('Failed to fetch total contacts:', error);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!session?.user?.email) {
      toast.error("Please log in to process images");
      return;
    }

    setIsUploading(true);
    const newProgress = { ...uploadProgress };

    for (const file of acceptedFiles) {
      if (!file.name.toLowerCase().endsWith('.png')) {
        toast.error(`${file.name} is not a PNG file`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('email', session.user.email);

        newProgress[file.name] = 'uploading';
        setUploadProgress(newProgress);

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/process-image`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to process image');
        }

        newProgress[file.name] = 'success';
        setUploadProgress(newProgress);
        toast.success(`Successfully processed ${file.name}`);
      } catch (error) {
        console.error('Upload error:', error);
        newProgress[file.name] = 'error';
        setUploadProgress(newProgress);
        toast.error(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    setIsUploading(false);
  }, [session?.user?.email, uploadProgress]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png']
    },
    disabled: isUploading
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    const fetchConfig = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/config?email=${session.user.email}`);
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

  // Fetch contacts count when config changes
  useEffect(() => {
    if (config?.google_sheet_url) {
      fetchTotalContacts();
    }
  }, [config?.google_sheet_url]);

  if (status === "loading") return <div>Loading...</div>;
  if (!session) return null;

  return (
    <main className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto px-6 py-8 flex justify-center">
        <div className="w-full max-w-4xl space-y-8">
          <h1 className="text-2xl font-semibold">⌟ Dashboard</h1>

          {missingSettings.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-red-100 p-1 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-red-700 font-medium">Configuration Required</p>
                  <p className="text-sm text-red-600">
                    Please configure the following settings to use all features:
                  </p>
                  <ul className="text-sm text-red-600 list-disc list-inside">
                    {missingSettings.map((setting, index) => (
                      <li key={index}>{setting}</li>
                    ))}
                  </ul>
                  <a
                    href="/settings"
                    className="inline-flex items-center text-sm text-red-600 hover:text-red-800 hover:underline transition-colors"
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
              <div className="grid grid-cols-2 gap-8">
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
                  <span className="text-sm text-gray-600">Emails Sent</span>
                  <span className="text-lg font-semibold text-purple-600">{emailsSent}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Process Images</h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Drop PNG files to process them automatically</span>
                </div>
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                  ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input {...getInputProps()} />
                <div className="space-y-2">
                  <FolderOpen className="h-12 w-12 mx-auto text-gray-400" />
                  {isDragActive ? (
                    <p className="text-blue-600">Drop the files here...</p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-gray-600">Drag & drop PNG files here, or click to select files</p>
                      <p className="text-sm text-gray-500">Only PNG files are supported</p>
                    </div>
                  )}
                </div>
                      </div>

              {Object.keys(uploadProgress).length > 0 && (
                <div className="mt-4 space-y-2">
                  {Object.entries(uploadProgress).map(([filename, status]) => (
                    <div key={filename} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">{filename}</span>
                      <span className={`text-sm ${
                        status === 'success' ? 'text-green-600' :
                        status === 'error' ? 'text-red-600' :
                        'text-blue-600'
                      }`}>
                        {status === 'success' ? '✓ Processed' :
                         status === 'error' ? '✕ Failed' :
                         '⟳ Processing...'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading || !config?.google_sheet_url}
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
                  disabled={isSending || !config?.google_sheet_url}
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
          onEmailsSent={(count) => {
            setEmailsSent(prev => prev + count);
          }}
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
