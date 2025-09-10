"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();  

  if (status === "loading") return null;
  if (session) {
    router.push("/dashboard");
    return null;
  }

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-white">
      {/* Part 1: Hero Section */}
      <section className="relative h-screen flex items-center justify-center px-6 bg-gradient-to-b from-[#0158FE] via-blue-300 to-white z-10">
        <div className="max-w-4xl text-center">
          <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight leading-tight mb-8">
            <span className="text-white drop-shadow-lg">Outreach Assistant</span>
          </h1>
          
          <p className="mt-6 text-xl sm:text-2xl text-white font-light tracking-wide max-w-2xl mx-auto drop-shadow-md">
            Take Your Outreach Further.
          </p>
        </div>
      </section>

      {/* Part 2: How It Works Section */}
      <section id="how-it-works" className="relative h-screen flex flex-col justify-center bg-white px-6 py-12 z-20">
        <div className="mx-auto max-w-7xl w-full">
          <div className="mx-auto max-w-4xl text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#0158FE] mb-4 whitespace-nowrap">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 font-light mt-6 max-w-2xl mx-auto">
              From your favorite LinkedIn profiles to automated email outreach, we've got you covered.
            </p>
          </div>
          
          <div className="mx-auto max-w-5xl">
            <video 
              className="w-full rounded-2xl shadow-2xl"
              controls
              poster="/outreach-demo.mp4"
            >
              <source src="/outreach-demo.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </section>

      {/* Part 3: FAQ Section */}
      <section id="faq" className="relative h-screen flex flex-col justify-center bg-white px-6 py-12 z-30">
        <div className="mx-auto max-w-4xl w-full">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#0158FE] mb-4">
              FAQ
            </h2>
            <p className="text-xl text-gray-600 font-light mt-6">
              Everything you need to know about Outreach Assistant.
            </p>
          </div>

          <Accordion
            type="single"
            collapsible
            className="w-full"
            defaultValue="item-1"
          >
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-lg font-semibold text-gray-900 hover:text-[#0158FE] transition-colors">
                Screenshot-Based Enrichment
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-4 text-balance text-gray-600">
                <p>
                  Drop in screenshots of interesting LinkedIn profiles and watch our AI automatically extract names, roles, and company data.
                </p>
                <p>
                  Our advanced processing technology converts visual information into structured contact data, saving you hours of manual data entry.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg font-semibold text-gray-900 hover:text-[#0158FE] transition-colors">
                Google Sheets Integration
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-4 text-balance text-gray-600">
                <p>
                  Automatically sync with your outreach spreadsheet. Clean, enrich, and back up your contact lists in one click.
                </p>
                <p>
                  Seamlessly integrate with your existing workflow and keep all your contact data organized and accessible in real-time.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg font-semibold text-gray-900 hover:text-[#0158FE] transition-colors">
                Personalized Email Sending
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-4 text-balance text-gray-600">
                <p>
                  Use templates with dynamic variables to customize every message. Send with your own SMTP in one secure batch.
                </p>
                <p>
                  Create compelling, personalized outreach campaigns that resonate with your prospects and increase response rates.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Part 4: Footer with gradient */}
      <footer className="relative bg-gradient-to-b from-white to-[#0158FE] px-6 py-16 z-40">
        <div className="mx-auto max-w-6xl w-full">
          <div className="flex flex-col items-center text-center space-y-8">
            
            {/* Main footer links section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
              
              {/* Navigation */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-4">Navigation</h3>
                <ul className="space-y-2">
                  <li><a href="#how-it-works" className="text-sm text-white/80 hover:text-white transition-colors">How It Works</a></li>
                  <li><a href="#faq" className="text-sm text-white/80 hover:text-white transition-colors">FAQ</a></li>
                </ul>
              </div>

              {/* Community */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-4">Community</h3>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="https://github.com/victorsotofr/outreach-assistant"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.49933 0.25C3.49635 0.25 0.25 3.49593 0.25 7.50024C0.25 10.703 2.32715 13.4206 5.2081 14.3797C5.57084 14.446 5.70302 14.2222 5.70302 14.0299C5.70302 13.8576 5.69679 13.4019 5.69323 12.797C3.67661 13.235 3.25112 11.825 3.25112 11.825C2.92132 10.9874 2.44599 10.7644 2.44599 10.7644C1.78773 10.3149 2.49584 10.3238 2.49584 10.3238C3.22353 10.375 3.60629 11.0711 3.60629 11.0711C4.25298 12.1788 5.30335 11.8588 5.71638 11.6732C5.78225 11.205 5.96962 10.8854 6.17658 10.7043C4.56675 10.5209 2.87415 9.89918 2.87415 7.12104C2.87415 6.32925 3.15677 5.68257 3.62053 5.17563C3.54576 4.99226 3.29697 4.25521 3.69174 3.25691C3.69174 3.25691 4.30015 3.06196 5.68522 3.99973C6.26337 3.83906 6.8838 3.75895 7.50022 3.75583C8.1162 3.75895 8.73619 3.83906 9.31523 3.99973C10.6994 3.06196 11.3069 3.25691 11.3069 3.25691C11.7026 4.25521 11.4538 4.99226 11.3795 5.17563C11.8441 5.68257 12.1245 6.32925 12.1245 7.12104C12.1245 9.9063 10.4292 10.5192 8.81452 10.6985C9.07444 10.9224 9.30633 11.3648 9.30633 12.0413C9.30633 13.0102 9.29742 13.7922 9.29742 14.0299C9.29742 14.2239 9.42828 14.4496 9.79591 14.3788C12.6746 13.4179 14.75 10.7025 14.75 7.50024C14.75 3.49593 11.5036 0.25 7.49933 0.25Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                      </svg>
                      GitHub
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom section */}
            <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-4xl pt-8 border-t border-white/20 gap-4">
              <p className="text-xs text-white/80">
                © 2025 Outreach Assistant. All rights reserved.
              </p>
              <p className="text-xs text-white/80">
                Built with 🤍 by Victor
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}