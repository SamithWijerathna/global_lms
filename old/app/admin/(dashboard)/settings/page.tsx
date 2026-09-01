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
import { Select, SelectItem } from "@heroui/select";

// Button
import { Button } from "@heroui/button";

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

// Dropdown
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
} from "@heroui/dropdown";


import { useAdminAuth } from "@/src/lib/useAdminAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useIsSSR } from "@react-aria/ssr";
import { Suspense } from "react";

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

  const userRole = user?.role?.toLowerCase() || "";
  const isSuperOrHigher = ["superuser", "developer", "admin"].includes(userRole);
  const isDeveloper = ["developer", "superuser", "admin"].includes(userRole);

  // Apply theme (user preference > system preference)
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

  // Block User Management tab if no permission
  useEffect(() => {
    if (!loading && !isSuperOrHigher && selected === "usermanagement") {
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

  const handleLogout = async () => {
    const fd = new FormData();
    fd.append("action", "logout");
    await fetch("/api/admin/auth", { method: "POST", body: fd });
    router.push("/admin/login");
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!isAuthenticated || !user) return <div className="p-8">Not authenticated</div>;

  const avatarSrc = photoPreview || (user.profile_photo ? `/uploads/${user.profile_photo}` : undefined);

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        
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

              {/* Add more LMS-style preferences here later (language, notifications, date format, etc.) */}
            </CardBody>
          </Card>
        </Tab>

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