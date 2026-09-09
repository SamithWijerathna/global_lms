"use client";
import { siteConfig } from "@/config/site";
export const metadata = {
  title: `Dashboard - ${siteConfig.name}`,
};
import { Card, CardHeader, CardBody } from "@heroui/card"; // Assuming Skeleton from same UI lib
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Chip } from "@heroui/chip";
import { Progress, CircularProgress } from "@heroui/progress";
import {Skeleton} from "@heroui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useEffect, useState } from "react";

interface DashboardData {
  classes: number;
  users: number;
  payments: {
    total: number;
    pending: number;
    approved: number;
    approved_total: number;
  };
  recentUsers: Array<{
    student_id: string;
    name: string;
    email: string;
    create_at: string;
  }>;
  recentPayments: Array<{
    student_id: string;
    student_name: string;
    class_title: string;
    amount: number;
    status: string;
    created_at: string;
  }>;
  pendingPayments: Array<{
    
    student_name: string;
    student_id: string;
    class_title: string;
    amount: number;
    created_at: string;
    transaction_proof: string;
  }>;
}

const chartData = [
  { month: "Jan", enrollments: 0 }, { month: "Feb", enrollments: 0 },
  { month: "Mar", enrollments: 0 }, { month: "Apr", enrollments: 0 },
  { month: "May", enrollments: 0 }, { month: "Jun", enrollments: 0 },
  { month: "Jul", enrollments: 0 }, { month: "Aug", enrollments: 0 },
  { month: "Sep", enrollments: 0 }, { month: "Oct", enrollments: 0 },
  { month: "Nov", enrollments: 21 }, { month: "Dec", enrollments: 0 },
];

