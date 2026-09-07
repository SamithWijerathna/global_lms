"use client";

import React, { useState, useEffect } from "react";
import { RadioGroup, Radio } from "@heroui/radio";
import { Card } from "@heroui/card";
import { Spinner } from "@heroui/spinner";
import { Building2, Upload, AlertCircle } from "lucide-react";

export interface BankAccount {
  id: number;
  uuid: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch_name?: string;
  account_type?: string;
  instructions?: string;
  is_active: number;
  display_order: number;
}

interface BankTransferSectionProps {
  bankChoice: string;
  setBankChoice: (choice: string) => void;
  file: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  preview: string | null;
  uploading?: boolean;
}

export default function BankTransferSection({
  bankChoice,
  setBankChoice,
  file,
  onFileChange,
  preview,
  uploading = false,
}: BankTransferSectionProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchAccounts() {
      try {
        setLoading(true);
        const res = await fetch("/api/bank-accounts");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data)) {
            setBankAccounts(data);
            // If accounts exist and current selection is empty or invalid, select the first
            if (data.length > 0) {
              const matchesExisting = data.some((a) => a.bank_name === bankChoice);
              if (!matchesExisting) {
                setBankChoice(data[0].bank_name);
              }
            } else {
              setBankChoice("");
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch bank accounts:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchAccounts();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-default-500">Loading bank details...</p>
      </div>
    );
  }

  // NO FALLBACK ACCOUNTS when length === 0
  if (bankAccounts.length === 0) {
    return (
      <div className="bg-warning-50 border border-warning-200 text-warning-800 dark:bg-warning-900/20 dark:border-warning-800 dark:text-warning-300 p-5 rounded-large text-center flex flex-col items-center gap-3">
        <AlertCircle className="w-8 h-8 text-warning-500" />
        <div>
          <p className="font-semibold text-base">No Bank Accounts Available</p>
          <p className="text-xs text-default-500 mt-1">
            Bank transfer payments are currently unavailable. Please contact administration.
          </p>
        </div>
      </div>
    );
  }

  // Selected bank account object
  const selectedAccount =
    bankAccounts.find((a) => a.bank_name === bankChoice) || bankAccounts[0];

  return (
    <div className="flex flex-col gap-5">
      {/* Show selector only if there are MORE THAN 1 accounts */}
      {bankAccounts.length > 1 && (
        <RadioGroup
          label="Select Bank"
          value={selectedAccount.bank_name}
          onValueChange={(val) => setBankChoice(val)}
          orientation="horizontal"
          className="w-full"
        >
          {bankAccounts.map((account) => (
            <Radio key={account.id || account.uuid} value={account.bank_name}>
              <div className="flex items-center gap-2 font-medium">
                <Building2 className="w-4 h-4 text-primary" />
                {account.bank_name}
              </div>
            </Radio>
          ))}
        </RadioGroup>
      )}

      {/* Selected Bank Details Card */}
      {selectedAccount && (
        <Card className="bg-default-100 dark:bg-default-50/5 p-5 text-small gap-2">
          <p className="font-semibold text-base text-primary mb-1">
            {selectedAccount.bank_name}
          </p>
          <p>
            <strong>Account Name:</strong> {selectedAccount.account_name}
          </p>
          <p>
            <strong>Account Number:</strong> {selectedAccount.account_number}
          </p>
          {selectedAccount.branch_name && (
            <p>
              <strong>Branch:</strong> {selectedAccount.branch_name}
            </p>
          )}
          {selectedAccount.instructions && (
            <p className="mt-2 text-xs text-default-500 italic">
              <strong>Instructions:</strong> {selectedAccount.instructions}
            </p>
          )}
        </Card>
      )}

      {/* Upload Payment Receipt Dropzone */}
      <div>
        <p className="font-medium mb-3">Upload Payment Receipt</p>
        <label className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer bg-default-50 hover:bg-default-100 transition-colors overflow-hidden">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-12 h-12 text-default-400 mb-4" />
            <p className="mb-2 text-sm text-default-600">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-default-500">Image or PDF</p>
          </div>

          {preview && file?.type.startsWith("image/") && (
            <img
              src={preview}
              alt="Preview"
              className="absolute inset-0 w-full h-full object-contain p-2 bg-default-100/50 rounded-xl"
            />
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
            onChange={onFileChange}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
}
