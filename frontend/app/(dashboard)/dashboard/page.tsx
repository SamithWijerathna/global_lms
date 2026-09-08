"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/src/lib/useAuth";
import { Spinner } from "@heroui/spinner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Award,
  BarChart3,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  FileText,
  Package,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Sparkles,
  PlayCircle,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getMaterialCoverImage } from "@/components/ProtectedYouTubePlayer";

interface Student {
  uuid: string;
  student_id: string;
  first_name: string;
  last_name: string;
  batch: string;
  birthday: string;
  phone: string;
  profile_url: string;
  user_email: string;
  user_address: string;
  id_number: string;
  create_at: string;
}

type TrendPoint = {
  id: number;
  paper_id: string;
  paper_name: string;
  date: string;
  total: number;
  mcq: number;
  essay: number;
};

type BestPaper = {
  paper_id: string;
  paper_name: string | null;
  best_total: number;
};

type MarksResponse = {
  student_uuid: string;
  latestPaperId: string | null;
  bestPaper: BestPaper | null;
  trend: TrendPoint[];
  classAverageTrend: Array<{ date: string; average: number }>;
};

type RankResponse = {
  student_uuid: string;
  paper_id: string;
  rank: number | null;
  topScore: number | null;
  totalStudents: number;
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [marks, setMarks] = useState<MarksResponse | null>(null);
  const [rank, setRank] = useState<RankResponse | null>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [studentLoading, setStudentLoading] = useState(true);
  const [marksLoading, setMarksLoading] = useState(true);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [error, setError] = useState("");
  const [marksError, setMarksError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const scrollSlider = (direction: "left" | "right") => {
    if (!sliderRef.current) return;
    const scrollAmount = 320;
    sliderRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Fetch student details
  useEffect(() => {
    if (!hydrated || authLoading) return;
    if (!user) {
      setStudentLoading(false);
      return;
    }
    setStudentLoading(true);
    const param = user.uuid
      ? `user_uuid=${user.uuid}`
      : `user_email=${encodeURIComponent(user.user_email || "")}`;
    fetch(`/api/dashboard/user?${param}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch student details");
        return res.json();
      })
      .then((data) => setStudent(data))
      .catch((err) => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => setStudentLoading(false));
  }, [user, hydrated, authLoading]);

  // Fetch marks and rank
  useEffect(() => {
    if (!user?.uuid || authLoading) return;

    const load = async () => {
      try {
        setMarksLoading(true);
        setMarksError(null);
        setRank(null);

        const res = await fetch(
          `/api/paper/marks?student_uuid=${user.uuid}&withAverage=true`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("Failed to load marks");
        const marksData: MarksResponse = await res.json();
        setMarks(marksData);

        if (marksData.latestPaperId) {
          const rankRes = await fetch(
            `/api/paper/rank?student_uuid=${user.uuid}&paper_id=${marksData.latestPaperId}`,
            { cache: "no-store" }
          );
          if (rankRes.ok) {
            const rankData: RankResponse = await rankRes.json();
            setRank(rankData);
          }
        }
      } catch (e: any) {
        console.error(e);
        setMarksError(e.message || "Failed to load performance data");
      } finally {
        setMarksLoading(false);
      }
    };

    load();
  }, [user?.uuid, authLoading]);

  // Fetch recent class materials
  useEffect(() => {
    if (!hydrated) return;
    setMaterialsLoading(true);
    fetch("/api/class-materials")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.materials)) {
          setMaterials(data.materials.slice(0, 10));
        }
      })
      .catch(console.error)
      .finally(() => setMaterialsLoading(false));
  }, [hydrated]);

  // Prepare chart data (last 4 papers, sorted oldest -> newest)
  const sortedLimitedTrend = useMemo(() => {
    if (!marks?.trend?.length) return [];
    return [...marks.trend]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-4);
  }, [marks?.trend]);

  const labels = sortedLimitedTrend.map((t) => {
    const formattedDate = new Date(t.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `${t.paper_name || t.paper_id} (${formattedDate})`;
  });

  const mcqSeries = sortedLimitedTrend.map((t) => t.mcq);
  const essaySeries = sortedLimitedTrend.map((t) => t.essay);
  const totalSeries = sortedLimitedTrend.map((t) => t.total);

  const avgSeries = useMemo(() => {
    if (!marks) return [];
    const avgMap = new Map(marks.classAverageTrend.map((x) => [x.date, x.average]));
    return sortedLimitedTrend.map((t) => avgMap.get(t.date) ?? null);
  }, [marks, sortedLimitedTrend]);

  const gapCount = 3;
  const chartLabels = ["Start", ...labels, ...Array(gapCount - 1).fill("")];
  const chartMcq = [0, ...mcqSeries, ...Array(gapCount - 1).fill(null)];
  const chartEssay = [0, ...essaySeries, ...Array(gapCount - 1).fill(null)];
  const chartTotal = [0, ...totalSeries, ...Array(gapCount - 1).fill(null)];
  const chartAvg = [null, ...avgSeries, ...Array(gapCount - 1).fill(null)];

  // Chart.js instance
  useEffect(() => {
    if (!chartCanvasRef.current || sortedLimitedTrend.length === 0) return;

    (async () => {
      const mod = await import("chart.js/auto");
      const Chart = mod.default;
      const ctx = chartCanvasRef.current!.getContext("2d");
      if (!ctx) return;

      // @ts-ignore
      if (chartCanvasRef.current._chartInstance) {
        // @ts-ignore
        chartCanvasRef.current._chartInstance.destroy();
      }

      // @ts-ignore
      const chart = new Chart(ctx, {
        type: "line",
        data: {
          labels: chartLabels,
          datasets: [
            {
              label: "MCQ (Part A)",
              data: chartMcq,
              borderColor: "#3b82f6",
              backgroundColor: "rgba(59, 130, 246, 0.12)",
              tension: 0.3,
              fill: true,
              borderWidth: 2,
              pointRadius: 4,
            },
            {
              label: "Essay (Part B)",
              data: chartEssay,
              borderColor: "#f59e0b",
              backgroundColor: "rgba(245, 158, 11, 0.12)",
              tension: 0.3,
              fill: true,
              borderWidth: 2,
              pointRadius: 4,
            },
            {
              label: "Total",
              data: chartTotal,
              borderColor: "#10b981",
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              tension: 0.3,
              fill: true,
              borderWidth: 2.5,
              pointRadius: 5,
            },
            {
              label: "Class Average",
              data: chartAvg,
              borderColor: "#8b5cf6",
              backgroundColor: "rgba(139, 92, 246, 0.05)",
              borderDash: [5, 5],
              tension: 0.3,
              fill: false,
              borderWidth: 2,
              pointRadius: 4,
              spanGaps: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              suggestedMax: 100,
              grid: { color: "rgba(156, 163, 175, 0.1)" },
            },
            x: {
              grid: { display: false },
            },
          },
          plugins: {
            legend: { position: "top", labels: { boxWidth: 12, usePointStyle: true } },
          },
        },
      });
      // @ts-ignore
      chartCanvasRef.current._chartInstance = chart;
    })();
  }, [sortedLimitedTrend.length, chartMcq, chartEssay, chartTotal, chartAvg, chartLabels]);

  // Trend info calculation
  const trendInfo = useMemo(() => {
    if (totalSeries.length < 2) return null;
    const first = totalSeries[0];
    const last = totalSeries[totalSeries.length - 1];
    const percent = ((last - first) / (first || 1) * 100).toFixed(1);
    const isUp = Number(percent) >= 0;
    return { percent: Math.abs(Number(percent)), isUp };
  }, [totalSeries]);

  const qrValue = `${student?.uuid}|${student?.student_id}|${student?.user_email}`;

  if (!hydrated || authLoading || studentLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) return <div className="text-red-500 text-center py-10">{error}</div>;
  if (!student) return <div className="text-center py-10">No student data found.</div>;

  const latestScore = marks?.trend?.[marks.trend.length - 1]?.total ?? 0;
  const bestScore = marks?.bestPaper?.best_total ?? 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Welcome Banner Card */}
      <Card className="border-0 shadow-md bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl overflow-hidden relative">
        <div className="p-5 sm:p-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-xl w-full">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium backdrop-blur-sm">
              <Calendar className="w-3.5 h-3.5" />
              <span>{today}</span>
            </div>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
              Welcome back, {student?.first_name} {student?.last_name}!
            </h1>
            <p className="text-indigo-200 text-xs sm:text-base leading-relaxed">
              Track your academic performance, review your class materials, and stay on top of your learning goals.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
              <Link
                href="/my-classes"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-colors shadow-md"
              >
                <BookOpen className="w-4 h-4" />
                <span>My Classes</span>
              </Link>
              <Link
                href="/class-materials"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold transition-colors backdrop-blur-sm"
              >
                <FileText className="w-4 h-4" />
                <span>Class Materials</span>
              </Link>
            </div>
          </div>

          {/* Student QR & Verification Card */}
          <div className="w-full md:w-auto flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 rounded-2xl border border-slate-800/80 shadow-xl gap-2.5">
            <div className="p-2 bg-white rounded-xl shadow-md flex items-center justify-center">
              <QRCodeSVG value={qrValue} size={105} />
            </div>
            <div className="text-center">
              <p className="text-[11px] text-slate-400 font-medium tracking-wide">Student Verification</p>
              <p className="text-xs font-bold text-white font-mono tracking-widest mt-0.5">{student?.student_id}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 4 Professional Elegant Gradient Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Rank */}
        <Card className="border border-indigo-800/40 shadow-md bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-xl p-3.5 sm:p-5 flex flex-col justify-between transition-all hover:border-indigo-700/60">
          <CardHeader className="p-0 pb-1.5 sm:pb-2">
            <CardTitle className="text-[11px] sm:text-xs font-semibold text-indigo-200/80 uppercase tracking-wider">Class Rank</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              #{rank?.rank || "N/A"}
            </div>
            <p className="text-[11px] sm:text-xs text-indigo-300/80 mt-1.5 font-medium">
              out of {rank?.totalStudents || 0} students
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Latest Mark */}
        <Card className="border border-emerald-800/40 shadow-md bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950 text-white rounded-xl p-3.5 sm:p-5 flex flex-col justify-between transition-all hover:border-emerald-700/60">
          <CardHeader className="p-0 pb-1.5 sm:pb-2">
            <CardTitle className="text-[11px] sm:text-xs font-semibold text-emerald-200/80 uppercase tracking-wider">Latest Mark</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {latestScore} <span className="text-xs sm:text-sm font-normal text-emerald-300/70">/ 100</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-emerald-300/90 font-medium mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Latest exam result</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Best Score */}
        <Card className="border border-amber-800/40 shadow-md bg-gradient-to-br from-amber-900 via-amber-950 to-slate-950 text-white rounded-xl p-3.5 sm:p-5 flex flex-col justify-between transition-all hover:border-amber-700/60">
          <CardHeader className="p-0 pb-1.5 sm:pb-2">
            <CardTitle className="text-[11px] sm:text-xs font-semibold text-amber-200/80 uppercase tracking-wider">Best Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {bestScore} <span className="text-xs sm:text-sm font-normal text-amber-300/70">/ 100</span>
            </div>
            <p className="text-[11px] sm:text-xs text-amber-300/80 truncate mt-1.5 font-medium">
              {marks?.bestPaper?.paper_name || "Highest score"}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Active Batch */}
        <Card className="border border-purple-800/40 shadow-md bg-gradient-to-br from-purple-900 via-purple-950 to-slate-950 text-white rounded-xl p-3.5 sm:p-5 flex flex-col justify-between transition-all hover:border-purple-700/60">
          <CardHeader className="p-0 pb-1.5 sm:pb-2">
            <CardTitle className="text-[11px] sm:text-xs font-semibold text-purple-200/80 uppercase tracking-wider">Active Batch</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-xl sm:text-3xl font-extrabold text-white truncate tracking-tight">
              {student?.batch || "Enrolled"}
            </div>
            <p className="text-[11px] sm:text-xs text-purple-300/80 mt-1.5 font-medium font-mono">
              ID: {student?.student_id}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Columns wide) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Recent Class Materials ("Continue Learning") */}
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 rounded-xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Class Materials
                </CardTitle>
                <CardDescription>Access latest lessons, PDFs, and video lectures</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollSlider("left")}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                  aria-label="Previous materials"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollSlider("right")}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                  aria-label="Next materials"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <Link
                  href="/class-materials"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 flex items-center gap-1 ml-2"
                >
                  <span>View All</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {materialsLoading ? (
                <div className="py-8 text-center text-gray-400">Loading materials...</div>
              ) : materials.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">
                  No recent materials available.
                </div>
              ) : (
                <div
                  ref={sliderRef}
                  className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory hide-scrollbar pb-2 pt-1"
                >
                  {materials.map((m: any, idx: number) => {
                    const isVideo = m.material_type === "video";
                    const coverImg = getMaterialCoverImage(m);
                    return (
                      <div
                        key={`mat-${m.id || m.material_id || idx}-${idx}`}
                        className="min-w-[280px] sm:min-w-[310px] max-w-[330px] flex-shrink-0 snap-start group flex flex-col justify-between border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-gray-50/50 dark:bg-gray-800/30 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all shadow-xs"
                      >
                        {/* Preview Thumbnail Banner */}
                        <div className="relative w-full aspect-video bg-slate-950 overflow-hidden">
                          {coverImg ? (
                            <img
                              src={coverImg}
                              alt={m.material_title || "Material preview"}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
                              <div className="p-3 rounded-full bg-white/10 text-white backdrop-blur-sm">
                                {isVideo ? <PlayCircle className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                              </div>
                            </div>
                          )}
                          {/* Video Play Overlay */}
                          {isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
                              <div className="w-10 h-10 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <PlayCircle className="w-6 h-6 fill-current" />
                              </div>
                            </div>
                          )}
                          {/* Type & Section Badges */}
                          <div className="absolute top-2 left-2">
                            <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
                              {m.material_type || "LESSON"}
                            </span>
                          </div>
                          {m.section_name && (
                            <div className="absolute top-2 right-2">
                              <span className="px-2 py-0.5 rounded-md bg-indigo-600/80 backdrop-blur-md text-white text-[10px] font-medium truncate max-w-[110px]">
                                {m.section_name}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Body */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div className="space-y-1.5">
                            <h4 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {m.material_title || m.title || "Class Resource"}
                            </h4>
                            {m.material_description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                {m.material_description.replace(/<[^>]*>?/gm, "")}
                              </p>
                            )}
                          </div>
                          <div className="pt-2 border-t border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between">
                            <span className="text-[11px] text-gray-400 font-medium">
                              {m.create_at ? new Date(m.create_at).toLocaleDateString() : "Recent"}
                            </span>
                            <Link
                              href="/class-materials"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              <span>Open</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card: Performance Analytics Line Graph */}
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                  Performance Overview
                </CardTitle>
                <CardDescription>Paper mark progression over time</CardDescription>
              </div>
              {trendInfo && (
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    trendInfo.isUp
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                  }`}
                >
                  {trendInfo.isUp ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {trendInfo.isUp ? "+" : "-"}
                    {trendInfo.percent}% trend
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {marksLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <Spinner size="md" />
                </div>
              ) : marksError ? (
                <div className="h-80 flex items-center justify-center text-red-500 text-sm">
                  {marksError}
                </div>
              ) : sortedLimitedTrend.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-gray-400 text-sm">
                  No exam score data found yet.
                </div>
              ) : (
                <div className="w-full h-80 pt-2">
                  <canvas ref={chartCanvasRef} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card: Exam Marks Table */}
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Paper Scores
              </CardTitle>
              <CardDescription>Detailed breakdown of your recent examination marks</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {marks?.trend && marks.trend.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-y border-gray-100 dark:border-gray-800 uppercase">
                      <tr>
                        <th className="px-6 py-3">Paper</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3 text-center">MCQ</th>
                        <th className="px-6 py-3 text-center">Essay</th>
                        <th className="px-6 py-3 text-right">Total Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {marks.trend.slice(-5).map((t, idx) => (
                        <tr key={`score-${t.id || t.paper_id || idx}-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                          <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                            {t.paper_name || t.paper_id}
                          </td>
                          <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                            {new Date(t.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-center font-medium text-blue-600 dark:text-blue-400">
                            {t.mcq}
                          </td>
                          <td className="px-6 py-4 text-center font-medium text-amber-600 dark:text-amber-400">
                            {t.essay}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              {t.total} / 100
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-6 text-center text-gray-400 text-sm">
                  No paper attempt history available.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Sidebar Widgets - 1 Column wide) */}
        <div className="space-y-6">
          {/* Card: Student Profile Summary */}
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 rounded-xl">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 rounded-full bg-indigo-600 text-white font-bold text-xl flex items-center justify-center mx-auto shadow-md">
                {student?.first_name?.[0] || "S"}{student?.last_name?.[0] || ""}
              </div>
              <CardTitle className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
                {student?.first_name} {student?.last_name}
              </CardTitle>
              <CardDescription>Student Profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs border-t border-gray-100 dark:border-gray-800 pt-4">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 dark:text-gray-400">Student ID</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">{student?.student_id}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 dark:text-gray-400">Batch</span>
                <span className="font-semibold text-gray-900 dark:text-white">{student?.batch || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 dark:text-gray-400">Email</span>
                <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[160px]">{student?.user_email}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 dark:text-gray-400">Phone</span>
                <span className="font-semibold text-gray-900 dark:text-white">{student?.phone || "N/A"}</span>
              </div>
            </CardContent>
            <CardFooter className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <Link
                href="/settings/edit-profile"
                className="w-full py-2 text-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-semibold text-gray-800 dark:text-gray-200 transition-colors"
              >
                Edit Profile Settings
              </Link>
            </CardFooter>
          </Card>

          {/* Card: Quick Navigation Shortcuts */}
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                Quick Shortcuts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-0">
              <Link
                href="/my-classes"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                      My Classes
                    </p>
                    <p className="text-xs text-gray-500">Access registered classes</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                href="/class-store"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                      Class Store
                    </p>
                    <p className="text-xs text-gray-500">Enroll in new classes</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                href="/class-materials"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                      Class Materials
                    </p>
                    <p className="text-xs text-gray-500">Download notes & videos</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                href="/settings/payment-history"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:emerald-400">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                      Payment History
                    </p>
                    <p className="text-xs text-gray-500">View receipts & status</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}