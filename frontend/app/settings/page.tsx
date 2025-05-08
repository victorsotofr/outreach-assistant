'use client';

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Image from "next/image";
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

  const [savedSection, setSavedSection] = useState<null | string>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");

    setUiFormKey(sessionStorage.getItem("uiform_api_key") || "");
    setOpenAiKey(sessionStorage.getItem("openai_api_key") || "");
    setEmailUser(sessionStorage.getItem("smtp_user") || "");
    setEmailPass(sessionStorage.getItem("smtp_pass") || "");
    setSmtpServer(sessionStorage.getItem("smtp_server") || "");
    setSmtpPort(sessionStorage.getItem("smtp_port") || "");
    setGoogleSheetUrl(sessionStorage.getItem("google_sheet_url") || "");
  }, [status, router]);

  const save = (section: string) => {
    sessionStorage.setItem("uiform_api_key", uiFormKey);
    sessionStorage.setItem("openai_api_key", openAiKey);
    sessionStorage.setItem("smtp_user", emailUser);
    sessionStorage.setItem("smtp_pass", emailPass);
    sessionStorage.setItem("smtp_server", smtpServer);
    sessionStorage.setItem("smtp_port", smtpPort);
    sessionStorage.setItem("google_sheet_url", googleSheetUrl);

    setSavedSection(section);
    toast.success(`✓ ${section} saved.`);
    setTimeout(() => setSavedSection(null), 3000);
  };

  if (status === "loading") return <div>Loading...</div>;
  if (!session) return null;

  return (
    <main className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto px-6 py-8 flex justify-center">
        <div className="w-full max-w-4xl space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="text-sm text-gray-600">
              Your Keys are used locally to personalize your assistant experience. They will never be sent to our servers.
            </p>
            <p className="text-sm text-gray-600">
              Configure your information below step by step.
            </p>
          </div>

          {/* === UiForm Section === */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Image src="/uiform-logo.png" alt="UiForm" width={24} height={24} />
              <h2 className="text-lg font-semibold">UiForm API Key</h2>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700 leading-relaxed">
                You will have to create your extraction schema and automation Template on{" "}
                <a
                  href="https://www.uiform.com/dashboard/templates/create"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  UiForm.com
                </a>
                .<br />
                Please visit the site — don't forget to keep your UiForm API Key and Google Sheet extraction endpoint URL.
              </p>
            </div>

            <div className="space-y-2">
              <Input
                type="password"
                value={uiFormKey}
                onChange={(e) => setUiFormKey(e.target.value)}
                placeholder="sk_uiform_..."
              />
              <div className="flex items-center gap-4">
                <Button onClick={() => save("UiForm API Key")}>Save</Button>
                {savedSection === "UiForm API Key" && <span className="text-green-600 text-sm">✓ Saved</span>}
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Don't have one?{" "}
              <a
                href="https://www.uiform.com/dashboard/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800"
              >
                Get your UiForm API key here
              </a>
            </p>
          </section>

          {/* === OpenAI Section === */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Image src="/openai-logo.png" alt="OpenAI" width={24} height={24} />
              <h2 className="text-lg font-semibold">OpenAI API Key</h2>
            </div>

            <div className="space-y-2">
              <Input
                type="password"
                value={openAiKey}
                onChange={(e) => setOpenAiKey(e.target.value)}
                placeholder="sk-..."
              />
              <div className="flex items-center gap-4">
                <Button onClick={() => save("OpenAI API Key")}>Save</Button>
                {savedSection === "OpenAI API Key" && <span className="text-green-600 text-sm">✓ Saved</span>}
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Don't have one?{" "}
              <a
                href="https://platform.openai.com/account/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800"
              >
                Get your OpenAI key here
              </a>
            </p>
          </section>

          {/* === Google Section === */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Image src="/googlesheet-logo.png" alt="Google" width={24} height={24} />
              <h2 className="text-lg font-semibold">Google Sheet Outbound Database URL</h2>
            </div>

            <div className="space-y-2">
              <Input
                value={googleSheetUrl}
                onChange={(e) => setGoogleSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/..."
              />
              <div className="flex items-center gap-4">
                <Button onClick={() => save("Google Sheet URL")}>Save</Button>
                {savedSection === "Google Sheet URL" && <span className="text-green-600 text-sm">✓ Saved</span>}
              </div>
            </div>
          </section>

          {/* === Email Section === */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <h2 className="text-lg font-semibold">Email Settings (SMTP)</h2>
            </div>

            <div className="grid gap-4 max-w-xl">
              <Input
                value={emailUser}
                onChange={(e) => setEmailUser(e.target.value)}
                placeholder="SMTP Username (e.g. your@email.com)"
              />
              <Input
                type="password"
                value={emailPass}
                onChange={(e) => setEmailPass(e.target.value)}
                placeholder="SMTP Password"
              />
              <Input
                value={smtpServer}
                onChange={(e) => setSmtpServer(e.target.value)}
                placeholder="SMTP Server (e.g. smtp.yourdomain.com)"
              />
              <Input
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="SMTP Port (e.g. 587)"
              />
              <div className="flex items-center gap-4">
                <Button onClick={() => save("Email Settings")}>Save</Button>
                {savedSection === "Email Settings" && <span className="text-green-600 text-sm">✓ Saved</span>}
              </div>
            </div>
          </section>

          {/* === Blank Section === */}
          <section className="bg-white p-6 space-y-4">
          </section>
        </div>
      </div>
    </main>
  );
}
