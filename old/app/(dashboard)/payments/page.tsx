"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/src/lib/useAuth";

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
    approved_at: string;
    created_at: string;
}

export default function PaymentsPage() {
    const { user, loading } = useAuth();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (!user) return;
        async function fetchPayments() {
            try {
                console.log("Fetching payments for user:", user.uuid);
                const res = await fetch("/api/payment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "user_payments",
                        student_uuid: user.uuid
                    })
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
    }, [user]);

    if (loading || fetching) return <div className="p-8 text-center">Loading payments...</div>;
    if (!user) return <div className="p-8 text-center text-red-500">Not logged in</div>;

    return (
        <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow mt-8">
            <h2 className="text-2xl font-bold mb-6">My Payments</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full border">
                    <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800">
                            <th className="px-3 py-2 border">Amount</th>
                            <th className="px-3 py-2 border">Item Type</th>
                            <th className="px-3 py-2 border">Item ID</th>
                            <th className="px-3 py-2 border">Bank</th>
                            <th className="px-3 py-2 border">Status</th>
                            <th className="px-3 py-2 border">Approved At</th>
                            <th className="px-3 py-2 border">Created At</th>
                            <th className="px-3 py-2 border">Proof</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payments.map((p) => (
                            <tr key={p.id}>
                                <td className="px-3 py-2 border">{p.amount}</td>
                                <td className="px-3 py-2 border">{p.item_type}</td>
                                <td className="px-3 py-2 border">{p.item_id}</td>
                                <td className="px-3 py-2 border">{p.bank}</td>
                                <td className="px-3 py-2 border">{p.status}</td>
                                <td className="px-3 py-2 border">{p.approved_at}</td>
                                <td className="px-3 py-2 border">{p.created_at}</td>
                                <td className="px-3 py-2 border">
                                    <a href={`/${p.transaction_proof}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                        View
                                    </a>
                                </td>
                            </tr>
                        ))}
                        {payments.length === 0 && (
                            <tr>
                                <td colSpan={8} className="text-center py-4">No payments found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
