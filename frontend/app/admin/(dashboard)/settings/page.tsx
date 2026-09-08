"use client";

import React, { useState, useEffect } from "react";
// Tabs
import { Tabs, Tab } from "@heroui/tabs";

// Card
import { Card, CardHeader, CardBody } from "@heroui/card";

// Avatar
import { Avatar } from "@heroui/avatar";

// Form & Inputs
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";

// Button
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";

// Table
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";

// Modal
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";

import { useAdminAuth } from "@/src/lib/useAdminAuth";
import { useSystemSettings } from "@/src/lib/useSystemSettings";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DomainSettingsTab } from "@/components/DomainSettingsTab";

interface User {
  uuid: string;
  first_name: string;
  last_name: string;
  user_email: string;
  role: string;
  permission_id: number;
  create_at: string;
  profile_photo?: string;
  theme_preference?: string;
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";
  const [selected, setSelected] = useState(initialTab);
  const { user, loading, isAuthenticated, refetch } = useAdminAuth() as {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;
    refetch: () => Promise<void>;
  };
  const router = useRouter();

  // Profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    user_email: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Password states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Theme state
  const [isDark, setIsDark] = useState(false);

  // White Labeling & Branding states
  const { settings, refetchSettings } = useSystemSettings();
  const [brandingForm, setBrandingForm] = useState({
    site_title: "",
    site_short_name: "",
    copyright_text: "",
    contact_email: "",
    contact_phone: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingMessage, setBrandingMessage] = useState("");

  useEffect(() => {
    if (settings) {
      setBrandingForm({
        site_title: settings.site_title || "LASHINIGEO LMS",
        site_short_name: settings.site_short_name || "LASHINIGEO",
        copyright_text: settings.copyright_text || "© 2026 Lashinigeo LMS. All rights reserved.",
        contact_email: settings.contact_email || "support@lashinigeo.lk",
        contact_phone: settings.contact_phone || "+94 77 123 4567",
      });
    }
  }, [settings]);

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBranding(true);
    setBrandingMessage("");

    try {
      const fd = new FormData();
      Object.entries(brandingForm).forEach(([k, v]) => {
        fd.append(k, v);
      });
      if (logoFile) fd.append("logo_file", logoFile);
      if (faviconFile) fd.append("favicon_file", faviconFile);

      const res = await fetch("/api/settings", {
        method: "POST",
        body: fd,
      });

      if (res.ok) {
        setBrandingMessage("White-label branding settings saved successfully!");
        await refetchSettings();
      } else {
        alert("Failed to save branding settings.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving branding settings.");
    } finally {
      setSavingBranding(false);
    }
  };

  // User management states
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [modalForm, setModalForm] = useState({
    first_name: "",
    last_name: "",
    user_email: "",
    role: "",
    password: "",
  });

  // Batch Customizer states
  const [batches, setBatches] = useState<any[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any>(null);
  const [batchForm, setBatchForm] = useState({
    batch_code: "",
    batch_name: "",
    description: "",
    is_active: true,
  });

  // Class Type Customizer states
  const [classTypes, setClassTypes] = useState<any[]>([]);
  const [classTypesLoading, setClassTypesLoading] = useState(false);
  const [classTypeModalOpen, setClassTypeModalOpen] = useState(false);
  const [editingClassType, setEditingClassType] = useState<any>(null);
  const [classTypeForm, setClassTypeForm] = useState({
    type_code: "",
    type_name: "",
    description: "",
    is_active: true,
  });

  // Bank Account Customizer states
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [bankAccountsLoading, setBankAccountsLoading] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<any>(null);
  const [bankForm, setBankForm] = useState({
    bank_name: "",
    account_name: "",
    account_number: "",
    branch_name: "",
    account_type: "",
    instructions: "",
    is_active: true,
    display_order: 0,
  });

  const userRole = user?.role?.toLowerCase() || "";
  const isSuperOrHigher = ["superuser", "developer", "admin"].includes(userRole);
  const isDeveloper = ["developer", "superuser", "admin"].includes(userRole);

  // Apply theme
  useEffect(() => {
    if (!user) return;

    let initialDark: boolean;
    if (user.theme_preference) {
      initialDark = user.theme_preference === "dark";
    } else {
      initialDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    setIsDark(initialDark);
    if (initialDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [user]);

  const toggleTheme = async () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const fd = new FormData();
    fd.append("action", "updateTheme");
    fd.append("theme", newDark ? "dark" : "light");

    const res = await fetch("/api/admin/auth", { method: "POST", body: fd });
    if (res.ok) {
      await refetch();
    }
  };

  // Fetch roles & users for User Management tab
  useEffect(() => {
    if (selected === "usermanagement" && isAuthenticated && isSuperOrHigher) {
      setUsersLoading(true);
      Promise.all([
        fetch("/api/admin/auth")
          .then((r) => r.json())
          .then((d) => setRoles(d.roles || d)),
        fetch("/api/admin/auth?action=userList")
          .then((r) => r.json())
          .then((d) => setUsers(d.users || [])),
      ]).finally(() => setUsersLoading(false));
    }
  }, [selected, isAuthenticated, isSuperOrHigher]);

  // Fetch batches for Batch Management tab
  const fetchBatches = async () => {
    setBatchesLoading(true);
    try {
      const res = await fetch("/api/batches?all=true");
      const data = await res.json();
      if (Array.isArray(data)) {
        setBatches(data);
      }
    } catch (err) {
      console.error("Failed to fetch batches:", err);
    } finally {
      setBatchesLoading(false);
    }
  };

  useEffect(() => {
    if (selected === "batchmanagement" && isAuthenticated && isSuperOrHigher) {
      fetchBatches();
    }
  }, [selected, isAuthenticated, isSuperOrHigher]);

  // Fetch class types for Class Type Management tab
  const fetchClassTypes = async () => {
    setClassTypesLoading(true);
    try {
      const res = await fetch("/api/class-types?all=true");
      const data = await res.json();
      if (Array.isArray(data)) {
        setClassTypes(data);
      }
    } catch (err) {
      console.error("Failed to fetch class types:", err);
    } finally {
      setClassTypesLoading(false);
    }
  };

  useEffect(() => {
    if (selected === "classtypemanagement" && isAuthenticated && isSuperOrHigher) {
      fetchClassTypes();
    }
  }, [selected, isAuthenticated, isSuperOrHigher]);

  // Fetch bank accounts for Bank Management tab
  const fetchBankAccounts = async () => {
    setBankAccountsLoading(true);
    try {
      const res = await fetch("/api/bank-accounts?all=true");
      const data = await res.json();
      if (Array.isArray(data)) {
        setBankAccounts(data);
      }
    } catch (err) {
      console.error("Failed to fetch bank accounts:", err);
    } finally {
      setBankAccountsLoading(false);
    }
  };

  useEffect(() => {
    if (selected === "bankaccounts" && isAuthenticated && isSuperOrHigher) {
      fetchBankAccounts();
    }
  }, [selected, isAuthenticated, isSuperOrHigher]);

  // Block protected tabs if no permission
  useEffect(() => {
    if (
      !loading &&
      !isSuperOrHigher &&
      (selected === "usermanagement" || selected === "batchmanagement" || selected === "classtypemanagement" || selected === "bankaccounts")
    ) {
      setSelected("profile");
    }
  }, [loading, isSuperOrHigher, selected]);

  const startProfileEdit = () => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        user_email: user.user_email || "",
      });
      setPhotoFile(null);
      setPhotoPreview(null);
      setIsEditingProfile(true);
    }
  };

