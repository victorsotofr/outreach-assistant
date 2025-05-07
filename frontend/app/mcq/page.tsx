'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Mocked subjects — replace with dynamic lessons later
const subjects = ['Corporate Finance', 'Accounting', 'Valuation', 'M&A', 'Markets'];

export default function MCQLandingPage() {
  const router = useRouter();
  const [subject, setSubject] = useState<string>('');
  const [count, setCount] = useState<number>(5);

  const handleStart = () => {
    if (!subject) {
      toast.error("Please select a subject.");
      return;
    }
    if (count <= 0) {
      toast.error("Please enter a valid number of questions.");
      return;
    }

    router.push(`/mcq/quiz?subject=${encodeURIComponent(subject)}&count=${count}`);
  };

  return (
    <main className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto px-6 py-8 flex justify-center">
        <div className="w-full max-w-4xl space-y-4">
          <h1 className="text-2xl font-semibold mb-4">MCQ Mode</h1>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Subject</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {subjects.map((s) => (
                    <Button
                      key={s}
                      variant={s === subject ? 'default' : 'outline'}
                      onClick={() => setSubject(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Number of Questions</label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={count}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCount(Number(e.target.value))
                  }
                />
              </div>

              <Button
                onClick={handleStart}
                disabled={!subject || count <= 0}
                className="w-full bg-[#1C65BD] hover:bg-[#0D2E57] text-white text-sm rounded-lg"
              >
                Start Quiz
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
