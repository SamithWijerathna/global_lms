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
        studentsData.forEach((s: any) => {
          const name = `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.full_name || s.name || "Unknown Student";
          studentMap.set(s.student_uuid || s.uuid || s.id, name);
        });

        // Fetch classes (requires auth)
        const classesRes = await fetch("/api/admin/classes", {
          headers: adminHeaders,
        });
        const classesData = classesRes.ok ? await classesRes.json() : [];
        const classMap = new Map<string, string>();
        classesData.forEach((c: any) => {
          classMap.set(c.class_id || c.id, c.class_title || "Unknown Class");
        });

        // Enrich payments
        const enrichedPayments = paymentsData.map((p: any) => ({
          ...p,
          student_name: studentMap.get(p.student_uuid) || "Unknown Student",
          class_title: classMap.get(p.item_id) || "Unknown Class",
          receipt_url: p.transaction_proof || null,
        }));

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
                    <TableCell>{payment.student_name}</TableCell>
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
                <div>
                  <p className="text-sm font-medium text-default-500">Student</p>
                  <p className="font-semibold">{selectedPayment.student_name}</p>
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
    </div>
  );
}