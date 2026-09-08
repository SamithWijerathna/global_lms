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
  const [storage, setStorage] = useState<{ totalMB: number; usedMB: number } | null>(null);

const usedGB = storage
  ? (storage.usedMB / 1024).toFixed(1)
  : "0.0";

const totalGB = storage
  ? (storage.totalMB / 1024).toFixed(1)
  : "0.0";

const storagePercentage =
  storage && storage.totalMB > 0
    ? Math.round((storage.usedMB / storage.totalMB) * 100)
    : 0;

const remainingPercentage = 100 - storagePercentage;

// Proportional breakdown (based on your original percentages)
const videoGB = storage ? ((storage.usedMB * 0.44) / 1024).toFixed(1) : "2.7";
const docGB = storage ? ((storage.usedMB * 0.27) / 1024).toFixed(1) : "1.7";
const imageGB = storage ? ((storage.usedMB * 0.21) / 1024).toFixed(1) : "1.3";
const otherGB = storage ? ((storage.usedMB * 0.08) / 1024).toFixed(1) : "0.5";

 useEffect(() => {
  fetch("/api/admin", {
    headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
  })
    .then((res) => res.json())
    .then((json) => {
      setData(json);

      setStorage({
        usedMB: json.storage.usedMB,
        totalMB: json.storage.totalMB,
      });

      setProgressValue(
        json.storage.totalMB > 0
          ? Math.round((json.storage.usedMB / json.storage.totalMB) * 100)
          : 0
      );

      setLoading(false);
    })
    .catch((err) => {
      console.error(err);
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
  <CardHeader className="text-2xl font-bold text-center pb-4">Storage Usage</CardHeader>
  <CardBody className="p-8 flex flex-col items-center justify-center">
    <CircularProgress
      aria-label="Storage usage"
      size="lg"
      value={loading ? 0 : storagePercentage}  // Dynamic from API
      color="success"  // Low usage = green/success
      showValueLabel={true}
      classNames={{
        svg: "w-64 h-64 drop-shadow-lg",
        indicator: "stroke-green-500",
        track: "stroke-gray-200 dark:stroke-gray-700",
        value: "text-5xl font-bold",
      }}
      formatOptions={{ style: "percent" }}
    />
    <div className="mt-8 text-center">
      {loading ? (
        <>
          <Skeleton className="h-10 w-48 rounded mb-4" />
          <Skeleton className="h-6 w-64 rounded" />
        </>
      ) : (
        <>
          <p className="text-3xl font-bold">{usedGB} GB / {totalGB} GB</p>
          <p className="text-lg text-success font-medium mt-4">Plenty of space available ({remainingPercentage}% remaining)</p>
        </>
      )}
    </div>
    {/* Hover Overlay - Dynamic Breakdown (proportional to used) */}
    <div className="absolute inset-0 rounded-3xl bg-white/80 dark:bg-black/80 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out flex items-center justify-center z-20">
      <div className="text-center space-y-6 px-8">
        <h3 className="text-2xl font-bold">Storage Breakdown</h3>
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-64 rounded mx-auto" />)}
          </div>
        ) : (
          <div className="space-y-4 text-left max-w-sm mx-auto text-lg">
            <div className="flex justify-between">
              <span className="text-default-700">Videos</span>
              <span className="font-semibold">{videoGB} GB (44%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-default-700">Documents</span>
              <span className="font-semibold">{docGB} GB (27%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-default-700">Images</span>
              <span className="font-semibold">{imageGB} GB (21%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-default-700">Other</span>
              <span className="font-semibold">{otherGB} GB (8%)</span>
            </div>
          </div>
        )}
        <p className="text-success font-semibold pt-4">{remainingPercentage}% space remaining!</p>
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