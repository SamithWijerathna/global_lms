"use client";
import { siteConfig } from "@/config/site";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Table, TableHeader, TableBody, TableColumn, TableRow, TableCell } from "@heroui/table";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownSection, DropdownItem } from "@heroui/dropdown";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Pagination, PaginationItem, PaginationCursor } from "@heroui/pagination";
import { Spinner } from "@heroui/spinner";
import { Chip } from "@heroui/chip";
import { User } from "@heroui/user";
import { Button, ButtonGroup } from "@heroui/button";
import { Input } from "@heroui/input";
import { useConfirm } from "@/components/admin/GlobalConfirm";

import { SearchIcon, ChevronDownIcon, VerticalDotsIcon, PlusIcon } from "@/components/admin/icons"; // Assuming you have these icons in a file
const nicRegex = /^(\d{9}[VX]|\d{12})$/;

const isValidNIC = (value: string) => {
  if (!value) return true;
  return nicRegex.test(value.toUpperCase());
};
const columns = [
  { name: "STUDENT ID", uid: "student_id", sortable: true },
  { name: "NAME", uid: "name", sortable: true },
  { name: "EMAIL", uid: "email", sortable: true },
  { name: "PHONE", uid: "phone" },
  { name: "BATCH", uid: "batch", sortable: true },
  { name: "JOINED", uid: "create_at", sortable: true },
  { name: "STATUS", uid: "status", sortable: true },
  { name: "ACTIONS", uid: "actions" },
];

const statusColorMap = {
  completed: "success",
  pending: "warning",
  inactive: "danger",
};

const INITIAL_VISIBLE_COLUMNS = ["student_id", "name", "phone", "batch", "status", "actions"];

