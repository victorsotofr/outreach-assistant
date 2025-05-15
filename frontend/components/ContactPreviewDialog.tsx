import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ContactPreviewDialogProps {
  data: any[];
  onClose: () => void;
  email: string;
  sheetUrl: string;
  onEmailsSent: (count: number) => void;
}

const ContactPreviewDialog: React.FC<ContactPreviewDialogProps> = ({
  data,
  onClose,
  email,
  sheetUrl,
  onEmailsSent,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [showStreamingDialog, setShowStreamingDialog] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [useCc, setUseCc] = useState(false);

  const handleConfirm = async () => {
    setIsSending(true);
    setShowStreamingDialog(true);
    setIsComplete(false);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/send-emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          sheet_url: sheetUrl,
          confirmed: true,
          use_cc: useCc,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to send emails");
      }

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
            let type = "status";
            try {
              const parsed = JSON.parse(cleanLine);
              message = parsed.message;
              type = parsed.type || "status";
            } catch {
              // If not JSON, use the line as is
              message = cleanLine;
            }

            if (message) {
              console.log(`[${type}] ${message}`); // Add console logging
              
              if (type === "error") {
                toast.error(message);
                setIsSending(false);
                setShowStreamingDialog(false);
                return;
              } else if (message.includes("✓ Email sent to")) {
                onEmailsSent(1);
                toast.success(message);
              } else if (message.includes("✓ All emails sent successfully")) {
                setIsComplete(true);
                toast.success("✓ All emails sent successfully");
                setIsSending(false);

                // Download the updated contact list
                try {
                  const downloadResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/download-contacts`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email,
                      sheet_url: sheetUrl,
                      action: "download"
                    }),
                  });

                  if (!downloadResponse.ok) {
                    throw new Error("Failed to download updated contacts");
                  }

                  const blob = await downloadResponse.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "updated_contacts.xlsx";
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  toast.success("✓ Updated contact list downloaded");
                } catch (downloadError) {
                  console.error("Error downloading updated contacts:", downloadError);
                  toast.error("Failed to download updated contacts");
                }

                setTimeout(() => {
                  setShowStreamingDialog(false);
                  onClose();
                }, 2000);
              } else if (message.includes("→ Updated contact list saved to:")) {
                // Skip this message as we'll show a better one after download
                continue;
              } else {
                toast(message);
              }
            }
          } catch (e) {
            console.error("Stream parse error:", e, line);
            toast.error("Error processing server response");
            setIsSending(false);
            setShowStreamingDialog(false);
            return;
          }
        }
      }
    } catch (error: any) {
      console.error("Error sending emails:", error);
      toast.error(error.message || "Failed to send emails");
      setIsSending(false);
      setShowStreamingDialog(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Review Contacts Before Sending</h3>
            {!isSending && (
              <div className="flex gap-4">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="w-12 h-12 flex items-center justify-center bg-red-50 hover:bg-red-100 border-2 border-red-500 rounded-lg transition-colors"
                >
                  <span className="text-2xl text-red-600">✕</span>
                </Button>
                <Button
                  onClick={handleConfirm}
                  variant="outline"
                  className="w-12 h-12 flex items-center justify-center bg-green-50 hover:bg-green-100 border-2 border-green-500 rounded-lg transition-colors"
                >
                  <span className="text-2xl text-green-600">➣</span>
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 mb-4">
            <Checkbox
              id="use-cc"
              checked={useCc}
              onCheckedChange={(checked) => setUseCc(checked as boolean)}
            />
            <Label htmlFor="use-cc">Add me in Cc</Label>
          </div>

          <div className="max-h-[70vh] overflow-y-auto mb-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {data[0] &&
                    Object.keys(data[0]).map((header) => (
                      <th
                        key={header}
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
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
        </div>
      </div>

      {/* Streaming Dialog */}
      {showStreamingDialog && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">Please Wait</h3>
                {isSending && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                )}
              </div>
              {!isSending && (
                <Button
                  onClick={() => setShowStreamingDialog(false)}
                  variant="outline"
                  className="w-12 h-12 flex items-center justify-center bg-red-50 hover:bg-red-100 border-2 border-red-500 rounded-lg transition-colors"
                >
                  <span className="text-2xl text-red-600">✕</span>
                </Button>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                {isComplete ? "✓ All emails sent successfully" : "Sending emails..."}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContactPreviewDialog;
