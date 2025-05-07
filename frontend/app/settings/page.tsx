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

  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    const key = sessionStorage.getItem("openai_api_key");
    if (key) setApiKey(key);
  }, []);

  const handleSave = () => {
    sessionStorage.setItem("openai_api_key", apiKey);
    setSaved(true);
    toast.success("✅ API key saved.");
    setTimeout(() => setSaved(false), 3000);
  };

  if (status === "loading") return <div>Loading...</div>;
  if (!session) return null;

  return (
    <main className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto px-6 py-8 flex justify-center">
        <div className="w-full max-w-4xl space-y-8">
          <h1 className="text-2xl font-semibold">Settings</h1>

          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow space-y-4">
            <div className="flex items-center gap-2">
              <Image src="/openai-logo.png" alt="OpenAI" width={20} height={20} />
              <h2 className="text-lg font-semibold">OpenAI API Key</h2>
            </div>

            <p className="text-sm text-gray-600">
              Your API key is used locally to personalize your assistant experience. It's never sent to our servers.
            </p>

            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />

            <div className="flex items-center gap-4">
              <Button onClick={handleSave}>Save API Key</Button>
              {saved && <span className="text-green-600 text-sm">✓ Saved</span>}
            </div>

            <p className="text-xs text-gray-500">
              Don’t have one?{" "}
              <a
                href="https://platform.openai.com/account/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800"
              >
                Get your OpenAI key here
              </a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
