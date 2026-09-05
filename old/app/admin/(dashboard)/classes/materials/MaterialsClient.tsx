"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardFooter,
} from "@heroui/card";
import { Image } from "@heroui/image";
import ProtectedYouTubePlayer, { getYouTubeId } from "@/components/ProtectedYouTubePlayer";
import { Button } from "@heroui/button";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Skeleton } from "@heroui/skeleton";
import { Chip } from "@heroui/chip";
import { VerticalDotsIcon,EditDocumentIcon,DeleteDocumentIcon } from "@/components/admin/icons";
import Link from "next/link";
import { useConfirm } from "@/components/admin/GlobalConfirm";
import {useSearchParams, useRouter } from "next/navigation"; 


import { ArrowUp, ArrowDown, Search } from "lucide-react";
import { Input } from "@heroui/input";

export default function MaterialsPage() {
  const searchParams = useSearchParams();
  const classIdParam = searchParams.get("class_id");
  const classId = classIdParam;

  const router = useRouter();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [reordering, setReordering] = useState<boolean>(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<{ type: "video" | "pdf" | "image" | "link"; url: string } | null>(null);
  const confirm = useConfirm();

  const handleMoveMaterial = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= materials.length) return;

    const updated = [...materials];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const items = updated.map((mat, idx) => ({
      material_id: mat.material_id,
      display_order: idx,
    }));

    setMaterials(updated);
    setReordering(true);

    try {
      await fetch("/api/admin/classes/materials/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}`,
        },
        body: JSON.stringify({ items }),
      });
    } catch (err) {
      console.error("Material reorder failed", err);
      if (selectedClass) fetchMaterials(selectedClass.class_id);
    } finally {
      setReordering(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/admin/classes/materials", {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
      });
      const data = await res.json();
      setClasses(data);
      setLoadingClasses(false);
      return data; // Return data for immediate use
    } catch (err) {
      console.error(err);
      setLoadingClasses(false);
      return [];
    }
  };

  const fetchMaterials = async (classId: string) => {
    setLoadingMaterials(true);
    try {
      const res = await fetch(`/api/admin/classes/materials?class_id=${classId}`, {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
      });
      const data = await res.json();
      setMaterials(data);
      setLoadingMaterials(false);
    } catch (err) {
      console.error(err);
      setLoadingMaterials(false);
    }
  };

  useEffect(() => {
    const initializePage = async () => {
      const fetchedClasses = await fetchClasses();
      
      // If there's a classId in the URL, set it as selected
      if (classId && fetchedClasses.length > 0) {
        const cls = fetchedClasses.find((c: any) => c.class_id === classId);
        if (cls) {
          setSelectedClass(cls);
          fetchMaterials(classId);
        }
      }
    };
    
    initializePage();
  }, []);

  // Handle classId changes from URL
  useEffect(() => {
    if (!classId || classes.length === 0) return;
    
    const cls = classes.find((c: any) => c.class_id === classId);
    if (cls && (!selectedClass || selectedClass.class_id !== classId)) {
      setSelectedClass(cls);
      fetchMaterials(classId);
    }
  }, [classId, classes]);

  const handleClassClick = (cls: any) => {
    setSelectedClass(cls);
    fetchMaterials(cls.class_id);
  };

  const handleBack = () => {
    setSelectedClass(null);
    setMaterials([]);
    // Optionally clear the URL parameter
    router.push('/admin/classes/materials');
  };

  const handlePreview = (material: any) => {
    if (material.material_video_url) {
      setPreviewContent({ type: "video", url: material.material_video_url });
    } else if (material.material_pdf_url) {
      setPreviewContent({ type: "pdf", url: material.material_pdf_url });
    } else if (material.material_link) {
      setPreviewContent({ type: "link", url: material.material_link });
    } else if (material.material_imageurl) {
      setPreviewContent({ type: "image", url: material.material_imageurl });
    }
    setPreviewOpen(true);
  };

  const handleDelete = async (materialId: string) => {
    await confirm({
      title: "Delete Material?",
      message: (
        <>
          Are you sure you want to <strong>permanently delete</strong> this material?
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
          const res = await fetch(
            `/api/admin/classes/materials?material_id=${materialId}`,
            { 
              method: "DELETE",
              headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
            }
          );

          if (res.ok) {
            if (selectedClass) {
              await fetchMaterials(selectedClass.class_id);
            }
            fetchClasses();
          }
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  if (loadingClasses) {
    return (
      <div className="p-6">
        <h1 className="text-4xl font-bold mb-8">Materials</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="relative w-full h-[400px] overflow-hidden">
              <Skeleton className="w-full h-full rounded-lg" />
              <CardFooter className="absolute bg-white/30 backdrop-blur-md bottom-0 border-t-1 border-zinc-100/50 z-10 w-full">
                <div className="flex flex-col gap-1 w-full px-4 py-3">
                  <Skeleton className="h-8 w-3/4 rounded-lg" />
                  <Skeleton className="h-6 w-32 rounded-lg mb-2" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full">
      <div className="flex items-center gap-4 mb-8">
        {selectedClass && (
          <Button className="bg-gray-100 dark:bg-gray-500 dark:text-white" variant="light" onPress={handleBack}>
            ← Back to Classes
          </Button>
        )}
        <h1 className="text-4xl font-bold">
          {selectedClass ? `Materials - ${selectedClass.class_title}` : "Select a Class"}
        </h1>
        <div className="flex-1" />
        <Link href="/admin/classes/materials/add">
          <Button color="primary" size="lg">
            Add New Material
          </Button>
        </Link>
      </div>

      {!selectedClass ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {classes.map((cls: any) => (
            <div key={cls.class_id} className="cursor-pointer" onClick={() => handleClassClick(cls)}>
              <Card className="relative w-full h-[400px] overflow-hidden shadow-xl">
                {cls.class_imageurl ? (
                  <Image
                    removeWrapper
                    alt={cls.class_title}
                    className="z-0 w-full h-full object-cover"
                    src={cls.class_imageurl}
                  />
                ) : (
                  <div className="z-0 w-full h-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center">
                    <span className="text-white/80 text-xl font-medium">No Image</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent z-10" />

                <CardFooter className="absolute bg-white/30 backdrop-blur-md bottom-0 border-t-1 border-zinc-100/50 z-20 w-full">
                  <div className="flex flex-col gap-1 w-full px-4 py-3">
                    <h4 className="text-white font-semibold text-2xl drop-shadow-lg">
                      {cls.class_title}
                    </h4>
                    <p className="text-white/80 text-sm">
                      {cls.batch} • {cls.class_type}
                    </p>
                    <p className="text-white/70 text-xs mt-1">
                      {cls.material_count || 0} material{cls.material_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>
      ) : loadingMaterials ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="h-[320px]">
              <Skeleton className="w-full h-[200px] rounded-t-lg" />
              <CardBody>
                <Skeleton className="h-6 w-3/4 rounded-lg mb-2" />
                <Skeleton className="h-4 w-full rounded-lg" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : materials.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-xl text-default-500">No materials in this class yet.</p>
        </div>
      ) : (() => {
        const sections = Array.from(
          new Set(materials.map((m: any) => m.section_name || "General"))
        );
        const sectionFiltered =
          selectedSection === "ALL"
            ? materials
            : materials.filter(
                (m: any) => (m.section_name || "General") === selectedSection
              );
        const displayedMaterials = sectionFiltered.filter(
          (m: any) =>
            !searchQuery ||
            m.material_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.material_description?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
          <div>
            {/* Search & Section Filter Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
              {/* Toggleable Custom Section Cards / Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                <Button
                  size="sm"
                  variant={selectedSection === "ALL" ? "solid" : "flat"}
                  color={selectedSection === "ALL" ? "primary" : "default"}
                  onPress={() => setSelectedSection("ALL")}
                  className="font-medium"
                >
                  All Sections ({materials.length})
                </Button>
                {sections.map((secName) => {
                  const count = materials.filter(
                    (m: any) => (m.section_name || "General") === secName
                  ).length;
                  return (
                    <Button
                      key={secName}
                      size="sm"
                      variant={selectedSection === secName ? "solid" : "flat"}
                      color={selectedSection === secName ? "primary" : "default"}
                      onPress={() => setSelectedSection(secName)}
                      className="font-medium capitalize"
                    >
                      {secName} ({count})
                    </Button>
                  );
                })}
              </div>

              {/* Search Box */}
              <div className="w-full md:w-72">
                <Input
                  placeholder="Search materials..."
                  size="sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  startContent={<Search className="w-4 h-4 text-default-400" />}
                />
              </div>
            </div>

            {displayedMaterials.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-default-500 text-lg">No materials found in this section/search.</p>
              </div>
            ) : (() => {
              const displayedBySection = displayedMaterials.reduce((acc, m) => {
                const sec = m.section_name || "General";
                if (!acc[sec]) acc[sec] = [];
                acc[sec].push(m);
                return acc;
              }, {} as Record<string, any[]>);

              return (
                <div className="space-y-10">
                  {Object.entries(displayedBySection).map(([sectionName, secMats]) => (
                    <div key={sectionName}>
                      {/* Section Header / Text Separator */}
                      <div className="flex items-center gap-3 mb-6 pb-2 border-b border-default-200 dark:border-default-100">
                        <span className="w-2.5 h-2.5 rounded-full bg-secondary shadow-sm" />
                        <h3 className="text-xl font-bold text-foreground capitalize tracking-wide">
                          {sectionName}
                        </h3>
                        <Chip color="secondary" variant="flat" size="sm" className="font-semibold">
                          {secMats.length} item{secMats.length !== 1 ? "s" : ""}
                        </Chip>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {secMats.map((mat: any) => {
                          const originalIndex = materials.findIndex(
                            (m: any) => m.material_id === mat.material_id
                          );
                          return (
                            <Card key={mat.material_id} className="shadow-lg relative overflow-hidden">
                              <div
                                className="relative h-[200px] cursor-pointer"
                                onClick={() => handlePreview(mat)}
                              >
                                {mat.material_imageurl ? (
                                  <Image
                                    removeWrapper
                                    alt={mat.material_title}
                                    className="w-full h-full object-cover rounded-t-lg"
                                    src={mat.material_imageurl}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                    <span className="text-gray-600 text-lg">No Cover</span>
                                  </div>
                                )}

                                {/* Top Left Reorder Controls */}
                                <div className="absolute top-2 left-2 z-20 flex gap-1">
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="bordered"
                                    className="border-white/30 bg-black/50 text-white hover:bg-black/70"
                                    isDisabled={originalIndex === 0 || reordering}
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      handleMoveMaterial(originalIndex, "up");
                                    }}
                                    title="Move material up"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="bordered"
                                    className="border-white/30 bg-black/50 text-white hover:bg-black/70"
                                    isDisabled={originalIndex === materials.length - 1 || reordering}
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      handleMoveMaterial(originalIndex, "down");
                                    }}
                                    title="Move material down"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </Button>
                                </div>

                                <div className="absolute top-2 right-2 z-10">
                                  <Chip
                                    color={
                                      mat.material_type === "video"
                                        ? "success"
                                        : mat.material_type === "pdf"
                                        ? "warning"
                                        : "secondary"
                                    }
                                    size="sm"
                                  >
                                    {mat.material_type.toUpperCase()}
                                  </Chip>
                                </div>

                                {(mat.material_video_url || mat.material_pdf_url) && (
                                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-t-lg">
                                    <Button color="white" variant="shadow">
                                      Preview
                                    </Button>
                                  </div>
                                )}
                              </div>

                              <CardBody>
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <h3 className="text-xl font-semibold">{mat.material_title}</h3>
                                </div>
                                <Chip size="sm" variant="flat" color="secondary" className="mb-2 font-medium">
                                  {mat.section_name || "General"}
                                </Chip>
                                <p className="text-default-600 text-sm">
                                  {mat.material_description || "No description"}
                                </p>
                              </CardBody>

                              <CardFooter className="justify-end">
                                <Dropdown>
                                  <DropdownTrigger>
                                    <Button isIconOnly size="sm" variant="light">
                                      <VerticalDotsIcon className="w-5 h-5" />
                                    </Button>
                                  </DropdownTrigger>
                                  <DropdownMenu aria-label="Material actions" variant="faded">
                                    <DropdownItem
                                      key="edit"
                                      description="Update material"
                                      startContent={<EditDocumentIcon className="w-5 h-5" />}
                                      onPress={() =>
                                        router.push(`/admin/classes/materials/edit/${mat.material_id}`)
                                      }
                                    >
                                      Edit
                                    </DropdownItem>
                                    <DropdownItem
                                      key="delete"
                                      className="text-danger"
                                      color="danger"
                                      description="Remove permanently"
                                      startContent={<DeleteDocumentIcon className="w-5 h-5 text-danger" />}
                                      onPress={() => handleDelete(mat.material_id)}
                                    >
                                      Delete
                                    </DropdownItem>
                                  </DropdownMenu>
                                </Dropdown>
                              </CardFooter>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        );
      })()}

      <Modal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} size="5xl">
        <ModalContent>
          <ModalHeader>{previewContent?.type.toUpperCase()} Preview</ModalHeader>
          <ModalBody className="flex justify-center">
            {previewContent?.type === "video" ? (
              <video controls className="max-w-full max-h-[80vh] rounded-lg">
                <source src={previewContent.url} type="video/mp4" />
                Your browser does not support video.
              </video>
            ) : previewContent?.type === "pdf" ? (
              <iframe src={previewContent.url} className="w-full h-[80vh] rounded-lg" title="PDF Preview" />
            ) : previewContent?.type === "link" ? (
              <ProtectedYouTubePlayer url={previewContent.url} className="w-full max-w-4xl" />
            ) : previewContent?.type === "image" ? (
              <Image src={previewContent.url} alt="Preview" className="max-w-full max-h-[80vh] rounded-lg" />
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button onPress={() => setPreviewOpen(false)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}