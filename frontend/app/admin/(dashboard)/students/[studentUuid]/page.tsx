"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@heroui/spinner";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { siteConfig } from "@/config/site";
import { useParams } from "next/navigation";

export default function StudentProfilePage() {
  const router = useRouter();
  const params = useParams();
  const studentUuid = params.studentUuid as string;

  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
  };

  useEffect(() => {
    document.title = `${siteConfig.name} - Student Profile`;
  }, []);

  useEffect(() => {
    if (studentUuid) fetchStudent(studentUuid);
  }, [studentUuid]);

  const fetchStudent = async (uuid: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/students?uuid=${uuid}`, {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}`,
        },
      });
      const data = await res.json();
      setStudent(data[0] || null); // pick first element from array
    } catch (err) {
      console.error(err);
      setStudent(null);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex justify-center items-center h-screen text-red-500">
        Student not found
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        {student.first_name} {student.last_name} - Profile
      </h1>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-shrink-0">
          <img
            src={student.profile_url || "/assets/default-avatar.png"}
            alt="Profile"
            className="w-48 h-48 rounded-lg object-cover border border-gray-200"
          />
          <Chip
            color={student.profile_completed ? "success" : "warning"}
            className="mt-3 text-center w-full"
          >
            {student.profile_completed ? "Profile Completed" : "Pending Setup"}
          </Chip>
        </div>

        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Student ID" value={student.student_id} isReadOnly />
            <Input label="First Name" value={student.first_name} isReadOnly />
            <Input label="Last Name" value={student.last_name} isReadOnly />
            <Input label="Email" value={student.user_email} isReadOnly />
            <Input label="Phone" value={student.phone} isReadOnly />
            <Input label="Batch" value={student.batch} isReadOnly />
            <Input label="Address" value={student.user_address} isReadOnly />
            <Input label="Birthday" value={formatDate(student.birthday)} isReadOnly />
            <Input label="ID Number" value={student.id_number} isReadOnly />
            <Input label="GID" value={student.gid || "N/A"} isReadOnly />
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Joined Date</p>
            <p>{formatDate(student.create_at)}</p>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Additional Info</p>
            <p>{student.additional_info || "No extra information available."}</p>
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="flat" onPress={() => router.back()}>
              Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
