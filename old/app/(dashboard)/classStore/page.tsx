"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardFooter,
} from "@heroui/card";
import { Image } from "@heroui/image";
import { Button } from "@heroui/button";
import { Skeleton } from "@heroui/skeleton";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/modal";
import { Tabs, Tab } from "@heroui/tabs";
import { RadioGroup, Radio } from "@heroui/radio";
import { Chip } from "@heroui/chip";
import { Upload, CheckCircle, Banknote, Building2 } from "lucide-react";
import { useAuth } from "@/src/lib/useAuth";

export default function LessonStorePage() {
  const { user, loading: authLoading } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [bankChoice, setBankChoice] = useState<"commercial" | "hnb">("commercial");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);

  // Pending & approved class IDs
  const [pendingClassIds, setPendingClassIds] = useState<number[]>([]);
  const [approvedClassIds, setApprovedClassIds] = useState<number[]>([]);

  useEffect(() => {
    if (!user?.uuid || !user?.batch) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        // Fetch user's payments
        const paymentRes = await fetch("/api/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "user_payments",
            student_uuid: user.uuid,
          }),
        });
        const paymentData = await paymentRes.json();

        const payments = Array.isArray(paymentData) ? paymentData : paymentData.data || [];

        const approvedIds = payments
          .filter((p: any) => p.status === "approved" && p.item_type === "class")
          .map((p: any) => p.item_id);

        const pendingIds = payments
          .filter((p: any) => p.status === "pending" && p.item_type === "class")
          .map((p: any) => p.item_id);

        setApprovedClassIds(approvedIds);
        setPendingClassIds(pendingIds);

        // Fetch all classes
        const res = await fetch("/api/dashboard/class", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "class_data" }),
        });
        let data: any;
        try {
          data = await res.json();
        } catch (e) {
          const text = await res.text();
          data = text ? JSON.parse(text) : null;
        }

        const normalized = Array.isArray(data)
          ? data
          : data && Array.isArray(data.rows)
            ? data.rows
            : data && Array.isArray(data.data)
              ? data.data
              : [];

        if (!Array.isArray(normalized)) {
          setError("Unexpected API response. Please try again.");
          setClasses([]);
          return;
        }

        // Include pending classes but exclude approved ones
        const filteredClasses = normalized.filter((cls: any) => {
          const classId = cls.class_id || cls.id;
          return cls.batch === user.batch && !approvedIds.includes(classId);
        });

        if (filteredClasses.length === 0) {
          setError("No available classes for your batch at this time.");
          setClasses([]);
        } else {
          setError(null);
          setClasses(filteredClasses);
        }
      } catch (err: any) {
        console.error(err);
        setError("Failed to load classes. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.batch, user?.uuid]);

  const resetPaymentStates = () => {
    setFile(null);
    setPreview(null);
    setBankChoice("commercial");
    setPaymentSubmitted(false);
    setUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0] || null;
    setFile(uploaded);
    if (uploaded) {
      setPreview(URL.createObjectURL(uploaded));
    } else {
      setPreview(null);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!file) {
      alert("Please upload your payment receipt.");
      return;
    }

    if (!user) {
      alert("User not authenticated.");
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("receipt", file);
    formData.append("bank", bankChoice);
    formData.append("student_uuid", user.uuid);
    formData.append("payment_type", "class");
    formData.append("amount", selectedClass.class_price.toString());

    try {
      const res = await fetch("/api/payment/upload", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to upload receipt");

      setPaymentSubmitted(true);
      setTimeout(() => {
        resetPaymentStates();
        setIsPaymentModalOpen(false);
      }, 5000);
    } catch (err: any) {
      alert(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const enrollInClass = async (cls: any) => {
    const classId = cls.class_id || cls.id;

    if (pendingClassIds.includes(classId)) {
      alert("You already have a pending payment for this class.");
      return;
    }

    try {
      const res = await fetch("/api/payment/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: classId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to select class for payment");
        return;
      }

      setSelectedClass(cls);
      resetPaymentStates();
      setIsPaymentModalOpen(true);
    } catch (err) {
      alert("An error occurred while selecting the class.");
    }
  };

  const handleModalClose = (open: boolean) => {
    if (open) {
      setIsPaymentModalOpen(true);
      return;
    }

    if (paymentSubmitted) {
      resetPaymentStates();
      setIsPaymentModalOpen(false);
      return;
    }

    if (file) {
      if (confirm("You have uploaded a receipt. Discard the payment process?")) {
        resetPaymentStates();
        setIsPaymentModalOpen(false);
      }
    } else {
      setIsPaymentModalOpen(false);
    }
  };

  return (
    <div className="p-6 min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-center">
        Available Classes for Enrollment
      </h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="relative w-full h-[400px] overflow-hidden">
              <Skeleton className="w-full h-full rounded-lg" />
              <CardFooter className="absolute bg-white/30 backdrop-blur-md bottom-0 border-t-1 border-zinc-100/50 z-10 w-full">
                <div className="flex flex-col gap-1 w-full px-4 py-3">
                  <Skeleton className="h-8 w-3/4 rounded-lg" />
                  <Skeleton className="h-6 w-32 rounded-lg mb-2" />
                  <Skeleton className="h-10 w-28 rounded-full" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-xl text-danger">{error}</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-xl text-default-500">
            No available classes at the moment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {classes.map((cls: any) => {
            const classId = cls.class_id || cls.id;
            const isPending = pendingClassIds.includes(classId);

            return (
              <Card
                key={classId}
                className={`relative w-full h-[400px] overflow-hidden shadow-xl transition-transform ${
                  !isPending ? "hover:scale-[1.02]" : ""
                } ${isPending ? "opacity-75" : ""}`}
              >
                {cls.class_imageurl || cls.image_url ? (
                  <Image
                    removeWrapper
                    alt={cls.class_title}
                    className={`z-0 w-full h-full object-cover ${isPending ? "grayscale" : ""}`}
                    src={cls.class_imageurl || cls.image_url}
                  />
                ) : (
                  <div className="z-0 w-full h-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center">
                    <span className="text-white/80 text-xl font-medium">No Image</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent z-10" />

                {/* Pending overlay */}
                {isPending && (
                  <div className="absolute inset-0 bg-black/50 z-30 flex items-center justify-center pointer-events-none">
                    <Chip color="warning" size="lg" variant="shadow">
                      Payment Pending
                    </Chip>
                  </div>
                )}

                <CardFooter className="absolute bg-white/30 backdrop-blur-md bottom-0 border-t-1 border-zinc-100/50 z-20 w-full">
                  <div className="flex flex-col gap-1 w-full px-4 py-3">
                    <h4 className={`font-semibold text-2xl drop-shadow-lg ${isPending ? "text-white/70" : "text-white"}`}>
                      {cls.class_title || "Untitled Class"}
                    </h4>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className={`text-lg font-bold drop-shadow ${isPending ? "text-white/70" : "text-white"}`}>
                          Rs {cls.class_price || 0}
                        </p>
                        <p className="text-white/80 text-sm">
                          {cls.batch || ""}
                          {cls.class_type ? ` • ${cls.class_type}` : ""}
                          {cls.renew_type ? ` • ${cls.renew_type}` : ""}
                        </p>
                        <p className="text-white/70 text-xs mt-1 line-clamp-2">
                          {cls.class_description || "No description available"}
                        </p>
                      </div>
                      <Button
                        color={isPending ? "default" : "primary"}
                        radius="full"
                        size="sm"
                        isDisabled={isPending}
                        onPress={() => enrollInClass(cls)}
                      >
                        {isPending ? "Pending Approval" : "Enroll Now"}
                      </Button>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Payment Modal (unchanged from previous version) */}
      <Modal
        backdrop="blur"
        isOpen={isPaymentModalOpen}
        onOpenChange={handleModalClose}
        size="lg"
        classNames={{
          base: "bg-content1",
        }}
      >
        <ModalContent>
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold">Payment</h2>
              {selectedClass && (
                <p className="text-default-500 text-medium">
                  {selectedClass.class_title} - Rs. {selectedClass.class_price}
                </p>
              )}
            </ModalHeader>
            <ModalBody>
              {paymentSubmitted ? (
                <div className="flex flex-col items-center justify-center gap-6 py-10 text-center">
                  <CheckCircle className="w-24 h-24 text-success" />
                  <h3 className="text-2xl font-bold">Payment Submitted Successfully!</h3>
                  <p className="text-default-600 max-w-md">
                    Thank you! Your receipt has been uploaded. Our team will verify your payment shortly.
                  </p>
                  <p className="text-small text-default-500">Closing in 5 seconds...</p>
                  <Button
                    color="primary"
                    onPress={() => {
                      resetPaymentStates();
                      setIsPaymentModalOpen(false);
                    }}
                  >
                    Close Now
                  </Button>
                </div>
              ) : (
                selectedClass && (
                  <div className="flex flex-col gap-6">
                    <div className="text-center">
                      <p className="text-default-600">{selectedClass.class_description}</p>
                    </div>

                    <Tabs aria-label="Payment methods" defaultSelectedKey="bank" className="w-full">
                      <Tab
                        key="bank"
                        title={
                          <div className="flex items-center gap-2">
                            <Banknote className="w-5 h-5" />
                            Bank Transfer
                          </div>
                        }
                      >
                        <div className="flex flex-col gap-5">
                          <RadioGroup
                            label="Select Bank"
                            value={bankChoice}
                            onValueChange={setBankChoice as any}
                            orientation="horizontal"
                          >
                            <Radio value="commercial">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                Commercial Bank
                              </div>
                            </Radio>
                            <Radio value="hnb">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                Hatton National Bank
                              </div>
                            </Radio>
                          </RadioGroup>

                          <div className="bg-default-100 p-5 rounded-large text-small">
                            {bankChoice === "commercial" ? (
                              <>
                                <p><strong>Bank:</strong> Commercial Bank</p>
                                <p><strong>Account Name:</strong> R A S T Rajapaksha</p>
                                <p><strong>Account Number:</strong> 802 092 806 9</p>
                                <p><strong>Branch:</strong> Pilimathalawa</p>
                              </>
                            ) : (
                              <>
                                <p><strong>Bank:</strong> Hatton National Bank</p>
                                <p><strong>Account Name:</strong> R A S T Rajapaksha</p>
                                <p><strong>Account Number:</strong> 141020146041</p>
                                <p><strong>Branch:</strong> Pilimathalawa</p>
                              </>
                            )}
                          </div>

                          <div>
                            <p className="font-medium mb-3">Upload Payment Receipt</p>
                            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer bg-default-50 hover:bg-default-100 transition-colors">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-12 h-12 text-default-400 mb-4" />
                                <p className="mb-2 text-sm text-default-600">
                                  <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-default-500">Image or PDF</p>
                              </div>
                              {preview && file?.type.startsWith("image/") && (
                                <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover rounded-xl" />
                              )}
                              {file && !file.type.startsWith("image/") && (
                                <div className="absolute inset-0 flex items-center justify-center bg-default-100/80 rounded-xl">
                                  <p className="text-default-700 font-medium">PDF: {file.name}</p>
                                </div>
                              )}
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={uploading}
                              />
                            </label>
                          </div>

                          <Button
                            size="lg"
                            color="primary"
                            isLoading={uploading}
                            onPress={handlePaymentSubmit}
                            isDisabled={!file}
                            fullWidth
                          >
                            {uploading ? "Uploading Receipt..." : "Submit Payment"}
                          </Button>
                        </div>
                      </Tab>
                      <Tab
                        key="card"
                        title="Card Payment"
                        isDisabled
                      >
                        <div className="text-center py-10 text-default-500">
                          Coming Soon
                        </div>
                      </Tab>
                    </Tabs>
                  </div>
                )
              )}
            </ModalBody>
          </>
        </ModalContent>
      </Modal>
    </div>
  );
}