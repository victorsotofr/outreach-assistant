"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

export default function Settings() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [uiFormKey, setUiFormKey] = useState("");
  const [openAiKey, setOpenAiKey] = useState("");
  const [emailUser, setEmailUser] = useState("");
  const [emailPass, setEmailPass] = useState("");
  const [smtpServer, setSmtpServer] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>(["png"]);

  const [visibleFields, setVisibleFields] = useState<{ [key: string]: boolean }>({});
  const [savedFields, setSavedFields] = useState<{ [key: string]: boolean }>({});
  const [savedSection, setSavedSection] = useState<null | string>(null);

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

  const toggleVisibility = (field: string) => {
    setVisibleFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    if (!session?.user?.email) return;

    fetch(`http://localhost:8000/config?email=${session.user.email}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch config");
        return res.json();
      })
      .then(data => {
        setUiFormKey(data.uiform_api_key || "");
        setOpenAiKey(data.openai_api_key || "");
        setEmailUser(data.smtp_user || "");
        setEmailPass(data.smtp_pass || "");
        setSmtpServer(data.smtp_server || "");
        setSmtpPort(data.smtp_port || "");
        setGoogleSheetUrl(data.google_sheet_url || "");
        setSelectedFileTypes(data.watched_file_types || ["png"]);

        setSavedFields({
          uiform_api_key: !!data.uiform_api_key,
          openai_api_key: !!data.openai_api_key,
          smtp_user: !!data.smtp_user,
          smtp_pass: !!data.smtp_pass,
          smtp_server: !!data.smtp_server,
          smtp_port: !!data.smtp_port,
          google_sheet_url: !!data.google_sheet_url,
          watched_file_types: !!data.watched_file_types,
        });
      })
      .catch(err => {
        console.error("Error loading settings:", err);
        toast.error("Failed to load settings from server.");
      });
  }, [status, router, session]);

  const save = async (section: string) => {
    if (!session?.user?.email) return;

    try {
      const res = await fetch("http://localhost:8000/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.user.email,
          config: {
            openai_api_key: openAiKey,
            uiform_api_key: uiFormKey,
            smtp_user: emailUser,
            smtp_pass: emailPass,
            smtp_server: smtpServer,
            smtp_port: smtpPort,
            google_sheet_url: googleSheetUrl,
            watched_file_types: selectedFileTypes,
          },
        }),
      });

      if (!res.ok) throw new Error("Save failed");
      setSavedSection(section);
      setTimeout(() => setSavedSection(null), 3000);
      toast.success(`✓ ${section} saved.`);
      setSavedFields((prev) => ({
        ...prev,
        ...(section === "UiForm API Key" && { uiform_api_key: true }),
        ...(section === "OpenAI API Key" && { openai_api_key: true }),
        ...(section === "Google Sheet URL" && { google_sheet_url: true }),
        ...(section === "Email Settings" && {
          smtp_user: true,
          smtp_pass: true,
          smtp_server: true,
          smtp_port: true,
        }),
        ...(section === "File Types" && {
          watched_file_types: true,
        })
      }));
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save your settings.");
    }
  };

  const renderField = (
    key: string,
    value: string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    placeholder: string,
    type: string = "text"
  ) => (
    <div className="relative space-y-1">
      <div className="relative">
        <Input
          type={visibleFields[key] ? "text" : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`pr-10 ${!value ? "border-red-500" : savedFields[key] ? "bg-green-50 border-green-200" : ""}`}
        />
        {(type === "password" || key.includes("key") || key.includes("pass")) && (
          <div
            className="absolute inset-y-0 right-3 flex items-center cursor-pointer"
            onClick={() => toggleVisibility(key)}
          >
            {visibleFields[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </div>
        )}
      </div>
      {!value && <p className="text-sm text-red-500">Required</p>}
    </div>
  );

  if (status === "loading") return <div>Loading...</div>;
  if (!session) return null;

  return (
    <main className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto px-6 py-8 flex justify-center">
        <div className="w-full max-w-4xl space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="text-sm text-gray-600">
              Your informations are encrypted and stored securely per user.
            </p>
          </div>

          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Image src="/uiform-logo.png" alt="UiForm" width={20} height={20} />
              UiForm API Key
            </h2>
            {renderField("uiform_api_key", uiFormKey, (e) => setUiFormKey(e.target.value), "sk_uiform_...", "password")}
            <Button onClick={() => save("UiForm API Key")} className="mt-2">Save</Button>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Image src="/openai-logo.png" alt="OpenAI" width={20} height={20} />
              OpenAI API Key
            </h2>
            {renderField("openai_api_key", openAiKey, (e) => setOpenAiKey(e.target.value), "sk-...", "password")}
            <Button onClick={() => save("OpenAI API Key")} className="mt-2">Save</Button>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Image src="/googlesheet-logo.png" alt="Google" width={20} height={20} />
              Google Sheet URL
            </h2>
            <div className="space-y-2">
              {renderField("google_sheet_url", googleSheetUrl, (e) => setGoogleSheetUrl(e.target.value), "https://docs.google.com/...")}
              <div className="flex justify-between items-center">
                <Button onClick={() => save("Google Sheet URL")}>Save</Button>
                {googleSheetUrl && (
                  <a
                    href={googleSheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    title="Open Google Sheet"
                  >
                    Open Google Sheet
                  </a>
                )}
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow space-y-4">
            <h2 className="text-lg font-semibold">Email Settings</h2>
            <div className="space-y-4">
              {renderField("smtp_user", emailUser, (e) => setEmailUser(e.target.value), "your@email.com")}
              {renderField("smtp_pass", emailPass, (e) => setEmailPass(e.target.value), "Your SMTP password", "password")}
              {renderField("smtp_server", smtpServer, (e) => setSmtpServer(e.target.value), "smtp.gmail.com")}
              {renderField("smtp_port", smtpPort, (e) => setSmtpPort(e.target.value), "587")}
              <Button onClick={() => save("Email Settings")}>Save</Button>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow space-y-4">
            <h2 className="text-lg font-semibold">Watched File Types</h2>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {fileTypes.map((type) => (
                  <Button
                    key={type.id}
                    variant={selectedFileTypes.includes(type.id) ? "default" : "outline"}
                    onClick={() => toggleFileType(type.id)}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
              {selectedFileTypes.length === 0 && (
                <p className="text-sm text-red-500">Please select at least one file type</p>
              )}
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => save("File Types")}
                  disabled={selectedFileTypes.length === 0}
                >
                  Save File Types
                </Button>
                {savedSection === "File Types" && (
                  <span className="text-sm text-green-600">✓ Saved</span>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}