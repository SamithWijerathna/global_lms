"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@heroui/button";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Progress } from "@heroui/progress";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { Spinner } from "@heroui/spinner";

export default function QuizTaking() {
  const { quizUuid } = useParams();
  const [quiz, setQuiz] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [started, setStarted] = useState(false);
  const [isTimed, setIsTimed] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Set<string>[]>([]);

  useEffect(() => {
    if (quizUuid) {
      fetch(`/api/quizzes/${quizUuid}`)
        .then((r) => r.json())
        .then((data) => {
          setQuiz(data);
          setIsTimed(data.is_timed);
          setDurationMinutes(data.default_duration);
        });
    }
  }, [quizUuid]);

  useEffect(() => {
    if (started && isTimed && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (started && isTimed && timeLeft <= 0 && !results) {
      handleSubmit();
    }
  }, [started, isTimed, timeLeft, results]);

  if (!quiz) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const startQuiz = () => {
    const finalTimed = quiz.allow_toggle_timing ? isTimed : quiz.is_timed;
    const finalDuration = (quiz.allow_toggle_timing ? durationMinutes : quiz.default_duration) * 60;
    setTimeLeft(finalTimed ? finalDuration : 0);
    setAnswers(quiz.questions.map(() => new Set<string>()));
    setStarted(true);
  };

  const updateAnswer = (qIdx: number, value: string, add: boolean) => {
    const newAnswers = [...answers];
    if (add) newAnswers[qIdx].add(value);
    else newAnswers[qIdx].delete(value);
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    const res = await fetch(`/api/quizzes/${quizUuid}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: answers.map((set) => Array.from(set)) }),
    });
    const data = await res.json();
    setResults(data);
  };

  const formatTime = (sec: number) =>
    `${Math.floor(sec / 60)
      .toString()
      .padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}`;

  // Start Screen
  if (!started) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">{quiz.title}</h1>
        <p className="mb-8">{quiz.description}</p>
        <p className="mb-4">Total Questions: {quiz.questions.length}</p>

        {quiz.allow_toggle_timing ? (
          <div className="space-y-4 border p-6 rounded-lg mb-6">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isTimed}
                onChange={(e) => setIsTimed(e.target.checked)}
                className="w-5 h-5"
              />
              <span>Enable Timer</span>
            </label>
            {isTimed && (
              <Input
                label="Duration (minutes)"
                type="number"
                value={durationMinutes.toString()}
                onValueChange={(v) => setDurationMinutes(Number(v) || quiz.default_duration)}
                min={quiz.min_duration}
                max={quiz.max_duration}
              />
            )}
          </div>
        ) : (
          <p className="border p-6 rounded-lg mb-6">
            Timer is {quiz.is_timed ? `enabled (${quiz.default_duration} minutes)` : "disabled"} (set by admin)
          </p>
        )}
        <Button color="primary" size="lg" onPress={startQuiz}>
          Start Quiz
        </Button>
      </div>
    );
  }

  // Results Screen
  if (results) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Quiz Completed!</h1>
        <p className="text-2xl mb-8">
          Your Score: {results.score} / {results.totalPossible}
        </p>
        <div className="space-y-8">
          {quiz.questions.map((q: any, i: number) => {
            const evalItem = results.evaluated?.[i] || { earned: 0, correct_keys: [] };
            const earned = evalItem.earned;
            const correctKeys = new Set(evalItem.correct_keys);
            const selected = answers[i];
            const isStatement = q.type === "statement";

            return (
              <Card key={i}>
                <CardHeader>
                  <div className="flex justify-between">
                    <p className="font-medium">Question {i + 1}</p>
                    <Chip color={earned > 0 ? "success" : earned < 0 ? "danger" : "warning"}>
                      {earned} points
                    </Chip>
                  </div>
                </CardHeader>
                <CardBody>
                  <p className="font-medium mb-4">{q.question_text}</p>

                  {isStatement ? (
                    <div className="space-y-2">
                      {q.statements.map((stmt: any, sIdx: number) => {
                        const key = (stmt.index || sIdx + 1).toString();
                        const isCorrect = correctKeys.has(key);
                        const isSelected = selected.has(key);
                        const textColor = isCorrect ? "text-success" : isSelected ? "text-danger" : "";
                        return (
                          <p key={sIdx} className={textColor}>
                            {key}. {stmt.text} {isSelected && "(Selected)"}
                          </p>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {q.options.map((opt: any) => {
                        const isCorrect = correctKeys.has(opt.letter);
                        const isSelected = selected.has(opt.letter);
                        const textColor = isCorrect ? "text-success" : isSelected ? "text-danger" : "";
                        return (
                          <p key={opt.letter} className={textColor}>
                            {opt.letter}. {opt.text} {isSelected && "(Selected)"}
                          </p>
                        );
                      })}
                    </div>
                  )}

                  {q.explanation && (
                    <>
                      <p className="mt-6 font-medium text-primary">Explanation:</p>
                      <p>{q.explanation}</p>
                    </>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Quiz Taking Screen
  const q = quiz.questions[currentQuestion];
  const selected = answers[currentQuestion];
  const isMulti = q.type !== "statement" && q.options.some((opt: any) => opt.is_correct); // rough detection, but we don't have is_correct here

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between mb-6">
        <p>Question {currentQuestion + 1} of {quiz.questions.length}</p>
        {isTimed && <p>Time Left: {formatTime(timeLeft)}</p>}
      </div>
      {isTimed && (
        <Progress value={(timeLeft / (durationMinutes * 60)) * 100} color="primary" className="mb-8" />
      )}

      <Card>
        <CardHeader>
          <p className="text-xl font-medium">{q.question_text}</p>
        </CardHeader>
        <CardBody className="space-y-4">
          {q.type === "statement" ? (
            q.statements.map((stmt: any, idx: number) => {
              const key = (stmt.index || idx + 1).toString();
              return (
                <label key={idx} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(key)}
                    onChange={(e) => updateAnswer(currentQuestion, key, e.target.checked)}
                  />
                  <span>
                    {key}. {stmt.text}
                  </span>
                </label>
              );
            })
          ) : (
            q.options.map((opt: any) => (
              <label key={opt.letter} className="flex items-start gap-3 cursor-pointer">
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name={isMulti ? undefined : `q${currentQuestion}`}
                  checked={selected.has(opt.letter)}
                  onChange={(e) => {
                    if (isMulti) {
                      updateAnswer(currentQuestion, opt.letter, e.target.checked);
                    } else if (e.target.checked) {
                      const newAnswers = [...answers];
                      newAnswers[currentQuestion] = new Set([opt.letter]);
                      setAnswers(newAnswers);
                    }
                  }}
                />
                <span>
                  {opt.letter}. {opt.text}
                </span>
              </label>
            ))
          )}
        </CardBody>
        <CardFooter className="flex justify-between">
          <Button
            variant="flat"
            isDisabled={currentQuestion === 0}
            onPress={() => setCurrentQuestion(currentQuestion - 1)}
          >
            Previous
          </Button>
          {currentQuestion === quiz.questions.length - 1 ? (
            <Button color="primary" onPress={handleSubmit}>
              Submit Quiz
            </Button>
          ) : (
            <Button onPress={() => setCurrentQuestion(currentQuestion + 1)}>Next</Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}