export default function UsersPage() {
  useEffect(() => {
    document.title = `${siteConfig.name} Students Management`;
  }, []);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterValue, setFilterValue] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<any>(new Set([]));
  const [visibleColumns, setVisibleColumns] = useState<any>(new Set(INITIAL_VISIBLE_COLUMNS));
  const [statusFilter, setStatusFilter] = useState<any>("all");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortDescriptor, setSortDescriptor] = useState<any>({ column: "create_at", direction: "descending" });
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [processing, setProcessing] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/students", {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
      });
      const data = await res.json();
      setUsers(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const hasSearchFilter = Boolean(filterValue);

  const headerColumns = useMemo(() => {
    if (visibleColumns === "all") return columns;
    return columns.filter((column) => Array.from(visibleColumns).includes(column.uid));
  }, [visibleColumns]);

  const filteredItems = useMemo(() => {
    let filteredUsers = [...users];

    if (hasSearchFilter) {
      filteredUsers = filteredUsers.filter((user) =>
        `${user.first_name} ${user.last_name} ${user.user_email} ${user.student_id}`
          .toLowerCase()
          .includes(filterValue.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      const statuses = Array.from(statusFilter);
      filteredUsers = filteredUsers.filter((user) => statuses.includes(user.profile_completed ? "completed" : "pending"));
    }

    return filteredUsers;
  }, [users, filterValue, statusFilter]);

  const pages = Math.ceil(filteredItems.length / rowsPerPage) || 1;

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredItems.slice(start, end);
  }, [page, filteredItems, rowsPerPage]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const first = a[sortDescriptor.column];
      const second = b[sortDescriptor.column];
      let cmp = first < second ? -1 : first > second ? 1 : 0;
      if (sortDescriptor.column === "create_at") {
        cmp = new Date(first) < new Date(second) ? -1 : new Date(first) > new Date(second) ? 1 : 0;
      }
      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [sortDescriptor, items]);

  const handleViewEdit = (user: any) => {
    setSelectedUser({ ...user });
    setIsEditMode(false);
    onOpen();
  };

  const handleEdit = () => setIsEditMode(true);

  const handleSave = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}`,
        },
        body: JSON.stringify(selectedUser),
      });
      if (res.ok) {
        fetchUsers();
        setIsEditMode(false);
      }
    } catch (err) {
      console.error(err);
    }
    setProcessing(false);
  };

  const handleDelete = async (user: any) => {
    const confirmed = await confirm({
      title: "Delete User?",
      message: (
        <>
          Are you sure you want to <strong>permanently delete</strong> this user?
          <br />
          <span className="text-default-600">
            {user.first_name} {user.last_name} ({user.student_id})
          </span>
          <br /><br />
          This action <strong>cannot be undone</strong>.
        </>
      ),
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      confirmColor: "danger",
      onConfirm: async () => {
        setProcessing(true);
        try {
          await fetch(`/api/admin/students?uuid=${user.uuid}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
          });
          fetchUsers(); // refresh list
        } catch (err) {
          console.error(err);
        }
        setProcessing(false);
      },
    });

    if (!confirmed) return; // optional: if user canceled
  };
  const renderCell = useCallback((user: any, columnKey: any) => {
    const cellValue = user[columnKey];

    switch (columnKey) {
      case "name":
        return (
          <User
            avatarProps={{ radius: "lg", src: user.profile_url || "/assets/default-avatar.png" }}
            name={`${user.first_name} ${user.last_name}`}
            description={user.user_email}
          />
        );
      case "status":
        const status = user.profile_completed ? "completed" : "pending";
        return (
          <Chip className="capitalize" color={statusColorMap[status as keyof typeof statusColorMap] as any} size="sm" variant="flat">
            {status}
          </Chip>
        );
      case "create_at":
        return new Date(cellValue).toLocaleDateString();
      case "actions":
        return (
          <Dropdown>
            <DropdownTrigger>
              <Button isIconOnly size="sm" variant="light">
                <VerticalDotsIcon className="text-default-300" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Actions">
              <DropdownItem key="view" onPress={() => handleViewEdit(user)}>View Details</DropdownItem>
              <DropdownItem key="edit" onPress={() => handleViewEdit(user)}>Edit</DropdownItem>
              <DropdownItem key="delete" className="text-danger" color="danger" onPress={() => handleDelete(user)}>
                Delete
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        );
      default:
        return cellValue;
    }
  }, []);

  const topContent = useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between gap-3 items-end">
          <Input
            isClearable
            className="w-full sm:max-w-[44%]"
            placeholder="Search by name, email, or ID..."
            startContent={<SearchIcon />}
            value={filterValue}
            onClear={() => setFilterValue("")}
            onValueChange={setFilterValue}
          />
          <div className="flex gap-3">
            <Dropdown>
              <DropdownTrigger className="hidden sm:flex">
                <Button endContent={<ChevronDownIcon />} variant="flat">
                  Status
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                disallowEmptySelection
                closeOnSelect={false}
                selectedKeys={statusFilter}
                selectionMode="multiple"
                onSelectionChange={setStatusFilter}
              >
                <DropdownItem key="completed">Profile Completed</DropdownItem>
                <DropdownItem key="pending">Profile Pending</DropdownItem>
              </DropdownMenu>
            </Dropdown>
            <Dropdown>
              <DropdownTrigger className="hidden sm:flex">
                <Button endContent={<ChevronDownIcon />} variant="flat">
                  Columns
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                disallowEmptySelection
                closeOnSelect={false}
                selectedKeys={visibleColumns}
                selectionMode="multiple"
                onSelectionChange={setVisibleColumns}
              >
                {columns.map((column) => (
                  <DropdownItem key={column.uid}>{column.name}</DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-default-400 text-small">Total {users.length} users</span>
          <label className="flex items-center text-default-400 text-small">
            Rows per page:
            <select
              className="bg-transparent outline-none text-default-400 text-small"
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </label>
        </div>
      </div>
    );
  }, [filterValue, statusFilter, visibleColumns, users.length]);

  const bottomContent = useMemo(() => {
    return (
      <div className="py-2 px-2 flex justify-between items-center">
        <Pagination
          isCompact
          showControls
          showShadow
          color="primary"
          page={page}
          total={pages}
          onChange={setPage}
        />
      </div>
    );
  }, [page, pages]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Users Management</h1>

      {loading ? (
        <div className="flex justify-center py-20 w-full h-screen">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="overflow-x-auto w-full">
          <Table
            aria-label="Users table with sorting, filtering and pagination"
            isHeaderSticky
            bottomContent={bottomContent}
            bottomContentPlacement="outside"
            selectedKeys={selectedKeys}
            selectionMode="multiple"
            sortDescriptor={sortDescriptor}
            topContent={topContent}
            topContentPlacement="outside"
            onSelectionChange={setSelectedKeys}
            onSortChange={setSortDescriptor}
          >
            <TableHeader columns={headerColumns}>
              {(column) => (
                <TableColumn
                  key={column.uid}
                  align={column.uid === "actions" ? "center" : "start"}
                  allowsSorting={column.sortable}
                >
                  {column.name}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody items={sortedItems} emptyContent="No users found">
              {(item) => (
                <TableRow key={item.uuid}>
                  {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* User Details / Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
        <ModalContent>
          <>
            <ModalHeader className="flex flex-col gap-1">
              {isEditMode ? "Edit User" : "User Details"}
            </ModalHeader>
            <ModalBody>
              {selectedUser && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Student ID"
                      value={selectedUser.student_id}
                      isReadOnly={!isEditMode}
                      onValueChange={(v) => setSelectedUser({ ...selectedUser, student_id: v })}
                    />
                    <Input
                      label="First Name"
                      value={selectedUser.first_name}
                      isReadOnly={!isEditMode}
                      onValueChange={(v) => setSelectedUser({ ...selectedUser, first_name: v })}
                    />
                    <Input
                      label="Last Name"
                      value={selectedUser.last_name}
                      isReadOnly={!isEditMode}
                      onValueChange={(v) => setSelectedUser({ ...selectedUser, last_name: v })}
                    />
                    <Input
                      label="Email"
                      value={selectedUser.user_email}
                      isReadOnly={!isEditMode}
                      onValueChange={(v) => setSelectedUser({ ...selectedUser, user_email: v })}
                    />
                    <Input
                      label="Phone"
                      value={selectedUser.phone}
                      isReadOnly={!isEditMode}
                      onValueChange={(v) => setSelectedUser({ ...selectedUser, phone: v })}
                    />
                    <Input
                      label="Batch"
                      value={selectedUser.batch}
                      isReadOnly={!isEditMode}
                      onValueChange={(v) => setSelectedUser({ ...selectedUser, batch: v })}
                    />
                    <Input
                      label="Address"
                      value={selectedUser.user_address || ""}
                      isReadOnly={!isEditMode}
                      onValueChange={(v) => setSelectedUser({ ...selectedUser, user_address: v })}
                    />
                    <Input
                      label="ID Card Details"
                      value={selectedUser.id_number || ""}
                      isReadOnly={!isEditMode}
                      onValueChange={(v) => {
                        const value = v.toUpperCase();
                        if (/^[0-9VX]*$/.test(value)) {
                          setSelectedUser({ ...selectedUser, id_number: value });
                        }
                      }}

                      isInvalid={!isValidNIC(selectedUser.id_number || "")}
                      errorMessage="Enter valid Sri Lanka NIC (9 digits + V/X or 12 digits)"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Profile Status</p>
                    <Chip color={selectedUser.profile_completed ? "success" : "warning"}>
                      {selectedUser.profile_completed ? "Completed" : "Pending Setup"}
                    </Chip>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Joined Date</p>
                    <p>{new Date(selectedUser.create_at).toLocaleDateString()}</p>
                  </div>

                  {selectedUser.profile_url && (
                    <div>
                      <p className="text-sm font-medium mb-2">Profile Photo</p>
                      <img src={selectedUser.profile_url} alt="Profile" className="w-32 h-32 rounded-lg object-cover" />
                    </div>
                  )}
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              {!isEditMode ? (
                <>
                  <Button variant="flat" onPress={handleEdit}>
                    Edit
                  </Button>
                  <Button color="danger" onPress={() => handleDelete(selectedUser)} isLoading={processing}>
                    Delete User
                  </Button>
                  <Button color="primary" onPress={onClose}>
                    Close
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="light" onPress={() => setIsEditMode(false)} isDisabled={processing}>
                    Cancel
                  </Button>
                  <Button color="primary" onPress={handleSave} isLoading={processing}>
                    Save Changes
                  </Button>
                </>
              )}
            </ModalFooter>
          </>
        </ModalContent>
      </Modal>
    </div>
  );
}