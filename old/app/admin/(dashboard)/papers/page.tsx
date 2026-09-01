'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardFooter,
} from "@heroui/card";
import { Image } from "@heroui/image";
import { Button } from "@heroui/button";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Skeleton } from "@heroui/skeleton";
import { VerticalDotsIcon, EditDocumentIcon, DeleteDocumentIcon } from "@/components/admin/icons";
import { useConfirm } from "@/components/admin/GlobalConfirm";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Paper = {
  id: number;
  paper_id: string;
  paper_name: string | null;
  paper_cover_image: string | null;
};

export default function PapersPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();
  const router = useRouter();

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const token = process.env.NEXT_PUBLIC_API_SECRET_TOKEN;
      
      const res = await fetch('/api/papers', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPapers(data);
      }
    } catch (err) {
      console.error('Failed to fetch papers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, []);

  const handleDelete = async (id: number) => {
    await confirm({
      title: "Delete Paper?",
      message: (
        <>
          Are you sure you want to <strong>permanently delete</strong> this paper?
          <br />
          <span className="text-danger font-medium">
            This action cannot be undone.
          </span>
        </>
      ),
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      confirmColor: "danger",
      onConfirm: async () => {
        try {
          const token = process.env.NEXT_PUBLIC_API_SECRET_TOKEN;
          
          const res = await fetch(`/api/papers?id=${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (res.ok) {
            fetchPapers();
          } else {
            alert('Failed to delete paper');
          }
        } catch (err) {
          console.error(err);
          alert('Error deleting paper');
        }
      },
    });
  };

  return (
    <div className="p-6 w-full">
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-4xl font-bold">Paper Management</h1>
        <div className="flex-1" />
        <Link href="/admin/papers/add">
          <Button color="primary" size="lg">
            Add New Paper
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="relative w-full h-[400px] overflow-hidden">
              <Skeleton className="w-full h-full rounded-lg" />
            </Card>
          ))}
        </div>
      ) : papers.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-xl text-default-500">No papers found. Add one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {papers.map((paper) => (
            <Card
              key={paper.id}
              className="relative w-full h-[400px] overflow-hidden shadow-xl"
            >
              {paper.paper_cover_image ? (
                <Image
                  removeWrapper
                  alt={paper.paper_name || 'Paper'}
                  className="z-0 w-full h-full object-cover"
                  src={`/uploads/papers/${paper.paper_cover_image}`}
                />
              ) : (
                <div className="z-0 w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white/90 text-3xl font-bold text-center px-8">
                    {paper.paper_name || 'Untitled Paper'}
                  </span>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />

              <CardFooter className="absolute bottom-0 bg-white/30 backdrop-blur-md z-20 w-full border-t-1 border-zinc-100/50">
                <div className="flex flex-col gap-1 w-full px-4 py-3">
                  <h4 className="text-white font-semibold text-2xl drop-shadow-lg">
                    {paper.paper_name || 'Untitled Paper'}
                  </h4>
                  <p className="text-white/80 text-sm font-mono">
                    {paper.paper_id}
                  </p>
                </div>
              </CardFooter>

              <div className="absolute top-4 right-4 z-30">
                <Dropdown>
                  <DropdownTrigger>
                    <Button isIconOnly size="sm" variant="light">
                      <VerticalDotsIcon className="w-5 h-5 text-white" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="Paper actions" variant="faded">
                    <DropdownItem
                      key="edit"
                      description="Update paper"
                      startContent={<EditDocumentIcon className="w-5 h-5" />}
                      onPress={() => router.push(`/admin/papers/edit/${paper.id}`)}
                    >
                      Edit
                    </DropdownItem>
                    <DropdownItem
                      key="delete"
                      className="text-danger"
                      color="danger"
                      description="Remove permanently"
                      startContent={<DeleteDocumentIcon className="w-5 h-5 text-danger" />}
                      onPress={() => handleDelete(paper.id)}
                    >
                      Delete
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}