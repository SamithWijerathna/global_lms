"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Chip } from "@heroui/chip";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";

interface DomainRecord {
  id: string;
  domain: string;
  type: "subdomain" | "custom_domain";
  cnameTarget: string;
  verificationToken: string;
  isVerified: number;
  isPrimary: number;
  sslStatus: "pending" | "active" | "failed";
  lastCheckedAt?: string;
  createdAt: string;
}

import { getBackendApiUrl } from "@/src/lib/apiConfig";

export function DomainSettingsTab() {
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationFeedback, setVerificationFeedback] = useState<{ id: string; message: string; verified: boolean } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchDomains = async () => {
    setLoading(true);
    const apiUrl = getBackendApiUrl();
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${apiUrl}/api/v1/domains`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": "oxford", // fallback context for demo
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setDomains(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch domains:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    setAdding(true);
    setVerificationFeedback(null);
    const apiUrl = getBackendApiUrl();
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${apiUrl}/api/v1/domains`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": "oxford",
        },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewDomain("");
        fetchDomains();
      } else {
        alert(data.error?.message || "Failed to add domain.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to connect to server.");
    } finally {
      setAdding(false);
    }
  };

  const handleVerifyDomain = async (domain: DomainRecord) => {
    setVerifyingId(domain.id);
    setVerificationFeedback(null);
    const apiUrl = getBackendApiUrl();
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${apiUrl}/api/v1/domains/${domain.id}/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": "oxford",
        },
      });
      const data = await res.json();
      if (data.success) {
        setVerificationFeedback({
          id: domain.id,
          message: data.data?.message || "Verification check complete.",
          verified: !!data.data?.verified,
        });
        fetchDomains();
      } else {
        setVerificationFeedback({
          id: domain.id,
          message: data.error?.message || "Verification failed.",
          verified: false,
        });
      }
    } catch (err: any) {
      setVerificationFeedback({
        id: domain.id,
        message: err.message || "Network check failed.",
        verified: false,
      });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleSetPrimary = async (domainId: string) => {
    const apiUrl = getBackendApiUrl();
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${apiUrl}/api/v1/domains/${domainId}/primary`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": "oxford",
        },
      });
      const data = await res.json();
      if (data.success) {
        fetchDomains();
      } else {
        alert(data.error?.message || "Failed to update primary domain.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to set primary domain.");
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm("Are you sure you want to remove this custom domain?")) return;
    const apiUrl = getBackendApiUrl();
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${apiUrl}/api/v1/domains/${domainId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": "oxford",
        },
      });
      const data = await res.json();
      if (data.success) {
        fetchDomains();
      } else {
        alert(data.error?.message || "Failed to delete domain.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete domain.");
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Info Card */}
      <Card>
        <CardHeader>
          <div>
            <h2 className="text-2xl font-bold">Custom Domains & BYOD Routing</h2>
            <p className="text-sm text-default-500 mt-1">
              Connect your own academy domain (e.g. <code>lms.yourinstitution.com</code>) using DNS CNAME records.
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* Add Domain Form */}
          <form onSubmit={handleAddDomain} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
            <Input
              placeholder="e.g. lms.myacademy.com"
              value={newDomain}
              onValueChange={setNewDomain}
              label="Connect Custom Domain"
              className="flex-1"
            />
            <Button
              color="primary"
              type="submit"
              isLoading={adding}
              className="sm:self-end h-14"
            >
              Add Domain
            </Button>
          </form>

          {/* DNS Instructions Banner */}
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
            <h4 className="font-semibold text-primary text-sm flex items-center gap-2">
              <span>📋</span> DNS Setup Instructions for Bring Your Own Domain (BYOD)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-background rounded-lg border border-default-200">
                <span className="font-bold text-foreground block mb-1">Option 1: CNAME Record (Recommended)</span>
                <p className="text-default-500 mb-2">Point your subdomain to our LMS cluster:</p>
                <div className="flex items-center justify-between bg-default-100 p-2 rounded font-mono">
                  <span>cname.lms.circleone.asia</span>
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => copyToClipboard("cname.lms.circleone.asia", "cname")}
                  >
                    {copiedField === "cname" ? "✓ Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-background rounded-lg border border-default-200">
                <span className="font-bold text-foreground block mb-1">Option 2: TXT Verification Record</span>
                <p className="text-default-500 mb-2">Or add a TXT verification challenge record:</p>
                <div className="flex items-center justify-between bg-default-100 p-2 rounded font-mono truncate">
                  <span className="truncate">globallms-verification=&lt;token&gt;</span>
                  <span className="text-default-400 text-[10px]">Auto-generated</span>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Feedback Banner */}
          {verificationFeedback && (
            <div
              className={`p-4 rounded-xl border text-sm ${
                verificationFeedback.verified
                  ? "bg-success/10 border-success/30 text-success"
                  : "bg-warning/10 border-warning/30 text-warning"
              }`}
            >
              <div className="font-semibold mb-1">
                {verificationFeedback.verified ? "✅ Verification Succeeded" : "⏳ DNS Propagation In Progress"}
              </div>
              <p>{verificationFeedback.message}</p>
            </div>
          )}

          {/* Domains Table */}
          <div className="overflow-x-auto w-full">
            <Table aria-label="Domains Table" isStriped>
              <TableHeader>
                <TableColumn>DOMAIN</TableColumn>
                <TableColumn>TYPE</TableColumn>
                <TableColumn>DNS TARGET / CNAME</TableColumn>
                <TableColumn>STATUS</TableColumn>
                <TableColumn>SSL STATUS</TableColumn>
                <TableColumn>ACTIONS</TableColumn>
              </TableHeader>
              <TableBody
                isLoading={loading}
                emptyContent="No domains configured yet. Add your first domain above."
              >
                {domains.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-semibold">
                        <span>{d.domain}</span>
                        {d.isPrimary === 1 && (
                          <Chip size="sm" color="primary" variant="solid">
                            Primary
                          </Chip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-xs text-default-600">
                        {d.type.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs font-mono bg-default-100 px-2 py-1 rounded">
                        {d.cnameTarget}
                      </code>
                    </TableCell>
                    <TableCell>
                      {d.isVerified ? (
                        <Chip size="sm" color="success" variant="flat">
                          ✓ Verified
                        </Chip>
                      ) : (
                        <Chip size="sm" color="warning" variant="flat">
                          Pending DNS
                        </Chip>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={d.sslStatus === "active" ? "success" : "default"}
                        variant="dot"
                      >
                        {d.sslStatus}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {d.type === "custom_domain" && (
                          <Button
                            size="sm"
                            color="primary"
                            variant="flat"
                            isLoading={verifyingId === d.id}
                            onPress={() => handleVerifyDomain(d)}
                          >
                            Verify DNS
                          </Button>
                        )}
                        {d.isVerified === 1 && d.isPrimary === 0 && (
                          <Button
                            size="sm"
                            variant="light"
                            onPress={() => handleSetPrimary(d.id)}
                          >
                            Set Primary
                          </Button>
                        )}
                        {d.type === "custom_domain" && (
                          <Button
                            size="sm"
                            color="danger"
                            variant="light"
                            onPress={() => handleDeleteDomain(d.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
