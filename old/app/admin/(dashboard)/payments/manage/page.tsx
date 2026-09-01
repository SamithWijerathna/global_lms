"use client";
import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardBody,
} from "@heroui/card";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Chip } from "@heroui/chip";
import { Image } from "@heroui/image";
import { Skeleton } from "@heroui/skeleton";
import { Input } from "@heroui/input";
import { DateRangePicker } from "@heroui/date-picker";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function PaymentsManagementPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<Map<string, string>>(new Map());
  const [classesMap, setClassesMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [monthlyTarget, setMonthlyTarget] = useState(500000);
  const [editingTarget, setEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(monthlyTarget);
  const [thisMonthTotal, setThisMonthTotal] = useState(0);
  const [lastMonthTotal, setLastMonthTotal] = useState(0);
  const [growth, setGrowth] = useState(0);
  const [overallTotal, setOverallTotal] = useState(0);
  const [last4MonthsData, setLast4MonthsData] = useState<any[]>([]);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<{ type: "image" | "pdf"; url: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [apiError, setApiError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

 useEffect(() => {
  const fetchData = async () => {
    try {
      // Helper to normalize IDs
      const normalize = (v: any) => String(v).trim().toUpperCase();

      // Fetch payments
      const paymentsRes = await fetch("/api/payment?all=true");
      if (!paymentsRes.ok) throw new Error("Payments fetch failed");
      const paymentsJson = await paymentsRes.json();
      const paymentsData = Array.isArray(paymentsJson)
        ? paymentsJson
        : paymentsJson.payments || [];

      // Fetch students
      const studentsRes = await fetch("/api/admin/students", {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
      });
      if (!studentsRes.ok) throw new Error("Students fetch failed");
      const studentsData = await studentsRes.json();
      const studentsMap = new Map<string, string>();
      studentsData.forEach((s: any) => {
        studentsMap.set(
          normalize(s.student_uuid || s.uuid || s.id),
          s.full_name || s.name || "Unknown Student"
        );
      });
      setStudents(studentsMap);

      // Fetch classes
      const classesRes = await fetch("/api/admin/classes", {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
      });
      if (!classesRes.ok) throw new Error("Classes fetch failed");
      const classesData = await classesRes.json();
      const classesMap = new Map<string, string>();
      classesData.forEach((c: any) => {
        classesMap.set(normalize(c.class_id || c.id), c.class_title || "Unknown Class");
      });
      setClassesMap(classesMap);
      console.log("Classes Map:", classesMap);

      // Enrich payments with student_name and class_title
      const enriched = paymentsData.map((p: any) => {
        const studentKey = normalize(p.student_uuid || p.student_id);
        const classKey = normalize(p.item_id || p.class_id);

        return {
          ...p,
          student_name: studentsMap.get(studentKey) || "Unknown Student",
          class_title: classesMap.get(classKey) || `Unknown Class (${p.item_id || p.class_id})`,
          receipt_url: p.transaction_proof || null,
        };
      });

      // Sort by date descending (newest first)
      const sorted = enriched.sort(
        (a: any, b: any) =>
          new Date(b.created_at || b.payment_date).getTime() -
          new Date(a.created_at || a.payment_date).getTime()
      );

      setPayments(sorted);
      setFilteredPayments(sorted);
      calculateStats(sorted);
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setApiError("Failed to load data");
      setLoading(false);
    }
  };

  fetchData();
}, []);


  const calculateStats = (data: any[]) => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    let thisMonthSum = 0;
    let lastMonthSum = 0;
    let totalSum = 0;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyData: Record<string, number> = {};

    data.forEach((payment: any) => {
      const date = new Date(payment.created_at || payment.payment_date || new Date());
      const month = date.getMonth();
      const year = date.getFullYear();
      const key = `${monthNames[month]} ${year}`;
      const amount = parseFloat(payment.amount || 0);
      monthlyData[key] = (monthlyData[key] || 0) + amount;
      totalSum += amount;

      if (month === thisMonth && year === thisYear) {
        thisMonthSum += amount;
      }
      const lastMonth = (thisMonth - 1 + 12) % 12;
      const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear;
      if (month === lastMonth && year === lastYear) {
        lastMonthSum += amount;
      }
    });

    setThisMonthTotal(thisMonthSum);
    setLastMonthTotal(lastMonthSum);
    setOverallTotal(totalSum);
    setGrowth(lastMonthSum === 0 ? 0 : ((thisMonthSum - lastMonthSum) / lastMonthSum) * 100);

    const last4 = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mName = monthNames[d.getMonth()];
      const key = `${mName} ${d.getFullYear()}`;
      last4.push({ month: mName, income: monthlyData[key] || 0 });
    }
    setLast4MonthsData(last4);
  };

  // Filtering
  useEffect(() => {
    let filtered = payments;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter((p: any) =>
        p.student_name.toLowerCase().includes(lower) ||
        p.class_title.toLowerCase().includes(lower) ||
        p.amount.toString().includes(searchTerm) ||
        p.id.toString().includes(searchTerm)
      );
    }
    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((p: any) => {
        const pDate = new Date(p.created_at || p.payment_date);
        return pDate >= start && pDate <= end;
      });
    }
    setFilteredPayments(filtered);
  }, [searchTerm, dateRange, payments]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, dateRange]);

  // Adjust page if current page exceeds available pages (after delete/filter)
  useEffect(() => {
    const totalPages = Math.ceil(filteredPayments.length / rowsPerPage);
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [filteredPayments.length, page]);

  // Pagination slicing
  const paginatedPayments = filteredPayments.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );
  const totalPages = Math.ceil(filteredPayments.length / rowsPerPage);

  const handleDelete = async (paymentId: number) => {
    if (!confirm("Are you sure you want to delete this payment?")) return;
    try {
      const res = await fetch(`/api/admin/payments?id=${paymentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const updatedPayments = payments.filter((p: any) => p.id !== paymentId);
        setPayments(updatedPayments);
        calculateStats(updatedPayments);
        // filteredPayments will be updated automatically via useEffect
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewReceipt = (payment: any) => {
    if (payment.receipt_url) {
      const isPdf = payment.receipt_url.toLowerCase().endsWith(".pdf");
      setCurrentReceipt({ type: isPdf ? "pdf" : "image", url: payment.receipt_url });
      setReceiptModalOpen(true);
    }
  };

  const handleSaveTarget = () => {
    setMonthlyTarget(tempTarget);
    setEditingTarget(false);
  };

  const targetVsActual = [
    { name: "Target", value: monthlyTarget },
    { name: "Actual", value: thisMonthTotal },
  ];

  return (
    <div className="p-6">
      <h1 className="text-4xl font-bold mb-8">Payments Management</h1>
      {apiError && (
        <Card className="mb-8 border border-danger">
          <CardBody className="text-danger">{apiError}</CardBody>
        </Card>
      )}
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <Card className="shadow-lg">
          <CardHeader className="text-lg font-semibold">This Month</CardHeader>
          <CardBody>
            <p className="text-3xl font-bold text-success">Rs {thisMonthTotal.toLocaleString()}</p>
          </CardBody>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="text-lg font-semibold">Last Month</CardHeader>
          <CardBody>
            <p className="text-3xl font-bold">Rs {lastMonthTotal.toLocaleString()}</p>
          </CardBody>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="text-lg font-semibold">Growth</CardHeader>
          <CardBody>
            <p className={`text-3xl font-bold ${growth >= 0 ? "text-success" : "text-danger"}`}>
              {growth >= 0 ? "+" : ""}{growth.toFixed(1)}%
            </p>
          </CardBody>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="text-lg font-semibold">Overall Total</CardHeader>
          <CardBody>
            <p className="text-3xl font-bold text-primary">Rs {overallTotal.toLocaleString()}</p>
          </CardBody>
        </Card>
      </div>
      {/* Target & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <Card className="shadow-lg">
          <CardHeader className="flex justify-between items-center">
            <span className="text-xl font-semibold">Monthly Target</span>
            {!editingTarget ? (
              <Button size="sm" onPress={() => {
                setTempTarget(monthlyTarget);
                setEditingTarget(true);
              }}>
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" color="primary" onPress={handleSaveTarget}>
                  Save
                </Button>
                <Button size="sm" variant="light" onPress={() => setEditingTarget(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </CardHeader>
          <CardBody>
            {editingTarget ? (
              <Input
                type="number"
                value={tempTarget.toString()}
                onChange={(e) => setTempTarget(parseInt(e.target.value) || 0)}
                startContent={<span className="text-default-500">Rs</span>}
              />
            ) : (
              <p className="text-3xl font-bold">Rs {monthlyTarget.toLocaleString()}</p>
            )}
            <p className="text-sm text-default-500 mt-2">
              Actual: Rs {thisMonthTotal.toLocaleString()} ({monthlyTarget > 0 ? ((thisMonthTotal / monthlyTarget) * 100).toFixed(1) : 0}%)
            </p>
          </CardBody>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="text-xl font-semibold">Target vs Actual</CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={targetVsActual}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value?: number) => `Rs ${value?.toLocaleString() || 0}`} />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>
      <Card className="shadow-lg mb-12">
        <CardHeader className="text-xl font-semibold">Income Trend (Last 4 Months)</CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={last4MonthsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value?: number) => `Rs ${value?.toLocaleString() || 0}`} />
              <Line type="monotone" dataKey="income" stroke="#8884d8" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>
      {/* Filters */}
      <Card className="shadow-lg mb-8">
        <CardHeader className="text-xl font-semibold">Filters</CardHeader>
        <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Search"
            placeholder="Student name, class, amount..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            isClearable
            onClear={() => setSearchTerm("")}
          />
          <DateRangePicker
            label="Date Range"
            /* @ts-ignore */
            value={dateRange.start && dateRange.end ? { start: dateRange.start, end: dateRange.end } : null}
            /* @ts-ignore */
            onChange={(range: any) => {
              if (range) {
                setDateRange({ start: range.start.toDate(), end: range.end.toDate() });
              } else {
                setDateRange({ start: null, end: null });
              }
            }}
          />
        </CardBody>
      </Card>
      {/* Payments Table */}
      <Card className="shadow-lg">
        <CardHeader className="text-xl font-semibold">
          Payments History ({filteredPayments.length} records)
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="space-y-4">
              {[...Array(rowsPerPage)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-default-500">No payments found.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              <div className="overflow-x-auto w-full">
                <Table aria-label="Payments table">
                  <TableHeader>
                    <TableColumn>ID</TableColumn>
                    <TableColumn>Date</TableColumn>
                    <TableColumn>Student</TableColumn>
                    <TableColumn>Class</TableColumn>
                    <TableColumn>Amount</TableColumn>
                    <TableColumn>Status</TableColumn>
                    <TableColumn>Receipt</TableColumn>
                    <TableColumn>Actions</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {paginatedPayments.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.id}</TableCell>
                        <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{payment.student_name}</TableCell>
                        <TableCell>{payment.class_title}</TableCell>
                        <TableCell className="font-bold text-success">
                          Rs {parseFloat(payment.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip color={payment.status === "approved" ? "success" : "warning"} variant="flat">
                            {payment.status}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          {payment.receipt_url ? (
                            <Button size="sm" color="secondary" onPress={() => handleViewReceipt(payment)}>
                              View
                            </Button>
                          ) : (
                            <span className="text-default-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" color="danger" variant="light" onPress={() => handleDelete(payment.id)}>
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm text-default-500">
                  Showing {(page - 1) * rowsPerPage + 1} to{" "}
                  {Math.min(page * rowsPerPage, filteredPayments.length)} of {filteredPayments.length} records
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="flat"
                    isDisabled={page === 1}
                    onPress={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm font-medium">
                    Page {page} of {totalPages || 1}
                  </span>
                  <Button
                    size="sm"
                    variant="flat"
                    isDisabled={page === totalPages}
                    onPress={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
      {/* Receipt Modal */}
<Modal isOpen={receiptModalOpen} onClose={() => setReceiptModalOpen(false)} size="4xl">
  <ModalContent>
    <ModalHeader>Payment Receipt</ModalHeader>
    <ModalBody className="p-0 flex justify-center items-center">
      {currentReceipt ? (
        (() => {
          const receiptSrc = currentReceipt.url.startsWith("http://") || currentReceipt.url.startsWith("https://")
            ? currentReceipt.url
            : currentReceipt.url.startsWith("/") ? currentReceipt.url : "/" + currentReceipt.url;
          return currentReceipt.type === "image" ? (
            <Image
              src={receiptSrc}
              alt="Receipt"
              className="w-full max-h-[80vh] object-contain"
            />
          ) : currentReceipt.type === "pdf" ? (
            <iframe
              src={receiptSrc}
              className="w-full h-[80vh]"
            />
          ) : (
            <p className="text-center text-gray-500">Unsupported file type</p>
          );
        })()
      ) : (
        <p className="text-center text-gray-500">No receipt available</p>
      )}
    </ModalBody>
    <ModalFooter className="flex justify-between">
      <Button onClick={() => setReceiptModalOpen(false)}>Close</Button>
      {currentReceipt && (
        <a
          href={currentReceipt.url.startsWith("http://") || currentReceipt.url.startsWith("https://") ? currentReceipt.url : currentReceipt.url.startsWith("/") ? currentReceipt.url : "/" + currentReceipt.url}
          download
          className="ml-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Download
        </a>
      )}
    </ModalFooter>
  </ModalContent>
</Modal>

    </div>
  );
}