  const handleSaveProfile = async () => {
    const fd = new FormData();
    fd.append("action", "updateProfile");
    fd.append("first_name", profileForm.first_name);
    fd.append("last_name", profileForm.last_name);
    fd.append("user_email", profileForm.user_email);
    if (photoFile) fd.append("profile_photo", photoFile);

    const res = await fetch("/api/admin/auth", { method: "POST", body: fd });
    if (res.ok) {
      await refetch();
      setIsEditingProfile(false);
    } else {
      alert("Failed to update profile");
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword || !oldPassword || !newPassword) {
      alert("Passwords do not match or fields are empty");
      return;
    }

    const fd = new FormData();
    fd.append("action", "changePassword");
    fd.append("old_password", oldPassword);
    fd.append("new_password", newPassword);

    const res = await fetch("/api/admin/auth", { method: "POST", body: fd });
    if (res.ok) {
      alert("Password updated");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      alert("Failed to change password");
    }
  };

  // User modal functions
  const openUserModal = (u?: any) => {
    if (u) {
      setEditingUser(u);
      setModalForm({
        first_name: u.first_name || "",
        last_name: u.last_name || "",
        user_email: u.user_email || "",
        role: u.role || "",
        password: "",
      });
    } else {
      setEditingUser(null);
      setModalForm({ first_name: "", last_name: "", user_email: "", role: "", password: "" });
    }
    setModalOpen(true);
  };

