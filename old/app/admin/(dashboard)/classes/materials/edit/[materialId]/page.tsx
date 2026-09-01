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
import { useParams } from "next/navigation";

const CHUNK_SIZE = 5 * 1024 * 1024;

export default function EditMaterialPage() {
  const params = useParams();
  const materialId = params.materialId as string;

  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingMaterial, setLoadingMaterial] = useState(true);

  const [materialType, setMaterialType] = useState<"video" | "pdf" | "link">("video");

  const [formData, setFormData] = useState({
    material_title: "",
    material_description: "",
    material_link: "",
    expire_hours: "",
    view_limit: "",
  });

  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
  const [newPdfFile, setNewPdfFile] = useState<File | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);

  const [pdfDownloadable, setPdfDownloadable] = useState(true);
  const [videoViewCountEnabled, setVideoViewCountEnabled] = useState(false);
  const [isUnlimitedExpire, setIsUnlimitedExpire] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!materialId) return;

    const fetchClasses = async () => {
      try {
        const res = await fetch("/api/admin/classes/materials", {
          credentials: "include",
          headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
        });
        const data = await res.json();
        setClasses(data);
        setLoadingClasses(false);
      } catch (err) {
        setLoadingClasses(false);
      }
    };

    const fetchMaterial = async () => {
      try {
        const res = await fetch(`/api/admin/classes/materials?material_id=${materialId}`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
        });
        const data = await res.json();
        if (data.length > 0) {
          const mat = data[0];
          setFormData({
            material_title: mat.material_title,
            material_description: mat.material_description || "",
            material_link: mat.material_link || "",
            expire_hours: mat.expire_hours && mat.expire_hours !== "unlimited" ? mat.expire_hours : "",
            view_limit: mat.view_limit || "",
          });
          setMaterialType(mat.material_type);
          setCurrentVideoUrl(mat.material_video_url);
          setCurrentPdfUrl(mat.material_pdf_url);
          setCurrentImageUrl(mat.material_imageurl);
          setPdfDownloadable(mat.downloadable === 1);
          setVideoViewCountEnabled(mat.view_count_enabled === 1);
          setIsUnlimitedExpire(mat.expire_hours === "unlimited");

          const classIds = data.map((m: any) => m.class_id);
          setSelectedClasses(classIds);

          setVideoPreview(mat.material_video_url || null);
          setImagePreview(mat.material_imageurl || null);
        }
        setLoadingMaterial(false);
      } catch (err) {
        console.error(err);
        setLoadingMaterial(false);
      }
    };

    fetchClasses();
    fetchMaterial();
  }, [materialId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (type: "video" | "pdf" | "image", file: File | null) => {
    if (type === "video") {
      setNewVideoFile(file);
      if (file) setVideoPreview(URL.createObjectURL(file));
    }
    if (type === "pdf") setNewPdfFile(file);
    if (type === "image") {
      setNewImageFile(file);
      if (file) setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadInChunks = async (file: File, fileType: "video" | "pdf" | "image") => {
    const tempUploadId = crypto.randomUUID();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const form = new FormData();
      form.append("chunk", chunk);
      form.append("chunkIndex", i.toString());
      form.append("tempUploadId", tempUploadId);
      form.append("fileType", fileType);
      form.append("originalName", file.name);

      const res = await fetch("/api/admin/classes/materials", {
        method: "POST",
        credentials: "include",
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
        body: form,
      });

      if (!res.ok) throw new Error("Chunk failed");

      setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
    }

    const finalizeForm = new FormData();
    finalizeForm.append("finalize_file", "true");
    finalizeForm.append("tempUploadId", tempUploadId);
    finalizeForm.append("fileType", fileType);
    finalizeForm.append("material_id", materialId);

    const res = await fetch("/api/admin/classes/materials", {
      method: "POST",
      credentials: "include",
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
      body: finalizeForm,
    });

    const data = await res.json();
    if (!data.success) throw new Error("Finalize failed");
    return data.fileUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.material_title || selectedClasses.length === 0) {
      alert("Title and class selection required");
      return;
    }

    setIsUploading(true);
    setUploadStatus("Preparing...");

    try {
      let videoUrl = currentVideoUrl;
      let pdfUrl = currentPdfUrl;
      let imageUrl = currentImageUrl;

      if (newVideoFile) {
        setUploadStatus("Uploading video...");
        videoUrl = await uploadInChunks(newVideoFile, "video");
      }

      if (newPdfFile) {
        setUploadStatus("Uploading PDF...");
        pdfUrl = await uploadInChunks(newPdfFile, "pdf");
      }

      if (newImageFile) {
        setUploadStatus("Uploading cover...");
        imageUrl = await uploadInChunks(newImageFile, "image");
      }

      setUploadStatus("Updating database...");

      const updateForm = new FormData();
      updateForm.append("db_update", "true");
      updateForm.append("material_id", materialId);
      updateForm.append("material_title", formData.material_title);
      updateForm.append("material_description", formData.material_description || "");
      updateForm.append("material_type", materialType);
      updateForm.append("material_link", formData.material_link || "");
      updateForm.append("class_ids", JSON.stringify(selectedClasses));
      if (videoUrl) updateForm.append("material_video_url", videoUrl);
      if (pdfUrl) updateForm.append("material_pdf_url", pdfUrl);
      if (imageUrl) updateForm.append("material_imageurl", imageUrl);
      updateForm.append("downloadable", pdfDownloadable.toString());

      if (materialType === "video") {
        if (isUnlimitedExpire) {
          updateForm.append("expire_hours", "unlimited");
        } else if (formData.expire_hours) {
          updateForm.append("expire_hours", formData.expire_hours);
        } else {
          updateForm.append("expire_hours", "");
        }

        updateForm.append("view_count_enabled", videoViewCountEnabled ? "true" : "false");
        if (videoViewCountEnabled && formData.view_limit) {
          updateForm.append("view_limit", formData.view_limit);
        }
      }

      const res = await fetch("/api/admin/classes/materials", {
        method: "POST",
        credentials: "include",
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
        body: updateForm,
      });

      if (res.ok) {
        setSuccessModalOpen(true);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || "Failed to update");
      }
    } catch (err) {
      console.error(err);
      alert("Update failed");
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

  if (loadingMaterial || loadingClasses) {
    return <div className="p-6 text-center">Loading material...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-4xl font-bold mb-8">Edit Material</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Form */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Material Title *"
              value={formData.material_title}
              onChange={handleInputChange}
              name="material_title"
              isRequired
            />

            <Input
              label="Description"
              value={formData.material_description}
              onChange={handleInputChange}
              name="material_description"
            />

            <Select
              label="Material Type"
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
                  <label className="block text-sm font-medium mb-2">Current Video</label>
                  {currentVideoUrl ? (
                    <video controls className="w-full h-64 rounded-lg bg-black">
                      <source src={currentVideoUrl} type="video/mp4" />
                    </video>
                  ) : (
                    <p className="text-default-500">No video uploaded</p>
                  )}
                  <label className="block text-sm font-medium mt-4 mb-2">Replace Video</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileChange("video", e.target.files?.[0] || null)}
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
                  <label className="block text-sm font-medium mb-2">Current PDF</label>
                  {currentPdfUrl ? (
                    <iframe src={currentPdfUrl} className="w-full h-64 rounded-lg border" />
                  ) : (
                    <p className="text-default-500">No PDF uploaded</p>
                  )}
                  <label className="block text-sm font-medium mt-4 mb-2">Replace PDF</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileChange("pdf", e.target.files?.[0] || null)}
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
                label="Custom Link"
                value={formData.material_link}
                onChange={handleInputChange}
                name="material_link"
              />
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Current Cover Image</label>
              {currentImageUrl ? (
                <Image
                  src={currentImageUrl}
                  alt="Current cover"
                  className="w-full h-64 object-cover rounded-lg"
                />
              ) : (
                <p className="text-default-500">No cover image</p>
              )}
              <label className="block text-sm font-medium mt-4 mb-2">Replace Cover Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange("image", e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
              />
            </div>

            <Select
              label="Assigned Classes"
              selectionMode="multiple"
              selectedKeys={selectedClasses}
              onSelectionChange={(keys) => setSelectedClasses(Array.from(keys as Set<string>))}
              renderValue={() => getSelectedClassNames()}
            >
              {classes.map((cls: any) => (
                <SelectItem key={cls.class_id}>
                  {cls.class_title}
                </SelectItem>
              ))}
            </Select>

            <Button type="submit" color="primary" size="lg" isLoading={isUploading} className="w-full">
              Save Changes
            </Button>
          </form>
        </div>

        {/* Live Preview */}
        <div className="flex items-start justify-center">
          <Card className="w-full max-w-md shadow-2xl overflow-hidden relative">
            {materialType === "link" && getYouTubeId(formData.material_link) ? (
              <ProtectedYouTubePlayer url={formData.material_link} />
            ) : imagePreview || currentImageUrl ? (
              <Image
                removeWrapper
                alt="Cover"
                className="w-full h-[300px] object-cover"
                src={imagePreview || currentImageUrl!}
              />
            ) : (
              <div className="w-full h-[300px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-3xl font-bold">Cover Image</span>
              </div>
            )}

            <div className="absolute top-3 right-3 z-10">
              <Chip color={getTypeChipColor()} size="lg" variant="shadow">
                {getTypeLabel()}
              </Chip>
            </div>

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
                  Assigned to {selectedClasses.length} class{selectedClasses.length !== 1 ? "es" : ""}
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Upload Progress Modal */}
      <Modal isOpen={isUploading} backdrop="blur" isDismissable={false}>
        <ModalContent className="w-96">
          <ModalHeader>Uploading Changes</ModalHeader>
          <ModalBody>
            <Progress value={uploadProgress} color="primary" className="mb-4" />
            <p className="text-center text-sm">{uploadStatus || "Processing..."}</p>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Success Modal */}
      <Modal isOpen={successModalOpen} onClose={() => setSuccessModalOpen(false)} backdrop="blur">
        <ModalContent>
          <ModalHeader className="text-success">
            Material Updated Successfully!
          </ModalHeader>
          <ModalBody>
            <p>Your changes have been saved.</p>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onPress={() => setSuccessModalOpen(false)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}