"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardFooter,
} from "@heroui/card";
import { useRouter } from "next/navigation";
import { Image } from "@heroui/image";
import { Button } from "@heroui/button";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Skeleton } from "@heroui/skeleton";
import { Chip } from "@heroui/chip";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { VerticalDotsIcon } from "@/components/admin/icons"; // Adjust path
import Link from "next/link";
import {
  EditDocumentIcon,
  DeleteDocumentIcon,
} from "@/components/admin/icons"; // Adjust path
import {
  BookOpen,
  UserRound,
  ArrowUp,
  ArrowDown,
  Info,
} from "lucide-react";
import { useConfirm } from "@/components/admin/GlobalConfirm";
import RichTextRenderer from "@/components/RichTextRenderer";

export default function ClassListPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDetailsClass, setSelectedDetailsClass] = useState<any>(null);
  const confirm = useConfirm();

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/admin/classes", {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
      });
      const data = await res.json();
      setClasses(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleMoveClass = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= classes.length) return;

    const updated = [...classes];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const items = updated.map((cls, idx) => ({
      class_id: cls.class_id,
      display_order: idx,
    }));

    setClasses(updated);
    setReordering(true);

    try {
      await fetch("/api/admin/classes/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}`,
        },
        body: JSON.stringify({ items }),
      });
    } catch (err) {
      console.error("Reorder failed", err);
      fetchClasses(); // revert on error
    } finally {
      setReordering(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: "Delete Class?",
      message: (
        <>
          Are you sure you want to <strong>permanently delete</strong> this class?
          <br />
          <span className="text-danger font-medium">
            This action cannot be undone.
          </span>
        </>
      ),
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      confirmColor: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/classes?id=${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
          });

          if (res.ok) {
            fetchClasses(); // refresh list
          }
        } catch (err) {
          console.error(err);
        }
      },
    });

    if (!confirmed) return;
  };

  const openClassDetails = (cls: any) => {
    setSelectedDetailsClass(cls);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Class List</h1>
        <Link href="/admin/classes/add">
          <Button color="primary" size="lg">
            Add New Class
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="relative w-full h-[420px] overflow-hidden">
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
      ) : classes.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-xl text-default-500 mb-4">No classes available yet.</p>
          <Link href="/admin/classes/add">
            <Button color="primary">Create Your First Class</Button>
          </Link>
        </div>
      ) : (() => {
        const classesByBatch = classes.reduce((acc, cls) => {
          const batchName = cls.batch || "Other Batches";
          if (!acc[batchName]) acc[batchName] = [];
          acc[batchName].push(cls);
          return acc;
        }, {} as Record<string, any[]>);

        return (
          <div className="space-y-12">
            {Object.entries(classesByBatch).map(([batchName, batchClasses]) => (
              <div key={batchName}>
                {/* Batch Section Header */}
                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-default-200 dark:border-default-800">
                  <span className="w-3 h-3 rounded-full bg-primary shadow-sm" />
                  <h2 className="text-2xl font-bold text-foreground capitalize tracking-wide">
                    Batch Section: {batchName}
                  </h2>
                  <Chip color="primary" variant="flat" size="sm" className="font-semibold">
                    {batchClasses.length} class{batchClasses.length !== 1 ? "es" : ""}
                  </Chip>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
                  {batchClasses.map((cls: any) => {
                    const originalIndex = classes.findIndex((c) => (c.id || c.class_id) === (cls.id || cls.class_id));

                    return (
                      <Card key={cls.id || cls.class_id} className="relative w-full h-[420px] overflow-hidden shadow-xl flex flex-col justify-between">
                        {/* Background Image */}
                        {cls.class_imageurl ? (
                          <Image
                            removeWrapper
                            alt={cls.class_title}
                            className="z-0 w-full h-full object-cover"
                            src={cls.class_imageurl}
                          />
                        ) : (
                          <div className="z-0 w-full h-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center">
                            <span className="text-white/80 text-xl font-medium">No Image</span>
                          </div>
                        )}

                        {/* Dark overlay for text visibility */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent z-10" />

                        {/* Reorder Buttons - Top Left Corner */}
                        <div className="absolute top-3 left-3 z-30 flex gap-1">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="bordered"
                            className="border-white/30 bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm"
                            isDisabled={originalIndex === 0 || reordering}
                            onPress={() => handleMoveClass(originalIndex, "up")}
                            title="Move class left/up"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="bordered"
                            className="border-white/30 bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm"
                            isDisabled={originalIndex === classes.length - 1 || reordering}
                            onPress={() => handleMoveClass(originalIndex, "down")}
                            title="Move class right/down"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* 3-Dots Menu - Top Right Corner */}
                        <div className="absolute top-3 right-3 z-30">
                          <Dropdown>
                            <DropdownTrigger>
                              <Button isIconOnly size="sm" variant="bordered" className="border-white/30 bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm">
                                <VerticalDotsIcon className="w-5 h-5 text-white" />
                              </Button>
                            </DropdownTrigger>
                            <DropdownMenu aria-label="Class actions" variant="faded">
                              <DropdownItem
                                key="edit"
                                description="Modify class details"
                                shortcut="⌘E"
                                startContent={<EditDocumentIcon className="w-5 h-5 text-default-600" />}
                                onPress={() => router.push(`/admin/classes/edit/${cls.class_id}`)}
                              >
                                Edit Class
                              </DropdownItem>
                              <DropdownItem
                                key="materials"
                                description="View and manage class materials"
                                shortcut="⌘M"
                                startContent={<BookOpen className="w-5 h-5 text-default-600" />}
                                onPress={() => router.push(`/admin/classes/materials?class_id=${cls.class_id}`)}
                              >
                                View Materials
                              </DropdownItem>
                              <DropdownItem
                                showDivider
                                key="students"
                                description="See enrolled students"
                                shortcut="⌘S"
                                startContent={<UserRound className="w-5 h-5 text-default-600" />}
                                onPress={() => router.push(`/admin/classes/students/${cls.class_id}`)}
                              >
                                Enrolled Students
                              </DropdownItem>
                              <DropdownItem
                                key="delete"
                                className="text-danger"
                                color="danger"
                                description="Permanently remove this class"
                                shortcut="⌘⇧D"
                                startContent={<DeleteDocumentIcon className="w-5 h-5 text-danger" />}
                                onPress={() => handleDelete(cls.id)}
                              >
                                Delete Class
                              </DropdownItem>
                            </DropdownMenu>
                          </Dropdown>
                        </div>

                        {/* Footer with Class Details & Action Buttons */}
                        <CardFooter className="absolute bg-black/65 backdrop-blur-md bottom-0 border-t border-white/10 z-20 w-full p-4">
                          <div className="flex flex-col gap-2 w-full">
                            <h4 className="text-white font-bold text-lg leading-tight line-clamp-2 drop-shadow-md">
                              {cls.class_title}
                            </h4>

                            <div>
                              <div className="flex items-center justify-between">
                                <p className="text-white text-base font-bold drop-shadow">
                                  Rs {cls.class_price}
                                </p>
                                <span className="text-white/70 text-xs font-medium bg-white/10 px-2 py-0.5 rounded-md">
                                  {cls.batch} • {cls.class_type}
                                </span>
                              </div>
                              <p className="text-white/70 text-xs mt-1 line-clamp-2 leading-relaxed">
                                {cls.class_description || "No description available"}
                              </p>
                            </div>

                            {/* Leveled Buttons Action Row */}
                            <div className="flex items-center gap-2 pt-2 mt-auto w-full">
                              <Button
                                size="sm"
                                variant="flat"
                                startContent={<Info className="w-3.5 h-3.5" />}
                                className="flex-1 text-white bg-white/20 hover:bg-white/30 backdrop-blur-md text-xs font-medium"
                                onPress={() => openClassDetails(cls)}
                              >
                                View Details
                              </Button>
                              <Button
                                size="sm"
                                color="primary"
                                className="flex-1 text-xs font-semibold shadow-md"
                                onPress={() => router.push(`/admin/classes/edit/${cls.class_id}`)}
                              >
                                Edit Class
                              </Button>
                            </div>
                          </div>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Class Details Modal */}
      <Modal
        backdrop="blur"
        isOpen={isDetailsModalOpen}
        onOpenChange={(open) => setIsDetailsModalOpen(open)}
        size="2xl"
        scrollBehavior="inside"
        classNames={{
          base: "bg-content1 max-h-[90vh]",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 border-b border-default-100">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Class Details</span>
                <h2 className="text-2xl font-bold">{selectedDetailsClass?.class_title}</h2>
              </ModalHeader>
              <ModalBody className="py-5">
                {selectedDetailsClass && (
                  <div className="flex flex-col gap-5">
                    {/* Image banner */}
                    {selectedDetailsClass.class_imageurl ? (
                      <div className="w-full h-56 rounded-xl overflow-hidden shadow-md">
                        <img
                          src={selectedDetailsClass.class_imageurl}
                          alt={selectedDetailsClass.class_title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : null}

                    {/* Specs & Pricing */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-default-100 dark:bg-default-50/5 border border-default-200/50">
                      <div>
                        <p className="text-xs text-default-500 font-medium">Price</p>
                        <p className="text-2xl font-extrabold text-primary">Rs {selectedDetailsClass.class_price || 0}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedDetailsClass.batch && (
                          <Chip color="primary" variant="flat" size="sm" className="font-semibold">
                            Batch: {selectedDetailsClass.batch}
                          </Chip>
                        )}
                        {selectedDetailsClass.class_type && (
                          <Chip color="secondary" variant="flat" size="sm" className="font-semibold capitalize">
                            {selectedDetailsClass.class_type}
                          </Chip>
                        )}
                        {selectedDetailsClass.renew_type && (
                          <Chip color="default" variant="flat" size="sm" className="font-semibold capitalize">
                            {selectedDetailsClass.renew_type}
                          </Chip>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <h4 className="text-sm font-semibold text-default-700 mb-2">Description & Syllabus</h4>
                      <div className="p-4 rounded-xl bg-default-50 dark:bg-default-50/5 border border-default-200/40 max-h-60 overflow-y-auto">
                        <RichTextRenderer content={selectedDetailsClass.class_description} />
                      </div>
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter className="border-t border-default-100">
                <Button variant="flat" onPress={onClose}>
                  Close
                </Button>
                {selectedDetailsClass && (
                  <Button
                    color="primary"
                    className="font-semibold shadow-md"
                    onPress={() => {
                      onClose();
                      router.push(`/admin/classes/edit/${selectedDetailsClass.class_id}`);
                    }}
                  >
                    Edit Class
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}