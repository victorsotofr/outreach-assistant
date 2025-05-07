'use client';

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function FreeAnswerMode() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit() {
    if (!input.trim()) return;

    const apiKey = sessionStorage.getItem("openai_api_key");
    if (!apiKey) {
      toast.error("Missing OpenAI API key. Redirected to Settings.");
      router.push("/settings");
      return;
    }

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/free-answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ question: input }),
      });

      if (!res.ok) throw new Error("Evaluation failed");

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.feedback }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Error evaluating your answer." }]);
      toast.error("Something went wrong while evaluating your answer.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") return <div>Loading...</div>;
  if (!session) return null;

  return (
    <main className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto px-6 py-8 flex justify-center">
        <div className="w-full max-w-4xl space-y-4">
          <h1 className="text-2xl font-semibold mb-4">Free Answer Mode</h1>

          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl shadow-sm max-w-[80%] text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-blue-100 self-end ml-auto"
                    : "bg-green-100 self-start mr-auto"
                }`}
              >
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="bg-gray-100 p-4 rounded-xl shadow-sm max-w-[80%] text-sm self-start mr-auto">
                Evaluating...
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="fixed bottom-0 left-64 right-0 px-6 py-4 bg-white z-10 flex justify-center"
      >
        <div className="relative w-full max-w-4xl">
          <Textarea
            placeholder="Write your answer here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full min-h-[100px] max-h-[50vh] rounded-xl pr-20 pl-4 py-3 border border-gray-300 shadow-sm resize-y text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute bottom-3 right-3 px-4 py-2 bg-[#1C65BD] hover:bg-[#0D2E57] text-white text-sm rounded-lg"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Sending...</span>
              </div>
            ) : (
              "Submit Answer"
            )}
          </Button>
        </div>
      </form>
    </main>
  );
}
