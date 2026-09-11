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
import { Avatar } from "@heroui/avatar";
import {
  Phone,
  Mail,
  User,
  Calendar,
  MapPin,
  CreditCard,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";

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

  // Student Details Modal State
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

 useEffect(() => {
  // Load target from local storage first for instant response
  const localTarget = localStorage.getItem("monthlyTarget");
  if (localTarget) {
    const val = Number(localTarget);
    if (!isNaN(val) && val > 0) {
      setMonthlyTarget(val);
      setTempTarget(val);
    }
  }

  const fetchData = async () => {
    try {
      // Helper to normalize IDs
      const normalize = (v: any) => String(v).trim().toUpperCase();

      // Fetch target from server settings DB
      fetch("/api/settings?key=monthly_target")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.value) {
            const val = Number(data.value);
            if (!isNaN(val) && val > 0) {
              setMonthlyTarget(val);
              setTempTarget(val);
              localStorage.setItem("monthlyTarget", String(val));
            }
          }
        })
        .catch((err) => console.error("Failed to load target setting", err));

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
      const studentObjMap = new Map<string, any>();
      studentsData.forEach((s: any) => {
        const fullName = `${s.first_name || ""} ${s.last_name || ""}`.trim();
        const displayName = fullName
          ? (s.student_id ? `${fullName} (${s.student_id})` : fullName)
          : (s.user_email || s.student_id || s.full_name || s.name || "Unknown Student");

        if (s.uuid) {
          studentsMap.set(normalize(s.uuid), displayName);
          studentObjMap.set(normalize(s.uuid), s);
        }
        if (s.student_uuid) {
          studentsMap.set(normalize(s.student_uuid), displayName);
          studentObjMap.set(normalize(s.student_uuid), s);
        }
        if (s.id) {
          studentsMap.set(normalize(s.id), displayName);
          studentObjMap.set(normalize(s.id), s);
        }
        if (s.student_id) {
          studentsMap.set(normalize(s.student_id), displayName);
          studentObjMap.set(normalize(s.student_id), s);
        }
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

      // Enrich payments with student_name, student_phone, and class_title
      const enriched = paymentsData.map((p: any) => {
        const studentKey = normalize(p.student_uuid || p.student_id || "");
        const classKey = normalize(p.item_id || p.class_id || "");

        const mappedStudent = studentsMap.get(studentKey);
        const studentObj = studentObjMap.get(studentKey);
        const dbStudent = p.student_name && p.student_name !== "Unknown Student" ? p.student_name : null;

        const mappedClass = classesMap.get(classKey);
        const dbClass = p.class_title && !p.class_title.startsWith("Unknown Class") ? p.class_title : null;

        return {
          ...p,
          student_obj: studentObj || null,
          student_name: mappedStudent || dbStudent || p.user_email || "Unknown Student",
          student_phone: studentObj?.phone || p.student_phone || p.phone || null,
          student_email: studentObj?.user_email || p.student_email || p.user_email || null,
          student_profile_url: studentObj?.profile_url || p.student_profile_url || null,
          class_title: dbClass || mappedClass || `Unknown Class (${p.item_id || p.class_id})`,
          receipt_url: p.transaction_proof || p.receipt_url || null,
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
        (p.student_phone && p.student_phone.toLowerCase().includes(lower)) ||
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

  const handleDelete = async (paymentId: number, paymentUuid?: string) => {
    if (!confirm("Are you sure you want to delete this payment?")) return;
    try {
      const res = await fetch(`/api/payment?id=${paymentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: paymentId, payment_uuid: paymentUuid }),
      });
      
      if (res.ok) {
        const updatedPayments = payments.filter((p: any) => p.id !== paymentId && p.payment_uuid !== paymentUuid);
        setPayments(updatedPayments);
        calculateStats(updatedPayments);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete payment");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error deleting payment");
    }
  };

  const handleViewReceipt = (payment: any) => {
    if (payment.receipt_url) {
      const isPdf = payment.receipt_url.toLowerCase().endsWith(".pdf");
      setCurrentReceipt({ type: isPdf ? "pdf" : "image", url: payment.receipt_url });
      setReceiptModalOpen(true);
    }
  };

  const handleSaveTarget = async () => {
    setMonthlyTarget(tempTarget);
    setEditingTarget(false);
    try {
      localStorage.setItem("monthlyTarget", String(tempTarget));
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "monthly_target", value: tempTarget }),
      });
    } catch (err) {
      console.error("Failed to save monthly target setting", err);
    }
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
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground">{payment.student_name}</span>
                              <button
                                type="button"
                                className="p-1 text-default-400 hover:text-primary transition-colors rounded-md hover:bg-default-100"
                                title="View Student Details"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedStudent(
                                    payment.student_obj || {
                                      first_name: payment.student_name,
                                      phone: payment.student_phone,
                                      user_email: payment.student_email,
                                      uuid: payment.student_uuid,
                                    }
                                  );
                                  setStudentModalOpen(true);
                                }}
                              >
                                <User className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {payment.student_phone ? (
                              <a
                                href={`tel:${payment.student_phone}`}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone className="w-3 h-3" />
                                {payment.student_phone}
                              </a>
                            ) : (
                              <span className="text-[11px] text-default-400">No phone</span>
                            )}
                          </div>
                        </TableCell>
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
                          <Button size="sm" color="danger" variant="light" onPress={() => handleDelete(payment.id, payment.payment_uuid)}>
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

      {/* Student Details Modal */}
      <Modal
        isOpen={studentModalOpen}
        onOpenChange={setStudentModalOpen}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-2 border-b border-default-100">
            <User className="w-5 h-5 text-primary" />
            <span>Student Profile Details</span>
          </ModalHeader>
          <ModalBody className="py-4">
            {selectedStudent && (
              <div className="space-y-5">
                {/* Header Profile Card */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl bg-default-100/60 dark:bg-default-50/10 border border-default-200">
                  <Avatar
                    src={selectedStudent.profile_url || "/assets/default-avatar.png"}
                    className="w-16 h-16 sm:w-20 sm:h-20 text-large border-2 border-primary/20 flex-shrink-0"
                  />
                  <div className="flex-1 text-center sm:text-left space-y-1.5">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h2 className="text-xl font-bold text-foreground">
                        {selectedStudent.first_name || ""} {selectedStudent.last_name || selectedStudent.student_name || ""}
                      </h2>
                      {selectedStudent.student_id && (
                        <Chip size="sm" color="primary" variant="flat" className="font-mono font-semibold">
                          {selectedStudent.student_id}
                        </Chip>
                      )}
                    </div>
                    <p className="text-xs text-default-500">{selectedStudent.user_email || "No email on record"}</p>
                    <div>
                      <Chip
                        size="sm"
                        color={selectedStudent.profile_completed ? "success" : "warning"}
                        variant="flat"
                      >
                        {selectedStudent.profile_completed ? "Profile Completed" : "Profile Pending"}
                      </Chip>
                    </div>
                  </div>
                </div>

                {/* Information Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Phone */}
                  <div className="p-3 rounded-xl border border-default-200 bg-content1 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-default-400 font-medium">Phone Number</p>
                      {selectedStudent.phone ? (
                        <div className="flex items-center gap-2 mt-0.5">
                          <a
                            href={`tel:${selectedStudent.phone}`}
                            className="text-sm font-semibold text-primary hover:underline truncate"
                          >
                            {selectedStudent.phone}
                          </a>
                          <Button
                            size="sm"
                            isIconOnly
                            variant="light"
                            className="h-6 w-6 min-w-6"
                            onPress={() => {
                              navigator.clipboard.writeText(selectedStudent.phone);
                              setCopiedPhone(true);
                              setTimeout(() => setCopiedPhone(false), 2000);
                            }}
                            title="Copy Phone"
                          >
                            {copiedPhone ? (
                              <Check className="w-3.5 h-3.5 text-success" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-default-400" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-default-500">Not provided</p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="p-3 rounded-xl border border-default-200 bg-content1 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-secondary/10 text-secondary mt-0.5">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-default-400 font-medium">Email Address</p>
                      {selectedStudent.user_email ? (
                        <a
                          href={`mailto:${selectedStudent.user_email}`}
                          className="text-sm font-semibold text-foreground hover:text-primary hover:underline truncate block mt-0.5"
                        >
                          {selectedStudent.user_email}
                        </a>
                      ) : (
                        <p className="text-sm text-default-500">Not provided</p>
                      )}
                    </div>
                  </div>

                  {/* Batch */}
                  <div className="p-3 rounded-xl border border-default-200 bg-content1 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-warning/10 text-warning mt-0.5">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-default-400 font-medium">Batch / Grade</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">
                        {selectedStudent.batch || "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* NIC / ID */}
                  <div className="p-3 rounded-xl border border-default-200 bg-content1 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-success/10 text-success mt-0.5">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-default-400 font-medium">NIC / ID Number</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">
                        {selectedStudent.id_number || "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Home Address */}
                  <div className="p-3 rounded-xl border border-default-200 bg-content1 flex items-start gap-3 sm:col-span-2">
                    <div className="p-2 rounded-lg bg-danger/10 text-danger mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-default-400 font-medium">Home Address</p>
                      <p className="text-sm text-foreground mt-0.5">
                        {selectedStudent.user_address || "No address on record."}
                      </p>
                    </div>
                  </div>

                  {/* Birthday */}
                  <div className="p-3 rounded-xl border border-default-200 bg-content1 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-default-200 text-default-600 mt-0.5">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-default-400 font-medium">Birthday</p>
                      <p className="text-sm text-foreground mt-0.5">
                        {selectedStudent.birthday ? new Date(selectedStudent.birthday).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Joined Date */}
                  <div className="p-3 rounded-xl border border-default-200 bg-content1 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-default-200 text-default-600 mt-0.5">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-default-400 font-medium">Joined Date</p>
                      <p className="text-sm text-foreground mt-0.5">
                        {selectedStudent.create_at ? new Date(selectedStudent.create_at).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter className="flex justify-between items-center border-t border-default-100">
            {selectedStudent?.uuid ? (
              <Button
                as="a"
                href={`/admin/students/${selectedStudent.uuid}`}
                target="_blank"
                variant="light"
                color="primary"
                endContent={<ExternalLink className="w-4 h-4" />}
                size="sm"
              >
                Open Full Student Page
              </Button>
            ) : (
              <div />
            )}
            <Button color="default" onPress={() => setStudentModalOpen(false)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </div>
  );
}