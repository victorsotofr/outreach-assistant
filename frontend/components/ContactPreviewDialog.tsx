import React, { useEffect, useState, useRef } from 'react';

interface ContactPreviewDialogProps {
  data: any[];
  onClose: () => void;
  email: string;
  sheetUrl: string;
}

const ContactPreviewDialog: React.FC<ContactPreviewDialogProps> = ({
  data,
  onClose,
  email,
  sheetUrl,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [showStreamingDialog, setShowStreamingDialog] = useState(false);
  const [statusMessages, setStatusMessages] = useState<string[]>([]);
  const statusContainerRef = useRef<HTMLDivElement>(null);

  const handleConfirm = async () => {
    setIsSending(true);
    setShowStreamingDialog(true);
    setStatusMessages([]);

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

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

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
              setStatusMessages(prev => [...prev, message]);
              // Auto-scroll to bottom
              if (statusContainerRef.current) {
                statusContainerRef.current.scrollTop = statusContainerRef.current.scrollHeight;
              }
            }
          } catch (e) {
            console.warn("Stream parse error:", line);
          }
        }
      }

      setStatusMessages(prev => [...prev, "✓ All emails sent successfully"]);
      setTimeout(() => {
        setShowStreamingDialog(false);
        onClose();
      }, 2500);
    } catch (error: any) {
      setStatusMessages(prev => [...prev, `❌ Error: ${error.message}`]);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (isSending && statusContainerRef.current) {
      statusContainerRef.current.scrollTop = statusContainerRef.current.scrollHeight;
    }
  }, [statusMessages, isSending]);

  return (
    <>
      <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Review Contacts Before Sending</h3>
            {!isSending && (
              <div className="flex gap-4">
                <button
                  onClick={onClose}
                  className="w-12 h-12 flex items-center justify-center bg-red-50 hover:bg-red-100 border-2 border-red-500 rounded-lg transition-colors"
                >
                  <span className="text-2xl text-red-600">✕</span>
                </button>
                <button
                  onClick={handleConfirm}
                  className="w-12 h-12 flex items-center justify-center bg-green-50 hover:bg-green-100 border-2 border-green-500 rounded-lg transition-colors"
                >
                  <span className="text-2xl text-green-600">➣</span>
                </button>
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
                <h3 className="text-lg font-semibold">Email Status</h3>
                {isSending && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                )}
              </div>
              {!isSending && (
                <button
                  onClick={() => setShowStreamingDialog(false)}
                  className="w-12 h-12 flex items-center justify-center bg-red-50 hover:bg-red-100 border-2 border-red-500 rounded-lg transition-colors"
                >
                  <span className="text-2xl text-red-600">✕</span>
                </button>
              )}
            </div>

            <div
              ref={statusContainerRef}
              className="bg-gray-50 rounded-lg p-4 max-h-[50vh] overflow-y-auto"
            >
              <div className="space-y-1">
                {statusMessages.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Sending emails...</p>
                ) : (
                  statusMessages.map((msg, idx) => (
                    <p key={idx} className="text-sm text-gray-600">{msg}</p>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContactPreviewDialog;
