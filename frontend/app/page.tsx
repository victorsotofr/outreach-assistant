"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const phrases = [
    "AI-powered finance interviewer_",
    "Built for real interviews_",
  ];

  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex];
    const typingSpeed = isDeleting ? 40 : 80;
    const pauseTime = 1200;
  
    const timeout = setTimeout(() => {
      if (!isDeleting && charIndex < currentPhrase.length) {
        setDisplayedText(currentPhrase.slice(0, charIndex + 1));
        setCharIndex((prev) => prev + 1);
      } else if (!isDeleting && charIndex === currentPhrase.length) {
        setTimeout(() => setIsDeleting(true), pauseTime);
      } else if (isDeleting && charIndex > 0) {
        setDisplayedText(currentPhrase.slice(0, charIndex - 1));
        setCharIndex((prev) => prev - 1);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
      }
    }, typingSpeed);
  
    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, currentPhraseIndex]);  

  if (status === "loading") return null;
  if (session) {
    router.push("/chat");
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative isolate">
        <div className="flex items-center justify-center min-h-[90vh] mx-auto max-w-7xl px-6 py-12 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-2xl text-center py-12">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-gray-900 leading-tight mb-4">
              <span className="block text-black font-extrabold text-6xl sm:text-7xl mb-2">
                Finterview
              </span>
              <span className="block bg-gradient-to-br from-gray-600 to-gray-400 text-transparent bg-clip-text text-2xl sm:text-3xl h-10 animate-typing-loop overflow-hidden whitespace-nowrap border-r-4 border-gray-400 pr-2">
                {displayedText}
              </span>
            </h1>

            <p className="mt-6 text-md sm:text-lg text-gray-600">
              Rock Your Finance Interviews.
            </p>

            <style jsx>{`
              @keyframes blink {
                0%, 100% {
                  border-color: transparent;
                }
                50% {
                  border-color: #a1a1aa;
                }
              }

              .animate-typing-loop {
                display: inline-block;
                white-space: nowrap;
                overflow: hidden;
                border-right: 2px solid #a1a1aa;
                animation: blink 0.75s step-end infinite;
              }
            `}</style>

            {/* Animated Scroll Arrow */}
            <div className="mt-16 flex justify-center">
              <a
                href="#features"
                aria-label="Scroll down"
                className="hover:opacity-80 transition-opacity"
              >
                <svg
                  className="w-8 h-8 text-gray-500 animate-bounce"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything You Need.
            </p>
            <p className="mt-2 text-3xl font-light tracking-tight text-gray-900 sm:text-4xl">
              Rock Your Finance Interviews.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <span className="text-2xl">➤</span>
                  Interactive Practice
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Simulate actual interview scenarios with AI-driven mock sessions.
                  </p>
                  <p className="flex-auto">
                    Switch modes: Open chats, MCQs, Free-answers.
                  </p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <span className="text-2xl">➤</span>
                  Real-time Feedback
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Receive instant scoring and constructive feedback on your answers.
                  </p>
                  <p className="flex-auto">
                    Track your progresses.
                  </p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <span className="text-2xl">➤</span>
                  Document-based Q&A
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">Upload prep materials.</p>
                  <p className="flex-auto">
                    Work with your preferred model on your own lessons.
                  </p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <span className="text-sm text-gray-500">
              Built with 🖤 for Finance Students
            </span>
          </div>
          <div className="mt-8 md:order-1 md:mt-0">
            <p className="text-center text-xs leading-5 text-gray-500">
              &copy; 2025 Finance Interviewer. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