  const handleSaveUser = async () => {
    const fd = new FormData();
    fd.append("action", editingUser ? "updateUser" : "createUser");
    if (editingUser) fd.append("uuid", editingUser.uuid);
    fd.append("first_name", modalForm.first_name);
    fd.append("last_name", modalForm.last_name);
    fd.append("user_email", modalForm.user_email);
    fd.append("role", modalForm.role);
    if (modalForm.password) fd.append("password", modalForm.password);

    const res = await fetch("/api/admin/auth", { method: "POST", body: fd });
    if (res.ok) {
      const data = await fetch("/api/admin/auth?action=userList").then((r) => r.json());
      setUsers(data.users || []);
      setModalOpen(false);
    } else {
      alert("Failed to save user");
    }
  };

  const handleDeleteUser = async (uuid: string) => {
    if (!confirm("Delete this user?")) return;

    const fd = new FormData();
    fd.append("action", "deleteUser");
    fd.append("uuid", uuid);

    const res = await fetch("/api/admin/auth", { method: "POST", body: fd });
    if (res.ok) {
      setUsers(users.filter((u) => u.uuid !== uuid));
    }
  };

  // Batch modal functions
  const openBatchModal = (b?: any) => {
    if (b) {
      setEditingBatch(b);
      setBatchForm({
        batch_code: b.batch_code || "",
        batch_name: b.batch_name || "",
        description: b.description || "",
        is_active: b.is_active === 1 || b.is_active === true,
      });
    } else {
      setEditingBatch(null);
      setBatchForm({ batch_code: "", batch_name: "", description: "", is_active: true });
    }
    setBatchModalOpen(true);
  };

  const handleSaveBatch = async () => {
    if (!batchForm.batch_code || !batchForm.batch_name) {
      alert("Batch code and Batch name are required");
      return;
    }

    const payload = {
      ...(editingBatch ? { id: editingBatch.id } : {}),
      batch_code: batchForm.batch_code,
      batch_name: batchForm.batch_name,
      description: batchForm.description,
      is_active: batchForm.is_active ? 1 : 0,
    };

    const method = editingBatch ? "PUT" : "POST";
    const res = await fetch("/api/batches", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      await fetchBatches();
      setBatchModalOpen(false);
    } else {
      const err = await res.json();
      alert(err.error || "Failed to save batch");
    }
  };

  const handleDeleteBatch = async (id: number) => {
    if (!confirm("Are you sure you want to delete this batch?")) return;

    const res = await fetch(`/api/batches?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchBatches();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to delete batch");
    }
  };

  // Class Type modal functions
  const openClassTypeModal = (ct?: any) => {
    if (ct) {
      setEditingClassType(ct);
      setClassTypeForm({
        type_code: ct.type_code || "",
        type_name: ct.type_name || "",
        description: ct.description || "",
        is_active: ct.is_active === 1 || ct.is_active === true,
      });
    } else {
      setEditingClassType(null);
      setClassTypeForm({ type_code: "", type_name: "", description: "", is_active: true });
    }
    setClassTypeModalOpen(true);
  };

  const handleSaveClassType = async () => {
    if (!classTypeForm.type_code || !classTypeForm.type_name) {
      alert("Type code and Type name are required");
      return;
    }

    const payload = {
      ...(editingClassType ? { id: editingClassType.id } : {}),
      type_code: classTypeForm.type_code,
      type_name: classTypeForm.type_name,
      description: classTypeForm.description,
      is_active: classTypeForm.is_active ? 1 : 0,
    };

    const method = editingClassType ? "PUT" : "POST";
    const res = await fetch("/api/class-types", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      await fetchClassTypes();
      setClassTypeModalOpen(false);
    } else {
      const err = await res.json();
      alert(err.error || "Failed to save class type");
    }
  };

  const handleDeleteClassType = async (id: number) => {
    if (!confirm("Are you sure you want to delete this class type?")) return;

    const res = await fetch(`/api/class-types?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchClassTypes();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to delete class type");
    }
  };

