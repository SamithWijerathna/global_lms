"use client";
import { useState, useEffect } from "react";
import { Card, CardBody, CardFooter, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Progress } from "@heroui/progress";
import { Checkbox } from "@heroui/checkbox";
import { RadioGroup, Radio } from "@heroui/radio";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Spinner } from "@heroui/spinner";
import { Divider } from "@heroui/divider";
import {
  AlertCircle,
  Clock,
  Trophy,
  Eye,
  BookOpen,
  CheckCircle,
  XCircle,
  Timer,
  Award,
  ArrowLeft,
  ArrowRight,
  FileQuestion
} from "lucide-react";
import { useAuth } from "@/src/lib/useAuth";
import GlassSurface from "@/components/GlassSurface";
import Image from "next/image";

type Quiz = {
  uuid: string;
  title: string;
  description?: string;
  is_timed: boolean;
  default_duration?: number;
  num_questions?: number;
  create_at: string;
};

type Question = {
  question_id: string;
  type: "mcq" | "abcd" | "statement";
  question_text: string;
  explanation?: string;
  image_url?: string;                    // Question image
  points?: number;
  positive_points?: number;
  negative_points?: number;
  options?: Array<{
    letter: string;
    text: string;
    image_url?: string;                  // Option image
    is_correct: boolean;
  }>;
  statements?: Array<{
    index: number;
    text: string;
    is_correct: boolean;
  }>;
};

type QuizAttempt = {
  uuid: string;
  quiz_uuid: string;
  student_uuid: string;
  score: number;
  total_points: number;
  time_taken?: number;
  completed_at: string;
  answers_json?: string | Record<string, any> | null;
  answers_available?: boolean;
  quiz_title?: string;
};

