"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Chip } from "@heroui/chip";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";

import { getBackendApiUrl } from "@/src/lib/apiConfig";

interface TenantItem {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  plan: string;
  monthlyPrice: string;
  status: string;
  dbName: string;
  maxStorageMb?: number;
  maxMediaStorageGb?: number;
  primaryDomain?: string;
  domainVerified?: number;
  licenseKey?: string;
  createdAt: string;
}

export default function SaaSAdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState("");
  const [adminEmail, setAdminEmail] = useState("0wsamithaw0@gmail.com");
  const [adminPassword, setAdminPassword] = useState("Samith@071");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);

  // New Tenant Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [checkingDns, setCheckingDns] = useState(false);
  const [dnsStatus, setDnsStatus] = useState<{
    checked: boolean;
    verified: boolean;
    domainExists?: boolean;
    message: string;
    target: string;
    domain: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    plan: "Standard",
    monthlyPrice: "LKR 5,000",
    maxStorageMb: "500",
    maxMediaStorageGb: "10",
    customDomain: "",
    initialInvoiceAmount: "5000",
  });
  const [createdResult, setCreatedResult] = useState<any>(null);

  // Storage Quota Editing State
  const [editingStorageTenant, setEditingStorageTenant] = useState<TenantItem | null>(null);
  const [editLocalMb, setEditLocalMb] = useState(500);
  const [editMediaGb, setEditMediaGb] = useState(10);
  const [savingStorage, setSavingStorage] = useState(false);

  // Tenant Deletion State
  const [deletingTenant, setDeletingTenant] = useState<TenantItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [provisioningSslId, setProvisioningSslId] = useState<string | null>(null);

  const fetchTenants = async (authToken: string) => {
    setLoadingTenants(true);
    const apiUrl = getBackendApiUrl();
    try {
      const res = await fetch(`${apiUrl}/api/v1/saas-admin/tenants`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTenants(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch tenants:", err);
    } finally {
      setLoadingTenants(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    const apiUrl = getBackendApiUrl();
    try {
      const res = await fetch(`${apiUrl}/api/v1/saas-admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (data.success && data.data?.token) {
        setToken(data.data.token);
        setIsLoggedIn(true);
        fetchTenants(data.data.token);
      } else {
        setLoginError(data.error?.message || "Invalid credentials.");
      }
    } catch (err: any) {
      setLoginError(err.message || "Failed to connect to backend server.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleCheckCname = async () => {
    if (!formData.customDomain.trim()) {
      alert("Please enter a Custom Domain first (e.g. lms.myacademy.com).");
      return;
    }

    setCheckingDns(true);
    const apiUrl = getBackendApiUrl();
    try {
      const res = await fetch(`${apiUrl}/api/v1/saas-admin/check-cname`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domain: formData.customDomain }),
      });
      const data = await res.json();
      if (data.success) {
        setDnsStatus({
          checked: true,
          verified: !!data.data.verified,
          domainExists: !!data.data.domainExists,
          message: data.data.message || "",
          target: data.data.cnameTarget || "cname.lms.circleone.asia",
          domain: data.data.domain || formData.customDomain,
        });
      } else {
        setDnsStatus({
          checked: true,
          verified: false,
          domainExists: data.error?.code === "DOMAIN_EXISTS",
          message: data.error?.message || "Failed to verify CNAME.",
          target: "cname.lms.circleone.asia",
          domain: formData.customDomain,
        });
      }
    } catch (err: any) {
      setDnsStatus({
        checked: true,
        verified: false,
        domainExists: false,
        message: err.message || "Network error while checking DNS.",
        target: "cname.lms.circleone.asia",
        domain: formData.customDomain,
      });
    } finally {
      setCheckingDns(false);
    }
  };

  const handleCreateTenant = async (force: boolean = false) => {
    if (!formData.name || !formData.email || !formData.customDomain) {
      alert("Institute Name, Custom Domain, and Admin Email are required.");
      return;
    }

    if (!force && (!dnsStatus || !dnsStatus.verified)) {
      await handleCheckCname();
      return;
    }

    setCreating(true);
    const apiUrl = getBackendApiUrl();
    try {
      const res = await fetch(`${apiUrl}/api/v1/saas-admin/tenants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedResult(data.data);
        fetchTenants(token);
      } else {
        alert(data.error?.message || "Failed to create tenant.");
      }
    } catch (err: any) {
      alert(err.message || "Network error while provisioning tenant.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!deletingTenant) return;
    setDeleting(true);
    const apiUrl = getBackendApiUrl();
    try {
      const res = await fetch(`${apiUrl}/api/v1/saas-admin/tenants/${deletingTenant.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setDeletingTenant(null);
        fetchTenants(token);
      } else {
        alert(data.error?.message || "Failed to delete tenant.");
      }
    } catch (err: any) {
      alert(err.message || "Network error while deleting tenant.");
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenStorageModal = (t: TenantItem) => {
    setEditingStorageTenant(t);
    setEditLocalMb(t.maxStorageMb || 500);
    setEditMediaGb(t.maxMediaStorageGb || 10);
  };

  const handleUpdateStorage = async () => {
    if (!editingStorageTenant) return;
    setSavingStorage(true);
    const apiUrl = getBackendApiUrl();
    try {
      const res = await fetch(`${apiUrl}/api/v1/saas-admin/tenants/${editingStorageTenant.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          maxStorageMb: editLocalMb,
          maxMediaStorageGb: editMediaGb,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingStorageTenant(null);
        fetchTenants(token);
      } else {
        alert(data.error?.message || "Failed to update storage quotas.");
      }
    } catch (err: any) {
      alert(err.message || "Network error while updating storage quotas.");
    } finally {
      setSavingStorage(false);
    }
  };

  const handleProvisionSsl = async (tenantId: string) => {
    setProvisioningSslId(tenantId);
    const apiUrl = getBackendApiUrl();
    try {
      const res = await fetch(`${apiUrl}/api/v1/saas-admin/tenants/${tenantId}/provision-ssl`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "SSL certificate issued successfully!");
        fetchTenants(token);
      } else {
        alert(data.error?.message || "Failed to provision SSL.");
      }
    } catch (err: any) {
      alert(err.message || "Network error while provisioning SSL.");
    } finally {
      setProvisioningSslId(null);
    }
  };

  const resetModal = () => {
    setCreatedResult(null);
    setDnsStatus(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      phone: "",
      plan: "Standard",
      monthlyPrice: "LKR 5,000",
      customDomain: "",
      initialInvoiceAmount: "5000",
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md p-6 shadow-xl border border-default-200">
          <CardHeader className="flex flex-col gap-1 items-center pb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold mb-2">
              <img src="/assets/logo-icon.png" alt="Volit" className="w-8 h-8 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-center">Volit SaaS Admin</h1>
            <p className="text-sm text-default-500 text-center">
              Central Multi-Tenant & Domain Provisioning Control
            </p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="p-3 text-sm text-danger bg-danger/10 rounded-lg border border-danger/20">
                  {loginError}
                </div>
              )}
              <Input
                label="Super Admin Email"
                type="email"
                value={adminEmail}
                onValueChange={setAdminEmail}
                isRequired
              />
              <Input
                label="Master Password"
                type="password"
                value={adminPassword}
                onValueChange={setAdminPassword}
                isRequired
              />
              <Button
                color="primary"
                type="submit"
                className="w-full font-semibold"
                isLoading={loginLoading}
              >
                Sign In to SaaS Control Plane
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Institutes & Custom Domains</h1>
          <p className="text-sm text-default-500 mt-1">
            Provision isolated tenant databases and verify custom CNAME pointed domains.
          </p>
        </div>
        <div className="flex gap-3">
          <Button color="primary" onPress={() => { resetModal(); setModalOpen(true); }}>
            + Provision New Institute
          </Button>
          <Button variant="flat" color="danger" onPress={() => setIsLoggedIn(false)}>
            Sign Out
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="p-4 border border-default-200">
          <p className="text-sm text-default-500">Active Tenant Institutes</p>
          <h3 className="text-3xl font-bold mt-1 text-primary">{tenants.length}</h3>
        </Card>
        <Card className="p-4 border border-default-200">
          <p className="text-sm text-default-500">Volit Root Cluster</p>
          <h3 className="text-xl font-bold mt-2 font-mono">lms.circleone.asia</h3>
        </Card>
        <Card className="p-4 border border-default-200">
          <p className="text-sm text-default-500">CNAME Ingestion Target</p>
          <h3 className="text-xl font-bold mt-2 font-mono text-success">cname.lms.circleone.asia</h3>
        </Card>
      </div>

      {/* Tenant Table */}
      <Card className="border border-default-200">
        <CardHeader className="flex justify-between items-center px-6 py-4">
          <h2 className="text-xl font-semibold">Registered Volit Academies</h2>
          <Button size="sm" variant="light" onPress={() => fetchTenants(token)} isLoading={loadingTenants}>
            🔄 Refresh
          </Button>
        </CardHeader>
        <CardBody className="p-0">
          <Table aria-label="Tenant Institutes Table">
            <TableHeader>
              <TableColumn>INSTITUTE NAME</TableColumn>
              <TableColumn>CUSTOM DOMAIN</TableColumn>
              <TableColumn>DATABASE NAME</TableColumn>
              <TableColumn>ADMIN EMAIL</TableColumn>
              <TableColumn>PLAN / PRICE</TableColumn>
              <TableColumn>STORAGE QUOTAS</TableColumn>
              <TableColumn>DOMAIN STATUS</TableColumn>
              <TableColumn>CREATED DATE</TableColumn>
              <TableColumn align="center">ACTIONS</TableColumn>
            </TableHeader>
            <TableBody emptyContent={loadingTenants ? "Loading tenants..." : "No tenants found."}>
              {tenants.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-semibold">{t.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-default-100 px-2 py-1 rounded text-primary font-mono">
                      {t.primaryDomain || `${t.slug}.lms.circleone.asia`}
                    </code>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs text-default-600 font-mono">{t.dbName}</code>
                  </TableCell>
                  <TableCell>{t.email}</TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <span className="font-medium">{t.plan}</span>
                      <span className="text-default-400 block">{t.monthlyPrice}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-default-500 font-medium">📁 Local:</span>
                        <Chip size="sm" variant="flat" color="primary">
                          {t.maxStorageMb || 500} MB
                        </Chip>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-default-500 font-medium">☁️ Media:</span>
                        {t.maxMediaStorageGb && t.maxMediaStorageGb > 0 ? (
                          <Chip size="sm" variant="flat" color="secondary">
                            {t.maxMediaStorageGb} GB
                          </Chip>
                        ) : (
                          <Chip size="sm" variant="flat" color="default">
                            None (Embeds)
                          </Chip>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" color="success" variant="flat">
                      Active CNAME
                    </Chip>
                  </TableCell>
                  <TableCell className="text-xs text-default-500">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="center">
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        color="secondary"
                        variant="flat"
                        onPress={() => handleOpenStorageModal(t)}
                      >
                        ⚙️ Quotas
                      </Button>
                      <Button
                        size="sm"
                        color="primary"
                        variant="flat"
                        isLoading={provisioningSslId === t.id}
                        onPress={() => handleProvisionSsl(t.id)}
                      >
                        🔒 Provision SSL
                      </Button>
                      <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        onPress={() => setDeletingTenant(t)}
                      >
                        🗑️ Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Provisioning Modal */}
      <Modal isOpen={modalOpen} onOpenChange={setModalOpen} size="2xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <h3 className="text-xl font-bold">
                  {createdResult ? "Tenant Provisioned Successfully!" : "Provision New Institute Tenant"}
                </h3>
              </ModalHeader>
              <ModalBody className="space-y-4">
                {createdResult ? (
                  <div className="space-y-4 p-4 rounded-xl bg-success/10 border border-success/20">
                    <p className="font-semibold text-success text-base">
                      🎉 Isolated database schema and primary domain connected!
                    </p>
                    <div className="space-y-2 text-sm">
                      <p><strong>Institute:</strong> {createdResult.name}</p>
                      <p><strong>Primary Domain:</strong> <code className="bg-default-200 px-2 py-0.5 rounded font-mono">{createdResult.primaryDomain}</code></p>
                      <p><strong>Database:</strong> <code className="bg-default-200 px-2 py-0.5 rounded font-mono">{createdResult.dbName}</code></p>
                      <p><strong>Admin Email:</strong> {createdResult.adminEmail}</p>
                      <p><strong>Initial Password:</strong> <code className="bg-default-200 px-2 py-0.5 rounded font-bold">{createdResult.initialPassword}</code></p>
                      <p><strong>License Key:</strong> <code className="bg-default-200 px-2 py-0.5 rounded font-mono">{createdResult.licenseKey}</code></p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Institute / Business Name"
                        placeholder="e.g. Oxford Royal Academy"
                        value={formData.name}
                        onValueChange={(v) => setFormData({ ...formData, name: v })}
                        isRequired
                      />
                      <Input
                        label="Custom Domain (CNAME Pointed)"
                        placeholder="e.g. lms.oxfordacademy.lk"
                        description="Domain must have a CNAME pointing to cname.lms.circleone.asia"
                        value={formData.customDomain}
                        onValueChange={(v) => {
                          setFormData({ ...formData, customDomain: v });
                          setDnsStatus(null);
                        }}
                        isRequired
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Admin Email"
                        type="email"
                        placeholder="admin@oxford.lk"
                        value={formData.email}
                        onValueChange={(v) => setFormData({ ...formData, email: v })}
                        isRequired
                      />
                      <Input
                        label="Admin Initial Password"
                        type="text"
                        placeholder="Leave blank to auto-generate"
                        value={formData.password}
                        onValueChange={(v) => setFormData({ ...formData, password: v })}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Select
                        label="Subscription Plan"
                        selectedKeys={[formData.plan]}
                        onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                      >
                        <SelectItem key="Starter">Starter (LKR 5,000/mo)</SelectItem>
                        <SelectItem key="Standard">Standard (LKR 10,000/mo)</SelectItem>
                        <SelectItem key="Enterprise">Enterprise (LKR 25,000/mo)</SelectItem>
                      </Select>
                      <Input
                        label="Initial Invoice Amount (LKR)"
                        type="number"
                        placeholder="5000"
                        value={formData.initialInvoiceAmount}
                        onValueChange={(v) => setFormData({ ...formData, initialInvoiceAmount: v })}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl bg-default-50 border border-default-200">
                      <Input
                        label="📁 Local Storage Quota (MB)"
                        description="For user photos, receipts & covers (default: 500 MB)"
                        type="number"
                        placeholder="500"
                        value={formData.maxStorageMb}
                        onValueChange={(v) => setFormData({ ...formData, maxStorageMb: v })}
                      />
                      <Select
                        label="☁️ Cloud Media Quota (R2)"
                        description="For course videos, PDFs & materials"
                        selectedKeys={[formData.maxMediaStorageGb]}
                        onChange={(e) => setFormData({ ...formData, maxMediaStorageGb: e.target.value })}
                      >
                        <SelectItem key="0">0 GB (None - Embeds Only)</SelectItem>
                        <SelectItem key="10">10 GB (Standard)</SelectItem>
                        <SelectItem key="20">20 GB (+10 GB)</SelectItem>
                        <SelectItem key="50">50 GB (+40 GB)</SelectItem>
                        <SelectItem key="100">100 GB (Enterprise)</SelectItem>
                      </Select>
                    </div>

                    {/* CNAME Verification Guide & Check Section */}
                    {formData.customDomain.trim() && (
                      <div className="space-y-3 p-4 rounded-xl border border-default-200 bg-default-50">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <span>📡</span> CNAME Record Pre-check
                          </h4>
                          <Button
                            size="sm"
                            color={dnsStatus?.verified ? "success" : "primary"}
                            variant={dnsStatus?.verified ? "flat" : "solid"}
                            isLoading={checkingDns}
                            onPress={handleCheckCname}
                          >
                            {dnsStatus ? "🔄 Re-Check CNAME Connection" : "Verify CNAME Record"}
                          </Button>
                        </div>

                        {dnsStatus ? (
                          <div className={`p-3 rounded-lg border text-xs space-y-2 ${
                            dnsStatus.verified
                              ? "bg-success/10 border-success/30 text-success"
                              : "bg-warning/10 border-warning/30 text-warning"
                          }`}>
                            <div className="font-semibold flex items-center justify-between">
                              <span>{dnsStatus.verified ? "✅ CNAME Connection Verified!" : "❌ CNAME Record Not Pointed Yet"}</span>
                              <div className="flex gap-1">
                                {dnsStatus.domainExists && (
                                  <Chip size="sm" color="danger" variant="flat">
                                    Domain In Use
                                  </Chip>
                                )}
                                <Chip size="sm" color={dnsStatus.verified ? "success" : "warning"} variant="flat">
                                  {dnsStatus.verified ? "Connected" : "Action Required"}
                                </Chip>
                              </div>
                            </div>
                            <p>{dnsStatus.message}</p>

                            {!dnsStatus.verified && (
                              <div className="p-3 bg-background rounded border border-default-200 space-y-2 text-foreground mt-2">
                                <p className="font-bold">📘 DNS Setup Guide for {formData.customDomain}:</p>
                                <ol className="list-decimal list-inside space-y-1 text-default-600">
                                  <li>Log into your DNS Provider (Cloudflare, GoDaddy, Namecheap, etc.).</li>
                                  <li>Add a new <strong>CNAME</strong> record for your domain:</li>
                                </ol>
                                <div className="grid grid-cols-3 gap-2 font-mono text-[11px] bg-default-100 p-2 rounded">
                                  <div><strong>Type:</strong> CNAME</div>
                                  <div><strong>Host/Name:</strong> {formData.customDomain.split(".")[0] || "@"}</div>
                                  <div><strong>Target:</strong> cname.lms.circleone.asia</div>
                                </div>
                                <p className="text-[11px] text-default-500">
                                  After creating the CNAME record, click <strong>"Re-Check CNAME Connection"</strong> above.
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-default-500">
                            Check that <code>{formData.customDomain}</code> points to <code>cname.lms.circleone.asia</code> before provisioning.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </ModalBody>
              <ModalFooter>
                {createdResult ? (
                  <Button color="primary" onPress={() => { resetModal(); onClose(); }}>
                    Close
                  </Button>
                ) : (
                  <>
                    <Button variant="flat" onPress={onClose}>
                      Cancel
                    </Button>
                    {dnsStatus && !dnsStatus.verified ? (
                      <div className="flex gap-2">
                        <Button color="warning" variant="flat" isLoading={creating} onPress={() => handleCreateTenant(true)}>
                          Provision Anyway (Bypass DNS)
                        </Button>
                        <Button color="primary" isLoading={checkingDns} onPress={handleCheckCname}>
                          Re-Check CNAME Connection
                        </Button>
                      </div>
                    ) : (
                      <Button color="primary" isLoading={creating} onPress={() => handleCreateTenant(false)}>
                        Provision Tenant DB & Domain
                      </Button>
                    )}
                  </>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deletingTenant} onOpenChange={(open) => !open && setDeletingTenant(null)}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-danger font-bold">
                ⚠️ Delete Tenant Institute
              </ModalHeader>
              <ModalBody>
                <p className="text-sm">
                  Are you sure you want to delete <strong>{deletingTenant?.name}</strong>?
                </p>
                <div className="p-3 bg-danger-50 text-danger border border-danger-200 rounded-lg text-xs space-y-1 mt-2">
                  <p className="font-bold">This action is permanent and will remove:</p>
                  <ul className="list-disc list-inside">
                    <li>Tenant Database Schema: <code>{deletingTenant?.dbName}</code></li>
                    <li>Domain routing records & custom domains</li>
                    <li>SaaS subscription invoices</li>
                  </ul>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose} isDisabled={deleting}>
                  Cancel
                </Button>
                <Button color="danger" isLoading={deleting} onPress={handleDeleteTenant}>
                  Confirm Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Edit Storage Quotas Modal */}
      <Modal isOpen={!!editingStorageTenant} onOpenChange={(open) => !open && setEditingStorageTenant(null)} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <h3 className="text-lg font-bold">
                  ⚙️ Assign Storage Quotas: {editingStorageTenant?.name}
                </h3>
              </ModalHeader>
              <ModalBody className="space-y-4">
                <p className="text-sm text-default-600">
                  Assign independent storage tiers for <strong>{editingStorageTenant?.primaryDomain || editingStorageTenant?.slug}</strong>.
                </p>

                {/* Local Storage Tier */}
                <div className="p-4 rounded-xl border border-default-200 bg-default-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm">📁 Local Storage Quota</h4>
                      <p className="text-xs text-default-500">For student profiles, payment receipts, and cover images</p>
                    </div>
                    <Chip color="primary" variant="flat" size="sm">VPS Local Disk</Chip>
                  </div>
                  <div className="flex gap-2">
                    {[500, 1000, 2000].map((mb) => (
                      <Button
                        key={mb}
                        size="sm"
                        variant={editLocalMb === mb ? "solid" : "flat"}
                        color="primary"
                        onPress={() => setEditLocalMb(mb)}
                      >
                        {mb >= 1000 ? `${mb / 1000} GB` : `${mb} MB`}
                      </Button>
                    ))}
                  </div>
                  <Input
                    label="Custom Local Quota (MB)"
                    type="number"
                    value={String(editLocalMb)}
                    onValueChange={(v) => setEditLocalMb(parseInt(v, 10) || 500)}
                  />
                </div>

                {/* Cloudflare R2 Media Tier */}
                <div className="p-4 rounded-xl border border-secondary-200 bg-secondary-50/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm">☁️ Cloud Media Quota</h4>
                      <p className="text-xs text-default-500">For heavy course videos, PDFs, and study pack materials</p>
                    </div>
                    <Chip color="secondary" variant="flat" size="sm">Cloudflare R2</Chip>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[0, 10, 20, 50, 100].map((gb) => (
                      <Button
                        key={gb}
                        size="sm"
                        variant={editMediaGb === gb ? "solid" : "flat"}
                        color={gb === 0 ? "default" : "secondary"}
                        onPress={() => setEditMediaGb(gb)}
                      >
                        {gb === 0 ? "0 GB (None)" : `${gb} GB`}
                      </Button>
                    ))}
                  </div>
                  <Input
                    label="Custom Cloud Media Quota (GB)"
                    type="number"
                    value={String(editMediaGb)}
                    onValueChange={(v) => setEditMediaGb(v === "" ? 0 : Math.max(0, parseInt(v, 10) || 0))}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose} isDisabled={savingStorage}>
                  Cancel
                </Button>
                <Button color="primary" isLoading={savingStorage} onPress={handleUpdateStorage}>
                  Save Quotas
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