  // Bank Account modal functions
  const openBankModal = (b?: any) => {
    if (b) {
      setEditingBank(b);
      setBankForm({
        bank_name: b.bank_name || "",
        account_name: b.account_name || "",
        account_number: b.account_number || "",
        branch_name: b.branch_name || "",
        account_type: b.account_type || "",
        instructions: b.instructions || "",
        is_active: b.is_active === 1 || b.is_active === true,
        display_order: b.display_order || 0,
      });
    } else {
      setEditingBank(null);
      setBankForm({
        bank_name: "",
        account_name: "",
        account_number: "",
        branch_name: "",
        account_type: "",
        instructions: "",
        is_active: true,
        display_order: 0,
      });
    }
    setBankModalOpen(true);
  };

  const handleSaveBank = async () => {
    if (!bankForm.bank_name || !bankForm.account_name || !bankForm.account_number) {
      alert("Bank Name, Account Name, and Account Number are required");
      return;
    }

    const payload = {
      ...(editingBank ? { id: editingBank.id, uuid: editingBank.uuid } : {}),
      bank_name: bankForm.bank_name,
      account_name: bankForm.account_name,
      account_number: bankForm.account_number,
      branch_name: bankForm.branch_name,
      account_type: bankForm.account_type,
      instructions: bankForm.instructions,
      is_active: bankForm.is_active ? 1 : 0,
      display_order: bankForm.display_order,
    };

    const method = editingBank ? "PUT" : "POST";
    const res = await fetch("/api/bank-accounts", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      await fetchBankAccounts();
      setBankModalOpen(false);
    } else {
      const err = await res.json();
      alert(err.error || "Failed to save bank account");
    }
  };

