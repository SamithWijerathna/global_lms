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
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    email: "",
    password: "",
    phone: "",
    plan: "Standard",
    monthlyPrice: "LKR 5,000",
    customDomain: "",
    initialInvoiceAmount: "5000",
  });
  const [createdResult, setCreatedResult] = useState<any>(null);

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

  const handleCreateTenant = async () => {
    if (!formData.name || !formData.slug || !formData.email) {
      alert("Name, Subdomain Slug, and Admin Email are required.");
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

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md p-6 shadow-xl border border-default-200">
          <CardHeader className="flex flex-col gap-1 items-center pb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold mb-2">
              🌐
            </div>
            <h1 className="text-2xl font-bold text-center">Global LMS SaaS Admin</h1>
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
          <h1 className="text-3xl font-bold tracking-tight">Tenant Institutes & Domains</h1>
          <p className="text-sm text-default-500 mt-1">
            Provision isolated tenant databases and verify BYOD custom domains & CNAME records.
          </p>
        </div>
        <div className="flex gap-3">
          <Button color="primary" onPress={() => { setCreatedResult(null); setModalOpen(true); }}>
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
          <p className="text-sm text-default-500">Global LMS Root Domain</p>
          <h3 className="text-xl font-bold mt-2 font-mono">lms.circleone.asia</h3>
        </Card>
        <Card className="p-4 border border-default-200">
          <p className="text-sm text-default-500">Default CNAME Ingestion Target</p>
          <h3 className="text-xl font-bold mt-2 font-mono text-success">cname.lms.circleone.asia</h3>
        </Card>
      </div>

      {/* Tenant Table */}
      <Card className="border border-default-200">
        <CardHeader className="flex justify-between items-center px-6 py-4">
          <h2 className="text-xl font-semibold">Registered LMS Academies</h2>
          <Button size="sm" variant="light" onPress={() => fetchTenants(token)} isLoading={loadingTenants}>
            🔄 Refresh
          </Button>
        </CardHeader>
        <CardBody className="p-0">
          <Table aria-label="Tenant Institutes Table">
            <TableHeader>
              <TableColumn>INSTITUTE NAME</TableColumn>
              <TableColumn>SUBDOMAIN SLUG</TableColumn>
              <TableColumn>DATABASE NAME</TableColumn>
              <TableColumn>ADMIN EMAIL</TableColumn>
              <TableColumn>PLAN / PRICE</TableColumn>
              <TableColumn>DOMAIN STATUS</TableColumn>
              <TableColumn>CREATED DATE</TableColumn>
            </TableHeader>
            <TableBody emptyContent={loadingTenants ? "Loading tenants..." : "No tenants found."}>
              {tenants.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-semibold">{t.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-default-100 px-2 py-1 rounded text-primary">
                      {t.slug}.lms.circleone.asia
                    </code>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs text-default-600">{t.dbName}</code>
                  </TableCell>
                  <TableCell>{t.email}</TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <span className="font-medium">{t.plan}</span>
                      <span className="text-default-400 block">{t.monthlyPrice}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" color="success" variant="flat">
                      Active Subdomain
                    </Chip>
                  </TableCell>
                  <TableCell className="text-xs text-default-500">
                    {new Date(t.createdAt).toLocaleDateString()}
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
                      🎉 Database, isolated schema, and domain records created!
                    </p>
                    <div className="space-y-2 text-sm">
                      <p><strong>Institute:</strong> {createdResult.name}</p>
                      <p><strong>Subdomain:</strong> <code className="bg-default-200 px-2 py-0.5 rounded">{createdResult.subdomain}</code></p>
                      <p><strong>Database:</strong> <code className="bg-default-200 px-2 py-0.5 rounded">{createdResult.dbName}</code></p>
                      <p><strong>Admin Email:</strong> {createdResult.adminEmail}</p>
                      <p><strong>Initial Password:</strong> <code className="bg-default-200 px-2 py-0.5 rounded font-bold">{createdResult.initialPassword}</code></p>
                      <p><strong>License Key:</strong> <code className="bg-default-200 px-2 py-0.5 rounded">{createdResult.licenseKey}</code></p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Institute / Business Name"
                        placeholder="e.g. Oxford Royal Academy"
                        value={formData.name}
                        onValueChange={(v) => {
                          setFormData({
                            ...formData,
                            name: v,
                            slug: formData.slug || v.toLowerCase().replace(/[^a-z0-9]/g, ""),
                          });
                        }}
                        isRequired
                      />
                      <Input
                        label="Subdomain Slug"
                        placeholder="e.g. oxford"
                        description="Creates <slug>.globallms.com"
                        value={formData.slug}
                        onValueChange={(v) => setFormData({ ...formData, slug: v })}
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
                      <Input
                        label="Optional BYOD Custom Domain"
                        placeholder="e.g. lms.oxfordacademy.lk"
                        description="Can be verified via CNAME later"
                        value={formData.customDomain}
                        onValueChange={(v) => setFormData({ ...formData, customDomain: v })}
                      />
                      <Select
                        label="Subscription Plan"
                        selectedKeys={[formData.plan]}
                        onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                      >
                        <SelectItem key="Starter">Starter (LKR 5,000/mo)</SelectItem>
                        <SelectItem key="Standard">Standard (LKR 10,000/mo)</SelectItem>
                        <SelectItem key="Enterprise">Enterprise (LKR 25,000/mo)</SelectItem>
                      </Select>
                    </div>
                  </>
                )}
              </ModalBody>
              <ModalFooter>
                {createdResult ? (
                  <Button color="primary" onPress={() => { setCreatedResult(null); onClose(); }}>
                    Close
                  </Button>
                ) : (
                  <>
                    <Button variant="flat" onPress={onClose}>
                      Cancel
                    </Button>
                    <Button color="primary" isLoading={creating} onPress={handleCreateTenant}>
                      Provision Tenant DB & Domains
                    </Button>
                  </>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
