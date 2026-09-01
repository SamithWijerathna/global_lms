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
import { VerticalDotsIcon } from "@/components/admin/icons"; // Adjust path
import Link from "next/link";
import {
  EditDocumentIcon,
  DeleteDocumentIcon,
} from "@/components/admin/icons"; // Adjust path
import {

  BookOpen,
  UserRound,
} from "lucide-react";
import { useConfirm } from "@/components/admin/GlobalConfirm";

export default function ClassListPage() {
  const router = useRouter();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
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

    // Optional, but keeps logic clear
    if (!confirmed) return;
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
      ) : classes.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-xl text-default-500 mb-4">No classes available yet.</p>
          <Link href="/admin/classes/add">
            <Button color="primary">Create Your First Class</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {classes.map((cls: any) => (
            <Card key={cls.id} className="relative w-full h-[400px] overflow-hidden shadow-xl">
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

              {/* Dark overlay for better text visibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent z-10" />

              {/* 3-Dots Menu - Top Right Corner */}
              {/* Replace the old dropdown with this new one */}
              <div className="absolute top-3 right-3 z-30">
                <Dropdown>
                  <DropdownTrigger>
                    <Button isIconOnly size="sm" variant="bordered" className="border-white/30 bg-white/10">
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

              {/* Footer with Class Details */}
              <CardFooter className="absolute bg-white/30 backdrop-blur-md bottom-0 border-t-1 border-zinc-100/50 z-20 w-full">
                <div className="flex flex-col gap-1 w-full px-4 py-3">
                  <h4 className="text-white font-semibold text-2xl drop-shadow-lg">
                    {cls.class_title}
                  </h4>

                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-white text-lg font-bold drop-shadow">
                        Rs {cls.class_price}
                      </p>
                      <p className="text-white/80 text-sm">
                        {cls.batch} • {cls.class_type} • {cls.renew_type}
                      </p>
                      <p className="text-white/70 text-xs mt-1">
                        {cls.class_description || "No description available"}
                      </p>
                    </div>
                    <Button
                      className="text-tiny font-medium"
                      color="primary"
                      radius="full"
                      size="sm"
                    >
                      Enroll Now
                    </Button>
                  </div>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}