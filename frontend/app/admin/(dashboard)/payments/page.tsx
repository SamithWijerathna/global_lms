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

export default function PaymentApprovalPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [studentsMap, setStudentsMap] = useState<Map<string, string>>(new Map());
  const [classesMap, setClassesMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<{ type: "image" | "pdf"; url: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Student Details Modal State
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const adminHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}`,
  };

  const paymentHeaders = {
    ...adminHeaders,
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch pending payments (no auth required - GET returns pending by default)
        const paymentsRes = await fetch("/api/payment");
        if (!paymentsRes.ok) throw new Error("Failed to fetch payments");
        const paymentsJson = await paymentsRes.json();
        const paymentsData = paymentsJson.payments || [];

        // Fetch students (requires auth)
        const studentsRes = await fetch("/api/admin/students", {
          headers: adminHeaders,
        });
        const studentsData = studentsRes.ok ? await studentsRes.json() : [];
        const studentMap = new Map<string, string>();
        const studentObjMap = new Map<string, any>();
        studentsData.forEach((s: any) => {
          const fullName = `${s.first_name || ""} ${s.last_name || ""}`.trim();
          const displayName = fullName
            ? (s.student_id ? `${fullName} (${s.student_id})` : fullName)
            : (s.user_email || s.student_id || s.full_name || s.name || "Unknown Student");

          const normalize = (v: any) => String(v).trim().toUpperCase();
          if (s.uuid) {
            studentMap.set(normalize(s.uuid), displayName);
            studentObjMap.set(normalize(s.uuid), s);
          }
          if (s.student_uuid) {
            studentMap.set(normalize(s.student_uuid), displayName);
            studentObjMap.set(normalize(s.student_uuid), s);
          }
          if (s.id) {
            studentMap.set(normalize(s.id), displayName);
            studentObjMap.set(normalize(s.id), s);
          }
          if (s.student_id) {
            studentMap.set(normalize(s.student_id), displayName);
            studentObjMap.set(normalize(s.student_id), s);
          }
        });

        // Fetch classes (requires auth)
        const classesRes = await fetch("/api/admin/classes", {
          headers: adminHeaders,
        });
        const classesData = classesRes.ok ? await classesRes.json() : [];
        const classMap = new Map<string, string>();
        classesData.forEach((c: any) => {
          const normalize = (v: any) => String(v).trim().toUpperCase();
          classMap.set(normalize(c.class_id || c.id), c.class_title || "Unknown Class");
        });

        // Enrich payments
        const enrichedPayments = paymentsData.map((p: any) => {
          const normalize = (v: any) => String(v).trim().toUpperCase();
          const studentKey = normalize(p.student_uuid || p.student_id || "");
          const classKey = normalize(p.item_id || p.class_id || "");

          const mappedStudent = studentMap.get(studentKey);
          const studentObj = studentObjMap.get(studentKey);
          const dbStudent = p.student_name && p.student_name !== "Unknown Student" ? p.student_name : null;

          const mappedClass = classMap.get(classKey);
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

        setStudentsMap(studentMap);
        setClassesMap(classMap);
        setPayments(enrichedPayments);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Search filter
  const filteredPayments =
    searchTerm.trim() === ""
      ? payments
      : payments.filter((p: any) =>
          p.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.student_phone && p.student_phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
          p.class_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.amount.toString().includes(searchTerm) ||
          p.id.toString().includes(searchTerm)
        );

  const handleRowClick = (payment: any) => {
    setSelectedPayment(payment);
    setModalOpen(true);
  };

  const handleViewReceipt = (url: string) => {
    if (url) {
      const isPdf = url.toLowerCase().endsWith(".pdf");
      setCurrentReceipt({ type: isPdf ? "pdf" : "image", url });
      setReceiptModalOpen(true);
    }
  };

  const handleApprove = async () => {
    if (!selectedPayment) return;

    try {
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: paymentHeaders,
        body: JSON.stringify({
          action: "complete_payment",
          payment_uuid: selectedPayment.payment_uuid,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to approve payment");
      }

      // Remove from local state
      setPayments(prev => prev.filter(p => p.payment_uuid !== selectedPayment.payment_uuid));
      setModalOpen(false);
    } catch (err: any) {
      alert(err.message || "An error occurred while approving");
    }
  };

  const handleReject = async () => {
    if (!selectedPayment) return;

    try {
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: paymentHeaders,
        body: JSON.stringify({
          action: "reject",
          payment_uuid: selectedPayment.payment_uuid,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reject payment");
      }

      // Remove from local state
      setPayments(prev => prev.filter(p => p.payment_uuid !== selectedPayment.payment_uuid));
      setModalOpen(false);
    } catch (err: any) {
      alert(err.message || "An error occurred while rejecting");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-4xl font-bold mb-8">Payment Approval</h1>

      <Card className="shadow-lg mb-8">
        <CardHeader>Search Pending Payments</CardHeader>
        <CardBody>
          <Input
            placeholder="Search by student, class, amount, ID..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            clearable
            onClear={() => setSearchTerm("")}
          />
        </CardBody>
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="text-xl font-semibold">
          Pending Payments ({filteredPayments.length})
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-default-500">No pending payments.</p>
            </div>
          ) : (
            <Table aria-label="Pending payments table">
              <TableHeader>
                <TableColumn>ID</TableColumn>
                <TableColumn>Date</TableColumn>
                <TableColumn>Student</TableColumn>
                <TableColumn>Class</TableColumn>
                <TableColumn>Amount</TableColumn>
                <TableColumn>Bank/Method</TableColumn>
                <TableColumn>Receipt</TableColumn>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment: any) => (
                  <TableRow
                    key={payment.id}
                    className="cursor-pointer hover:bg-default-100 transition-colors"
                    onClick={() => handleRowClick(payment)}
                  >
                    <TableCell>{payment.id}</TableCell>
                    <TableCell>{new Date(payment.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground">{payment.student_name}</span>
                        {payment.student_phone ? (
                          <span className="text-xs text-default-500 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-primary" />
                            {payment.student_phone}
                          </span>
                        ) : (
                          <span className="text-[11px] text-default-400">No phone</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{payment.class_title}</TableCell>
                    <TableCell className="font-bold text-success">
                      Rs {parseFloat(payment.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>{payment.bank || "-"}</TableCell>
                    <TableCell>
                      {payment.receipt_url ? (
                        <Button
                          size="sm"
                          color="secondary"
                          onPress={(e) => {
                            e.stopPropagation();
                            handleViewReceipt(payment.receipt_url);
                          }}
                        >
                          View
                        </Button>
                      ) : (
                        <span className="text-default-500">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Payment Details Modal */}
      <Modal isOpen={modalOpen} onOpenChange={setModalOpen} size="lg">
        <ModalContent>
          <ModalHeader>Payment Details</ModalHeader>
          <ModalBody>
            {selectedPayment && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-default-500">Payment ID</p>
                  <p>{selectedPayment.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-default-500">Payment UUID</p>
                  <p className="text-xs break-all">{selectedPayment.payment_uuid}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-default-500">Date</p>
                  <p>{new Date(selectedPayment.created_at).toLocaleString()}</p>
                </div>

                {/* Student Info Card */}
                <div className="p-3.5 bg-default-50 dark:bg-default-100/40 rounded-xl border border-default-200">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={selectedPayment.student_profile_url || "/assets/default-avatar.png"}
                        className="w-11 h-11 border border-default-200"
                      />
                      <div>
                        <p className="text-xs text-default-400 font-medium">Student</p>
                        <p className="font-semibold text-foreground text-sm sm:text-base">
                          {selectedPayment.student_name}
                        </p>
                        {selectedPayment.student_phone ? (
                          <a
                            href={`tel:${selectedPayment.student_phone}`}
                            className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="w-3 h-3" />
                            {selectedPayment.student_phone}
                          </a>
                        ) : (
                          <p className="text-xs text-default-400">No phone on record</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      color="primary"
                      variant="flat"
                      startContent={<User className="w-3.5 h-3.5" />}
                      onPress={() => {
                        setSelectedStudent(
                          selectedPayment.student_obj || {
                            first_name: selectedPayment.student_name,
                            phone: selectedPayment.student_phone,
                            user_email: selectedPayment.student_email,
                            uuid: selectedPayment.student_uuid,
                          }
                        );
                        setStudentModalOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-default-500">Class</p>
                  <p className="font-semibold">{selectedPayment.class_title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-default-500">Amount</p>
                  <p className="text-2xl font-bold text-success">
                    Rs {parseFloat(selectedPayment.amount).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-default-500">Bank</p>
                  <p>{selectedPayment.bank || "-"}</p>
                </div>
                {selectedPayment.receipt_url && (
                  <div>
                    <p className="text-sm font-medium text-default-500 mb-2">Transaction Proof</p>
                    <Button color="secondary" onPress={() => handleViewReceipt(selectedPayment.receipt_url)}>
                      View Receipt
                    </Button>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter className="gap-4">
            <Button color="danger" variant="flat" onPress={handleReject}>
              Reject
            </Button>
            <Button color="success" onPress={handleApprove}>
              Approve
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Receipt Modal */}
      <Modal isOpen={receiptModalOpen} onOpenChange={setReceiptModalOpen} size="4xl">
        <ModalContent>
          <ModalHeader>Transaction Proof</ModalHeader>
          <ModalBody className="p-0">
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
                    removeWrapper
                  />
                ) : currentReceipt.type === "pdf" ? (
                  <iframe src={receiptSrc} className="w-full h-[80vh]" title="Receipt PDF" />
                ) : null;
              })()
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button onPress={() => setReceiptModalOpen(false)}>Close</Button>
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