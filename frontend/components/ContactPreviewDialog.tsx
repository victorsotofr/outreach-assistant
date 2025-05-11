import React, { useState } from 'react';
import { Button } from "@/components/ui/button";

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

  const handleConfirm = async () => {
    setIsSending(true);
    setShowStreamingDialog(true);
    setIsComplete(false);

    try {
      const response = await fetch("http://localhost:8000/send-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          sheet_url: sheetUrl,
          confirmed: true,
        }),
      });

      if (!response.ok) throw new Error("Failed to send emails");

      // Wait for the response to complete
      await response.text();
      
      setIsComplete(true);
      // Update the email count in the dashboard
      onEmailsSent(data.length);
      setTimeout(() => {
        setShowStreamingDialog(false);
        onClose();
      }, 2500);
    } catch (error: any) {
      console.error("Error sending emails:", error);
    } finally {
      setIsSending(false);
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
