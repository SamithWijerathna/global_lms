'use client';

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Image } from "@heroui/image";
import { Skeleton } from "@heroui/skeleton";
import { Progress } from "@heroui/progress";
import { Input } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { Pagination } from "@heroui/pagination";
import { User } from "@heroui/user";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { Select, SelectItem } from "@heroui/select";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";

import {
  VerticalDotsIcon,
  EditDocumentIcon,
  DeleteDocumentIcon,
} from "@/components/admin/icons";
import { useConfirm } from "@/components/admin/GlobalConfirm";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Mark = {
  id: number;
  student_uuid: string;
  student_id: string | null;
  first_name: string | null;
  last_name: string | null;
  batch: string | null;
  paper_id: string;
  paper_name: string | null;
  paper_cover_image: string | null;
  mark_a: number;
  mark_b: number;
  create_at: string;
};
const columns = [
  { name: "STUDENT", uid: "student" },
  { name: "PAPER", uid: "paper" },
  { name: "MCQ", uid: "mark_a", sortable: true },
  { name: "ESSAY", uid: "mark_b", sortable: true },
  { name: "TOTAL", uid: "total", sortable: true },
  { name: "DATE", uid: "date", sortable: true },
  { name: "ACTIONS", uid: "actions" },
];

export default function MarksManagementPage() {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterStudent, setFilterStudent] = useState("");
  const [filterPaper, setFilterPaper] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [sortDescriptor, setSortDescriptor] = useState<any>({
    column: "date",
    direction: "descending",
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Mark | null>(null);
  const [editA, setEditA] = useState(0);
  const [editB, setEditB] = useState(0);

  const confirm = useConfirm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, sRes, pRes] = await Promise.all([
        fetch("/api/marks", {
          headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
        }),
        fetch("/api/admin/students", {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}`,
          },
        }),
        fetch("/api/papers", {
          headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
        }),
      ]);

      if (mRes.ok) setMarks(await mRes.json());
      if (sRes.ok) setStudents(await sRes.json());
      if (pRes.ok) setPapers(await pRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filterStudent, filterPaper, searchTerm]);

  /* ---------------------------------------------------------------------- */
  /*                                 HELPERS                                  */
  /* ---------------------------------------------------------------------- */
  const studentName = (m: Mark) =>
    [m.student_id, m.first_name, m.last_name].filter(Boolean).join(" - ") ||
    "Unknown";

  /* ---------------------------------------------------------------------- */
  /*                                 FILTERING                                */
  /* ---------------------------------------------------------------------- */
  const filtered = useMemo(() => {
    return marks.filter((m) => {
      if (filterStudent && m.student_uuid !== filterStudent) return false;
      if (filterPaper && m.paper_id !== filterPaper) return false;
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        if (
          !studentName(m).toLowerCase().includes(t) &&
          !(m.paper_name || "").toLowerCase().includes(t)
        )
          return false;
      }
      return true;
    });
  }, [marks, filterStudent, filterPaper, searchTerm]);

  /* ---------------------------------------------------------------------- */
  /*                                 ANALYTICS                                */
  /* ---------------------------------------------------------------------- */
  const totalRecords = filtered.length;
  const totalStudents = new Set(filtered.map((m) => m.student_uuid)).size;

  const totalScores = filtered.map((m) => m.mark_a + m.mark_b);
  const averageTotal = totalRecords > 0 ? totalScores.reduce((a, b) => a + b, 0) / totalRecords : 0;
  const highestScore = totalRecords > 0 ? Math.max(...totalScores, 0) : 0;
  const lowestScore = totalRecords > 0 ? (totalScores.length ? Math.min(...totalScores) : 0) : 0;

  const avgMCQ = filtered.reduce((s, m) => s + m.mark_a, 0) / (filtered.length || 1);
  const avgEssay = filtered.reduce((s, m) => s + m.mark_b, 0) / (filtered.length || 1);

  const passCount = filtered.filter((m) => m.mark_a + m.mark_b >= 50).length;
  const passRate = totalRecords > 0 ? (passCount / totalRecords) * 100 : 0;

  /* ----------------------------- Grade Distribution ----------------------------- */
  const gradeBands = [
    { range: "90-100", min: 90, max: 101 },
    { range: "80-89", min: 80, max: 90 },
    { range: "70-79", min: 70, max: 80 },
    { range: "60-69", min: 60, max: 70 },
    { range: "50-59", min: 50, max: 60 },
    { range: "Below 50", min: 0, max: 50 },
  ];

  const gradeCounts = gradeBands.map((band) => ({
    ...band,
    count: filtered.filter((m) => {
      const total = m.mark_a + m.mark_b;
      return total >= band.min && total < band.max;
    }).length,
  }));

  /* ----------------------------- Performance Trend ----------------------------- */
  const dailyData = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();

    filtered.forEach((m) => {
      const dateKey = new Date(m.create_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (!map.has(dateKey)) {
        map.set(dateKey, { sum: 0, count: 0 });
      }
      const entry = map.get(dateKey)!;
      entry.sum += m.mark_a + m.mark_b;
      entry.count += 1;
    });

    const data = Array.from(map.entries(), ([date, { sum, count }]) => ({
      date,
      average: sum / count,
    }));

    data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return data;
  }, [filtered]);

  /* ---------------------------------------------------------------------- */
  /*                                  SORTING                                 */
  /* ---------------------------------------------------------------------- */
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let x = 0;
      let y = 0;
      switch (sortDescriptor.column) {
        case "mark_a":
          x = a.mark_a;
          y = b.mark_a;
          break;
        case "mark_b":
          x = a.mark_b;
          y = b.mark_b;
          break;
        case "total":
          x = a.mark_a + a.mark_b;
          y = b.mark_a + b.mark_b;
          break;
        case "date":
          x = new Date(a.create_at).getTime();
          y = new Date(b.create_at).getTime();
          break;
      }
      return sortDescriptor.direction === "descending" ? y - x : x - y;
    });
  }, [filtered, sortDescriptor]);

  /* ---------------------------------------------------------------------- */
  /*                                PAGINATION                                */
  /* ---------------------------------------------------------------------- */
  const pages = Math.ceil(sorted.length / pageSize);
  const items = sorted.slice((page - 1) * pageSize, page * pageSize);

  /* ---------------------------------------------------------------------- */
  /*                                CELL RENDER                               */
  /* ---------------------------------------------------------------------- */
  const renderCell = (m: Mark, key: React.Key) => {
    switch (key) {
      case "student":
        return (
          <User
            name={studentName(m)}
            description={m.batch || undefined}
          />
        );
      case "paper":
        return (
          <div className="flex items-center gap-3">
            {m.paper_cover_image && (
              <Image
                alt={m.paper_name || "Paper"}
                className="w-10 h-10 object-cover rounded"
                src={m.paper_cover_image}
              />
            )}
            <span>{m.paper_name || m.paper_id}</span>
          </div>
        );
      case "mark_a":
        return m.mark_a.toFixed(1);
      case "mark_b":
        return m.mark_b.toFixed(1);
      case "total":
        return (
          <Chip
            color={(m.mark_a + m.mark_b) >= 50 ? "success" : "danger"}
            variant="flat"
          >
            {(m.mark_a + m.mark_b).toFixed(1)}
          </Chip>
        );
      case "date":
        return new Date(m.create_at).toLocaleDateString();
      case "actions":
        return (
          <Dropdown>
            <DropdownTrigger>
              <Button isIconOnly variant="light">
                <VerticalDotsIcon className="text-default-400" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Actions">
              <DropdownItem
                key="edit"
                startContent={<EditDocumentIcon />}
                onPress={() => {
                  setEditing(m);
                  setEditA(m.mark_a);
                  setEditB(m.mark_b);
                  setEditOpen(true);
                }}
              >
                Edit
              </DropdownItem>
              <DropdownItem
                key="delete"
                startContent={<DeleteDocumentIcon />}
                color="danger"
                onPress={() =>
                  confirm({
                    title: "Delete mark?",
                    message: "This action cannot be undone.",
                    confirmColor: "danger",
                    confirmText: "Delete",
                    onConfirm: async () => {
                      await fetch(`/api/marks?id=${m.id}`, { headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` }, method: "DELETE" });
                      fetchData();
                    },
                  })
                }
              >
                Delete
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        );
      default:
        return null;
    }
  };

  /* ---------------------------------------------------------------------- */
  /*                                  RENDER                                  */
  /* ---------------------------------------------------------------------- */
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="container p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Marks Management</h1>
        <Button color="primary" as={Link} href="/admin/papers/marks/add">
          Add Mark
        </Button>
      </div>

      {/* -------------------------- Summary Analytics -------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardBody className="text-center">
            <p className="text-sm text-default-500">Total Records</p>
            <p className="text-2xl font-bold">{totalRecords}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-sm text-default-500">Average Total</p>
            <p className="text-2xl font-bold">{averageTotal.toFixed(2)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-sm text-default-500">Highest Score</p>
            <p className="text-2xl font-bold">{highestScore.toFixed(2)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-sm text-default-500">Lowest Score</p>
            <p className="text-2xl font-bold">{lowestScore.toFixed(2)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-sm text-default-500">Avg MCQ (Part A)</p>
            <p className="text-2xl font-bold">{avgMCQ.toFixed(2)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-sm text-default-500">Avg Essay (Part B)</p>
            <p className="text-2xl font-bold">{avgEssay.toFixed(2)}</p>
          </CardBody>
        </Card>
      </div>

      {/* -------------------------- Grade Distribution -------------------------- */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-6">Grade Distribution</h2>
        <div className="space-y-5 w-full">
          {gradeCounts.map((band) => {
            const percentage = totalRecords > 0 ? (band.count / totalRecords) * 100 : 0;
            let color: "primary" | "success" | "warning" | "danger" = "primary";
            if (band.min >= 80) color = "success";
            else if (band.min >= 60) color = "warning";
            else if (band.min >= 50) color = "primary";
            else color = "danger";

            return (
              <div key={band.range}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">
                    {band.range}: {band.count} students
                  </span>
                  <span>{percentage.toFixed(0)}%</span>
                </div>
                <Progress value={percentage} color={color} />
              </div>
            );
          })}
        </div>
      </div>

      {/* -------------------------- Performance Trend Chart -------------------------- */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-6">Overall Performance Trend</h2>
        {dailyData.length > 1 ? (
              <Card>
      <CardBody>
          <div className="rounded-lg p-4">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value?: number) => value?.toFixed(2) || "0.00"} />
                <Line
                  type="monotone"
                  dataKey="average"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ fill: "#2563eb" }}
                  name="Average Total Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          </CardBody>
            </Card>
        ) : (
          <Card>
            <CardBody>
              <p className="text-default-500">Not enough data points to display a trend chart.</p>
            </CardBody>
          </Card>
        )}
        
      </div>

      {/* -------------------------- Filters -------------------------- */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input
          placeholder="Search student or paper..."
          value={searchTerm}
          onValueChange={setSearchTerm}
          className="max-w-sm"
        />
        <Select
          placeholder="All Students"
          selectedKeys={filterStudent ? [filterStudent] : []}
          onSelectionChange={(keys) => setFilterStudent(Array.from(keys)[0] as string || "")}
          className="max-w-xs"
        >
          {([
            <SelectItem key="all_students">All Students</SelectItem>,
            ...students.map((s: any) => (
              <SelectItem key={s.uuid || s.student_uuid}>
                {s.student_id} - {s.first_name} {s.last_name}
              </SelectItem>
            ))
          ] as any[])}
        </Select>
        <Select
          placeholder="All Papers"
          selectedKeys={filterPaper ? [filterPaper] : []}
          onSelectionChange={(keys) => setFilterPaper(Array.from(keys)[0] as string || "")}
          className="max-w-xs"
        >
          {([
            <SelectItem key="all_papers">All Papers</SelectItem>,
            ...papers.map((p: any) => (
              <SelectItem key={p.id || p.paper_id}>{p.paper_name || p.paper_id}</SelectItem>
            ))
          ] as any[])}
        </Select>
      </div>

      {/* -------------------------- Table -------------------------- */}
      <div className="overflow-x-auto w-full">
        <Table
          aria-label="Marks table"
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
        >
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn
                key={column.uid}
                allowsSorting={column.sortable}
              >
                {column.name}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody items={items}>
            {(item) => (
              <TableRow key={item.id}>
                {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination
            total={pages}
            page={page}
            onChange={setPage}
          />
        </div>
      )}

      {/* -------------------------- Edit Modal -------------------------- */}
      <Modal isOpen={editOpen} onOpenChange={setEditOpen}>
        <ModalContent>
          <ModalHeader>Edit Marks</ModalHeader>
          <ModalBody>
            <Input
              label="MCQ Mark (Part A)"
              type="number"
              value={editA.toString()}
              onValueChange={(v) => setEditA(Number(v))}
            />
            <Input
              label="Essay Mark (Part B)"
              type="number"
              value={editB.toString()}
              onValueChange={(v) => setEditB(Number(v))}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={async () => {
                if (!editing) return;
                await fetch(`/api/marks/${editing.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ mark_a: editA, mark_b: editB }),
                });
                setEditOpen(false);
                fetchData();
              }}
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}