"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/src/lib/useAuth";
import { Spinner } from "@heroui/spinner";
import SplitText from "@/components/ui/SplitText";
import GlassSurface from '@/components/GlassSurface';
import { TrendingUp, TrendingDown } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';


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
  const [studentLoading, setStudentLoading] = useState(true);
  const [marksLoading, setMarksLoading] = useState(true);
  const [error, setError] = useState("");
  const [marksError, setMarksError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes rotate3d {
        0% {
          transform: perspective(1000px) rotateY(0deg) rotateX(10deg);
        }
        25% {
          transform: perspective(1000px) rotateY(90deg) rotateX(10deg);
        }
        50% {
          transform: perspective(1000px) rotateY(180deg) rotateX(10deg);
        }
        75% {
          transform: perspective(1000px) rotateY(270deg) rotateX(10deg);
        }
        100% {
          transform: perspective(1000px) rotateY(360deg) rotateX(10deg);
        }
      }
      .animate-3d-rotate {
        animation: rotate3d 10s ease-in-out infinite;
        transform-style: preserve-3d;
        filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
      }
      .animate-3d-rotate::before {
        content: '';
        position: absolute;
        top: 5px;
        left: 5px;
        right: -5px;
        bottom: -5px;
        background: inherit;
        filter: blur(15px) brightness(0.8);
        z-index: -1;
        opacity: 0.6;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
const today = new Date().toLocaleDateString("en-US", {
  month: "long",
  day: "numeric",
});

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Fetch student details
  useEffect(() => {
    if (!hydrated || authLoading || !user) return;
    setStudentLoading(true);
    const param = user.uuid ? `user_uuid=${user.uuid}` : `user_email=${encodeURIComponent(user.user_email || "")}`;
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

  // Prepare chart data (last 4 papers, sorted oldest → newest)
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
      year: "numeric",
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

  // Padding hack for nicer visual spacing
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

      // Destroy previous chart if exists
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
              borderColor: "rgb(33, 150, 243)",
              backgroundColor: "rgba(33, 150, 243, 0.2)",
              tension: 0.4,
              fill: true,
              borderWidth: 2,
              pointRadius: 5,
            },
            {
              label: "Essay (Part B)",
              data: chartEssay,
              borderColor: "rgb(255, 152, 0)",
              backgroundColor: "rgba(255, 152, 0, 0.2)",
              tension: 0.4,
              fill: true,
              borderWidth: 2,
              pointRadius: 5,
            },
            {
              label: "Total",
              data: chartTotal,
              borderColor: "rgb(76, 175, 80)",
              backgroundColor: "rgba(76, 175, 80, 0.2)",
              tension: 0.4,
              fill: true,
              borderWidth: 2,
              pointRadius: 5,
            },
            {
              label: "Class Average",
              data: chartAvg,
              borderColor: "rgba(156, 39, 176, 0.9)",
              backgroundColor: "rgba(156, 39, 176, 0.1)",
              borderDash: [5, 5],
              tension: 0.3,
              fill: false,
              borderWidth: 2,
              pointRadius: 5,
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
              title: { display: true, text: "Marks" },
            },
          },
          plugins: {
            legend: { position: "top" },
            title: {
              display: true,
              text: `My Progress (Last ${sortedLimitedTrend.length} Papers)`,
            },
          },
        },
      });
      // @ts-ignore
      chartCanvasRef.current._chartInstance = chart;
    })();
  }, [sortedLimitedTrend.length, chartMcq, chartEssay, chartTotal, chartAvg, chartLabels]);

  // Trend percentage calculation (oldest → newest)
  const trendInfo = useMemo(() => {
    if (totalSeries.length < 2) return null;
    const first = totalSeries[0];
    const last = totalSeries[totalSeries.length - 1];
    const percent = ((last - first) / first * 100).toFixed(1);
    const isUp = Number(percent) > 0;
    return { percent: Math.abs(Number(percent)), isUp };
  }, [totalSeries]);

  const qrValue = `${student?.uuid}|${student?.student_id}|${student?.user_email}`;

  if (!hydrated || authLoading || studentLoading)
    return <div className="w-full h-full flex justify-center items-center"><Spinner size="md" /></div>;

  if (error) return <div className="text-red-500 text-center">{error}</div>;
  if (!student) return <div className="text-center">No student data found.</div>;

  return (
    <>
      <div className="w-full flex flex-col gap-5">
        {/* Welcome + QR Section */}
        <GlassSurface className="!w-full !h-auto space-y-6 p-6 rounded-xl">
          <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h3 className="text-lg text-gray-600">{today}</h3>
              <SplitText
                text={`Welcome ${student?.first_name} ${student?.last_name}`}
                className="text-3xl md:text-4xl font-semibold"
                delay={50}
                duration={1.25}
                ease="power3.out"
                splitType="words"
                from={{ opacity: 0, y: 40 }}
                to={{ opacity: 1, y: 0 }}
              />
              <p className="mt-4 text-lg text-gray-600">Student ID: {student?.student_id}</p>
            </div>
            <div className="flex-shrink-0 bg-white p-4 rounded-xl shadow-lg">
              <QRCodeSVG value={qrValue} size={140} />
            </div>
          </div>
        </GlassSurface>
         {/* Rank and Mark Cards */}
        <div className="flex w-full flex-col items-center justify-center gap-5 md:flex-row">
          <GlassSurface className="flex h-auto items-center !py-26 justify-between !w-full md:!w-1/2 p-6">
            <div className="w-2/3 text-2xl font-semibold">
              <span>
                My Rank: <span className="user_top_rank text-blue-600">{rank?.rank || "N/A"}</span>
              </span>
              <div className="text-sm text-gray-500">
                of {rank?.totalStudents || "0"} students
              </div>
            </div>
            <div className="w-1/3 flex justify-end relative">
              <img 
                src="/island.png" 
                alt="rank" 
                className="max-w-full h-auto animate-3d-rotate relative"
              />
            </div>
          </GlassSurface>

          <GlassSurface className="flex h-auto items-center !py-26 justify-between !w-full md:!w-1/2 p-6">
            <div className="w-2/3 text-2xl font-semibold">
              <span>
                My Mark:{" "}
                <span className="user_top_mark text-green-600">
                  {marks?.trend?.[marks.trend.length - 1]?.total || "0"}
                </span>
              </span>
              <div className="text-sm text-gray-500">Latest paper</div>
            </div>
            <div className="w-1/3 flex justify-end relative">
              <img 
                src="/lashinigeo_rank.png" 
                alt="mark" 
                className="max-w-full h-auto animate-3d-rotate relative"
              />
            </div>
          </GlassSurface>
        </div>


        {/* Performance Chart */}
        <GlassSurface className="!h-auto !w-full">
          <div className="w-full">
            <h1 className="!text-2xl py-2 px-4 !font-semibold">Performance Overview</h1>

            {marksLoading ? (
              <div style={{ height: 420 }} className="w-full flex items-center justify-center">
                <Spinner size="md" />
              </div>
            ) : marksError ? (
              <div style={{ height: 420 }} className="w-full flex items-center justify-center text-red-600">
                {marksError}
              </div>
            ) : sortedLimitedTrend.length === 0 ? (
              <div style={{ height: 420 }} className="w-full flex items-center justify-center text-gray-500">
                No performance data available.
              </div>
            ) : (
              <>
                <div className="w-full px-4" style={{ height: 420 }}>
                  <canvas ref={chartCanvasRef} />
                </div>

                {trendInfo && (
                  <div className="px-4 py-4 flex flex-col gap-2 text-sm border-t border-gray-200">
                    <div className="flex gap-2 font-medium leading-none">
                      {trendInfo.isUp ? "Trending up" : "Trending down"} by {trendInfo.percent}% over the period{" "}
                      {trendInfo.isUp ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="leading-none text-muted-foreground">
                      Showing scores for the last {sortedLimitedTrend.length} papers
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </GlassSurface>
      </div>
    </>
  );
}