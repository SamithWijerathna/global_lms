"use client";
import { useState, useEffect, useContext } from "react";
import { Banknote, CreditCard, CheckCircle, Building2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/src/lib/useAuth";
import { v4 as uuidv4 } from "uuid";

export default function PaymentPage() {
  const [selected, setSelected] = useState("bank");
  const [bankChoice, setBankChoice] = useState("commercial");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
const { userData } = useAuth();

  const session_id = uuidv4();
  
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/payment/info", { cache: "no-store" });
        const data = await res.json();
        console.log("Fetched class info:", data);
        setClassData(data);
        if (data?.error) {
          throw new Error(data.error);
        }
        setClassData(data);
      } catch (err: any) {
        console.error("Error fetching class info:", err);
        setError(err.message || "No class selected. Please go back and choose one.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    setFile(uploaded || null);
    if (uploaded) {
      setPreview(URL.createObjectURL(uploaded));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userData) {
      alert("User not found. Please log in again.");
      return;
    }

    if (!file) {
      alert("Please upload your payment receipt before submitting.");
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("receipt", file);
    formData.append("bank", bankChoice);
    formData.append("student_uuid", userData.uuid);
    formData.append("payment_type", "class");
    formData.append("amount", classData.price.toString());

    try {
      const res = await fetch("/api/payment/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to upload receipt");

      setSubmitted(true);
      
      // Auto redirect after 5 seconds
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 5000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-6">
        <div className="bg-white shadow-md rounded-xl p-6 text-center">
          <p className="text-red-600 font-semibold mb-2">⚠️ {error}</p>
          <p className="text-gray-600">Please go back and select a class to continue.</p>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">No class found. Please start from the classes page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-200 to-gray-100 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-lg"
      >
        <AnimatePresence mode="wait">
          {!submitted && (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                  {classData.title}
                </h1>
                <p className="text-gray-600">{classData.class_description}</p>
                <p className="text-lg font-semibold text-blue-600 mt-2">
                  Rs. {classData.price}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <button
                  onClick={() => setSelected("bank")}
                  className={`flex flex-col items-center justify-center border rounded-xl p-4 transition-all ${
                    selected === "bank"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-300 hover:border-blue-400"
                  }`}
                >
                  <Banknote className="w-8 h-8 text-blue-600 mb-2" />
                  <span className="font-medium">Bank Transfer</span>
                </button>

                <button
                  disabled
                  className="flex flex-col items-center justify-center border rounded-xl p-4 cursor-not-allowed bg-gray-100 opacity-70"
                >
                  <CreditCard className="w-8 h-8 text-gray-500 mb-2" />
                  <span className="font-medium">Card Payment</span>
                  <span className="text-xs text-gray-500 mt-1">Coming Soon</span>
                </button>
              </div>
            </>
          )}

          {selected === "bank" && !submitted && (
            <motion.form
              key="bank"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <h2 className="text-lg font-semibold text-gray-700">Bank Transfer Details</h2>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBankChoice("commercial")}
                  className={`flex items-center justify-center gap-2 border rounded-xl p-3 transition-all ${
                    bankChoice === "commercial"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-300 hover:border-blue-400"
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Commercial Bank</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBankChoice("hnb")}
                  className={`flex items-center justify-center gap-2 border rounded-xl p-3 transition-all ${
                    bankChoice === "hnb"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-300 hover:border-blue-400"
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Hatton National Bank</span>
                </button>
              </div>
 
              <div className="bg-gray-50 border rounded-xl p-4 text-gray-700">
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Payment Receipt
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="w-full border border-gray-300 rounded-xl p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={uploading}
                />
              </div>

              {preview && (
                <div className="mt-3 border rounded-xl overflow-hidden max-h-64 bg-gray-50 flex justify-center p-2">
                  <img
                    src={preview}
                    alt="Receipt Preview"
                    className="max-h-60 w-auto object-contain rounded-lg"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={uploading}
                className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Submit Payment"
                )}
              </button>
            </motion.form>
          )}

          {submitted && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center space-y-4 py-8"
            >
              <CheckCircle className="w-20 h-20 text-green-500" />
              <h2 className="text-2xl font-bold text-gray-800">
                Payment Submitted Successfully!
              </h2>
              <p className="text-gray-600 max-w-md">
                Thank you! Your receipt has been uploaded. Our team will verify your payment shortly.
              </p>
              <div className="pt-4 space-y-3 w-full">
                <p className="text-sm text-gray-500">Redirecting to dashboard in 5 seconds...</p>
                <button
                  onClick={() => window.location.href = "/dashboard"}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
                >
                  Go to Dashboard Now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <p className="absolute bottom-2 right-2 text-xs text-gray-500">{session_id}</p>
    </div>
  );
}