export default function StudentQuickQuizPage() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [latestAttempts, setLatestAttempts] = useState<Record<string, QuizAttempt>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ obtained: number; max: number } | null>(null);
  const [questionResults, setQuestionResults] = useState<any[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  // History modal
  const { isOpen: historyOpen, onOpen: historyOnOpen, onClose: historyOnClose } = useDisclosure();
  const [selectedHistoryAttempt, setSelectedHistoryAttempt] = useState<QuizAttempt | null>(null);
  const [historyQuestions, setHistoryQuestions] = useState<Question[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const quizRes = await fetch("/api/quizzes");
        if (!quizRes.ok) throw new Error("Failed to load quizzes");

        const quizData = await quizRes.json();
        let quizList: Quiz[] = Array.isArray(quizData)
          ? quizData
          : (quizData.quizzes || quizData.data || quizData.rows || []);

        const uniqueQuizzes = Array.from(new Map(quizList.map((q) => [q.uuid, q])).values());
        setQuizzes(uniqueQuizzes);

        if (user?.uuid) {
          const attemptRes = await fetch(`/api/quiz/my_attempts?student_uuid=${user.uuid}`);
          if (attemptRes.ok) {
            const attemptData = await attemptRes.json();
            const latestMap: Record<string, QuizAttempt> = {};
            (Array.isArray(attemptData) ? attemptData : []).forEach((attempt: QuizAttempt) => {
              if (!latestMap[attempt.quiz_uuid] ||
                  new Date(attempt.completed_at) > new Date(latestMap[attempt.quiz_uuid].completed_at)) {
                latestMap[attempt.quiz_uuid] = attempt;
              }
            });
            setLatestAttempts(latestMap);
          }
        }
      } catch (err: any) {
        console.error("Error loading quizzes:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const startQuiz = async (quiz: Quiz) => {
    if (!user?.uuid) {
      alert("Please login to take quizzes");
      return;
    }

    setSelectedQuiz(quiz);
    setLoading(true);

    try {
      const res = await fetch(`/api/questions?quiz_uuid=${quiz.uuid}`);
      if (!res.ok) throw new Error("Failed to load questions");

      const qsData = await res.json();
      let qsList: Question[] = Array.isArray(qsData.questions) 
        ? qsData.questions 
        : (qsData || []);

      // Parse options and statements if they come as strings
      qsList = qsList.map((q: any) => ({
        ...q,
        options: typeof q.options === "string" ? JSON.parse(q.options) : (q.options || []),
        statements: typeof q.statements === "string" ? JSON.parse(q.statements) : (q.statements || [])
      }));

      if (qsList.length === 0) {
        alert("No questions found in this quiz");
        setLoading(false);
        return;
      }

      setQuestions(qsList);
      setCurrentIndex(0);
      setAnswers({});
      setSubmitted(false);
      setResult(null);
      setQuestionResults([]);
      setSubmitError(null);
      setStartTime(Date.now());

      if (quiz.is_timed && quiz.default_duration) {
        setTimeLeft(quiz.default_duration * 60);
      } else {
        setTimeLeft(0);
      }

      setStarted(true);
    } catch (err: any) {
      console.error("Error loading questions:", err);
      alert(err.message || "Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  const openHistoryDetails = async (attempt: QuizAttempt) => {
    setSelectedHistoryAttempt(attempt);
    setHistoryLoading(true);
    historyOnOpen();

    try {
      const res = await fetch(`/api/questions?quiz_uuid=${attempt.quiz_uuid}`);
      if (!res.ok) throw new Error("Failed to load questions");

      const qsData = await res.json();
      let qsList: Question[] = Array.isArray(qsData.questions) 
        ? qsData.questions 
        : (qsData || []);

      qsList = qsList.map((q: any) => ({
        ...q,
        options: typeof q.options === "string" ? JSON.parse(q.options) : (q.options || []),
        statements: typeof q.statements === "string" ? JSON.parse(q.statements) : (q.statements || [])
      }));

      setHistoryQuestions(qsList);
    } catch (err: any) {
      console.error("Error loading history details:", err);
      alert(err.message || "Failed to load question details");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (timeLeft > 0 && started && !submitted && selectedQuiz?.is_timed) {
      const timer = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            handleSubmit();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, started, submitted, selectedQuiz]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleAnswer = (qId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = async () => {
    if (!user?.uuid || !selectedQuiz) {
      alert("Login required");
      return;
    }

    setSubmitted(true);
    setSubmitError(null);

    try {
      const timeTaken = selectedQuiz.is_timed && selectedQuiz.default_duration
        ? selectedQuiz.default_duration * 60 - timeLeft
        : Math.floor((Date.now() - startTime) / 1000);

      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_uuid: selectedQuiz.uuid,
          student_uuid: user.uuid,
          answers,
          time_taken: timeTaken,
        }),
      });

      if (!res.ok) throw new Error("Submission failed");

      const data = await res.json();
      
      if (data.score) {
        setResult(data.score);
        
        // Refresh latest attempts
        const attemptRes = await fetch(`/api/quiz/my_attempts?student_uuid=${user.uuid}`);
        if (attemptRes.ok) {
          const attemptData = await attemptRes.json();
          const latestMap: Record<string, QuizAttempt> = {};
          (Array.isArray(attemptData) ? attemptData : []).forEach((attempt: QuizAttempt) => {
            if (!latestMap[attempt.quiz_uuid] ||
                new Date(attempt.completed_at) > new Date(latestMap[attempt.quiz_uuid].completed_at)) {
              latestMap[attempt.quiz_uuid] = attempt;
            }
          });
          setLatestAttempts(latestMap);
        }
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      setSubmitError(err.message || "Submission error");
      setSubmitted(false);
    }
  };

  // Image Component
  const QuestionImage = ({ url, alt = "Question image" }: { url?: string; alt?: string }) => {
    if (!url) return null;
    return (
      <div className="my-6 flex justify-center">
        <Image
          src={url}
          alt={alt}
          width={700}
          height={450}
          className="rounded-2xl shadow-lg max-h-[420px] object-contain border border-default-200 bg-default-50"
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 min-h-screen flex flex-col items-center justify-center">
        <Spinner size="lg" />
        <p className="text-center mt-4 text-default-600">Loading quizzes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-20 min-h-screen flex flex-col items-center justify-center">
        <AlertCircle className="h-16 w-16 text-danger mb-4" />
        <p className="text-center text-danger text-xl">{error}</p>
        <Button color="primary" className="mt-6" onPress={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  // Quiz Taking Mode
  if (started) {
    if (submitted && result) {
      const percentage = result.max > 0 ? Math.round((result.obtained / result.max) * 100) : 0;
      const isPassed = percentage >= 50;
      const correctCount = questionResults.filter(qr => qr.is_correct).length;
      const incorrectCount = questionResults.length - correctCount;

      return (
        <div className="container mx-auto px-4 py-8 min-h-screen">
          <GlassSurface width="100%" height="auto" className="max-w-5xl mx-auto">
            <div className="flex flex-col items-center justify-center text-center p-8">
              {isPassed ? (
                <Trophy className="h-24 w-24 text-success mb-6 animate-bounce" />
              ) : (
                <Award className="h-24 w-24 text-warning mb-6" />
              )}
              
              <h1 className="text-4xl font-bold mb-4">
                {isPassed ? "Congratulations! 🎉" : "Quiz Completed"}
              </h1>
              
              <Divider className="my-6" />
              
              <div className="space-y-6 w-full">
                <div className="flex justify-between items-center text-lg">
                  <span className="text-default-600">Your Score:</span>
                  <span className="text-3xl font-bold text-primary">
                    {result.obtained} / {result.max}
                  </span>
                </div>

                <Progress value={percentage} color={isPassed ? "success" : "warning"} size="lg" showValueLabel />

                <Chip color={isPassed ? "success" : "warning"} size="lg" variant="flat" className="text-lg px-8 py-6">
                  Score: {percentage}%
                </Chip>

                {/* Question Summary */}
                <div className="flex justify-center gap-4 mt-4">
                  <Chip 
                    color="success"
                    size="lg"
                    variant="flat"
                    startContent={<CheckCircle size={18} />}
                  >
                    {correctCount} Correct
                  </Chip>
                  <Chip 
                    color="danger"
                    size="lg"
                    variant="flat"
                    startContent={<XCircle size={18} />}
                  >
                    {incorrectCount} Incorrect
                  </Chip>
                </div>
              </div>

              <Divider className="my-6" />
              
              <div className="flex gap-4 mt-8">
                <Button 
                  size="lg" 
                  color="primary" 
                  variant="solid"
                  onPress={() => {
                    setStarted(false);
                    setSubmitted(false);
                    setResult(null);
                  }}
                  startContent={<ArrowLeft size={20} />}
                >
                  Back to Quizzes
                </Button>

                {selectedQuiz && (
                  <Button
                    size="lg"
                    color="secondary"
                    variant="bordered"
                    onPress={() => {
                      setStarted(false);
                      setSubmitted(false);
                      setResult(null);
                      setTimeout(() => startQuiz(selectedQuiz), 100);
                    }}
                  >
                    Retake Quiz
                  </Button>
                )}
              </div>
            </div>
          </GlassSurface>
        </div>
      );
    }

    if (submitted && submitError) {
      return (
        <div className="container mx-auto px-4 py-8 min-h-screen">
          <GlassSurface width="100%" height="auto" className="max-w-2xl mx-auto">
            <div className="flex flex-col items-center justify-center text-center p-12">
              <XCircle className="h-32 w-32 text-danger mb-8" />
              <h1 className="text-4xl font-bold mb-4 text-danger">Submission Error</h1>
              <p className="text-xl mb-8 text-default-600">{submitError}</p>

              <div className="flex gap-4">
                <Button size="lg" color="primary" onPress={() => { setSubmitted(false); setSubmitError(null); }}>
                  Try Again
                </Button>
                <Button size="lg" color="default" variant="bordered" onPress={() => setStarted(false)} startContent={<ArrowLeft size={20} />}>
                  Back to Quizzes
                </Button>
              </div>
            </div>
          </GlassSurface>
        </div>
      );
    }

    const currentQ = questions[currentIndex];
    const totalQuestions = questions.length;
    const progressPercentage = ((currentIndex + 1) / totalQuestions) * 100;

    if (!currentQ) {
      return (
        <div className="container mx-auto px-4 py-20 min-h-screen flex flex-col items-center justify-center">
          <AlertCircle className="h-16 w-16 text-danger mb-4" />
          <p className="text-danger text-xl">Question not found</p>
          <Button color="primary" className="mt-6" onPress={() => setStarted(false)}>
            Back to Quizzes
          </Button>
        </div>
      );
    }

    return (
      <div className="container mx-auto px-4 py-6 min-h-screen">
        {/* Header */}
        <Card className="mb-6 shadow-lg">
          <CardBody className="p-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <FileQuestion className="h-8 w-8 text-primary" />
                <h1 className="text-2xl md:text-3xl font-bold">{selectedQuiz?.title}</h1>
              </div>

              {selectedQuiz?.is_timed && timeLeft > 0 && (
                <div className={`flex items-center gap-2 text-2xl font-mono ${timeLeft < 60 ? "text-danger animate-pulse" : "text-warning"}`}>
                  <Clock className="h-8 w-8" />
                  {formatTime(timeLeft)}
                </div>
              )}
            </div>

            <div className="mt-6">
              <div className="flex justify-between text-sm text-default-600 mb-2">
                <span>Question {currentIndex + 1} of {totalQuestions}</span>
                <span>{Math.round(progressPercentage)}% Complete</span>
              </div>
              <Progress value={progressPercentage} color="primary" size="md" />
            </div>
          </CardBody>
        </Card>

        {/* Question Card */}
        <Card className="mb-6 shadow-lg">
          <CardBody className="p-8">
            <div className="flex items-start gap-4 mb-6">
              <Chip color="primary" size="lg" variant="flat">Q{currentIndex + 1}</Chip>
              <h2 className="text-xl md:text-2xl font-semibold flex-1">{currentQ.question_text}</h2>
            </div>

            {/* Question Image */}
            <QuestionImage url={currentQ.image_url} alt="Question illustration" />

            <Divider className="my-8" />

            {/* MCQ / ABCD Options with Images */}
            {(currentQ.type === "mcq" || currentQ.type === "abcd") && currentQ.options?.length > 0 ? (
              <div className="space-y-4">
                <p className="text-default-600 mb-4">Select all correct answers:</p>
                {currentQ.options.map((opt) => {
                  const selectedList = answers[currentQ.question_id] || [];
                  const isSelected = selectedList.includes(opt.letter);

                  return (
                    <Card
                      key={opt.letter}
                      isPressable
                      isHoverable
                      className={`transition-all duration-200 ${isSelected ? "border-2 border-primary bg-primary-50 dark:bg-primary-900/20" : "hover:border-default-300"}`}
                      onPress={() => {
                        const prev = selectedList;
                        handleAnswer(currentQ.question_id, isSelected ? prev.filter((l: string) => l !== opt.letter) : [...prev, opt.letter]);
                      }}
                    >
                      <CardBody className="p-6">
                        <div className="flex gap-4">
                          <Checkbox
                            isSelected={isSelected}
                            size="lg"
                            color="primary"
                            onChange={(e) => {
                              const prev = answers[currentQ.question_id] || [];
                              handleAnswer(
                                currentQ.question_id,
                                e.target.checked ? [...prev, opt.letter] : prev.filter((l: string) => l !== opt.letter)
                              );
                            }}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                              <Chip variant="flat" size="sm" className="font-mono">{opt.letter}</Chip>
                              <span className="text-lg">{opt.text}</span>
                            </div>

                            {opt.image_url && (
                              <div className="mt-3">
                                <Image
                                  src={opt.image_url}
                                  alt={`Option ${opt.letter}`}
                                  width={520}
                                  height={320}
                                  className="rounded-xl shadow-sm max-h-72 object-contain border border-default-100"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            ) : null}

            {/* Statement Type */}
            {currentQ.type === "statement" && currentQ.statements?.length > 0 ? (
              <div className="space-y-6">
                <p className="text-default-600 mb-4">Mark each statement as True or False:</p>
                {currentQ.statements.map((stmt) => {
                  const currentValue = answers[currentQ.question_id]?.[stmt.index];
                  return (
                    <Card key={stmt.index} className="bg-default-50 dark:bg-default-900/50">
                      <CardBody className="p-6">
                        <div className="flex items-start gap-4 mb-5">
                          <Chip color="secondary" size="sm">{stmt.index}</Chip>
                          <p className="text-lg flex-1">{stmt.text}</p>
                        </div>

                        <RadioGroup
                          value={currentValue !== undefined ? String(currentValue) : undefined}
                          onValueChange={(v) => {
                            const prev = answers[currentQ.question_id] || {};
                            handleAnswer(currentQ.question_id, { ...prev, [stmt.index]: v === "true" });
                          }}
                          orientation="horizontal"
                          classNames={{ wrapper: "gap-8" }}
                        >
                          <Radio value="true" color="success">True</Radio>
                          <Radio value="false" color="danger">False</Radio>
                        </RadioGroup>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            ) : null}

            {currentQ.type !== "mcq" && currentQ.type !== "abcd" && currentQ.type !== "statement" && (
              <p className="text-danger text-center py-8">Unsupported question type: {currentQ.type}</p>
            )}
          </CardBody>
        </Card>

        {/* Navigation */}
        <Card className="shadow-lg">
          <CardBody className="p-6">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <Button
                size="lg"
                variant="bordered"
                disabled={currentIndex === 0}
                onPress={() => setCurrentIndex(currentIndex - 1)}
                startContent={<ArrowLeft size={20} />}
              >
                Previous
              </Button>

              <div className="flex gap-2 flex-wrap justify-center">
                {questions.slice(0, 10).map((_, idx) => (
                  <Button
                    key={idx}
                    size="sm"
                    variant={idx === currentIndex ? "solid" : "bordered"}
                    color={answers[questions[idx]?.question_id] ? "primary" : "default"}
                    isIconOnly
                    onPress={() => setCurrentIndex(idx)}
                  >
                    {idx + 1}
                  </Button>
                ))}
                {totalQuestions > 10 && <Chip size="sm" variant="flat">+{totalQuestions - 10}</Chip>}
              </div>

              {currentIndex === totalQuestions - 1 ? (
                <Button size="lg" color="success" variant="shadow" onPress={handleSubmit} endContent={<CheckCircle size={20} />}>
                  Submit Quiz
                </Button>
              ) : (
                <Button size="lg" color="primary" onPress={() => setCurrentIndex(currentIndex + 1)} endContent={<ArrowRight size={20} />}>
                  Next
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Quiz Listing Page
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Quick Quiz Access
        </h1>
        <p className="text-default-600 text-lg mt-3">Test your knowledge and track your progress</p>
      </div>

      {quizzes.length === 0 ? (
        <GlassSurface className="max-w-2xl mx-auto">
          <div className="text-center py-20">
            <BookOpen className="h-24 w-24 text-default-400 mx-auto mb-6" />
            <p className="text-xl text-default-500">No quizzes available at the moment</p>
          </div>
        </GlassSurface>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => {
            const attempt = latestAttempts[quiz.uuid];
            const percentage = attempt && attempt.total_points > 0
              ? Math.round((attempt.score / attempt.total_points) * 100)
              : 0;

            return (
              <Card key={quiz.uuid} className="shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                <CardHeader className="flex-col items-start p-6 pb-0">
                  <div className="flex justify-between items-start w-full mb-3">
                    <Chip color={quiz.is_timed ? "warning" : "success"} variant="flat" size="sm" startContent={quiz.is_timed ? <Timer size={14} /> : <CheckCircle size={14} />}>
                      {quiz.is_timed ? `${quiz.default_duration} min` : "Untimed"}
                    </Chip>

                    {attempt && (
                      <Chip color={percentage >= 50 ? "success" : "warning"} variant="flat" size="sm">
                        {percentage}%
                      </Chip>
                    )}
                  </div>
                  <h3 className="text-xl font-bold">{quiz.title}</h3>
                </CardHeader>

                <CardBody className="p-6 pt-3">
                  <p className="text-default-600 mb-4 min-h-[60px]">
                    {quiz.description || "No description available"}
                  </p>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-default-600">Questions:</span>
                      <span className="font-medium">{quiz.num_questions || "?"}</span>
                    </div>

                    {attempt && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-default-600">Best Score:</span>
                          <span className="font-semibold text-primary">
                            {attempt.score} / {attempt.total_points}
                          </span>
                        </div>
                        <Progress value={percentage} color={percentage >= 50 ? "success" : "warning"} size="sm" className="mt-1" />
                      </>
                    )}
                  </div>
                </CardBody>

                <CardFooter className="p-6 pt-0 flex gap-3">
                  <Button
                    color="primary"
                    className="flex-1"
                    onPress={() => startQuiz(quiz)}
                    startContent={<BookOpen size={18} />}
                  >
                    {attempt ? "Retake" : "Start"}
                  </Button>

                  {attempt && (
                    <Button
                      color="secondary"
                      variant="flat"
                      className="flex-1"
                      onPress={() => openHistoryDetails(attempt)}
                      startContent={<Eye size={18} />}
                    >
                      View Details
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* History Modal */}
      <Modal isOpen={historyOpen} onClose={historyOnClose} size="5xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <Eye className="h-6 w-6 text-primary" />
                  Detailed Quiz Results
                </div>
                {selectedHistoryAttempt && (
                  <p className="text-sm text-default-600 font-normal">
                    {selectedHistoryAttempt.quiz_title || "Quiz Details"}
                  </p>
                )}
              </ModalHeader>

              <ModalBody className="py-6">
                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Spinner size="lg" />
                    <p className="text-center mt-4 text-default-600">Loading details...</p>
                  </div>
                ) : selectedHistoryAttempt ? (
                  <div className="space-y-8">
                    {/* Score Summary */}
                    <GlassSurface className="bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20">
                      <div className="p-8">
                        <div className="flex flex-wrap justify-between items-center gap-6">
                          <div>
                            <p className="text-sm text-default-600">Final Score</p>
                            <p className="text-4xl font-bold text-primary">
                              {selectedHistoryAttempt.score} / {selectedHistoryAttempt.total_points}
                            </p>
                          </div>
                          <div className="flex gap-6">
                            <div>
                              <p className="text-sm text-default-600">Percentage</p>
                              <Chip
                                color={
                                  selectedHistoryAttempt.total_points > 0 &&
                                  (selectedHistoryAttempt.score / selectedHistoryAttempt.total_points) >= 0.5
                                    ? "success"
                                    : "warning"
                                }
                                size="lg"
                                variant="flat"
                              >
                                {selectedHistoryAttempt.total_points > 0
                                  ? Math.round((selectedHistoryAttempt.score / selectedHistoryAttempt.total_points) * 100)
                                  : 0}%
                              </Chip>
                            </div>
                            {selectedHistoryAttempt.time_taken && (
                              <div>
                                <p className="text-sm text-default-600">Time Taken</p>
                                <Chip size="lg" variant="flat" startContent={<Clock size={16} />}>
                                  {formatTime(selectedHistoryAttempt.time_taken)}
                                </Chip>
                              </div>
                            )}
                          </div>
                        </div>

                        <Progress
                          value={
                            selectedHistoryAttempt.total_points > 0
                              ? (selectedHistoryAttempt.score / selectedHistoryAttempt.total_points) * 100
                              : 0
                          }
                          color={
                            selectedHistoryAttempt.total_points > 0 &&
                            (selectedHistoryAttempt.score / selectedHistoryAttempt.total_points) >= 0.5
                              ? "success"
                              : "warning"
                          }
                          className="mt-6"
                        />
                      </div>
                    </GlassSurface>

                    <div className="space-y-6">
                      <h3 className="text-2xl font-semibold flex items-center gap-3">
                        <FileQuestion size={24} /> Question Breakdown
                      </h3>
                      {/* History breakdown can be enhanced later with images */}
                    </div>
                  </div>
                ) : (
                  <p className="text-center py-12 text-default-500">No data available</p>
                )}
              </ModalBody>

              <ModalFooter>
                <Button color="primary" variant="light" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}