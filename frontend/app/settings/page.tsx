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
  const [uiFormEndpoint, setUiFormEndpoint] = useState("");
  const [openAiKey, setOpenAiKey] = useState("");
  const [emailUser, setEmailUser] = useState("");
  const [emailPass, setEmailPass] = useState("");
  const [smtpServer, setSmtpServer] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");

  const [visibleFields, setVisibleFields] = useState<{ [key: string]: boolean }>({
    uiform_api_key: false,
    openai_api_key: false,
    smtp_pass: false
  });
  const [savedFields, setSavedFields] = useState<{ [key: string]: boolean }>({});
  const [savedSection, setSavedSection] = useState<null | string>(null);

  const toggleVisibility = (field: string) => {
    setVisibleFields((prev) => {
      const newState = { ...prev, [field]: !prev[field] };
      return newState;
    });
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    if (!session?.user?.email) return;

    const fetchConfig = async () => {
      if (!session?.user?.email) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/config?email=${session.user.email}`);
        if (!res.ok) throw new Error("Failed to fetch config");
        const data = await res.json();
        
        setUiFormKey(data.uiform_api_key || "");
        setUiFormEndpoint(data.uiform_api_endpoint || "");
        setOpenAiKey(data.openai_api_key || "");
        setEmailUser(data.smtp_user || "");
        setEmailPass(data.smtp_pass || "");
        setSmtpServer(data.smtp_server || "");
        setSmtpPort(data.smtp_port || "");
        setGoogleSheetUrl(data.google_sheet_url || "");

        setSavedFields({
          uiform_api_key: !!data.uiform_api_key,
          uiform_api_endpoint: !!data.uiform_api_endpoint,
          openai_api_key: !!data.openai_api_key,
          smtp_user: !!data.smtp_user,
          smtp_pass: !!data.smtp_pass,
          smtp_server: !!data.smtp_server,
          smtp_port: !!data.smtp_port,
          google_sheet_url: !!data.google_sheet_url,
        });
      } catch (err) {
        console.error("Error loading settings:", err);
        toast.error("Failed to load settings from server.");
      }
    };

    fetchConfig();
  }, [status, router, session]);

  const save = async (section: string) => {
    if (!session?.user?.email) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/config`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          email: session.user.email,
          config: {
            openai_api_key: openAiKey,
            uiform_api_key: uiFormKey,
            uiform_api_endpoint: uiFormEndpoint,
            smtp_user: emailUser,
            smtp_pass: emailPass,
            smtp_server: smtpServer,
            smtp_port: smtpPort,
            google_sheet_url: googleSheetUrl,
          },
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Save failed");
      }

      setSavedSection(section);
      setTimeout(() => setSavedSection(null), 3000);
      toast.success(`✓ ${section} saved.`);
      setSavedFields((prev) => ({
        ...prev,
        ...(section === "UiForm API Key" && { 
          uiform_api_key: true,
          uiform_api_endpoint: true 
        }),
        ...(section === "OpenAI API Key" && { openai_api_key: true }),
        ...(section === "Google Sheet URL" && { google_sheet_url: true }),
        ...(section === "Email Settings" && {
          smtp_user: true,
          smtp_pass: true,
          smtp_server: true,
          smtp_port: true,
        }),
      }));
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save your settings.");
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
          <button
            type="button"
            className="absolute inset-y-0 right-3 flex items-center cursor-pointer hover:bg-gray-100 rounded-r-md px-2"
            onClick={() => toggleVisibility(key)}
            aria-label={visibleFields[key] ? "Hide" : "Show"}
          >
            {visibleFields[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
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

          <section className="bg-white border border-gray-200 rounded-xl p-4 shadow space-y-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Image src="/uiform-logo.png" alt="UiForm" width={20} height={20} />
              UiForm API Key
              {savedFields["uiform_api_key"] && savedFields["uiform_api_endpoint"] && (
                <span className="text-green-500">✓</span>
              )}
            </h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="uiform"
                    type="password"
                    value={uiFormKey}
                    onChange={(e) => setUiFormKey(e.target.value)}
                    placeholder="uf-..."
                    className="flex-1"
                  />
                  <Button
                    onClick={() => save("UiForm API Key")}
                    disabled={!uiFormKey}
                    variant="outline"
                  >
                    Save
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="uiform-endpoint"
                    type="text"
                    value={uiFormEndpoint}
                    onChange={(e) => setUiFormEndpoint(e.target.value)}
                    placeholder="https://api.uiform.io/v1"
                    className="flex-1"
                  />
                  <Button
                    onClick={() => save("UiForm API Endpoint")}
                    disabled={!uiFormEndpoint}
                    variant="outline"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-4 shadow space-y-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Image src="/openai-logo.png" alt="OpenAI" width={20} height={20} />
              OpenAI API Key
              {savedFields["openai_api_key"] && (
                <span className="text-green-500">✓</span>
              )}
            </h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="openai"
                    type="password"
                    value={openAiKey}
                    onChange={(e) => setOpenAiKey(e.target.value)}
                    placeholder="sk-..."
                    className="flex-1"
                  />
                  <Button
                    onClick={() => save("OpenAI API Key")}
                    disabled={!openAiKey}
                    variant="outline"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-4 shadow space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Image src="/googlesheet-logo.png" alt="Google" width={20} height={20} />
                Google Sheet URL
                {savedFields["google_sheet_url"] && (
                  <span className="text-green-500">✓</span>
                )}
              </h2>
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
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="sheet"
                    type="text"
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="flex-1"
                  />
                  <Button
                    onClick={() => save("Google Sheet URL")}
                    disabled={!googleSheetUrl}
                    variant="outline"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Email Settings
              {savedFields["smtp_user"] && savedFields["smtp_pass"] && savedFields["smtp_server"] && savedFields["smtp_port"] && (
                <span className="text-green-500">✓</span>
              )}
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="emailUser"
                    type="text"
                    value={emailUser}
                    onChange={(e) => setEmailUser(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1"
                  />
                  <Button
                    onClick={() => save("Email Settings")}
                    disabled={!emailUser}
                    variant="outline"
                  >
                    Save
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="emailPass"
                    type="password"
                    value={emailPass}
                    onChange={(e) => setEmailPass(e.target.value)}
                    placeholder="Enter your SMTP password"
                    className="flex-1"
                  />
                  <Button
                    onClick={() => save("Email Settings")}
                    disabled={!emailPass}
                    variant="outline"
                  >
                    Save
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="smtpServer"
                    type="text"
                    value={smtpServer}
                    onChange={(e) => setSmtpServer(e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="flex-1"
                  />
                  <Button
                    onClick={() => save("Email Settings")}
                    disabled={!smtpServer}
                    variant="outline"
                  >
                    Save
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="smtpPort"
                    type="text"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                    className="flex-1"
                  />
                  <Button
                    onClick={() => save("Email Settings")}
                    disabled={!smtpPort}
                    variant="outline"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white border border-0 rounded-xl p-6 space-y-4">
            <h2 className="text-lg "></h2>
            <div className="space-y-4">
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}