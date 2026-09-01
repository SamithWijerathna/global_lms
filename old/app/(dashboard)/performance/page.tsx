"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/src/lib/useAuth";
import { Spinner } from "@heroui/spinner";
import GlassSurface from '@/components/GlassSurface'
import { Table, TableHeader, TableBody, TableColumn, TableRow, TableCell } from "@heroui/table";

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

export default function StudentMarksDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [marks, setMarks] = useState<MarksResponse | null>(null);
  const [rank, setRank] = useState<RankResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!user?.uuid || authLoading) return;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/paper/marks?student_uuid=${user.uuid}&withAverage=true`,
          { cache: "no-store" }
        );
        const marksData: MarksResponse = await res.json();
        if (!res.ok) throw new Error("Failed to load marks");
        setMarks(marksData);

        if (marksData.latestPaperId) {
          const rankRes = await fetch(
            `/api/paper/rank?student_uuid=${user.uuid}&paper_id=${marksData.latestPaperId}`,
            { cache: "no-store" }
          );
          const rankData: RankResponse = await rankRes.json();
          if (rankRes.ok) setRank(rankData);
        } else {
          setRank(null);
        }
      } catch (e: any) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.uuid, authLoading]);

  const limitedTrend = useMemo(() => {
    if (!marks?.trend?.length) return [];
    return marks.trend.slice(-4);
  }, [marks]);

  const labels = limitedTrend.map((t) => `${t.paper_name} (${t.date})`);
  const mcqSeries = limitedTrend.map((t) => t.mcq);
  const essaySeries = limitedTrend.map((t) => t.essay);
  const totalSeries = limitedTrend.map((t) => t.total);

  const avgSeries = useMemo(() => {
    if (!marks) return [];
    const avgMap = new Map(marks.classAverageTrend.map((x) => [x.date, x.average]));
    return limitedTrend.map((t) => avgMap.get(t.date) ?? null);
  }, [marks, limitedTrend]);

  const gapCount = 3;
  const startGap = [0];
  const endGap = Array(gapCount - 1).fill(0);
  const avgStartGap = [null];
  const avgEndGap = Array(gapCount - 1).fill(null);

  const chartLabels = ["Start", ...labels, ...Array(gapCount - 1).fill("")];
  const chartMcq = [0, ...mcqSeries, ...Array(gapCount - 1).fill(null)];
  const chartEssay = [0, ...essaySeries, ...Array(gapCount - 1).fill(null)];
  const chartTotal = [0, ...totalSeries, ...Array(gapCount - 1).fill(null)];
  const chartAvg = [null, ...avgSeries, ...Array(gapCount - 1).fill(null)];

  useEffect(() => {
    if (!chartCanvasRef.current || !limitedTrend.length) return;

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
            title: { display: true, text: "My Progress (Last 4 Papers)" },
          },
        },
      });

      // @ts-ignore
      chartCanvasRef.current._chartInstance = chart;
    })();
  }, [limitedTrend, chartMcq, chartEssay, chartTotal, chartAvg, chartLabels]);

  // Table columns definition
  const columns = [
    { key: "paper", label: "Paper", align: "start" as const },
    { key: "date", label: "Date", align: "center" as const },
    { key: "mcq", label: "MCQ (Part A)", align: "center" as const },
    { key: "essay", label: "Essay (Part B)", align: "center" as const },
    { key: "total", label: "Total", align: "center" as const },
  ];

  // Table rows data (sorted newest first)
  const rows = useMemo(() => {
    if (!marks?.trend?.length) return [];

    const sortedTrend = [...marks.trend].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return sortedTrend.map((t) => ({
      key: t.id.toString(),
      paper: t.paper_name || t.paper_id,
      date: t.date,
      mcq: t.mcq,
      essay: t.essay,
      total: t.total,
    }));
  }, [marks?.trend]);

  if (authLoading || loading) return <div className="w-full h-full flex justify-center items-center"><Spinner size="md" /></div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!marks || !marks.trend?.length)
    return <div className="p-4 w-full h-full flex items-center justify-center text-gray-500">No marks data available.</div>;

  return (
    <div className="gap-5">
      <div className="mt-4 grid pb-4 gap-4 md:grid-cols-2 overflow-y-auto">
{rank && rank.rank && marks.latestPaperId ? (
        <GlassSurface className="p-4 !h-full flex !w-full bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex flex-col justify-center items-start w-full">
            <strong>Latest Paper Ranking</strong>
            <div className="mt-2">Paper: <code>{marks.latestPaperId}</code></div>
            <div>
              Your rank: <strong>{rank.rank}</strong> of {rank.totalStudents} students
            </div>
            {rank.topScore !== null && (
              <div>Top score: <strong>{rank.topScore.toFixed(2)}</strong></div>
            )}
          </div>
        </GlassSurface>
      ) : (
        <GlassSurface className="p-4 bg-gray-100 rounded-lg">
          <em>No ranking available yet.</em>
        </GlassSurface>
      )}

      {marks.bestPaper && (
        <GlassSurface className="p-4 !w-full !h-full  rounded-lg ">
          <div className="flex flex-col justify-center items-start w-full">
            <strong>Best Paper</strong>
            <div className="mt-2">
              {marks.bestPaper.paper_name || marks.bestPaper.paper_id} — Score:{" "}
              <strong>{marks.bestPaper.best_total.toFixed(2)}</strong>
            </div>
          </div>
        </GlassSurface>
      )}
      </div>
      

      <GlassSurface className="!w-full !h-full pb-4">
        <div className="w-full" style={{ height: 420 }}>
          <canvas ref={chartCanvasRef} />
        </div>
      </GlassSurface>


        <h3 className="text-lg font-semibold mb-2">All Paper Marks</h3>
        <div className="overflow-x-auto">
          <Table
            aria-label="Student marks trend"
            className="min-w-full text-sm"
            isStriped
          >
            <TableHeader>
              {columns.map((column) => (
                <TableColumn
                  key={column.key}
                  align={column.align}
                  className={column.align === "center" ? "text-center" : "text-left"}
                >
                  {column.label}
                </TableColumn>
              ))}
            </TableHeader>
            <TableBody items={rows}>
              {(row) => (
                <TableRow key={row.key}>
                  {(columnKey) => {
                    const value = (row as any)[columnKey as string];

                    if (["mcq", "essay", "total"].includes(columnKey as string) && typeof value === "number") {
                      const formatted = value.toFixed(2);
                      const isTotal = columnKey === "total";
                      return (
                        <TableCell
                          className={`text-center ${isTotal ? "font-semibold text-green-700" : ""}`}
                        >
                          {formatted}
                        </TableCell>
                      );
                    }

                    return (
                      <TableCell className={columnKey === "paper" ? "text-left" : "text-center"}>
                        {value}
                      </TableCell>
                    );
                  }}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
   
  );
}