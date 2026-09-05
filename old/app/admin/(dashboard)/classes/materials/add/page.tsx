"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
} from "@heroui/card";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Progress } from "@heroui/progress";
import { Chip } from "@heroui/chip";
import { Image } from "@heroui/image";
import ProtectedYouTubePlayer, { getYouTubeId } from "@/components/ProtectedYouTubePlayer";

const CHUNK_SIZE = 16 * 1024 * 1024;

export default function AddMaterialPage() {
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [materialType, setMaterialType] = useState<"video" | "pdf" | "link">("video");

  const [formData, setFormData] = useState({
    material_title: "",
    material_description: "",
    section_name: "",
    display_order: "0",
    material_link: "",
    expire_hours: "",
    view_limit: "",
  });

  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [pdfDownloadable, setPdfDownloadable] = useState(true);
  const [videoViewCountEnabled, setVideoViewCountEnabled] = useState(false);
  const [isUnlimitedExpire, setIsUnlimitedExpire] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const hasInput = formData.material_title || videoFile || pdfFile || formData.material_link || imageFile;

  useEffect(() => {
    fetch("/api/admin/classes/materials", {
      credentials: "include",
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
    })
      .then(res => res.json())
      .then(data => {
        setClasses(data);
        setLoadingClasses(false);
      })
      .catch(() => setLoadingClasses(false));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (type: "video" | "pdf" | "image", file: File | null) => {
    if (type === "video") {
      setVideoFile(file);
      if (file) setVideoPreview(URL.createObjectURL(file));
    }
    if (type === "pdf") setPdfFile(file);
    if (type === "image") {
      setImageFile(file);
      if (file) setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadInChunks = async (file: File, fileType: "video" | "pdf" | "image") => {
    const tempUploadId = crypto.randomUUID();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const chunkForm = new FormData();
      chunkForm.append("chunk", chunk);
      chunkForm.append("chunkIndex", i.toString());
      chunkForm.append("tempUploadId", tempUploadId);
      chunkForm.append("fileType", fileType);
      chunkForm.append("originalName", file.name);

      const res = await fetch("/api/admin/classes/materials", {
        method: "POST",
        credentials: "include",
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
        body: chunkForm,
      });

      if (!res.ok) throw new Error("Chunk upload failed");

      setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
    }

    const finalizeForm = new FormData();
    finalizeForm.append("finalize_file", "true");
    finalizeForm.append("tempUploadId", tempUploadId);
    finalizeForm.append("fileType", fileType);

    const finalizeRes = await fetch("/api/admin/classes/materials", {
      method: "POST",
      credentials: "include",
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
      body: finalizeForm,
    });

    const data = await finalizeRes.json();
    if (!data.success) throw new Error("Finalize failed");
    return data.fileUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.material_title || selectedClasses.length === 0) {
      alert("Title and class selection required");
      return;
    }

    if ((materialType === "video" && !videoFile) || (materialType === "pdf" && !pdfFile)) {
      alert("File required for video/PDF");
      return;
    }

    setIsUploading(true);
    setUploadStatus("Preparing...");

    try {
      let videoUrl = null;
      let pdfUrl = null;
      let imageUrl = null;

      if (videoFile) {
        setUploadStatus("Uploading video...");
        videoUrl = await uploadInChunks(videoFile, "video");
      }

      if (pdfFile) {
        setUploadStatus("Uploading PDF...");
        pdfUrl = await uploadInChunks(pdfFile, "pdf");
      }

      if (imageFile) {
        setUploadStatus("Uploading cover...");
        imageUrl = await uploadInChunks(imageFile, "image");
      }

      setUploadStatus("Saving to database...");

      const dbForm = new FormData();
      dbForm.append("section_name", formData.section_name || "General");
      dbForm.append("display_order", formData.display_order || "0");
      dbForm.append("db_insert", "true");
      dbForm.append("material_title", formData.material_title);
      dbForm.append("material_description", formData.material_description || "");
      dbForm.append("material_type", materialType);
      dbForm.append("material_link", formData.material_link || "");
      dbForm.append("class_ids", JSON.stringify(selectedClasses));
      dbForm.append("material_id", `MT${Date.now().toString(36).toUpperCase()}`);
      if (videoUrl) dbForm.append("material_video_url", videoUrl);
      if (pdfUrl) dbForm.append("material_pdf_url", pdfUrl);
      if (imageUrl) dbForm.append("material_imageurl", imageUrl);
      dbForm.append("downloadable", pdfDownloadable.toString());

      if (materialType === "video") {
        if (isUnlimitedExpire) {
          dbForm.append("expire_hours", "unlimited");
        } else if (formData.expire_hours) {
          dbForm.append("expire_hours", formData.expire_hours);
        }

        dbForm.append("view_count_enabled", videoViewCountEnabled ? "true" : "false");
        if (videoViewCountEnabled && formData.view_limit) {
          dbForm.append("view_limit", formData.view_limit);
        }
      }

      const res = await fetch("/api/admin/classes/materials", {
        method: "POST",
        credentials: "include",
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
        body: dbForm,
      });

      if (res.ok) {
        setSuccessModalOpen(true);
        // Reset form
        setFormData({ material_title: "", material_description: "", material_link: "", expire_hours: "", view_limit: "" });
        setSelectedClasses([]);
        setVideoFile(null); setPdfFile(null); setImageFile(null);
        setVideoPreview(null); setImagePreview(null);
        setPdfDownloadable(true); setVideoViewCountEnabled(false); setIsUnlimitedExpire(false);
        document.querySelectorAll('input[type="file"]').forEach(el => (el as HTMLInputElement).value = "");
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || "Failed to save material");
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus("");
    }
  };

  const getSelectedClassNames = () => {
    return classes
      .filter((cls: any) => selectedClasses.includes(cls.class_id))
      .map((cls: any) => cls.class_title)
      .join(", ") || "No classes selected";
  };

  const getTypeChipColor = () => {
    switch (materialType) {
      case "video": return "success";
      case "pdf": return "warning";
      case "link": return "secondary";
      default: return "default";
    }
  };

  const getTypeLabel = () => materialType.toUpperCase();

  return (
    <div className="p-6">
      <h1 className="text-4xl font-bold mb-8">Add New Material</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Form */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Material Title *"
              placeholder="e.g. Chapter 1 - Introduction"
              value={formData.material_title}
              onChange={handleInputChange}
              name="material_title"
              isRequired
            />

            <Input
              label="Description (Optional)"
              placeholder="Brief description"
              value={formData.material_description}
              onChange={handleInputChange}
              name="material_description"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Custom Section Name"
                placeholder="e.g. Lesson 1: Introduction, Past Papers, Theory Notes"
                value={formData.section_name}
                onChange={handleInputChange}
                name="section_name"
                description="Custom category or section for grouping materials (default: General)"
              />

              <Input
                label="Display Order (Sort Position)"
                type="number"
                placeholder="0"
                value={formData.display_order}
                onChange={handleInputChange}
                name="display_order"
                description="Position number for ordering cards (0 = top)"
              />
            </div>

            <Select
              label="Material Type *"
              selectedKeys={[materialType]}
              onSelectionChange={(keys) => setMaterialType(Array.from(keys)[0] as any)}
            >
              <SelectItem key="video">Video</SelectItem>
              <SelectItem key="pdf">PDF</SelectItem>
              <SelectItem key="link">Custom Link</SelectItem>
            </Select>

            {materialType === "video" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Video File *</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileChange("video", e.target.files?.[0] || null)}
                    required
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <Switch
                    isSelected={videoViewCountEnabled}
                    onValueChange={setVideoViewCountEnabled}
                  >
                    Enable View Count Limit
                  </Switch>
                </div>

                {videoViewCountEnabled && (
                  <Input
                    label="Maximum Views"
                    type="number"
                    placeholder="e.g. 5"
                    name="view_limit"
                    value={formData.view_limit}
                    onChange={handleInputChange}
                  />
                )}

                <div className="flex items-center gap-4">
                  <Input
                    label="Expire After (hours)"
                    type="number"
                    placeholder="e.g. 48"
                    name="expire_hours"
                    value={formData.expire_hours}
                    onChange={handleInputChange}
                    isDisabled={isUnlimitedExpire}
                    className="flex-1"
                  />
                  <Button
                    variant={isUnlimitedExpire ? "solid" : "bordered"}
                    color="primary"
                    onPress={() => setIsUnlimitedExpire(!isUnlimitedExpire)}
                  >
                    Unlimited
                  </Button>
                </div>
              </>
            )}

            {materialType === "pdf" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">PDF File *</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileChange("pdf", e.target.files?.[0] || null)}
                    required
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <Switch
                    isSelected={pdfDownloadable}
                    onValueChange={setPdfDownloadable}
                  >
                    Allow Download
                  </Switch>
                </div>
              </>
            )}

            {materialType === "link" && (
              <Input
                label="Custom Link *"
                placeholder="https://youtube.com/watch?v=..."
                name="material_link"
                value={formData.material_link}
                onChange={handleInputChange}
                isRequired
              />
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Cover Image (Recommended)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange("image", e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
              />
            </div>

            {loadingClasses ? (
              <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
            ) : (
              <Select
                label="Assign to Classes *"
                selectionMode="multiple"
                placeholder="Select classes"
                selectedKeys={selectedClasses}
                onSelectionChange={(keys) => setSelectedClasses(Array.from(keys as Set<string>))}
                renderValue={() => getSelectedClassNames()}
              >
                {classes.map((cls: any) => (
                  <SelectItem key={cls.class_id} value={cls.class_id}>
                    {cls.class_title} ({cls.class_id})
                  </SelectItem>
                ))}
              </Select>
            )}

            <Button
              type="submit"
              color="primary"
              size="lg"
              isLoading={isUploading}
              className="w-full mt-8"
            >
              Add Material
            </Button>
          </form>
        </div>

        {/* Live Preview */}
        <div className="flex items-start justify-center">
          {!hasInput ? (
            <Card className="w-full max-w-md h-[500px] shadow-xl">
              <div className="h-[300px] bg-gray-200 rounded-t-lg animate-pulse" />
              <CardBody className="pt-6 space-y-4">
                <div className="h-8 bg-gray-200 rounded-lg w-3/4 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded-lg w-full animate-pulse" />
                <div className="h-4 bg-gray-200 rounded-lg w-2/3 animate-pulse" />
              </CardBody>
            </Card>
          ) : (
            <Card className="w-full max-w-md shadow-2xl overflow-hidden relative">
              {materialType === "link" && getYouTubeId(formData.material_link) ? (
                <ProtectedYouTubePlayer url={formData.material_link} />
              ) : imagePreview ? (
                <Image
                  removeWrapper
                  alt="Cover"
                  className="w-full h-[300px] object-cover"
                  src={imagePreview}
                />
              ) : (
                <div className="w-full h-[300px] bg-gradient-to-br from-purple-900 to-indigo-950 flex flex-col items-center justify-center text-white/80 p-6 relative">
                  <span className="text-5xl font-black tracking-widest uppercase opacity-40">
                    {materialType}
                  </span>
                  <Chip
                    className="absolute top-4 right-4 capitalize font-semibold"
                    color={getTypeChipColor()}
                    variant="solid"
                  >
                    {materialType}
                  </Chip>
                </div>
              )}

              {(videoPreview || pdfFile) && (
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity z-20 cursor-pointer"
                  onClick={() => {
                    // You can open a modal here for full preview if needed
                  }}
                >
                  <Button color="white" size="lg" variant="shadow">
                    {videoPreview ? "Play Video" : "Preview PDF"}
                  </Button>
                </div>
              )}

              <CardBody className="pt-6">
                <h3 className="text-2xl font-bold">{formData.material_title || "Material Title"}</h3>
                <p className="text-default-600 mt-2">
                  {formData.material_description || "No description"}
                </p>

                {materialType === "link" && formData.material_link && !getYouTubeId(formData.material_link) && (
                  <p className="text-primary text-sm mt-3 break-all">{formData.material_link}</p>
                )}

                <div className="mt-6 space-y-2">
                  {materialType === "video" && (
                    <>
                      {formData.expire_hours && (
                        <p className="text-sm text-default-500">
                          Expires in: {isUnlimitedExpire ? "Never" : `${formData.expire_hours} hours`}
                        </p>
                      )}
                      {videoViewCountEnabled && formData.view_limit && (
                        <p className="text-sm text-default-500">
                          View Limit: {formData.view_limit} times
                        </p>
                      )}
                    </>
                  )}
                  {materialType === "pdf" && (
                    <p className="text-sm text-default-500">
                      Download: {pdfDownloadable ? "Allowed" : "View Only"}
                    </p>
                  )}
                  <p className="text-sm text-default-500">
                    Assigned to {selectedClasses.length} class{selectedClasses.length !== 1 ? "es" : ""}:{" "}
                    <span className="font-medium">{getSelectedClassNames()}</span>
                  </p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Upload Progress Modal */}
      <Modal isOpen={isUploading} backdrop="blur" isDismissable={false}>
        <ModalContent className="w-96">
          <ModalHeader>Uploading Material</ModalHeader>
          <ModalBody>
            <Progress value={uploadProgress} color="primary" className="mb-4" />
            <p className="text-center text-sm">{uploadStatus || "Processing..."}</p>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}