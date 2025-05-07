'use client';

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";

export default function ReferencesPage() {
  const { data: session, status } = useSession();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Replace with real backend call
    setUploadedFiles(["corporate_finance.pdf", "valuation_notes.pdf"]);
  }, []);

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);

    try {
      const formData = new FormData();
      files.forEach(file => formData.append("files", file));

      const res = await fetch("/api/references/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      toast.success("📄 Documents uploaded and processed.");
      setFiles([]);
      setUploadedFiles((prev) => [...prev, ...files.map(f => f.name)]);
    } catch (err) {
      console.error(err);
      toast.error("❌ Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const toggleSelection = (fileName: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      newSet.has(fileName) ? newSet.delete(fileName) : newSet.add(fileName);
      return newSet;
    });
  };

  if (status === "loading") return <div>Loading...</div>;
  if (!session) return null;

  return (
    <main className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto px-6 py-8 flex justify-center">
        <div className="w-full max-w-4xl space-y-6">
          <h1 className="text-2xl font-semibold">References</h1>

          {/* Upload Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow space-y-4">
            <p className="text-sm text-gray-600">
              Upload course materials (PDF, DOCX...) to enable document-based Q&A.
              These files will empower your assistant for revisions.
            </p>

            <div className="flex items-center gap-4">
              <label
                htmlFor="file-upload"
                className="inline-block cursor-pointer bg-gray-100 border border-gray-300 text-sm px-4 py-2 rounded-md hover:bg-gray-200 transition"
              >
                ⏏︎ Add Files
              </label>

              <Button
                onClick={handleUpload}
                disabled={files.length === 0 || uploading}
                className="bg-[#1C65BD] hover:bg-[#0D2E57] text-white"
              >
                {uploading ? "Uploading..." : "Upload & Process"}
              </Button>
            </div>

            <input
              id="file-upload"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="hidden"
            />

            {files.length > 0 && (
              <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                {files.map((f) => (
                  <li key={f.name}>{f.name}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Uploaded Files List */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow space-y-4">
            <h2 className="text-lg font-semibold">✓ Uploaded Materials</h2>
            <ul className="space-y-2">
              {uploadedFiles.map((file) => (
                <li
                  key={file}
                  className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-md border hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file)}
                      onChange={() => toggleSelection(file)}
                    />
                    <button
                      className="text-sm text-blue-600 underline hover:text-blue-800"
                      onClick={() => setPreviewFile(file)}
                    >
                      {file}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <Modal onClose={() => setPreviewFile(null)}>
            <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">{previewFile}</h3>
            <iframe
                src={`/uploads/${previewFile}`}
                className="w-full h-[500px] rounded border"
            />
            </div>
        </Modal>
        )}
    </main>
  );
}