export default function DashboardHome() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [progressValue, setProgressValue] = useState(0);
  const [loading, setLoading] = useState(true);

  interface StorageTier {
    usedMB?: number;
    totalMB?: number;
    usedGB?: number;
    totalGB?: number;
    percentage: number;
    remainingMB?: number;
    remainingGB?: number;
  }

  interface StorageResponse {
    totalMB: number;
    usedMB: number;
    local?: StorageTier;
    media?: StorageTier;
  }

  const [storage, setStorage] = useState<StorageResponse | null>(null);
  const [activeStorageTab, setActiveStorageTab] = useState<"local" | "media">("local");

  const localUsedMB = storage?.local?.usedMB ?? storage?.usedMB ?? 0;
  const localTotalMB = storage?.local?.totalMB ?? storage?.totalMB ?? 500;
  const localPercentage = storage?.local?.percentage ?? (localTotalMB > 0 ? Math.round((localUsedMB / localTotalMB) * 100) : 0);

  const mediaUsedGB = storage?.media?.usedGB ?? 0;
  const mediaTotalGB = storage?.media?.totalGB ?? 0;
  const isEmbedOnly = !loading && mediaTotalGB === 0;
  const mediaPercentage = storage?.media?.percentage ?? (mediaTotalGB > 0 ? Math.round((mediaUsedGB / mediaTotalGB) * 100) : 0);

  const currentPercentage = activeStorageTab === "local" ? localPercentage : mediaPercentage;
  const currentRemaining = 100 - currentPercentage;

  useEffect(() => {
    fetch("/api/admin", {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
    })
      .then((res) => res.json())
      .then((json) => {
        setData(json);

        if (json.storage) {
          setStorage(json.storage);
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load dashboard data:", err);
        setLoading(false);
      });
  }, []);





  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8">
      <main>
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-lg text-default-600 mt-3">
            Monitor your driving school performance, enrollments, and finances.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-sm font-semibold text-default-600">Total Students</CardHeader>
            <CardBody>
              {loading ? <Skeleton className="h-12 w-24 rounded" /> : <p className="text-4xl font-bold text-primary">{data?.users ?? 0}</p>}
              <p className="text-sm text-success mt-3">+21 enrollments in November</p>
            </CardBody>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-sm font-semibold text-default-600">Active Classes</CardHeader>
            <CardBody>
              {loading ? <Skeleton className="h-12 w-16 rounded" /> : <p className="text-4xl font-bold text-primary">{data?.classes ?? 0}</p>}
              <p className="text-sm text-default-500 mt-3">2027 Theory Physical (Nov batch)</p>
            </CardBody>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-sm font-semibold text-default-600">Pending Payments</CardHeader>
            <CardBody>
              {loading ? <Skeleton className="h-12 w-16 rounded" /> : <p className="text-4xl font-bold text-primary">{data?.payments?.pending ?? 0}</p>}
              <p className="text-sm text-success mt-3">All processed</p>
            </CardBody>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-sm font-semibold text-default-600">Total Revenue</CardHeader>
            <CardBody>
              {loading ? <Skeleton className="h-12 w-32 rounded" /> : <p className="text-4xl font-bold text-primary">Rs {data?.payments?.approved_total?.toLocaleString() ?? 0}</p>}
              <p className="text-sm text-success mt-3">From approved enrollments</p>
            </CardBody>
          </Card>
        </div>

        {/* Chart + Storage */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-8 mb-8 sm:mb-12">
          <Card className="lg:col-span-2 shadow-lg">
            <CardHeader className="text-xl font-semibold">Enrollment Trends (2025)</CardHeader>
            <CardBody>
              {loading ? (
                <Skeleton className="h-96 w-full rounded" />
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="4 4" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="enrollments" stroke="#8b5cf6" strokeWidth={4} dot={{ fill: "#8b5cf6" }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>

          {/* Storage - Unchanged */}
          {/* Storage Usage - Dynamically Updated from API */}
<Card className="relative overflow-hidden shadow-2xl hover:shadow-3xl transition-shadow duration-500 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-3xl group">
  <CardHeader className="flex flex-col items-center pb-2 pt-6">
    <span className="text-2xl font-bold text-center">Storage Usage</span>
    {/* Tier Switcher Pill */}
    <div className="flex gap-2 mt-3 bg-default-100 p-1 rounded-full border border-default-200">
      <button
        type="button"
        className={`px-3 py-1 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 ${
          activeStorageTab === "local"
            ? "bg-primary text-white shadow"
            : "text-default-600 hover:text-foreground"
        }`}
        onClick={() => setActiveStorageTab("local")}
      >
        <span>📁 App Storage</span>
        <span className="opacity-80">({localTotalMB} MB)</span>
      </button>
      <button
        type="button"
        className={`px-3 py-1 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 ${
          activeStorageTab === "media"
            ? "bg-purple-600 text-white shadow"
            : "text-default-600 hover:text-foreground"
        }`}
        onClick={() => setActiveStorageTab("media")}
      >
        <span>☁️ Cloud Media</span>
        <span className="opacity-80">
          {isEmbedOnly ? "(Embeds)" : `(${mediaTotalGB} GB)`}
        </span>
      </button>
    </div>
  </CardHeader>
  <CardBody className="p-6 flex flex-col items-center justify-center">
    {activeStorageTab === "media" && isEmbedOnly ? (
      <div className="w-56 h-56 rounded-full border-2 border-dashed border-purple-300 dark:border-purple-700 flex flex-col items-center justify-center p-4 text-center bg-purple-50/50 dark:bg-purple-950/20">
        <span className="text-4xl mb-2">🎬</span>
        <span className="text-sm font-bold uppercase tracking-wide text-purple-700 dark:text-purple-300">
          Embeds Only
        </span>
        <span className="text-xs text-default-500 mt-1 max-w-[160px]">
          YouTube & Vimeo links are unlimited & free
        </span>
      </div>
    ) : (
      <CircularProgress
        aria-label="Storage usage"
        size="lg"
        value={loading ? 0 : currentPercentage}
        color={currentPercentage > 85 ? "danger" : currentPercentage > 60 ? "warning" : activeStorageTab === "media" ? "secondary" : "success"}
        showValueLabel={true}
        classNames={{
          svg: "w-56 h-56 drop-shadow-lg",
          indicator: activeStorageTab === "media" ? "stroke-purple-500" : currentPercentage > 85 ? "stroke-red-500" : "stroke-green-500",
          track: "stroke-gray-200 dark:stroke-gray-700",
          value: "text-4xl font-bold",
        }}
        formatOptions={{ style: "percent" }}
      />
    )}
    <div className="mt-6 text-center">
      {loading ? (
        <>
          <Skeleton className="h-8 w-44 rounded mb-2" />
          <Skeleton className="h-5 w-56 rounded" />
        </>
      ) : activeStorageTab === "local" ? (
        <>
          <p className="text-2xl font-bold">{localUsedMB} MB / {localTotalMB} MB</p>
          <p className="text-xs text-default-500 mt-1">Student Avatars, Payment Slips & Covers</p>
          <p className="text-sm text-success font-medium mt-2">
            {currentRemaining}% space available ({storage?.local?.remainingMB ?? (localTotalMB - localUsedMB)} MB remaining)
          </p>
        </>
      ) : isEmbedOnly ? (
        <>
          <p className="text-xl font-bold text-foreground">0 GB Direct Storage</p>
          <p className="text-xs text-default-500 mt-1">Direct file/video uploads not assigned</p>
          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-2">
            ✨ Embed YouTube & Vimeo classes freely
          </p>
        </>
      ) : (
        <>
          <p className="text-2xl font-bold">{mediaUsedGB} GB / {mediaTotalGB} GB</p>
          <p className="text-xs text-default-500 mt-1">Cloudflare R2: Course Videos, PDFs & Materials</p>
          <p className="text-sm text-purple-600 font-medium mt-2">
            {currentRemaining}% space available ({storage?.media?.remainingGB ?? (mediaTotalGB - mediaUsedGB)} GB remaining)
          </p>
        </>
      )}
    </div>

    {/* Hover Overlay - Dual Tier Breakdown */}
    <div className="absolute inset-0 rounded-3xl bg-white/90 dark:bg-black/90 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out flex items-center justify-center z-20">
      <div className="text-center space-y-4 px-6 w-full max-w-xs">
        <h3 className="text-xl font-bold">Storage Tiers</h3>
        <div className="p-3 bg-default-50 rounded-xl border border-default-200 text-left space-y-1">
          <div className="flex justify-between items-center text-sm font-semibold">
            <span>📁 App Essentials (Local)</span>
            <span className="text-primary font-bold">{localPercentage}%</span>
          </div>
          <p className="text-xs text-default-500">{localUsedMB} MB of {localTotalMB} MB used</p>
          <p className="text-[11px] text-default-400">Profiles, Receipts & Covers</p>
        </div>

        <div className="p-3 bg-purple-50/30 rounded-xl border border-purple-200 text-left space-y-1">
          <div className="flex justify-between items-center text-sm font-semibold text-purple-700 dark:text-purple-300">
            <span>☁️ Cloud Media (R2)</span>
            <span className="font-bold">{isEmbedOnly ? "Embeds" : `${mediaPercentage}%`}</span>
          </div>
          <p className="text-xs text-default-500">
            {isEmbedOnly ? "Direct uploads disabled (0 GB)" : `${mediaUsedGB} GB of ${mediaTotalGB} GB used`}
          </p>
          <p className="text-[11px] text-default-400">
            {isEmbedOnly ? "Free YouTube & Vimeo embeds" : "Videos, Documents & Materials"}
          </p>
        </div>
        <p className="text-xs text-default-400 italic">Click the tabs above to toggle view</p>
      </div>
    </div>
  </CardBody>
</Card>
        </div>

        {/* Recent Students & Recent/Pending Payments */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-8">
          {/* Recent Accounts */}
          <Card className="shadow-lg">
            <CardHeader className="text-xl font-semibold">Recently Created Accounts</CardHeader>
            <CardBody>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                <Table aria-label="Recent accounts" removeWrapper>
                  <TableHeader>
                    <TableColumn>STUDENT ID</TableColumn>
                    <TableColumn>NAME</TableColumn>
                    <TableColumn>EMAIL</TableColumn>
                    <TableColumn>JOINED</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {(data?.recentUsers || []).map((user) => (
                      <TableRow key={user.student_id}>
                        <TableCell><div className="font-medium">{user.student_id}</div></TableCell>
                        <TableCell>{user.name}</TableCell>
                        <TableCell><div className="text-sm text-default-500">{user.email}</div></TableCell>
                        <TableCell>{new Date(user.create_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Recent + Pending Payments */}
          <Card className="shadow-lg">
            <CardHeader className="text-xl font-semibold flex justify-between items-center">
              <span>Recent Payments</span>
              <Chip color={data?.payments?.pending === 0 ? "success" : "danger"} variant="flat">
                {data?.payments?.pending ?? 0} Pending
              </Chip>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded" />
                  ))}
                </div>
              ) : (data?.payments?.pending ?? 0) > 0 ? (
                <div className="overflow-x-auto w-full">
                <Table aria-label="Pending payments" removeWrapper>
                  <TableHeader>
                    <TableColumn>STUDENT</TableColumn>
                    <TableColumn>CLASS</TableColumn>
                    <TableColumn>AMOUNT</TableColumn>
                    <TableColumn>STATUS</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {(data?.pendingPayments || []).map((p, index) => (
                      <TableRow key={index}>
                        <TableCell><div className="font-medium">{p.student_name} ({p.student_id})</div></TableCell>
                        <TableCell>{p.class_title}</TableCell>
                        <TableCell className="font-semibold">Rs {p.amount}</TableCell>
                        <TableCell><Chip color="warning" variant="flat">pending</Chip></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                <Table aria-label="Recent payments" removeWrapper>
                  <TableHeader>
                    <TableColumn>STUDENT</TableColumn>
                    <TableColumn>CLASS</TableColumn>
                    <TableColumn>AMOUNT</TableColumn>
                    <TableColumn>STATUS</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {(data?.recentPayments || []).slice(0, 8).map((p, index) => (
                      <TableRow key={index}>
                        <TableCell><div className="font-medium">{p.student_name}</div></TableCell>
                        <TableCell>{p.class_title || "N/A"}</TableCell>
                        <TableCell className="font-semibold">Rs {p.amount}</TableCell>
                        <TableCell>
                          <Chip color={p.status === "approved" ? "success" : p.status === "reject" ? "danger" : "warning"} variant="flat">
                            {p.status}
                          </Chip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </main>
    </div>
  );
}