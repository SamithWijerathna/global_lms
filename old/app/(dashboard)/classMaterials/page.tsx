"use client";
import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardFooter,
} from "@heroui/card";
import { Image } from "@heroui/image";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/modal";
import { Tabs, Tab } from "@heroui/tabs";
import { RadioGroup, Radio } from "@heroui/radio";
import { Chip } from "@heroui/chip";
import {
  Upload,
  CheckCircle,
  Banknote,
  Building2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/src/lib/useAuth";
import ProtectedYouTubePlayer, { getYouTubeId } from "@/components/ProtectedYouTubePlayer";

type ClassItem = {
  class_id: string;
  class_title: string;
  class_description: string;
  class_imageurl?: string;
  image_url?: string;
  renew_type?: string;
  class_price: number;
  approved_at?: string;
  expiry_date?: Date;
  is_active?: boolean;
  is_expired?: boolean;
};

type Material = {
  material_id?: string;
  material_title?: string;
  material_description?: string;
  material_type?: string;
  material_imageurl?: string;
  material_video_url?: string;
  material_pdf_url?: string;
  material_link?: string;
  section_name?: string;
  display_order?: number;
  create_at?: string;
  pdf_downloadable?: boolean;
  view_limit_enabled?: boolean;
  view_limit?: number;
  expire_hours?: number | "unlimited";
  class_title?: string; // Added for quick access
};

function MaterialViewer({
  material,
  onBack,
}: {
  material: Material;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isExpired, setIsExpired] = useState(false);
  const [viewAllowed, setViewAllowed] = useState(true);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [hasIncremented, setHasIncremented] = useState(false);
  const [totalWatched, setTotalWatched] = useState(0);

  let playStart = 0;
  const THRESHOLD_SECONDS = 180; // 3 minutes of actual playback = 1 view count

  const watermarkText = user?.student_id
    ? `Lashinigeo - ${user.student_id}`
    : "Lashinigeo Protected";

  const pdfParams = material.pdf_downloadable
    ? ""
    : "#toolbar=0&navpanes=0&scrollbar=0&view=FitH";

  useEffect(() => {
    // Client-side expiry check
    if (
      material.expire_hours &&
      material.expire_hours !== "unlimited" &&
      material.create_at
    ) {
      const createTime = new Date(material.create_at).getTime();
      const expireTime = createTime + material.expire_hours * 3600000;
      if (Date.now() > expireTime) {
        setIsExpired(true);
        return;
      }
    }

    // Server-side check for videos
    if (
      material.material_type === "video" &&
      user?.uuid &&
      material.material_id
    ) {
      fetch("/api/video/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check",
          user_uuid: user.uuid,
          material_id: material.material_id,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.expired) {
            setIsExpired(true);
          } else if (!data.allowed) {
            setIsLimitReached(true);
            setViewAllowed(false);
          }
        })
        .catch(() => setViewAllowed(false));
    }
  }, [material, user]);

  const handlePlay = () => {
    playStart = Date.now();
  };

  const handleStop = () => {
    if (playStart > 0 && viewAllowed) {
      const added = (Date.now() - playStart) / 1000;
      setTotalWatched((prev) => {
        const newTotal = prev + added;
        if (newTotal >= THRESHOLD_SECONDS && !hasIncremented) {
          if (user?.uuid) {
            fetch("/api/video/view", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "inc",
                user_uuid: user.uuid,
                material_id: material.material_id,
              }),
            }).catch(console.error);
          }
          setHasIncremented(true);
        }
        return newTotal;
      });
      playStart = 0;
    }
  };

  // Expired view
  if (isExpired) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 text-primary hover:text-primary-600 transition"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to All Materials
          </button>
          <Card className="overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-danger to-danger-600 p-8 text-white">
              <Chip color="default" variant="flat" className="mb-4">
                {material.material_type?.toUpperCase() || "UNKNOWN"}
              </Chip>
              <h1 className="text-3xl font-bold">{material.material_title}</h1>
              {material.class_title && (
                <p className="mt-2 text-xl text-primary-100">
                  Class: {material.class_title}
                </p>
              )}
            </div>
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
              <AlertCircle className="h-32 w-32 text-danger mb-8" />
              <h2 className="text-3xl font-bold text-danger">Material Expired</h2>
              <p className="mt-4 text-lg text-default-600">
                This material has expired and is no longer available.
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // View limit reached
  if (material.material_type === "video" && !viewAllowed) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 text-primary hover:text-primary-600 transition"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to All Materials
          </button>
          <Card className="overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-primary to-primary-600 p-8 text-white">
              <Chip color="default" variant="flat" className="mb-4">
                VIDEO
              </Chip>
              <h1 className="text-3xl font-bold">{material.material_title}</h1>
              {material.class_title && (
                <p className="mt-2 text-xl text-primary-100">
                  Class: {material.class_title}
                </p>
              )}
            </div>
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
              <AlertCircle className="h-32 w-32 text-warning mb-8" />
              <h2 className="text-3xl font-bold text-warning">View Limit Reached</h2>
              <p className="mt-4 text-lg text-default-600">
                You have reached the maximum allowed views for this video.
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button
          variant="light"
          onPress={onBack}
          className="mb-6 font-medium text-default-600 hover:text-primary transition"
          startContent={
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          }
        >
          Back to All Materials
        </Button>

        <Card className="overflow-hidden shadow-2xl border border-default-200 dark:border-default-100 bg-content1">
          {/* Clean Header Bar */}
          <div className="p-6 md:p-8 border-b border-default-100 bg-gradient-to-r from-default-100/50 via-content1 to-default-100/50">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Chip color="primary" variant="solid" className="font-semibold uppercase text-xs">
                  {material.material_type?.toUpperCase() || "UNKNOWN"}
                </Chip>
                {material.section_name && (
                  <Chip color="secondary" variant="flat" className="capitalize font-semibold text-xs">
                    {material.section_name}
                  </Chip>
                )}
              </div>
              {(material.view_limit_enabled || material.expire_hours) && (
                <div className="flex flex-wrap gap-2">
                  {material.view_limit_enabled && material.view_limit && (
                    <Chip color="warning" variant="flat" size="sm">
                      Max {material.view_limit} views
                    </Chip>
                  )}
                  {material.expire_hours && material.expire_hours !== "unlimited" && (
                    <Chip color="warning" variant="flat" size="sm">
                      Expires in {material.expire_hours} hrs
                    </Chip>
                  )}
                  {material.expire_hours === "unlimited" && (
                    <Chip color="success" variant="flat" size="sm">
                      No expiry
                    </Chip>
                  )}
                </div>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
              {material.material_title}
            </h1>
            {material.class_title && (
              <p className="text-sm font-medium text-primary mt-1">
                Class: {material.class_title}
              </p>
            )}
            {material.material_description && (
              <p className="mt-3 text-default-600 text-sm md:text-base leading-relaxed">
                {material.material_description}
              </p>
            )}
            {material.material_type === "pdf" && !material.pdf_downloadable && (
              <div className="mt-4 flex items-center gap-2 text-warning text-xs font-medium">
                <AlertCircle className="h-4 w-4" />
                <span>Download & print disabled for security</span>
              </div>
            )}
          </div>

          {/* Player / Content Viewer Section */}
          <div className="p-4 md:p-8 bg-black/90 dark:bg-black">
            {material.material_type === "video" && material.material_video_url && (
              <div
                className="relative overflow-hidden rounded-xl bg-black shadow-2xl"
                style={{ paddingBottom: "56.25%" }}
                onContextMenu={(e) => e.preventDefault()}
                onSelectStart={(e) => e.preventDefault()}
              >
                <video
                  ref={videoRef}
                  controls
                  controlsList="nodownload nofullscreen noplaybackrate"
                  disablePictureInPicture
                  className="absolute inset-0 h-full w-full"
                  preload="metadata"
                  playsInline
                  onPlay={handlePlay}
                  onPause={handleStop}
                  onEnded={handleStop}
                  onTimeUpdate={handleStop}
                >
                  <source src={material.material_video_url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                  <div className="absolute text-white/30 text-xl md:text-2xl font-bold select-none animate-watermark-roam drop-shadow-md whitespace-nowrap">
                    {watermarkText}
                  </div>
                </div>
              </div>
            )}

            {material.material_pdf_url && (
              <div className="relative overflow-hidden rounded-xl border border-default-200">
                <iframe
                  src={`${material.material_pdf_url}${pdfParams}`}
                  className="h-[80vh] w-full bg-white"
                  title={material.material_title}
                  sandbox="allow-same-origin allow-scripts"
                />
                <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                  <div className="absolute text-black/20 dark:text-white/30 text-xl md:text-2xl font-bold select-none animate-watermark-roam drop-shadow-sm whitespace-nowrap">
                    {watermarkText}
                  </div>
                </div>
              </div>
            )}

            {material.material_link && (
              getYouTubeId(material.material_link) ? (
                <div className="w-full relative rounded-xl overflow-hidden shadow-2xl">
                  <ProtectedYouTubePlayer url={material.material_link} watermarkText={watermarkText} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-content1 rounded-xl">
                  <svg
                    className="h-16 w-16 text-primary mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  <h3 className="text-2xl font-bold mb-2">External Link Resource</h3>
                  <p className="text-default-500 mb-6 max-w-md">
                    This material is hosted on an external platform. Click below to open in a new tab.
                  </p>
                  <Button
                    as="a"
                    href={material.material_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    color="primary"
                    size="lg"
                  >
                    Open Link
                  </Button>
                </div>
              )
            )}
          </div>
        </Card>
        <style jsx global>{`
          @keyframes watermark-roam {
            0% { top: 5%; left: 5%; transform: rotate(-5deg); }
            20% { top: 20%; left: 65%; transform: rotate(8deg); }
            40% { top: 60%; left: 75%; transform: rotate(-10deg); }
            60% { top: 75%; left: 10%; transform: rotate(5deg); }
            80% { top: 35%; left: 45%; transform: rotate(-3deg); }
            100% { top: 5%; left: 5%; transform: rotate(-5deg); }
          }
          .animate-watermark-roam {
            animation: watermark-roam 60s ease-in-out infinite;
          }
        `}</style>
      </div>
    </div>
  );
}

export default function QuickAccessPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [pendingClassIds, setPendingClassIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [loadingAllMaterials, setLoadingAllMaterials] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentClass, setPaymentClass] = useState<ClassItem | null>(null);
  const [bankChoice, setBankChoice] = useState<"commercial" | "hnb">("commercial");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);

  useEffect(() => {
    if (!user?.uuid) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const paymentRes = await fetch("/api/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "user_payments",
            student_uuid: user.uuid,
          }),
        });
        const paymentData = await paymentRes.json();
        const payments = Array.isArray(paymentData)
          ? paymentData
          : paymentData.data || [];
        const approvedIds = payments
          .filter((p: any) => p.status === "approved" && p.item_type === "class")
          .map((p: any) => p.item_id);
        const pendingIds = payments
          .filter((p: any) => p.status === "pending" && p.item_type === "class")
          .map((p: any) => p.item_id);
        setPendingClassIds(pendingIds);

        const classRes = await fetch("/api/dashboard/class", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "class_data" }),
        });
        let classRaw = await classRes.json();
        const classList = Array.isArray(classRaw)
          ? classRaw
          : Array.isArray(classRaw.data)
          ? classRaw.data
          : Array.isArray(classRaw.rows)
          ? classRaw.rows
          : [];

        const enrichedClasses = classList
          .filter((c: any) => approvedIds.includes(c.class_id))
          .map((cls: any) => {
            const payment = payments.find(
              (p: any) =>
                p.item_id === cls.class_id && p.status === "approved"
            );
            if (payment?.approved_at) {
              const approvedDate = new Date(payment.approved_at);
              let expiryDate: Date | undefined;
              if (cls.renew_type === "monthly") {
                expiryDate = new Date(
                  approvedDate.getFullYear(),
                  approvedDate.getMonth() + 1,
                  0
                );
              } else if (cls.renew_type === "30days") {
                expiryDate = new Date(approvedDate);
                expiryDate.setDate(expiryDate.getDate() + 30);
              }
              const isExpired = expiryDate ? new Date() > expiryDate : false;
              return {
                ...cls,
                class_price: Number(cls.class_price) || 0,
                approved_at: payment.approved_at,
                expiry_date: expiryDate,
                is_active: !isExpired,
                is_expired: isExpired,
              };
            }
            return {
              ...cls,
              class_price: Number(cls.class_price) || 0,
            };
          });
        setClasses(enrichedClasses);
        setError(
          enrichedClasses.length === 0
            ? "No enrolled classes found. Visit the store to enroll."
            : null
        );
      } catch (err) {
        console.error(err);
        setError("Failed to load classes.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.uuid]);

  // Fetch all materials from active classes
  useEffect(() => {
    if (loading || classes.length === 0) return;

    const activeClasses = classes.filter(
      (cls) => cls.is_active && !pendingClassIds.includes(cls.class_id)
    );

    if (activeClasses.length === 0) {
      setAllMaterials([]);
      return;
    }

    // Sort classes alphabetically for consistent grouping
    activeClasses.sort((a, b) => a.class_title.localeCompare(b.class_title));

    setLoadingAllMaterials(true);

    Promise.all(
      activeClasses.map(async (cls) => {
        const fd = new FormData();
        fd.append("action", "class_materials");
        fd.append("class_id", cls.class_id);
        const res = await fetch("/api/materials", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) return [];
        const data = await res.json();
        const mats = Array.isArray(data) ? data : data.data || [];
        return mats.map((m: Material) => ({
          ...m,
          class_title: cls.class_title,
        }));
      })
    )
      .then((results) => setAllMaterials(results.flat()))
      .catch(() => setAllMaterials([]))
      .finally(() => setLoadingAllMaterials(false));
  }, [classes, loading, pendingClassIds]);

  const formatExpiry = (date?: Date) => {
    if (!date) return "Active";
    const daysLeft = Math.ceil(
      (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft < 0) return "Expired";
    if (daysLeft <= 7) return `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const startRenewal = async (cls: ClassItem) => {
    if (pendingClassIds.includes(cls.class_id)) {
      alert("You already have a pending payment for renewing this class.");
      return;
    }
    try {
      const res = await fetch("/api/payment/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: cls.class_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to start renewal");
        return;
      }
      setPaymentClass(cls);
      resetPaymentStates();
      setIsPaymentModalOpen(true);
    } catch (err) {
      alert("An error occurred while starting renewal.");
    }
  };

  const resetPaymentStates = () => {
    setFile(null);
    setPreview(null);
    setBankChoice("commercial");
    setPaymentSubmitted(false);
    setUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0] || null;
    setFile(uploaded);
    setPreview(uploaded ? URL.createObjectURL(uploaded) : null);
  };

  const handlePaymentSubmit = async () => {
    if (!file || !user || !paymentClass) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("receipt", file);
    formData.append("bank", bankChoice);
    formData.append("student_uuid", user.uuid);
    formData.append("payment_type", "class");
    formData.append("amount", paymentClass.class_price.toString());
    try {
      const res = await fetch("/api/payment/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      setPaymentSubmitted(true);
      setTimeout(() => {
        resetPaymentStates();
        setIsPaymentModalOpen(false);
        // Optional: refresh page after submission
        window.location.reload();
      }, 5000);
    } catch (err: any) {
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleModalClose = (open: boolean) => {
    if (!open && file && !paymentSubmitted) {
      if (!confirm("Discard uploaded receipt?")) return;
    }
    setIsPaymentModalOpen(open);
  };

  if (loading) return <p className="text-center text-default-500 py-20">Loading your classes...</p>;
  if (error) return <p className="text-center text-danger py-20">{error}</p>;

  if (selectedMaterial) {
    return (
      <MaterialViewer
        material={selectedMaterial}
        onBack={() => setSelectedMaterial(null)}
      />
    );
  }

  // Group materials by class
  const groupedMaterials = allMaterials.reduce((acc, mat) => {
    const key = mat.class_title || "Uncategorized";
    if (!acc[key]) acc[key] = [];
    acc[key].push(mat);
    return acc;
  }, {} as Record<string, Material[]>);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-12">
        Quick Access - All Materials
      </h1>

      {/* Materials Section */}
      {classes.length === 0 ? (
        <p className="text-center text-default-500 py-20">
          No enrolled classes yet.
        </p>
      ) : loadingAllMaterials ? (
        <p className="text-center text-default-500 py-20">
          Loading all materials...
        </p>
      ) : allMaterials.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-warning text-xl mb-4">
            No active materials available.
          </p>
          <p className="text-default-600">
            Your classes may be expired or pending payment. Renew below to access materials.
          </p>
        </div>
      ) : (
        <div>
          {Object.entries(groupedMaterials).map(([classTitle, materials]) => (
            <div key={classTitle}>
              <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-4">
                {classTitle}
                <Chip color="secondary" variant="flat">
                  {materials.length} material{materials.length !== 1 ? "s" : ""}
                </Chip>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {materials.map((material) => {
                  const isExpired =
                    material.expire_hours &&
                    material.expire_hours !== "unlimited" &&
                    material.create_at &&
                    Date.now() >
                      new Date(material.create_at).getTime() +
                        material.expire_hours * 3600000;

                  return (
                    <Card
                      key={material.material_id}
                      className={`relative overflow-hidden shadow-lg transition-all ${
                        isExpired
                          ? "opacity-60 grayscale"
                          : "hover:shadow-2xl"
                      }`}
                    >
                      {material.material_imageurl && (
                        <Image
                          removeWrapper
                          src={material.material_imageurl}
                          alt={material.material_title}
                          className="h-48 w-full object-cover rounded-t-large"
                        />
                      )}
                      {isExpired && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30 rounded-large">
                          <Chip color="danger" size="lg" variant="shadow">
                            Expired
                          </Chip>
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Chip color="primary" variant="flat" size="sm">
                            {material.material_type?.toUpperCase()}
                          </Chip>
                          <Chip color="secondary" variant="flat" size="sm" className="capitalize font-medium">
                            {material.section_name || "General"}
                          </Chip>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">
                          {material.material_title}
                        </h3>
                        <p className="text-default-600 text-sm mb-4">
                          {material.material_description}
                        </p>
                        <Button
                          fullWidth
                          color={
                            material.material_type === "video"
                              ? "danger"
                              : material.material_type === "pdf"
                              ? "success"
                              : "primary"
                          }
                          isDisabled={!!isExpired}
                          onPress={
                            isExpired
                              ? undefined
                              : () => setSelectedMaterial(material)
                          }
                        >
                          {isExpired
                            ? "Expired"
                            : material.material_type === "video"
                            ? "Watch Video"
                            : material.material_type === "pdf"
                            ? "View PDF"
                            : "Open Link"}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Classes Overview Section (for status & renewal) */}
      {classes.length > 0 && (
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center mb-12">
            My Classes Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {classes.map((cls) => {
              const isPending = pendingClassIds.includes(cls.class_id);
              const isExpired = cls.is_expired;

              return (
                <Card
                  key={cls.class_id}
                  className={`relative h-[400px] overflow-hidden shadow-xl ${
                    isPending || isExpired
                      ? "opacity-75 grayscale"
                      : "hover:scale-[1.02] transition-transform"
                  }`}
                >
                  <Image
                    removeWrapper
                    alt={cls.class_title}
                    className="z-0 h-full w-full object-cover"
                    src={
                      cls.class_imageurl ||
                      cls.image_url ||
                      "/placeholder.jpg"
                    }
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent z-10" />
                  {(isPending || isExpired) && (
                    <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center">
                      <Chip color="warning" size="lg" variant="shadow">
                        {isPending ? "Payment Pending" : "Expired"}
                      </Chip>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 z-30">
                    <Chip
                      color={
                        isExpired
                          ? "danger"
                          : isPending
                          ? "warning"
                          : "success"
                      }
                    >
                      {formatExpiry(cls.expiry_date)}
                    </Chip>
                  </div>
                  <CardFooter className="absolute bottom-0 z-30 w-full bg-white/30 backdrop-blur-md">
                    <div className="flex flex-col gap-2 w-full p-4">
                      <h3 className="text-white text-2xl font-bold drop-shadow-lg">
                        {cls.class_title}
                      </h3>
                      <p className="text-white/80 text-sm line-clamp-2">
                        {cls.class_description}
                      </p>
                      <Button
                        fullWidth
                        color={isExpired || isPending ? "primary" : "default"}
                        isDisabled={!isExpired && !isPending}
                        onPress={() =>
                          isExpired || isPending ? startRenewal(cls) : undefined
                        }
                      >
                        {isPending
                          ? "Pending Approval"
                          : isExpired
                          ? "Renew Class"
                          : "Active - View Materials Above"}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <Modal
        backdrop="blur"
        isOpen={isPaymentModalOpen}
        onOpenChange={handleModalClose}
        size="lg"
      >
        <ModalContent>
          <ModalHeader>Renew Class Payment</ModalHeader>
          <ModalBody>
            {paymentSubmitted ? (
              <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
                <CheckCircle className="h-24 w-24 text-success" />
                <h3 className="text-2xl font-bold">Payment Submitted!</h3>
                <p className="text-default-600">
                  Your receipt has been uploaded. Awaiting approval.
                </p>
                <p className="text-small text-default-500">
                  Page will refresh in 5 seconds...
                </p>
              </div>
            ) : (
              paymentClass && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold">
                      {paymentClass.class_title}
                    </h3>
                    <p className="text-default-600">
                      Rs. {paymentClass.class_price}
                    </p>
                    <p className="text-default-600 mt-2">
                      {paymentClass.class_description}
                    </p>
                  </div>
                  <Tabs fullWidth defaultSelectedKey="bank">
                    <Tab
                      key="bank"
                      title={
                        <div className="flex items-center gap-2">
                          <Banknote className="h-5 w-5" />
                          Bank Transfer
                        </div>
                      }
                    >
                      <div className="space-y-6">
                        <RadioGroup
                          label="Select Bank"
                          value={bankChoice}
                          onValueChange={setBankChoice as any}
                        >
                          <Radio value="commercial">
                            <Building2 className="h-4 w-4 mr-2" />
                            Commercial Bank
                          </Radio>
                          <Radio value="hnb">
                            <Building2 className="h-4 w-4 mr-2" />
                            Hatton National Bank
                          </Radio>
                        </RadioGroup>
                        <Card className="bg-default-100 p-5">
                          {bankChoice === "commercial" ? (
                            <>
                              <p><strong>Bank:</strong> Commercial Bank</p>
                              <p><strong>Account Name:</strong> R A S T Rajapaksha</p>
                              <p><strong>Account Number:</strong> 802 092 806 9</p>
                              <p><strong>Branch:</strong> Pilimathalawa</p>
                            </>
                          ) : (
                            <>
                              <p><strong>Bank:</strong> Hatton National Bank</p>
                              <p><strong>Account Name:</strong> R A S T Rajapaksha</p>
                              <p><strong>Account Number:</strong> 141020146041</p>
                              <p><strong>Branch:</strong> Pilimathalawa</p>
                            </>
                          )}
                        </Card>
                        <div>
                          <p className="font-medium mb-3">
                            Upload Payment Receipt
                          </p>
                          <label className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer bg-default-50 hover:bg-default-100 overflow-hidden">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="h-12 w-12 text-default-400 mb-4" />
                              <p className="text-sm text-default-600">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-default-500">Image or PDF</p>
                            </div>
                            {preview && file?.type.startsWith("image/") && (
                              <img
                                src={preview}
                                alt="Preview"
                                className="absolute inset-0 w-full h-full object-contain p-2 bg-default-100/50 rounded-xl"
                              />
                            )}
                            {file && !file.type.startsWith("image/") && (
                              <div className="absolute inset-0 flex items-center justify-center bg-default-100/80 rounded-xl">
                                <p className="text-default-700 font-medium">
                                  PDF: {file.name}
                                </p>
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={handleFileChange}
                            />
                          </label>
                        </div>
                        <Button
                          fullWidth
                          size="lg"
                          color="primary"
                          isLoading={uploading}
                          isDisabled={!file}
                          onPress={handlePaymentSubmit}
                        >
                          {uploading ? "Uploading..." : "Submit Payment"}
                        </Button>
                      </div>
                    </Tab>
                  </Tabs>
                </div>
              )
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}