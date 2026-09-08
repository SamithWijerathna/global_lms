"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/src/lib/useAuth";
import { Pagination } from "@heroui/react";

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
        const res = await fetch("/api/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "user_payments",
            student_uuid: userUuid,
          }),
        });
        const data = await res.json();
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

  const renderCell = (item: any, columnKey: string) => {
    if (columnKey === "proof") {
      return item.proof ? (
        <a
          href={`/${item.proof}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:opacity-80 font-medium"
        >
          View
        </a>
      ) : (
        <span className="text-muted-foreground">No proof</span>
      );
    }

    if (columnKey === "status") {
      const color =
        item.status.toLowerCase() === "approved"
          ? "text-emerald-600 dark:text-emerald-400 font-semibold"
          : item.status.toLowerCase() === "rejected"
          ? "text-rose-600 dark:text-rose-400 font-semibold"
          : "text-amber-600 dark:text-amber-400 font-semibold";
      return <span className={color}>{item.status.toUpperCase()}</span>;
    }

    if (columnKey === "amount") {
      return <span className="font-semibold">{formatAmount(item.amount)}</span>;
    }

    return item[columnKey];
  };

  if (loading || fetching) {
    return (
      <div className="w-full space-y-6 pb-12">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-left">
          Payment History
        </h1>
        <div className="w-full h-80 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading payment history...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full space-y-6 pb-12">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-left">
          Payment History
        </h1>
        <div className="w-full h-80 flex items-center justify-center">
          <p className="text-sm text-rose-500 font-medium">Not logged in</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-left">
        Payment History
      </h1>

      <div className="max-w-md">
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by amount, type, ID, bank, status, date..."
          className="w-full px-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
        />
      </div>

      {sortedPayments.length === 0 ? (
        <div className="min-h-[40vh] flex items-center justify-center text-center">
          <p className="text-sm sm:text-base text-muted-foreground font-medium">
            {searchTerm ? "No matching payments found." : "No payment history available."}
          </p>
        </div>
      ) : (
        <>
          <div className="relative w-full overflow-auto rounded-lg border border-border bg-card shadow-sm">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b bg-muted/50">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="h-10 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0 divide-y divide-border">
                {paginatedRows.map((item) => (
                  <tr
                    key={item.key}
                    className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                  >
                    {columns.map((column) => (
                      <td key={column.key} className="p-4 align-middle whitespace-nowrap">
                        {renderCell(item, column.key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination
                page={currentPage}
                total={totalPages}
                onChange={setCurrentPage}
                showControls
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}