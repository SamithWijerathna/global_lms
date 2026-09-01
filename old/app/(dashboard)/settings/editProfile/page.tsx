"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../../../src/lib/useAuth";

const inputClass = "w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";
const disabledInputClass = "w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed";

export default function EditProfilePage() {
  const { user, loading } = useAuth();

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrorMessage("Please select a valid image file.");
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
        // Keep preview if a new image was uploaded (it will show until page reload)
      } else {
        setErrorMessage(data.error || "Update failed. Please try again.");
      }
    } catch (err) {
      console.error("Update failed", err);
      setErrorMessage("An error occurred while updating your profile.");
    }

    setSaving(false);
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return <div className="p-8 text-center text-red-500">Not logged in</div>;

  const profileImageUrl = preview || user.profile_url || "https://via.placeholder.com/128?text=No+Image";

  return (
    <div className="mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow mt-8 pb-24 sm:pb-6">
      <h2 className="text-2xl font-bold mb-8">Edit Profile</h2>

      {/* Profile Picture */}
      <div className="flex flex-col items-start mb-10">
        <img
          src={profileImageUrl}
          alt="Profile"
          className="w-32 h-32 rounded-full object-cover border-4 border-gray-300 dark:border-gray-600 shadow-lg"
        />
        {preview && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">New image preview</p>}
        <input
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileChange}
          className="mt-4 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
        />
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <option value="2027OL">2027 OL</option>
            <option value="2028OL">2028 OL</option>

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
            rows={4}
            className={`${inputClass} resize-none`}
            placeholder="Full address..."
          />
        </div>

        {/* Submit Button (full width) */}
        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-56 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold disabled:opacity-70 disabled:cursor-not-allowed transition"
          >
            {saving ? "Saving..." : "Update Profile"}
          </button>
        </div>
      </form>

      {/* Messages */}
      {successMessage && (
        <div className="text-center mt-6 text-green-600 dark:text-green-400 font-medium">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="text-center mt-6 text-red-600 dark:text-red-400 font-medium">
          {errorMessage}
        </div>
      )}
    </div>
  );
}