// app/papers/add/page.tsx
'use client';

import { useState } from 'react';
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Image } from "@heroui/image";
import { Card, CardFooter } from "@heroui/card";
import { useRouter } from "next/navigation";

export default function AddPaperPage() {
  const [paperName, setPaperName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!paperName.trim()) {
      alert('Paper name is required');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('action', 'paper_predefine');
    formData.append('paper_name', paperName);
    if (selectedFile) {
      formData.append('cover_image', selectedFile);
    }

    try {
      const token = process.env.NEXT_PUBLIC_API_SECRET_TOKEN;
      
      const res = await fetch('/api/papers', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (res.ok) {
        router.push('/admin/papers');
      } else if (res.status === 401) {
        alert('Unauthorized. Please log in again.');
        router.push('/admin/login');
      } else {
        alert('Failed to add paper');
      }
    } catch (err) {
      console.error(err);
      alert('Error adding paper');
    } finally {
      setLoading(false);
    }
  };

  const displaySrc = preview || null;
  const displayName = paperName || 'Untitled Paper';

  return (
    <div className="p-6 container">
      <h1 className="text-4xl font-bold mb-8">Add New Paper</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Form Side */}
        <div className="space-y-6">
          <Card>
            <Card className="p-6 space-y-6">
              <Input
                label="Paper Name"
                placeholder="e.g. Final Exam 2025"
                value={paperName}
                onValueChange={setPaperName}
                isRequired
              />

              <div className="grid w-full items-center gap-2">
                <label className="text-sm font-medium">Cover Image (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
                />
              </div>

              <div className="flex justify-end gap-4">
                <Button variant="light" onPress={() => router.push('/admin/papers')}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleSubmit}
                  isLoading={loading}
                  isDisabled={!paperName.trim()}
                >
                  Add Paper
                </Button>
              </div>
            </Card>
          </Card>
        </div>

        {/* Preview Side */}
        <div className="space-y-4">
          <p className="text-lg font-medium text-default-700">Live Preview</p>
          <p className="text-sm text-default-500">This is how the paper card will appear in the management list.</p>

          <Card className="relative w-full h-[400px] overflow-hidden shadow-xl">
            {displaySrc ? (
              <Image
                removeWrapper
                alt="Preview"
                className="z-0 w-full h-full object-cover"
                src={displaySrc}
              />
            ) : (
              <div className="z-0 w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white/90 text-3xl font-bold text-center px-8">
                  {displayName}
                </span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />

            <CardFooter className="absolute bottom-0 bg-white/30 backdrop-blur-md z-20 w-full border-t-1 border-zinc-100/50">
              <div className="flex flex-col gap-1 w-full px-4 py-3">
                <h4 className="text-white font-semibold text-2xl drop-shadow-lg">
                  {displayName}
                </h4>
                <p className="text-white/80 text-sm font-mono">
                  Will be generated
                </p>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}