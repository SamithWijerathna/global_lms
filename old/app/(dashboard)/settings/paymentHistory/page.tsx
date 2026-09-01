"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/src/lib/useAuth";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  getKeyValue,
} from "@heroui/react";

interface Payment {
  id: number;
  payment_uuid: string;
  student_uuid: string;
  amount: number;
  item_type: string;
  item_id: string;
  bank: string;
  transaction_proof: string;
  status: string;
  approved_at: string | null;
  created_at: string;
}

const columns = [
  { key: "amount", label: "AMOUNT" },
  { key: "item_type", label: "ITEM TYPE" },
  { key: "item_id", label: "ITEM ID" },
  { key: "bank", label: "BANK" },
  { key: "status", label: "STATUS" },
  { key: "approved_at", label: "APPROVED AT" },
  { key: "created_at", label: "CREATED AT" },
  { key: "proof", label: "PROOF" },
];

const formatDateTime = (isoString: string | null | undefined): string => {
  if (!isoString || isoString.trim() === "") return "Pending";
  
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Invalid Date";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatAmount = (amount: number): string => {
  return amount.toLocaleString();
};

export default function PaymentsPage() {
  const { user, loading } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 8;

  useEffect(() => {
    const userUuid = user?.uuid;
    if (!userUuid) return;

    async function fetchPayments() {
      try {
        console.log("Fetching payments for user:", userUuid);
        const res = await fetch("/api/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "user_payments",
            student_uuid: userUuid,
          }),
        });
        const data = await res.json();
        console.log("Payments API response:", data);
        if (Array.isArray(data)) {
          setPayments(data);
        } else {
          setPayments([]);
        }
      } catch (err) {
        console.error("Failed to fetch payments", err);
        setPayments([]);
      }
      setFetching(false);
    }
    fetchPayments();
  }, [user?.uuid]);

  const filteredPayments = payments.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.amount.toString().includes(searchTerm) ||
      p.item_type.toLowerCase().includes(term) ||
      p.item_id.toLowerCase().includes(term) ||
      p.bank.toLowerCase().includes(term) ||
      p.status.toLowerCase().includes(term) ||
      (p.approved_at && p.approved_at.toLowerCase().includes(term)) ||
      p.created_at.toLowerCase().includes(term)
    );
  });

  const sortedPayments = useMemo(() => {
    return [...filteredPayments].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [filteredPayments]);

  const rows = sortedPayments.map((p) => ({
    key: p.payment_uuid,
    amount: p.amount,
    item_type: p.item_type,
    item_id: p.item_id,
    bank: p.bank,
    status: p.status,
    approved_at: formatDateTime(p.approved_at),
    created_at: formatDateTime(p.created_at),
    proof: p.transaction_proof,
  }));

  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }, [rows, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const renderCell = (item: any, columnKey: React.Key) => {
    const cellValue = getKeyValue(item, columnKey as string);

    if (columnKey === "proof") {
      return item.proof ? (
        <a
          href={`/${item.proof}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 underline hover:opacity-80"
        >
          View
        </a>
      ) : (
        <span className="text-gray-500 dark:text-gray-400">No proof</span>
      );
    }

    if (columnKey === "status") {
      const color =
        item.status.toLowerCase() === "approved"
          ? "text-green-600 dark:text-green-400"
          : item.status.toLowerCase() === "rejected"
          ? "text-red-600 dark:text-red-400"
          : "text-yellow-600 dark:text-yellow-400";
      return <span className={`font-medium ${color}`}>{item.status.toUpperCase()}</span>;
    }

    if (columnKey === "amount") {
      return <span className="font-medium">{formatAmount(item.amount)}</span>;
    }

    return cellValue;
  };

  if (loading || fetching) return <div className="p-8 text-center">Loading payments...</div>;
  if (!user) return <div className="p-8 text-center text-red-500">Not logged in</div>;

  return (
    <div className="mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow mt-8">
      <h2 className="text-2xl font-bold mb-6">My Payments</h2>

      <div className="mb-6 max-w-md">
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by amount, type, ID, bank, status, date..."
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {sortedPayments.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {searchTerm ? "No matching payments found." : "No payments found."}
        </div>
      ) : (
        <>
          <Table aria-label="My payments table">
            <TableHeader columns={columns}>
              {(column) => (
                <TableColumn key={column.key} className="text-left">
                  {column.label}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody items={paginatedRows}>
              {(item) => (
                <TableRow key={item.key}>
                  {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="mt-6 flex justify-center">
            <Pagination
              page={currentPage}
              total={totalPages}
              onChange={setCurrentPage}
              showControls
            />
          </div>
        </>
      )}
    </div>
  );
}