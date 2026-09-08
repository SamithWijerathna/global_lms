"use client";
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import Link from "next/link";

export default function QuizzesList() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/quizzes")
      .then(r => r.json())
      .then(data => setQuizzes(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Available Quizzes</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz) => (
          <Card key={quiz.uuid}>
            <CardHeader>
              <h2 className="text-xl font-medium">{quiz.title}</h2>
            </CardHeader>
            <CardBody>
              <p>{quiz.description || "No description"}</p>
              <p className="text-sm text-default-500 mt-4">
                Questions: {quiz.num_questions || 0} | {quiz.is_timed ? `Timed (${quiz.default_duration} min default)` : "Untimed"}
              </p>
              <Link href={`/student/quizzes/${quiz.uuid}`}>
                <Button color="primary" className="mt-4">Start Quiz</Button>
              </Link>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}