  const handleDeleteBank = async (id: number) => {
    if (!confirm("Are you sure you want to delete this bank account?")) return;

    const res = await fetch(`/api/bank-accounts?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchBankAccounts();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to delete bank account");
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!isAuthenticated || !user) return <div className="p-8">Not authenticated</div>;

  const avatarSrc = photoPreview || (user.profile_photo ? `/uploads/${user.profile_photo}` : undefined);

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Settings & Configuration</h1>
      </div>

      <Tabs
        aria-label="Dashboard tabs"
        selectedKey={selected}
        onSelectionChange={(key) => setSelected(key as string)}
      >
        <Tab key="profile" title="Profile">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h2 className="text-2xl font-bold">Profile Information</h2>
              </CardHeader>
              <CardBody className="gap-6">
                <div className="flex flex-col items-center">
                  <Avatar src={avatarSrc} name={`${user.first_name} ${user.last_name}`} size="lg" className="w-32 h-32" />
                  {isEditingProfile && (
                    <input
                      type="file"
                      accept="image/*"
                      className="mt-4"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPhotoFile(file);
                          setPhotoPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  )}
                </div>

                {!isEditingProfile ? (
                  <div className="space-y-4">
                    <p><strong>Name:</strong> {user.first_name} {user.last_name}</p>
                    <p><strong>Email:</strong> {user.user_email}</p>
                    <p><strong>Role:</strong> {user.role}</p>
                    <p><strong>Created:</strong> {new Date(user.create_at).toLocaleDateString()}</p>
                    <Button onPress={startProfileEdit}>Edit Profile</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Input label="First Name" value={profileForm.first_name} onValueChange={(v) => setProfileForm({ ...profileForm, first_name: v })} />
                    <Input label="Last Name" value={profileForm.last_name} onValueChange={(v) => setProfileForm({ ...profileForm, last_name: v })} />
                    <Input label="Email" value={profileForm.user_email} onValueChange={(v) => setProfileForm({ ...profileForm, user_email: v })} />
                    <div className="flex gap-3">
                      <Button onPress={handleSaveProfile}>Save</Button>
                      <Button variant="flat" onPress={() => setIsEditingProfile(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-xl font-bold">Change Password</h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <Input type="password" label="Current Password" value={oldPassword} onValueChange={setOldPassword} />
                <Input type="password" label="New Password" value={newPassword} onValueChange={setNewPassword} />
                <Input type="password" label="Confirm New Password" value={confirmPassword} onValueChange={setConfirmPassword} />
                <Button
                  onPress={handleChangePassword}
                  isDisabled={!oldPassword || !newPassword || newPassword !== confirmPassword}
                >
                  Update Password
                </Button>
              </CardBody>
            </Card>
          </div>
        </Tab>

        <Tab key="preferences" title="Preferences">
          <Card className="max-w-3xl">
            <CardHeader>
              <h2 className="text-2xl font-bold">Personal Preferences</h2>
            </CardHeader>
            <CardBody className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-small text-default-500">Toggle dark/light theme (saved to your account)</p>
                </div>
                <Switch isSelected={isDark} onValueChange={toggleTheme} />
              </div>
            </CardBody>
          </Card>
        </Tab>

        {isSuperOrHigher && (
          <Tab key="whitelabel" title="White-Label & Branding">
            <Card>
              <CardHeader>
                <div>
                  <h2 className="text-2xl font-bold">White-Labeling & System Branding</h2>
                  <p className="text-sm text-default-500 mt-1">
                    Customize the system brand name, site logo, favicon, copyright text, and contact details across the LMS.
                  </p>
                </div>
              </CardHeader>
              <CardBody>
                <form onSubmit={handleSaveBranding} className="space-y-6 max-w-3xl">
                  {/* Brand Logo & Favicon Upload Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-xl border border-default-200 dark:border-default-100 bg-default-50/50">
                    {/* Site Logo */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-foreground">
                        Site Brand Logo
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg border border-default-200 bg-white dark:bg-black p-2 flex items-center justify-center shadow-xs">
                          <img
                            src={logoPreview || settings.site_logo_url || "/assets/logo.png"}
                            alt="Brand Logo"
                            className="max-h-full max-w-full object-contain"
                            onError={(e: any) => { e.target.src = "/assets/logo.png"; }}
                          />
                        </div>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setLogoFile(file);
                              setLogoPreview(URL.createObjectURL(file));
                            }
                          }}
                          className="text-xs text-default-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Site Favicon */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-foreground">
                        Site Favicon (.ico / .png)
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg border border-default-200 bg-white dark:bg-black p-2 flex items-center justify-center shadow-xs">
                          <img
                            src={faviconPreview || settings.site_favicon_url || "/favicon.ico"}
                            alt="Favicon"
                            className="max-h-full max-w-full object-contain"
                            onError={(e: any) => { e.target.src = "/favicon.ico"; }}
                          />
                        </div>
                        <input
                          type="file"
                          accept="image/x-icon,image/png,image/vnd.microsoft.icon"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setFaviconFile(file);
                              setFaviconPreview(URL.createObjectURL(file));
                            }
                          }}
                          className="text-xs text-default-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Text Settings Form Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <Input
                        label="Full Site Title / System Name *"
                        placeholder="e.g. LASHINIGEO LMS"
                        value={brandingForm.site_title}
                        onValueChange={(v) => setBrandingForm({ ...brandingForm, site_title: v })}
                        isRequired
                      />
                    </div>

                    <div>
                      <Input
                        label="Short Brand Name *"
                        placeholder="e.g. LASHINIGEO"
                        value={brandingForm.site_short_name}
                        onValueChange={(v) => setBrandingForm({ ...brandingForm, site_short_name: v })}
                        isRequired
                      />
                    </div>

                    <div>
                      <Input
                        type="email"
                        label="Support Contact Email"
                        placeholder="support@yourcompany.com"
                        value={brandingForm.contact_email}
                        onValueChange={(v) => setBrandingForm({ ...brandingForm, contact_email: v })}
                      />
                    </div>

                    <div>
                      <Input
                        type="tel"
                        label="Support Phone Number"
                        placeholder="+94 77 123 4567"
                        value={brandingForm.contact_phone}
                        onValueChange={(v) => setBrandingForm({ ...brandingForm, contact_phone: v })}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Input
                        label="Copyright Text (Footer)"
                        placeholder="© 2026 Your Company. All rights reserved."
                        value={brandingForm.copyright_text}
                        onValueChange={(v) => setBrandingForm({ ...brandingForm, copyright_text: v })}
                      />
                    </div>
                  </div>

                  {/* Alert Message */}
                  {brandingMessage && (
                    <div className="p-3.5 rounded-lg text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                      {brandingMessage}
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      color="primary"
                      size="lg"
                      isLoading={savingBranding}
                      className="px-8 font-semibold shadow-sm"
                    >
                      Save White-Label Settings
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </Tab>
        )}

        {isSuperOrHigher && (
          <Tab key="batchmanagement" title="Batch Customizer">
            <Card>
              <CardHeader className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Batch Management</h2>
                  <p className="text-sm text-default-500">Add, edit, or remove dynamic batches used for classes and students</p>
                </div>
                <Button color="primary" onPress={() => openBatchModal()}>Add New Batch</Button>
              </CardHeader>
              <CardBody>
                <div className="overflow-x-auto w-full">
                  <Table aria-label="Batches table" isStriped>
                    <TableHeader>
                      <TableColumn>BATCH CODE</TableColumn>
                      <TableColumn>BATCH NAME</TableColumn>
                      <TableColumn>DESCRIPTION</TableColumn>
                      <TableColumn>STATUS</TableColumn>
                      <TableColumn>CREATED AT</TableColumn>
                      <TableColumn>ACTIONS</TableColumn>
                    </TableHeader>
                    <TableBody isLoading={batchesLoading} emptyContent="No batches found">
                      {batches.map((b: any) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-semibold text-primary">{b.batch_code}</TableCell>
                          <TableCell>{b.batch_name}</TableCell>
                          <TableCell>{b.description || "—"}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${b.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                              {b.is_active ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell>{new Date(b.create_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" onPress={() => openBatchModal(b)}>Edit</Button>
                              <Button size="sm" color="danger" onPress={() => handleDeleteBatch(b.id)}>
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardBody>
            </Card>
          </Tab>
        )}

        {isSuperOrHigher && (
          <Tab key="classtypemanagement" title="Class Type Customizer">
            <Card>
              <CardHeader className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Class Type Management</h2>
                  <p className="text-sm text-default-500">Add, edit, or remove dynamic class types (Theory, Revision, Paper, etc.)</p>
                </div>
                <Button color="primary" onPress={() => openClassTypeModal()}>Add New Class Type</Button>
              </CardHeader>
              <CardBody>
                <div className="overflow-x-auto w-full">
                  <Table aria-label="Class types table" isStriped>
                    <TableHeader>
                      <TableColumn>TYPE CODE</TableColumn>
                      <TableColumn>TYPE NAME</TableColumn>
                      <TableColumn>DESCRIPTION</TableColumn>
                      <TableColumn>STATUS</TableColumn>
                      <TableColumn>CREATED AT</TableColumn>
                      <TableColumn>ACTIONS</TableColumn>
                    </TableHeader>
                    <TableBody isLoading={classTypesLoading} emptyContent="No class types found">
                      {classTypes.map((ct: any) => (
                        <TableRow key={ct.id}>
                          <TableCell className="font-semibold text-primary">{ct.type_code}</TableCell>
                          <TableCell>{ct.type_name}</TableCell>
                          <TableCell>{ct.description || "—"}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${ct.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                              {ct.is_active ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell>{new Date(ct.create_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" onPress={() => openClassTypeModal(ct)}>Edit</Button>
                              <Button size="sm" color="danger" onPress={() => handleDeleteClassType(ct.id)}>
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardBody>
            </Card>
          </Tab>
        )}

        {isSuperOrHigher && (
          <Tab key="bankaccounts" title="Bank Accounts">
            <Card>
              <CardHeader className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Bank Account Management</h2>
                  <p className="text-sm text-default-500">Add, update, or remove dynamic bank accounts for bank transfer payments</p>
                </div>
                <Button color="primary" onPress={() => openBankModal()}>Add New Bank Account</Button>
              </CardHeader>
              <CardBody>
                <div className="overflow-x-auto w-full">
                  <Table aria-label="Bank accounts table" isStriped>
                    <TableHeader>
                      <TableColumn>BANK NAME</TableColumn>
                      <TableColumn>ACCOUNT NAME</TableColumn>
                      <TableColumn>ACCOUNT NUMBER</TableColumn>
                      <TableColumn>BRANCH</TableColumn>
                      <TableColumn>STATUS</TableColumn>
                      <TableColumn>ORDER</TableColumn>
                      <TableColumn>ACTIONS</TableColumn>
                    </TableHeader>
                    <TableBody isLoading={bankAccountsLoading} emptyContent="No bank accounts found">
                      {bankAccounts.map((b: any) => (
                        <TableRow key={b.id || b.uuid}>
                          <TableCell className="font-semibold text-primary">{b.bank_name}</TableCell>
                          <TableCell>{b.account_name}</TableCell>
                          <TableCell className="font-mono">{b.account_number}</TableCell>
                          <TableCell>{b.branch_name || "—"}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${b.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                              {b.is_active ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell>{b.display_order ?? 0}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" onPress={() => openBankModal(b)}>Edit</Button>
                              <Button size="sm" color="danger" onPress={() => handleDeleteBank(b.id)}>
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardBody>
            </Card>
          </Tab>
        )}

        {isSuperOrHigher && (
          <Tab key="usermanagement" title="User Management">
            <Card>
              <CardHeader className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">All Users</h2>
                <Button onPress={() => openUserModal()}>Add New User</Button>
              </CardHeader>
              <CardBody>
                <div className="overflow-x-auto w-full">
                  <Table aria-label="Users table" isStriped>
                    <TableHeader>
                      <TableColumn>AVATAR</TableColumn>
                      <TableColumn>NAME</TableColumn>
                      <TableColumn>EMAIL</TableColumn>
                      <TableColumn>ROLE</TableColumn>
                      <TableColumn>CREATED</TableColumn>
                      <TableColumn>ACTIONS</TableColumn>
                    </TableHeader>
                    <TableBody isLoading={usersLoading} emptyContent="No users">
                      {users.map((u: any) => (
                        <TableRow key={u.uuid}>
                          <TableCell>
                            <Avatar
                              src={u.profile_photo ? `/uploads/${u.profile_photo}` : undefined}
                              name={`${u.first_name[0]}${u.last_name[0]}`}
                              size="sm"
                            />
                          </TableCell>
                          <TableCell>{u.first_name} {u.last_name}</TableCell>
                          <TableCell>{u.user_email}</TableCell>
                          <TableCell>{u.role}</TableCell>
                          <TableCell>{new Date(u.create_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" onPress={() => openUserModal(u)}>Edit</Button>
                              {isDeveloper && u.uuid !== user.uuid && (
                                <Button size="sm" color="danger" onPress={() => handleDeleteUser(u.uuid)}>
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
          </Tab>
        )}

        {isSuperOrHigher && (
          <Tab key="domains" title="Custom Domain & CNAME">
            <DomainSettingsTab />
          </Tab>
        )}
      </Tabs>

      {/* User Modal */}
      <Modal isOpen={modalOpen} onOpenChange={setModalOpen}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{editingUser ? "Edit User" : "Add New User"}</ModalHeader>
              <ModalBody className="space-y-4">
                <Input
                  label="First Name"
                  value={modalForm.first_name}
                  onValueChange={(v) => setModalForm({ ...modalForm, first_name: v })}
                />
                <Input
                  label="Last Name"
                  value={modalForm.last_name}
                  onValueChange={(v) => setModalForm({ ...modalForm, last_name: v })}
                />
                <Input
                  label="Email"
                  value={modalForm.user_email}
                  onValueChange={(v) => setModalForm({ ...modalForm, user_email: v })}
                />
                <Select
                  label="Role"
                  selectedKeys={modalForm.role ? [modalForm.role] : []}
                  onSelectionChange={(keys) => setModalForm({ ...modalForm, role: Array.from(keys)[0] as string })}
                >
                  {roles.map((r: any) => (
                    <SelectItem key={r.role_name}>{r.role_name}</SelectItem>
                  ))}
                </Select>
                <Input
                  type="password"
                  label={editingUser ? "New Password (leave empty to keep)" : "Password"}
                  value={modalForm.password}
                  onValueChange={(v) => setModalForm({ ...modalForm, password: v })}
                  isRequired={!editingUser}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>Cancel</Button>
                <Button onPress={handleSaveUser}>Save</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Batch Customizer Modal */}
      <Modal isOpen={batchModalOpen} onOpenChange={setBatchModalOpen}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{editingBatch ? "Edit Batch" : "Add New Batch"}</ModalHeader>
              <ModalBody className="space-y-4">
                <Input
                  label="Batch Code *"
                  placeholder="e.g. 2029AL"
                  value={batchForm.batch_code}
                  onValueChange={(v) => setBatchForm({ ...batchForm, batch_code: v })}
                  isRequired
                />
                <Input
                  label="Batch Name *"
                  placeholder="e.g. 2029 A/L"
                  value={batchForm.batch_name}
                  onValueChange={(v) => setBatchForm({ ...batchForm, batch_name: v })}
                  isRequired
                />
                <Input
                  label="Description"
                  placeholder="e.g. Batch for 2029 Advanced Level students"
                  value={batchForm.description}
                  onValueChange={(v) => setBatchForm({ ...batchForm, description: v })}
                />
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-medium">Batch Active</span>
                  <Switch
                    isSelected={batchForm.is_active}
                    onValueChange={(v) => setBatchForm({ ...batchForm, is_active: v })}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>Cancel</Button>
                <Button color="primary" onPress={handleSaveBatch}>Save Batch</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Class Type Customizer Modal */}
      <Modal isOpen={classTypeModalOpen} onOpenChange={setClassTypeModalOpen}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{editingClassType ? "Edit Class Type" : "Add New Class Type"}</ModalHeader>
              <ModalBody className="space-y-4">
                <Input
                  label="Type Code *"
                  placeholder="e.g. workshop"
                  value={classTypeForm.type_code}
                  onValueChange={(v) => setClassTypeForm({ ...classTypeForm, type_code: v })}
                  isRequired
                />
                <Input
                  label="Type Name *"
                  placeholder="e.g. Workshop"
                  value={classTypeForm.type_name}
                  onValueChange={(v) => setClassTypeForm({ ...classTypeForm, type_name: v })}
                  isRequired
                />
                <Input
                  label="Description"
                  placeholder="e.g. Special Practical & Workshop Class"
                  value={classTypeForm.description}
                  onValueChange={(v) => setClassTypeForm({ ...classTypeForm, description: v })}
                />
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-medium">Class Type Active</span>
                  <Switch
                    isSelected={classTypeForm.is_active}
                    onValueChange={(v) => setClassTypeForm({ ...classTypeForm, is_active: v })}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>Cancel</Button>
                <Button color="primary" onPress={handleSaveClassType}>Save Class Type</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Bank Account Modal */}
      <Modal isOpen={bankModalOpen} onOpenChange={setBankModalOpen}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{editingBank ? "Edit Bank Account" : "Add New Bank Account"}</ModalHeader>
              <ModalBody className="space-y-4">
                <Input
                  label="Bank Name *"
                  placeholder="e.g. Commercial Bank, HNB, Sampath"
                  value={bankForm.bank_name}
                  onValueChange={(v) => setBankForm({ ...bankForm, bank_name: v })}
                  isRequired
                />
                <Input
                  label="Account Name *"
                  placeholder="e.g. R A S T Rajapaksha"
                  value={bankForm.account_name}
                  onValueChange={(v) => setBankForm({ ...bankForm, account_name: v })}
                  isRequired
                />
                <Input
                  label="Account Number *"
                  placeholder="e.g. 802 092 806 9"
                  value={bankForm.account_number}
                  onValueChange={(v) => setBankForm({ ...bankForm, account_number: v })}
                  isRequired
                />
                <Input
                  label="Branch Name"
                  placeholder="e.g. Pilimathalawa"
                  value={bankForm.branch_name}
                  onValueChange={(v) => setBankForm({ ...bankForm, branch_name: v })}
                />
                <Input
                  label="Instructions / Note"
                  placeholder="e.g. Include student reference number in transfer note"
                  value={bankForm.instructions}
                  onValueChange={(v) => setBankForm({ ...bankForm, instructions: v })}
                />
                <Input
                  type="number"
                  label="Display Order"
                  placeholder="0"
                  value={bankForm.display_order.toString()}
                  onValueChange={(v) => setBankForm({ ...bankForm, display_order: parseInt(v) || 0 })}
                />
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-medium">Account Active</span>
                  <Switch
                    isSelected={bankForm.is_active}
                    onValueChange={(v) => setBankForm({ ...bankForm, is_active: v })}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>Cancel</Button>
                <Button color="primary" onPress={handleSaveBank}>Save Bank Account</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}