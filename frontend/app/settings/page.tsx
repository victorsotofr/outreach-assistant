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

  const [visibleFields, setVisibleFields] = useState<{ [key: string]: boolean }>({});
  const [savedFields, setSavedFields] = useState<{ [key: string]: boolean }>({});
  const [savedSection, setSavedSection] = useState<null | string>(null);

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

        setSavedFields({
          uiform_api_key: !!data.uiform_api_key,
          openai_api_key: !!data.openai_api_key,
          smtp_user: !!data.smtp_user,
          smtp_pass: !!data.smtp_pass,
          smtp_server: !!data.smtp_server,
          smtp_port: !!data.smtp_port,
          google_sheet_url: !!data.google_sheet_url,
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
          className={!value ? "border-red-500 pr-10" : "pr-10"}
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
      {savedFields[key] && (
        <p className="text-green-600 text-sm">✓ Saved</p>
      )}
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
            {renderField("google_sheet_url", googleSheetUrl, (e) => setGoogleSheetUrl(e.target.value), "https://docs.google.com/...")}
            <Button onClick={() => save("Google Sheet URL")} className="mt-2">Save</Button>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              ✉️ Email Settings (SMTP)
            </h2>
            {renderField("smtp_user", emailUser, (e) => setEmailUser(e.target.value), "your@email.com")}
            {renderField("smtp_pass", emailPass, (e) => setEmailPass(e.target.value), "Password", "password")}
            {renderField("smtp_server", smtpServer, (e) => setSmtpServer(e.target.value), "smtp.yourdomain.com")}
            {renderField("smtp_port", smtpPort, (e) => setSmtpPort(e.target.value), "587")}
            <Button onClick={() => save("Email Settings")} className="mt-2">Save</Button>
          </section>
        </div>
      </div>
    </main>
  );
}