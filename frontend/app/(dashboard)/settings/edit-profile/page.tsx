"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../../../src/lib/useAuth";

const inputClass =
  "flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors shadow-xs";

const labelClass =
  "block text-sm font-medium text-foreground mb-2";

const disabledInputClass =
  "flex h-10 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed opacity-70 shadow-xs";

const textareaClass =
  "flex min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors shadow-xs";

export default function EditProfilePage() {
  const { user, loading } = useAuth();

  const [batches, setBatches] = useState<Array<{ id: number; batch_code: string; batch_name: string }>>([]);

  useEffect(() => {
    fetch("/api/batches")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setBatches(data);
      })
      .catch((err) => console.error("Failed to load batches", err));
  }, []);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    user_email: "",
    phone: "",
    batch: "",
    user_address: "",
    birthday: "",
    id_number: "",
    student_id: "",
  });

  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        user_email: user.user_email || "",
        phone: user.phone || "",
        batch: user.batch || "",
        user_address: user.user_address || "",
        birthday: user.birthday ? user.birthday.slice(0, 10) : "",
        id_number: user.id_number || "",
        student_id: user.student_id || "",
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrorMessage("Please select a valid image file.");
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setErrorMessage("Profile picture exceeds 8MB limit. Please choose an image under 8MB.");
        return;
      }
      setProfileFile(file);
      setPreview(URL.createObjectURL(file));
      setSuccessMessage("");
      setErrorMessage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    if (!user) {
      setErrorMessage("User not found.");
      setSaving(false);
      return;
    }

    try {
      let res;
      if (profileFile) {
        const formData = new FormData();
        formData.append("uuid", user.uuid);
        Object.entries(form).forEach(([key, value]) => {
          formData.append(key, value as string);
        });
        formData.append("profile", profileFile);

        res = await fetch("/api/auth", {
          method: "PUT",
          body: formData,
        });
      } else {
        res = await fetch("/api/auth", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uuid: user.uuid, ...form }),
        });
      }

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage("Profile updated successfully!");
      } else {
        setErrorMessage(data.error || "Update failed. Please try again.");
      }
    } catch (err) {
      console.error("Update failed", err);
      setErrorMessage("An error occurred while updating your profile.");
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="w-full space-y-6 pb-12">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-left">
          Edit Profile
        </h1>
        <div className="w-full h-80 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full space-y-6 pb-12">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-left">
          Edit Profile
        </h1>
        <div className="w-full h-80 flex items-center justify-center">
          <p className="text-sm text-rose-500 font-medium">Not logged in</p>
        </div>
      </div>
    );
  }

  const profileImageUrl = preview || user.profile_url || "https://via.placeholder.com/128?text=Profile";

  return (
    <div className="w-full space-y-6 pb-12">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-left">
        Edit Profile
      </h1>

      {/* Profile Picture Header Area */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-border">
        <img
          src={profileImageUrl}
          alt="Profile"
          className="w-24 h-24 rounded-full object-cover border border-border shadow-sm bg-muted"
        />
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Profile Photo
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="block text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
          />
          {preview && (
            <p className="text-xs text-muted-foreground font-medium">
              New image selected (click Update Profile to save)
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Student ID (read-only) */}
        <div>
          <label className={labelClass}>Student ID</label>
          <input
            value={form.student_id}
            disabled
            className={disabledInputClass}
          />
        </div>

        {/* ID Number */}
        <div>
          <label className={labelClass}>ID Number</label>
          <input
            type="text"
            name="id_number"
            value={form.id_number}
            onChange={handleChange}
            className={inputClass}
            placeholder="e.g. 200414000328"
          />
        </div>

        {/* First & Last Name */}
        <div>
          <label className={labelClass}>First Name</label>
          <input
            type="text"
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Last Name</label>
          <input
            type="text"
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            className={inputClass}
            required
          />
        </div>

        {/* Email (full width) */}
        <div className="md:col-span-2">
          <label className={labelClass}>Email</label>
          <input
            type="email"
            name="user_email"
            value={form.user_email}
            onChange={handleChange}
            className={inputClass}
            required
          />
        </div>

        {/* Phone & Batch */}
        <div>
          <label className={labelClass}>Phone</label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Batch</label>
          <select
            name="batch"
            value={form.batch}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="">Select Batch</option>
            {batches.map((b) => (
              <option key={b.id} value={b.batch_code}>
                {b.batch_name || b.batch_code}
              </option>
            ))}
          </select>
        </div>

        {/* Birthday */}
        <div>
          <label className={labelClass}>Birthday</label>
          <input
            type="date"
            name="birthday"
            value={form.birthday}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* Address (full width, textarea) */}
        <div className="md:col-span-2">
          <label className={labelClass}>Address</label>
          <textarea
            name="user_address"
            value={form.user_address}
            onChange={handleChange}
            rows={3}
            className={textareaClass}
            placeholder="Full address..."
          />
        </div>

        {/* Status Messages */}
        {(successMessage || errorMessage) && (
          <div className="md:col-span-2">
            {successMessage && (
              <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                {successMessage}
              </div>
            )}
            {errorMessage && (
              <div className="text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3.5 rounded-lg border border-rose-200 dark:border-rose-800">
                {errorMessage}
              </div>
            )}
          </div>
        )}

        {/* Submit Button (full width on mobile, auto on desktop) */}
        <div className="md:col-span-2 flex justify-start pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm rounded-md shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Update Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}