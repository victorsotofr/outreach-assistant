'use client';

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Question = {
  id: number;
  question: string;
  options: string[];
  answer: string;
};

const mockQuestions: Question[] = [
  {
    id: 1,
    question: "What is EBITDA?",
    options: ["Earnings Before Interest, Tax, Depreciation and Amortization", "Revenue", "Net Income", "Gross Profit"],
    answer: "Earnings Before Interest, Tax, Depreciation and Amortization",
  },
  {
    id: 2,
    question: "What does a DCF model calculate?",
    options: ["Break-even Point", "Market Share", "Future Cash Flows", "Intrinsic Value"],
    answer: "Intrinsic Value",
  },
  // Add more mock questions or fetch from backend
];

export default function QuizPage() {
  const searchParams = useSearchParams();
  const subject = searchParams.get("subject");
  const count = parseInt(searchParams.get("count") || "5");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    // Replace with backend call in real app
    const shuffled = mockQuestions.sort(() => 0.5 - Math.random()).slice(0, count);
    setQuestions(shuffled);
  }, [count]);

  const handleNext = () => {
    if (selected === questions[current].answer) {
      setScore((s) => s + 1);
    }
    setSelected(null);
    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1);
    } else {
      setShowResult(true);
    }
  };

  if (questions.length === 0) return <div className="p-6">Loading questions...</div>;

  if (showResult) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-4">
        <h1 className="text-xl font-semibold">✓ Quiz Completed</h1>
        <p>You scored {score} out of {questions.length}</p>
        <Button onClick={() => location.href = "/mcq"}>Back to Start</Button>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <h2 className="text-lg font-semibold">
        Question {current + 1} of {questions.length}
      </h2>
      <p className="text-gray-800">{q.question}</p>
      <div className="space-y-2">
        {q.options.map((opt) => (
          <Button
            key={opt}
            variant={selected === opt ? "default" : "outline"}
            className="w-full justify-start"
            onClick={() => setSelected(opt)}
          >
            {opt}
          </Button>
        ))}
      </div>
      <Button onClick={handleNext} disabled={!selected}>
        {current + 1 === questions.length ? "Finish" : "Next"}
      </Button>
    </div>
  );
}
