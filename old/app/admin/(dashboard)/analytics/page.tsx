"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Chip } from "@heroui/chip";
import { Skeleton } from "@heroui/skeleton";
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";
import { Input } from "@heroui/input";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  TrendingUp,
  DollarSign,
  Award,
  BookOpen,
  AlertCircle,
  Download,
  Calendar,
  Filter,
} from "lucide-react";

interface AnalyticsData {
  summary: {
    totalStudents: number;
    activeStudents: number;
    totalRevenue: number;
    avgMarks: number;
    totalClasses: number;
    unpaidStudents: number;
    avgPaymentPerStudent: number;
  };
  paymentStatus: Array<{ status: string; count: number }>;
  revenuePerClass: Array<{ class_title: string; class_id: string; revenue: number; students: number }>;
  studentsPerClass: Array<{ class_title: string; class_id: string; student_count: number }>;
  paymentsOverTime: Array<{ date: string; count: number; amount: number }>;
  topStudents: Array<{
    student_uuid: string;
    student_id: string;
    full_name: string;
    batch: string;
    avg_marks: number;
    exam_count: number;
    total_marks: number;
  }>;
  recentPayments: Array<{
    payment_uuid: string;
    student_uuid: string;
    student_id: string;
    student_name: string;
    amount: number;
    status: string;
    created_at: string;
    class_title?: string;
    studypack_title?: string;
  }>;
  marksDistribution: Array<{ range: string; count: number }>;
  paperAnalytics: Array<{
    paper_id: string;
    paper_name: string;
    submissions: number;
    avg_marks: number;
    highest_marks: number;
    lowest_marks: number;
  }>;
  newStudentsPerMonth: Array<{ month: string; count: number }>;
  allClasses: Array<{ class_id: string; class_title: string }>;
  classPerformanceTrends: Array<{ month: string; avg_marks: number }>;
  topPayingStudents: Array<{
    student_uuid: string;
    student_id: string;
    full_name: string;
    batch: string;
    total_paid: number;
    payment_count: number;
  }>;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentPapers, setStudentPapers] = useState<any[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async (filters?: { startDate?: string; endDate?: string; classId?: string }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append("startDate", filters.startDate);
      if (filters?.endDate) params.append("endDate", filters.endDate);
      if (filters?.classId) params.append("classId", filters.classId);

      const response = await fetch(`/api/analytics?${params.toString()}`, {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
      });
      
      if (!response.ok) {
        console.error("API Error:", response.status, response.statusText);
        setData(null);
        return;
      }
      
      const result = await response.json();
      
      // Validate the response has the expected structure
      if (!result || !result.summary) {
        console.error("Invalid response structure:", result);
        setData(null);
        return;
      }
      
      setData(result);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = () => {
    fetchAnalytics({ startDate, endDate, classId: selectedClass });
  };

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedClass("all");
    fetchAnalytics();
  };

  const handleStudentClick = async (studentUuid: string) => {
    setSelectedStudent(studentUuid);
    setLoadingPapers(true);
    try {
      const response = await fetch(`/api/marks?student_uuid=${studentUuid}`, {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
      });
      const result = await response.json();
      setStudentPapers(result);
    } catch (error) {
      console.error("Error fetching student papers:", error);
    } finally {
      setLoadingPapers(false);
    }
  };

  const handleExportToCSV = () => {
    if (!data) return;

    // Export top students to CSV
    const csvContent = [
      ["Student ID", "Name", "Batch", "Average Marks", "Exam Count", "Total Marks"],
      ...data.topStudents.map((s) => [
        s.student_id,
        s.full_name,
        s.batch,
        s.avg_marks.toFixed(2),
        s.exam_count,
        s.total_marks,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-top-students-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 rounded mb-4" />
          <Skeleton className="h-6 w-96 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardBody>
                <Skeleton className="h-24 w-full rounded" />
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <p className="text-lg text-default-600">Failed to load analytics data.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
          <TrendingUp className="w-10 h-10" />
          Analytics Dashboard
        </h1>
        <p className="text-lg text-default-600 mt-3">
          Comprehensive overview of student performance, class activity, and financial metrics.
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <Input
                type="date"
                label="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                startContent={<Calendar className="w-4 h-4" />}
              />
            </div>
            <div className="flex-1">
              <Input
                type="date"
                label="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                startContent={<Calendar className="w-4 h-4" />}
              />
            </div>
            <div className="flex-1">
              <Select
                label="Filter by Class"
                selectedKeys={[selectedClass]}
                onChange={(e) => setSelectedClass(e.target.value)}
                startContent={<Filter className="w-4 h-4" />}
                items={[{ class_id: "all", class_title: "All Classes" }, ...(data.allClasses || [])]}
              >
                {(cls) => (
                  <SelectItem key={cls.class_id}>
                    {cls.class_title}
                  </SelectItem>
                )}
              </Select>
            </div>
            <Button color="primary" onPress={handleFilterApply} startContent={<Filter className="w-4 h-4" />}>
              Apply Filters
            </Button>
            <Button color="default" variant="flat" onPress={handleResetFilters}>
              Reset
            </Button>
            <Button color="success" variant="flat" onPress={handleExportToCSV} startContent={<Download className="w-4 h-4" />}>
              Export CSV
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardBody>
            <div className="flex items-center gap-3">
              <Users className="w-10 h-10 text-primary" />
              <div>
                <p className="text-sm text-default-600">Total Students</p>
                <p className="text-3xl font-bold text-foreground">{data.summary.totalStudents}</p>
                <p className="text-xs text-success mt-1">
                  {data.summary.activeStudents} active students
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardBody>
            <div className="flex items-center gap-3">
              <BookOpen className="w-10 h-10 text-secondary" />
              <div>
                <p className="text-sm text-default-600">Total Classes</p>
                <p className="text-3xl font-bold text-foreground">{data.summary.totalClasses}</p>
                <p className="text-xs text-default-500 mt-1">Active courses</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardBody>
            <div className="flex items-center gap-3">
              <DollarSign className="w-10 h-10 text-success" />
              <div>
                <p className="text-sm text-default-600">Total Revenue</p>
                <p className="text-3xl font-bold text-foreground">
                  Rs. {data.summary.totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-default-500 mt-1">
                  Avg: Rs. {data.summary.avgPaymentPerStudent.toFixed(0)}/student
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardBody>
            <div className="flex items-center gap-3">
              <Award className="w-10 h-10 text-warning" />
              <div>
                <p className="text-sm text-default-600">Average Marks</p>
                <p className="text-3xl font-bold text-foreground">{data.summary.avgMarks.toFixed(1)}</p>
                <p className="text-xs text-warning mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {data.summary.unpaidStudents} unpaid students
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Charts Row 1: Payments Over Time & Revenue Per Class */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="shadow-lg">
          <CardHeader>
            <h3 className="text-lg font-semibold">Payments Over Time (Last 30 Days)</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.paymentsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="amount" stroke="#0088FE" name="Amount (Rs.)" />
                <Line yAxisId="right" type="monotone" dataKey="count" stroke="#00C49F" name="Count" />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <h3 className="text-lg font-semibold">Revenue Per Class</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.revenuePerClass.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="class_title" angle={-20} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#8884D8" name="Revenue (Rs.)" />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Charts Row 2: Class Performance Trend & Marks Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="shadow-lg">
          <CardHeader>
            <h3 className="text-lg font-semibold">Class Performance Trend (12 Months)</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.classPerformanceTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="avg_marks" stroke="#FF8042" name="Average Marks" />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <h3 className="text-lg font-semibold">Marks Distribution</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.marksDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.range}: ${entry.count}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.marksDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Charts Row 3: Payment Status & Students Per Class */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="shadow-lg">
          <CardHeader>
            <h3 className="text-lg font-semibold">Payment Status Distribution</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.paymentStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.status}: ${entry.count}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.paymentStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <h3 className="text-lg font-semibold">Students Per Class</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.studentsPerClass.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="class_title" angle={-20} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="student_count" fill="#82CA9D" name="Students" />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* New Students Per Month */}
      <Card className="shadow-lg mb-8">
        <CardHeader>
          <h3 className="text-lg font-semibold">New Students Per Month (12 Months)</h3>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.newStudentsPerMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#0088FE" name="New Students" />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Students Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <h3 className="text-lg font-semibold">Top Students by Average Marks</h3>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto w-full">
              <Table aria-label="Top Students">
                <TableHeader>
                  <TableColumn>RANK</TableColumn>
                  <TableColumn>STUDENT ID</TableColumn>
                  <TableColumn>NAME</TableColumn>
                  <TableColumn>BATCH</TableColumn>
                  <TableColumn>AVG MARKS</TableColumn>
                  <TableColumn>EXAMS</TableColumn>
                </TableHeader>
                <TableBody>
                  {data.topStudents.map((student, index) => (
                    <TableRow
                      key={student.student_uuid}
                      className="cursor-pointer hover:bg-default-100"
                      onClick={() => handleStudentClick(student.student_uuid)}
                    >
                      <TableCell>
                        <Chip color={index < 3 ? "warning" : "default"} size="sm">
                          #{index + 1}
                        </Chip>
                      </TableCell>
                      <TableCell>{student.student_id}</TableCell>
                      <TableCell>{student.full_name}</TableCell>
                      <TableCell>{student.batch}</TableCell>
                      <TableCell>
                        <span className="font-semibold">{student.avg_marks.toFixed(2)}</span>
                      </TableCell>
                      <TableCell>{student.exam_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardBody>
        </Card>

        {/* Top Paying Students Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <h3 className="text-lg font-semibold">Top Paying Students</h3>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto w-full">
              <Table aria-label="Top Paying Students">
                <TableHeader>
                  <TableColumn>RANK</TableColumn>
                  <TableColumn>STUDENT ID</TableColumn>
                  <TableColumn>NAME</TableColumn>
                  <TableColumn>BATCH</TableColumn>
                  <TableColumn>TOTAL PAID</TableColumn>
                  <TableColumn>PAYMENTS</TableColumn>
                </TableHeader>
                <TableBody>
                  {data.topPayingStudents.map((student, index) => (
                    <TableRow key={student.student_uuid}>
                      <TableCell>
                        <Chip color={index < 3 ? "success" : "default"} size="sm">
                          #{index + 1}
                        </Chip>
                      </TableCell>
                      <TableCell>{student.student_id}</TableCell>
                      <TableCell>{student.full_name}</TableCell>
                      <TableCell>{student.batch}</TableCell>
                      <TableCell>
                        <span className="font-semibold">Rs. {student.total_paid.toLocaleString()}</span>
                      </TableCell>
                      <TableCell>{student.payment_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent Payments Table */}
      <Card className="shadow-lg mb-8">
        <CardHeader>
          <h3 className="text-lg font-semibold">Recent Payments</h3>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto w-full">
            <Table aria-label="Recent Payments">
              <TableHeader>
                <TableColumn>STUDENT ID</TableColumn>
                <TableColumn>STUDENT NAME</TableColumn>
                <TableColumn>ITEM</TableColumn>
                <TableColumn>AMOUNT</TableColumn>
                <TableColumn>STATUS</TableColumn>
                <TableColumn>DATE</TableColumn>
              </TableHeader>
              <TableBody>
                {data.recentPayments.map((payment) => (
                  <TableRow key={payment.payment_uuid}>
                    <TableCell>{payment.student_id}</TableCell>
                    <TableCell>{payment.student_name}</TableCell>
                    <TableCell>{payment.class_title || payment.studypack_title || "N/A"}</TableCell>
                    <TableCell>Rs. {payment.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip color={payment.status === "approved" ? "success" : "warning"} size="sm">
                        {payment.status}
                      </Chip>
                    </TableCell>
                    <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardBody>
      </Card>

      {/* Paper Analytics Table */}
      <Card className="shadow-lg mb-8">
        <CardHeader>
          <h3 className="text-lg font-semibold">Paper Analytics</h3>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto w-full">
            <Table aria-label="Paper Analytics">
              <TableHeader>
                <TableColumn>PAPER NAME</TableColumn>
                <TableColumn>SUBMISSIONS</TableColumn>
                <TableColumn>AVG MARKS</TableColumn>
                <TableColumn>HIGHEST</TableColumn>
                <TableColumn>LOWEST</TableColumn>
              </TableHeader>
              <TableBody>
                {data.paperAnalytics.map((paper) => (
                  <TableRow key={paper.paper_id}>
                    <TableCell>{paper.paper_name}</TableCell>
                    <TableCell>{paper.submissions}</TableCell>
                    <TableCell>
                      <span className="font-semibold">{paper.avg_marks ? paper.avg_marks.toFixed(2) : "N/A"}</span>
                    </TableCell>
                    <TableCell>
                      <Chip color="success" size="sm">
                        {paper.highest_marks || "N/A"}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <Chip color="danger" size="sm">
                        {paper.lowest_marks || "N/A"}
                      </Chip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardBody>
      </Card>

      {/* Student Paper Details Modal/Section */}
      {selectedStudent && (
        <Card className="shadow-lg mb-8 border-2 border-primary">
          <CardHeader>
            <div className="flex justify-between items-center w-full">
              <h3 className="text-lg font-semibold">Student Paper Details</h3>
              <Button size="sm" color="danger" variant="flat" onPress={() => setSelectedStudent(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {loadingPapers ? (
              <Skeleton className="h-32 w-full rounded" />
            ) : studentPapers.length > 0 ? (
              <div className="overflow-x-auto w-full">
                <Table aria-label="Student Papers">
                  <TableHeader>
                    <TableColumn>PAPER NAME</TableColumn>
                    <TableColumn>MARK A</TableColumn>
                    <TableColumn>MARK B</TableColumn>
                    <TableColumn>TOTAL</TableColumn>
                    <TableColumn>DATE</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {studentPapers.map((paper: any) => (
                      <TableRow key={paper.id}>
                        <TableCell>{paper.paper_name || "N/A"}</TableCell>
                        <TableCell>{paper.mark_a}</TableCell>
                        <TableCell>{paper.mark_b}</TableCell>
                        <TableCell>
                          <span className="font-semibold">{paper.mark_a + paper.mark_b}</span>
                        </TableCell>
                        <TableCell>{new Date(paper.create_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-default-600">No papers found for this student.</p>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
