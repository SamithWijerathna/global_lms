"use client";

import React, { useState, useEffect } from "react";
import { RadioGroup, Radio } from "@heroui/radio";
import { Card } from "@heroui/card";
import { Spinner } from "@heroui/spinner";
import { Building2, Upload, AlertCircle, CheckCircle2, FileText, RefreshCw } from "lucide-react";

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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.size > 8 * 1024 * 1024) {
      alert("Receipt file size exceeds the 8MB limit. Please choose a file smaller than 8MB.");
      e.target.value = "";
      return;
    }
    onFileChange(e);
  };

  return (
    <div className="flex flex-col gap-4">
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
              <div className="flex items-center gap-2 font-medium text-sm">
                <Building2 className="w-4 h-4 text-primary" />
                {account.bank_name}
              </div>
            </Radio>
          ))}
        </RadioGroup>
      )}

      {/* Selected Bank Details Card */}
      {selectedAccount && (
        <Card className="bg-default-100 dark:bg-default-50/5 p-4 text-small gap-1.5 border border-default-200/50">
          <p className="font-semibold text-base text-primary">
            {selectedAccount.bank_name}
          </p>
          <p className="text-xs md:text-sm">
            <strong>Account Name:</strong> {selectedAccount.account_name}
          </p>
          <p className="text-xs md:text-sm">
            <strong>Account Number:</strong> {selectedAccount.account_number}
          </p>
          {selectedAccount.branch_name && (
            <p className="text-xs md:text-sm">
              <strong>Branch:</strong> {selectedAccount.branch_name}
            </p>
          )}
          {selectedAccount.instructions && (
            <p className="mt-1 text-xs text-default-500 italic">
              <strong>Instructions:</strong> {selectedAccount.instructions}
            </p>
          )}
        </Card>
      )}

      {/* Upload Payment Receipt Dropzone */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="font-medium text-sm">Upload Payment Receipt</p>
          <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
            Max 8MB • Auto WebP
          </span>
        </div>
        <label className={`relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all overflow-hidden ${
          file
            ? "border-success-400 bg-success-50/20 dark:bg-success-950/20"
            : "border-default-300 hover:border-primary bg-default-50 hover:bg-default-100 dark:bg-default-50/5"
        }`}>
          {!file ? (
            <div className="flex flex-col items-center justify-center p-4 text-center">
              <Upload className="w-9 h-9 text-primary/80 mb-2" />
              <p className="text-sm text-default-700 font-medium mb-0.5">
                <span className="text-primary font-semibold">Click to upload receipt</span> or drag and drop
              </p>
              <p className="text-xs text-default-400">JPG, PNG, WebP or PDF (Max 8MB, auto-optimized)</p>
            </div>
          ) : (
            <div className="relative w-full h-full p-3 flex items-center gap-4 bg-content1/90 backdrop-blur-sm">
              {preview && file.type.startsWith("image/") ? (
                <img
                  src={preview}
                  alt="Receipt Preview"
                  className="w-24 h-full object-cover rounded-lg border border-default-200 shadow-sm"
                />
              ) : (
                <div className="w-24 h-full bg-default-200/50 rounded-lg flex flex-col items-center justify-center text-default-600">
                  <FileText className="w-8 h-8 mb-1 text-primary" />
                  <span className="text-[10px] font-bold uppercase">PDF File</span>
                </div>
              )}

              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-1.5 text-success font-semibold text-xs md:text-sm mb-1">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Receipt Attached</span>
                </div>
                <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                <p className="text-[11px] text-default-400 mt-0.5">{formatFileSize(file.size)}</p>
                <div className="mt-2 flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                  <RefreshCw className="w-3 h-3" />
                  <span>Click to change file</span>
                </div>
              </div>
            </div>
          )}

          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
}
