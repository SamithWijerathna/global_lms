// app/marks/add/page.tsx (fixed student selection with reliable clickable items)
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Image } from "@heroui/image";
import { Card, CardBody, CardFooter } from "@heroui/card";
import { Select, SelectItem,  } from "@heroui/select";
import { ScrollShadow } from "@heroui/scroll-shadow";
import { useRouter } from "next/navigation";
import { Avatar } from "@heroui/avatar";
import { Spinner } from "@heroui/spinner";
export default function AddMarkPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentUuid, setSelectedStudentUuid] = useState<string | null>(null);
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [markMcq, setMarkMcq] = useState('');
  const [markEssay, setMarkEssay] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [studentsRes, papersRes] = await Promise.all([
          fetch("/api/admin/students", {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}`,
            },
          }),
          fetch("/api/papers", {
            headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
          }),
        ]);
        if (!studentsRes.ok) throw new Error('Failed to fetch students');
        setStudents(await studentsRes.json());
        if (papersRes.ok) setPapers(await papersRes.json());
      } catch (err) {
        console.error(err);
        alert('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredStudents = students.filter((s) =>
    `${s.student_id} ${s.first_name} ${s.last_name} ${s.user_email} ${s.batch}`
      .toLowerCase()
      .includes(studentSearch.toLowerCase())
  );

  const selectedStudent = students.find((s) => s.uuid === selectedStudentUuid);
  const selectedPaper = papers.find((p) => p.paper_id === selectedPaperId);

  const mcqNum = parseFloat(markMcq) || 0;
  const essayNum = parseFloat(markEssay) || 0;
  const total = (mcqNum + essayNum).toFixed(2);

  const handleSubmit = async () => {
    if (!selectedStudentUuid || !selectedPaperId || isNaN(mcqNum) || isNaN(essayNum)) {
      alert('Please complete all fields with valid values');
      return;
    }
    setSubmitting(true);
    const formData = new FormData();
    formData.append('action', 'add_mark');
    formData.append('student_uuid', selectedStudentUuid);
    formData.append('paper_id', selectedPaperId);
    formData.append('mark_mcq', mcqNum.toFixed(2));
    formData.append('mark_essay', essayNum.toFixed(2));

    try {
      const token = process.env.NEXT_PUBLIC_API_SECRET_TOKEN;
      
      const res = await fetch('/api/marks', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      if (res.ok) router.push('/admin/papers/marks');
      else alert('Failed to add mark');
    } catch (err) {
      console.error(err);
      alert('Error adding mark');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return  <div className="flex justify-center py-20 w-full h-full">
          <Spinner size="lg" />
        </div>;

  return (
    <div className="p-6 container mx-auto">
      <h1 className="text-4xl font-bold mb-8">Add New Mark</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Form Side */}
        <div className="space-y-6">
          <Card>
            <Card className="p-6 space-y-8">
              {/* Searchable Student Selection with reliable clickable divs */}
              <div>
                <label className="text-sm font-medium block mb-2">Select Student *</label>
                <Input
                  placeholder="Search by ID, name, email, or batch..."
                  value={studentSearch}
                  onValueChange={setStudentSearch}
                  classNames={{ base: "mb-4" }}
                />

                {!selectedStudentUuid ? (
                  <ScrollShadow className="h-96 w-full border rounded-lg">
                    <div className="p-2">
                      {filteredStudents.length === 0 ? (
                        <p className="text-center text-default-500 py-8">No students found</p>
                      ) : (
                        filteredStudents.map((s) => (
                          <div
                            key={s.uuid}
                            className="p-3 mb-2 cursor-pointer hover:bg-default-100 rounded-lg transition-colors"
                            onClick={() => {
                              setSelectedStudentUuid(s.uuid);
                              setStudentSearch('');
                            }}
                          >
                            <div className="flex items-center gap-4">
                              <Avatar
                                name={`${s.first_name} ${s.last_name}`}
                                size="lg"
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {s.student_id} - {s.first_name} {s.last_name}
                                </span>
                                <span className="text-sm text-default-500">
                                  {s.user_email} • Batch: {s.batch}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollShadow>
                ) : (
                  <Card className="bg-default-50">
                    <CardBody>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar
                            name={`${selectedStudent.first_name} ${selectedStudent.last_name}`}
                            size="lg"
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {selectedStudent.student_id} - {selectedStudent.first_name} {selectedStudent.last_name}
                            </span>
                            <span className="text-sm text-default-500">
                              {selectedStudent.user_email} • Batch: {selectedStudent.batch}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="light"
                          size="sm"
                          onPress={() => {
                            setSelectedStudentUuid(null);
                            setStudentSearch('');
                          }}
                        >
                          Change
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>

              {/* Paper Select */}
              <div>
                <label className="text-sm font-medium block mb-2">Select Paper *</label>
                <Select
                  labelPlacement="outside"
                  placeholder="Select a paper"
                  classNames={{
                    base: "w-full",
                    trigger: "h-14",
                  }}
                  selectedKeys={selectedPaperId ? [selectedPaperId] : []}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0];
                    setSelectedPaperId(key ? (key as string) : null);
                  }}
                  renderValue={(items) => {
                    return items.map((item) => {
                      const p = papers.find((pa) => pa.paper_id === item.key);
                      if (!p) return null;
                      return (
                        <div key={item.key} className="flex items-center gap-3">
                          {p.paper_cover_image ? (
                            <Image
                              className="w-10 h-10 object-cover rounded-md"
                              src={`/uploads/papers/${p.paper_cover_image}`}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center text-white text-sm font-bold">
                              {p.paper_id}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {p.paper_id} - {p.paper_name || 'Untitled'}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  }}
                >
                  {papers.map((p) => (
                    <SelectItem key={p.paper_id} textValue={p.paper_name || p.paper_id}>
                      <div className="flex gap-3 items-center">
                        {p.paper_cover_image ? (
                          <Image
                            className="w-12 h-12 object-cover rounded-md"
                            src={`/uploads/papers/${p.paper_cover_image}`}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center text-white font-bold">
                            {p.paper_id}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-small font-medium">
                            {p.paper_id} - {p.paper_name || 'Untitled'}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </Select>
              </div>

              {/* Marks Input */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="MCQ Marks (Part A) *"
                  type="number"
                  step="0.01"
                  min="0"
                  value={markMcq}
                  onValueChange={setMarkMcq}
                  placeholder="0.00"
                />
                <Input
                  label="Essay Marks (Part B) *"
                  type="number"
                  step="0.01"
                  min="0"
                  value={markEssay}
                  onValueChange={setMarkEssay}
                  placeholder="0.00"
                />
              </div>

              {mcqNum > 0 && essayNum > 0 && (
                <div className="p-4 bg-primary-50 rounded-lg text-center">
                  <p className="text-lg font-medium">Total Marks</p>
                  <p className="text-3xl font-bold text-primary">{total}</p>
                </div>
              )}

              <div className="flex justify-end gap-4">
                <Button variant="light" onPress={() => router.push('/admin/papers/marks')}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleSubmit}
                  isLoading={submitting}
                  isDisabled={!selectedStudentUuid || !selectedPaperId || !markMcq || !markEssay}
                >
                  Add Mark
                </Button>
              </div>
            </Card>
          </Card>
        </div>

        {/* Preview Side */}
        <div className="space-y-4">
          <p className="text-lg font-medium text-default-700">Live Preview</p>
          <p className="text-sm text-default-500">This is how the mark card will appear in the list.</p>

          <Card className="relative w-full h-[400px] overflow-hidden shadow-xl">
            {selectedPaper?.paper_cover_image ? (
              <Image
                removeWrapper
                alt={selectedPaper.paper_name || 'Paper'}
                className="z-0 w-full h-full object-cover"
                src={`/uploads/papers/${selectedPaper.paper_cover_image}`}
              />
            ) : (
              <div className="z-0 w-full h-full bg-gradient-to-br from-indigo-500 to-pink-600 flex items-center justify-center">
                <span className="text-white/90 text-3xl font-bold text-center px-8">
                  {selectedPaper?.paper_name || 'Select Paper'}
                </span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />

            <CardFooter className="absolute bottom-0 bg-white/30 backdrop-blur-md z-20 w-full border-t-1 border-zinc-100/50">
              <div className="flex flex-col gap-1 w-full px-4 py-3">
                <h4 className="text-white font-semibold text-2xl drop-shadow-lg">
                  {selectedStudent ? `${selectedStudent.student_id} - ${selectedStudent.first_name} ${selectedStudent.last_name}` : 'Select Student'}
                </h4>
                <p className="text-white/80 text-lg">
                  {selectedPaper?.paper_name || selectedPaper?.paper_id || 'Select Paper'}
                </p>
                <div className="flex gap-6 text-white/90 text-sm">
                  <span>MCQ: {mcqNum.toFixed(2)}</span>
                  <span>Essay: {essayNum.toFixed(2)}</span>
                  <span className="font-bold">Total: {total}</span>
                </div>
                <p className="text-white/70 text-sm">Today</p>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}