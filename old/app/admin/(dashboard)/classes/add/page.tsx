"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
} from "@heroui/card";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Button } from "@heroui/button";
import { Image } from "@heroui/image";
import { Skeleton } from "@heroui/skeleton";
import { useConfirm } from "@/components/admin/GlobalConfirm";

export default function AddClassPage() {

  const [batchesList, setBatchesList] = useState<Array<{ id: number; batch_code: string; batch_name: string }>>([]);
  const [classTypesList, setClassTypesList] = useState<Array<{ id: number; type_code: string; type_name: string }>>([]);

  useEffect(() => {
    fetch("/api/batches")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setBatchesList(data);
      })
      .catch((err) => console.error("Failed to load batches", err));

    fetch("/api/class-types")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setClassTypesList(data);
      })
      .catch((err) => console.error("Failed to load class types", err));
  }, []);

  const [formData, setFormData] = useState({
    class_title: "",
    class_description: "",
    class_price: "",
    class_type: "theory",
    renew_type: "30days",
    batch: "",
    class_code: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasInput =
    formData.class_title ||
    formData.class_description ||
    formData.batch ||
    formData.class_price ||
    previewUrl;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

const confirm = useConfirm();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!formData.class_title || !formData.batch || !formData.class_price) {
    await confirm({
      title: "Missing Required Fields",
      message: (
        <span className="text-warning">
          Please fill required fields: <b>Title, Batch, Price</b>
        </span>
      ),
      confirmText: "OK",
      cancelText: "",
      confirmColor: "warning",
      onConfirm: async () => {}, // no-op
    });
    return;
  }

  setIsSubmitting(true);

  const data = new FormData();
  data.append("class_title", formData.class_title);
  data.append("class_description", formData.class_description);
  data.append("class_price", formData.class_price);
  data.append("class_type", formData.class_type);
  data.append("renew_type", formData.renew_type);
  data.append("batch", formData.batch);
  data.append("class_code", formData.class_code || "");
  if (imageFile) data.append("class_image", imageFile);

  try {
    const res = await fetch("/api/admin/classes", { 
      method: "POST", 
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
      body: data 
    });
    if (res.ok) {
      await confirm({
        title: "Success",
        message: "Class added successfully!",
        confirmText: "OK",
        cancelText: "",
        confirmColor: "success",
        onConfirm: async () => {},
      });

      setFormData({
        class_title: "",
        class_description: "",
        class_price: "",
        class_type: "theory",
        renew_type: "30days",
        batch: "",
        class_code: "",
      });
      setImageFile(null);
      setPreviewUrl(null);
      if (document.getElementById("image-input")) {
        (document.getElementById("image-input") as HTMLInputElement).value = "";
      }
    } else {
      await confirm({
        title: "Error",
        message: "Failed to add class",
        confirmText: "OK",
        cancelText: "",
        confirmColor: "danger",
        onConfirm: async () => {},
      });
    }
  } catch (err) {
    console.error(err);
    await confirm({
      title: "Error",
      message: "Failed to add class",
      confirmText: "OK",
      cancelText: "",
      confirmColor: "danger",
      onConfirm: async () => {},
    });
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <div className="p-6">
      <h1 className="text-4xl font-bold mb-8">Add New Class</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Form */}
        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Class Title *"
              name="class_title"
              placeholder="e.g. 2027 Theory Physical"
              value={formData.class_title}
              onChange={handleInputChange}
              isRequired
            />
            <Select
              label="Batch *"
              name="batch"
              selectedKeys={formData.batch ? [formData.batch] : []}
              onChange={handleInputChange}
            >
              {batchesList.map((b) => (
                <SelectItem key={b.batch_code} textValue={b.batch_name || b.batch_code}>
                  {b.batch_name || b.batch_code}
                </SelectItem>
              ))}
            </Select>
            <Input
              label="Price (Rs) *"
              name="class_price"
              type="number"
              placeholder="3500"
              value={formData.class_price}
              onChange={handleInputChange}
              isRequired
            />
            <Select
              label="Class Type"
              name="class_type"
              selectedKeys={formData.class_type ? [formData.class_type] : []}
              onChange={handleInputChange}
            >
              {classTypesList.map((ct) => (
                <SelectItem key={ct.type_code} textValue={ct.type_name || ct.type_code}>
                  {ct.type_name || ct.type_code}
                </SelectItem>
              ))}
            </Select>
            <Select
              label="Renew Type"
              name="renew_type"
              selectedKeys={[formData.renew_type]}
              onChange={handleInputChange}
            >
              <SelectItem key="30days">30 Days</SelectItem>
              <SelectItem key="60days">60 Days</SelectItem>
              <SelectItem key="90days">90 Days</SelectItem>
              <SelectItem key="onetime">One Time</SelectItem>
            </Select>
            <Input
              label="Class Code (Optional)"
              name="class_code"
              placeholder="e.g. R02"
              value={formData.class_code}
              onChange={handleInputChange}
            />
            <Input
              label="Class Description"
              name="class_description"
              placeholder="November batch for 2027 A/L students"
              value={formData.class_description}
              onChange={handleInputChange}
            />
            <div>
              <label className="block text-sm font-medium mb-2">Class Image</label>
              <input
                id="image-input"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
              />
            </div>

            <Button
              type="submit"
              color="primary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full"
            >
              Add Class
            </Button>
          </form>
        </div>

        {/* Live Preview Card - Side by Side */}
        <div className="flex items-start justify-center">
          {!hasInput ? (
            // Skeleton when no input
            <Card className="w-full max-w-md h-[420px] shadow-xl">
              <Skeleton className="w-full h-[300px] rounded-t-lg" />
              <CardBody className="pt-6">
                <Skeleton className="h-8 w-3/4 rounded-lg mb-3" />
                <Skeleton className="h-4 w-full rounded-lg mb-2" />
                <Skeleton className="h-4 w-2/3 rounded-lg" />
                <div className="flex justify-between items-end mt-6">
                  <Skeleton className="h-10 w-24 rounded-lg" />
                  <Skeleton className="h-6 w-32 rounded-lg" />
                </div>
              </CardBody>
              <CardFooter className="justify-between">
                <Skeleton className="h-10 w-32 rounded-full" />
              </CardFooter>
            </Card>
          ) : (
            // Actual Preview Card
            <Card isFooterBlurred className="w-full max-w-md h-[420px] shadow-2xl">
              <CardHeader className="absolute z-10 top-1 flex-col items-start">
                <p className="text-tiny text-white/80 uppercase font-bold">New</p>

              </CardHeader>

              {previewUrl ? (
                <Image
                  removeWrapper
                  alt="Class preview"
                  className="z-0 w-full h-full object-cover scale-125 -translate-y-6"
                  src={previewUrl}
                />
              ) : (
                <div className="z-0 w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <span className="text-white/70 text-xl font-medium">No Image</span>
                </div>
              )}

              <CardFooter className="absolute bg-white/30 backdrop-blur-md bottom-0 border-t-1 border-zinc-100/50 z-10 ">
                <div className="flex flex-col gap-1 w-full">
                      <h4 className="text-white font-semibold text-2xl drop-shadow-lg">
                        {formData.class_title || "Class Title"}
                      </h4>
                  
                    <div className="flex justify-between">
                      <div>
                        <p className="text-white text-lg font-bold drop-shadow">
                          Rs {formData.class_price || "0"}
                        </p>
                        <p className="text-white/80 text-sm">
                          {formData.batch || "Batch"} • {formData.class_type} • {formData.renew_type}
                        </p>
                        <p className="text-white/70 text-xs mt-1">
                          {formData.class_description || "Class description will appear here"}
                        </p>
                      </div>
                      <Button
                      className="text-tiny font-medium"
                      color="primary"
                      radius="full"
                      size="sm"
                    >
                      Enroll Now
                    </Button>
                  </div>
</div>


            </CardFooter>
            </Card>
          )}
      </div>
    </div>
    </div >
  );
}