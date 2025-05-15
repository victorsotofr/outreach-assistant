"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();  

  if (status === "loading") return null;
  if (session) {
    router.push("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative isolate">
        <div className="flex items-center justify-center min-h-[90vh] mx-auto max-w-7xl px-6 py-12 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-2xl text-center py-12">
            <div className="flex justify-center mb-8">
              <img
                src="/uiform-logo.png"
                alt="UiForm Logo"
                className="h-16 w-auto hover:opacity-90 transition-opacity duration-200"
              />
            </div>
            <h1 className="text-4xl font-bold text-center mb-4">
              Everything You Need.<br />
              Scale Your Outreach with Smart Automation.
            </h1>
            
            <div className="w-full max-w-4xl mx-auto mb-12">
              <video 
                className="w-full rounded-lg shadow-lg"
                controls
                poster="/uiform-logo.png"
              >
                <source src="/outreach-demo.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>

            <p className="mt-6 text-lg sm:text-xl text-gray-600 font-light tracking-wide">
              Take Your Outreach Further with UiForm
            </p>

            <style jsx>{`
              @keyframes blink {
                0%, 100% {
                  border-color: transparent;
                }
                50% {
                  border-color: #9ca3af;
                }
              }

              .animate-typing-loop {
                display: inline-block;
                white-space: nowrap;
                overflow: hidden;
                border-right: 3px solid #9ca3af;
                animation: blink 0.75s step-end infinite;
              }
            `}</style>

            {/* Animated Scroll Arrow */}
            <div className="mt-16 flex justify-center">
              <a
                href="#features"
                aria-label="Scroll down"
                className="hover:opacity-80 transition-opacity duration-300"
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
      <div id="features" className="bg-gradient-to-b from-white to-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything You Need.
            </p>
            <p className="mt-2 text-3xl font-light tracking-tight text-gray-900 sm:text-4xl">
              Scale Your Outreach with Smart Automation.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              <div className="flex flex-col p-6 rounded-xl hover:bg-white/50 transition-all duration-300">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <span className="text-2xl bg-gradient-to-br from-gray-600 to-gray-400 text-transparent bg-clip-text">➤</span>
                  Screenshot-Based Enrichment ⌜⌟
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Drop in screenshots of interesting LinkedIn profiles.
                  </p>
                  <p className="flex-auto">
                    Auto-extract names, roles, and company data into your contact list.
                  </p>
                </dd>
              </div>

              <div className="flex flex-col p-6 rounded-xl hover:bg-white/50 transition-all duration-300">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <span className="text-2xl bg-gradient-to-br from-gray-600 to-gray-400 text-transparent bg-clip-text">➤</span>
                  <div className="flex items-center gap-2">
                    Integrated with Google Sheets
                    <img
                      src="/googlesheet-logo.png"
                      alt="Google Sheets Logo"
                      className="h-5 w-auto"
                    />
                  </div>
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Automatically sync with your outreach spreadsheet.
                  </p>
                  <p className="flex-auto">
                    Clean, enrich, and back up your contact lists in one click.
                  </p>
                </dd>
              </div>

              <div className="flex flex-col p-6 rounded-xl hover:bg-white/50 transition-all duration-300">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <span className="text-2xl bg-gradient-to-br from-gray-600 to-gray-400 text-transparent bg-clip-text">➤</span>
                  Personalized Email Sending ✓
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Use templates with dynamic variables to customize every message.
                  </p>
                  <p className="flex-auto">
                    Send with your own SMTP in one secure batch.
                  </p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>


      {/* Footer */}
      <footer className="bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <span className="text-sm text-gray-500">
              Built with 🖤 by Victor Soto for{" "}
              <a
                href="https://uiform.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                UiForm.com
              </a>
            </span>
          </div>
          <div className="mt-8 md:order-1 md:mt-0">
            <p className="text-center text-xs leading-5 text-gray-500">
              &copy; 2025 Outreach Assistant. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
