"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Table, TableHeader, TableBody, TableColumn, TableRow, TableCell } from "@heroui/table";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Pagination } from "@heroui/pagination";
import { Spinner } from "@heroui/spinner";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Checkbox } from "@heroui/checkbox";
import { useConfirm } from "@/components/admin/GlobalConfirm";
import { SearchIcon, VerticalDotsIcon, PlusIcon } from "@/components/admin/icons";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";

const columns = [
  { name: "TITLE", uid: "title", sortable: true },
  { name: "DESCRIPTION", uid: "description" },
  { name: "QUESTIONS", uid: "num_questions", sortable: true },
  { name: "TIMED", uid: "is_timed" },
  { name: "DEFAULT DURATION", uid: "default_duration", sortable: true },
  { name: "ACTIONS", uid: "actions" },
];

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterValue, setFilterValue] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);

  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [localQuestions, setLocalQuestions] = useState<any[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: qOpen, onOpen: qOnOpen, onClose: qOnClose } = useDisclosure();
  const [processing, setProcessing] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/quizzes", {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
      });
      const data = await res.json();
      setQuizzes(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!file) return null;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/quizzes/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      return url;
    } catch (err) {
      console.error(err);
      alert("Image upload failed");
      return null;
    }
  };

  const handleViewEdit = async (quiz: any) => {
    setSelectedQuiz({ ...quiz });
    const res = await fetch(`/api/admin/questions?quiz_uuid=${quiz.uuid}`, {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
    });
    const data = await res.json();
    const questionsWithLocalId = data.map((q: any) => ({ ...q, localId: uuidv4() }));
    setLocalQuestions(questionsWithLocalId);
    onOpen();
  };

  const handleAddQuiz = () => {
    setSelectedQuiz({
      title: "",
      description: "",
      is_timed: 1,
      default_duration: 30,
      allow_toggle_timing: 1,
      min_duration: 10,
      max_duration: 60,
    });
    setLocalQuestions([]);
    onOpen();
  };

  const handleSaveQuiz = async () => {
    setProcessing(true);
    if (!selectedQuiz?.title) {
      alert("Title is required");
      setProcessing(false);
      return;
    }

    let quizUuid = selectedQuiz.uuid;
    const isUpdate = !!quizUuid;

    const quizPayload = {
      ...(isUpdate ? { uuid: quizUuid } : {}),
      title: selectedQuiz.title,
      description: selectedQuiz.description || null,
      is_timed: selectedQuiz.is_timed ? 1 : 0,
      default_duration: selectedQuiz.default_duration,
      allow_toggle_timing: selectedQuiz.allow_toggle_timing ? 1 : 0,
      min_duration: selectedQuiz.min_duration,
      max_duration: selectedQuiz.max_duration,
    };

    const method = isUpdate ? "PUT" : "POST";
    const res = await fetch("/api/admin/quizzes", {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}`,
      },
      body: JSON.stringify(quizPayload),
    });

    if (!res.ok) {
      alert("Failed to save quiz");
      setProcessing(false);
      return;
    }

    if (!isUpdate) {
      const data = await res.json();
      quizUuid = data.uuid;
    }

    // Delete old questions when updating
    if (isUpdate) {
      await fetch(`/api/admin/questions?quiz_uuid=${quizUuid}&all=true`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}` },
      });
    }

    // Save questions with images
    for (const q of localQuestions) {
      const payload = {
        quiz_uuid: quizUuid,
        type: q.type,
        question_text: q.question_text,
        explanation: q.explanation || null,
        image_url: q.image_url || null,                    // ← Saved here
        points: q.points || 5,
        positive_points: q.positive_points || 1,
        negative_points: q.negative_points || 1,
        options: (q.options || []).map((o: any) => ({
          letter: o.letter,
          text: o.text || "",
          image_url: o.image_url || null,                  // ← Saved here
          is_correct: o.is_correct ? 1 : 0,
        })),
        statements: (q.statements || []).map((s: any) => ({
          index: s.index,
          text: s.text || "",
          is_correct: s.is_correct ? 1 : 0,
        })),
      };

      await fetch("/api/admin/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}`,
        },
        body: JSON.stringify(payload),
      });
    }

    fetchQuizzes();
    onClose();
    setProcessing(false);
  };

  const handleAddQuestion = () => {
    setSelectedQuestion({
      localId: uuidv4(),
      type: "mcq",
      question_text: "",
      explanation: "",
      image_url: "",                                 // ← New
      points: 5,
      positive_points: 1,
      negative_points: 1,
      options: Array.from({ length: 5 }, (_, i) => ({
        letter: String.fromCharCode(65 + i),
        text: "",
        image_url: "",                               // ← New
        is_correct: 0,
      })),
      statements: [],
    });
    qOnOpen();
  };

  const handleEditQuestion = (question: any) => {
    setSelectedQuestion({ ...question });
    qOnOpen();
  };

  const handleSaveLocalQuestion = () => {
    if (!selectedQuestion?.question_text?.trim()) {
      alert("Question text is required");
      return;
    }
    const updated = localQuestions.filter((q: any) => q.localId !== selectedQuestion.localId);
    updated.push(selectedQuestion);
    setLocalQuestions(updated);
    qOnClose();
  };

 const handleDeleteLocalQuestion = async (localId: string) => {
    const confirmed = await confirm({
      title: "Delete Question?",
      message: "This will remove the question from the current edit session.",
      confirmText: "Delete",
      confirmColor: "danger",
    });

    if (confirmed) {
      setLocalQuestions(localQuestions.filter((q: any) => q.localId !== localId));
    }
  };
  const handleDeleteQuiz = async (quiz: any) => {
  const confirmed = await confirm({
    title: "Delete Quiz?",
    message: `Are you sure you want to delete "${quiz.title}"? This action cannot be undone.`,
    confirmText: "Delete",
    confirmColor: "danger",
  });

  if (!confirmed) return;

  try {
    const res = await fetch(`/api/admin/quizzes?uuid=${quiz.uuid}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN || ""}`,
      },
    });

    if (!res.ok) {
      alert("Failed to delete quiz");
      return;
    }

    // Refresh the list
    fetchQuizzes();
  } catch (err) {
    console.error(err);
    alert("Error deleting quiz");
  }
};

  const renderCell = useCallback((quiz: any, columnKey: string) => {
    const cellValue = quiz[columnKey];
    switch (columnKey) {
      case "is_timed":
        return <Chip color={cellValue ? "success" : "warning"} size="sm">{cellValue ? "Timed" : "Untimed"}</Chip>;
      case "actions":
        return (
          <Dropdown>
            <DropdownTrigger>
              <Button isIconOnly size="sm" variant="light">
                <VerticalDotsIcon />
              </Button>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem key="view-edit" onPress={() => handleViewEdit(quiz)}>View/Edit</DropdownItem>
              <DropdownItem key="delete" className="text-danger" onPress={() => handleDeleteQuiz(quiz)}>Delete</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        );
      default:
        return cellValue ?? "";
    }
  }, []);

  const topContent = useMemo(() => (
    <div className="flex justify-between items-end">
      <Input
        isClearable
        placeholder="Search by title or description..."
        startContent={<SearchIcon />}
        value={filterValue}
        onClear={() => setFilterValue("")}
        onValueChange={setFilterValue}
      />
      <Button color="primary" startContent={<PlusIcon />} onPress={handleAddQuiz}>
        Add Quiz
      </Button>
    </div>
  ), [filterValue]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Quizzes Management</h1>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <Table
          aria-label="Quizzes table"
          topContent={topContent}
          bottomContent={<Pagination page={page} total={Math.ceil(quizzes.length / rowsPerPage)} onChange={setPage} />}
        >
          <TableHeader columns={columns}>
            {(column) => <TableColumn key={column.uid} allowsSorting={column.sortable}>{column.name}</TableColumn>}
          </TableHeader>
          <TableBody items={quizzes.slice((page-1)*rowsPerPage, page*rowsPerPage)}>
            {(item: any) => (
              <TableRow key={item.uuid}>
                {(columnKey) => <TableCell>{renderCell(item, columnKey as string)}</TableCell>}
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {/* Quiz Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{selectedQuiz?.uuid ? "Edit Quiz" : "Add Quiz"}</ModalHeader>
          <ModalBody className="space-y-6">
            {/* Quiz fields (same as before) */}
            <Input label="Title" value={selectedQuiz?.title || ""} onValueChange={(v) => setSelectedQuiz({ ...selectedQuiz, title: v })} />
            <Textarea label="Description" value={selectedQuiz?.description || ""} onValueChange={(v) => setSelectedQuiz({ ...selectedQuiz, description: v })} />
            <Checkbox isSelected={!!selectedQuiz?.is_timed} onValueChange={(v) => setSelectedQuiz({ ...selectedQuiz, is_timed: v ? 1 : 0 })}>Timed Quiz</Checkbox>
            <Input label="Default Duration (minutes)" type="number" value={selectedQuiz?.default_duration || ""} onValueChange={(v) => setSelectedQuiz({ ...selectedQuiz, default_duration: Number(v) })} />
            <Checkbox isSelected={!!selectedQuiz?.allow_toggle_timing} onValueChange={(v) => setSelectedQuiz({ ...selectedQuiz, allow_toggle_timing: v ? 1 : 0 })}>Allow toggle timing</Checkbox>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Min Duration" type="number" value={selectedQuiz?.min_duration || ""} onValueChange={(v) => setSelectedQuiz({ ...selectedQuiz, min_duration: Number(v) })} />
              <Input label="Max Duration" type="number" value={selectedQuiz?.max_duration || ""} onValueChange={(v) => setSelectedQuiz({ ...selectedQuiz, max_duration: Number(v) })} />
            </div>

            <div className="mt-8">
              <div className="flex justify-between mb-4">
                <h3 className="text-xl font-medium">Questions ({localQuestions.length})</h3>
                <Button color="primary" startContent={<PlusIcon />} onPress={handleAddQuestion}>Add Question</Button>
              </div>
              {/* Questions table */}
              <Table aria-label="Questions">
                <TableHeader>
                  <TableColumn>Question</TableColumn>
                  <TableColumn>Type</TableColumn>
                  <TableColumn>Actions</TableColumn>
                </TableHeader>
                <TableBody items={localQuestions}>
                  {(q: any) => (
                    <TableRow key={q.localId}>
                      <TableCell>{q.question_text?.substring(0, 60) || "(No text)"}...</TableCell>
                      <TableCell>{q.type?.toUpperCase()}</TableCell>
                      <TableCell>
                        <Dropdown>
                          <DropdownTrigger>
                            <Button isIconOnly size="sm" variant="light"><VerticalDotsIcon /></Button>
                          </DropdownTrigger>
                          <DropdownMenu>
                            <DropdownItem onPress={() => handleEditQuestion(q)}>Edit</DropdownItem>
                            <DropdownItem className="text-danger" onPress={() => handleDeleteLocalQuestion(q.localId)}>Delete</DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>Cancel</Button>
            <Button color="primary" onPress={handleSaveQuiz} isLoading={processing}>Save Quiz & Questions</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Question Edit Modal - FIXED IMAGE UPLOAD */}
      <Modal isOpen={qOpen} onClose={qOnClose} size="3xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>Add/Edit Question</ModalHeader>
          <ModalBody className="space-y-6">
            <Textarea
              label="Question Text"
              value={selectedQuestion?.question_text || ""}
              onValueChange={(v) => setSelectedQuestion({ ...selectedQuestion, question_text: v })}
            />

            {/* Question Image Upload */}
            <div>
              <p className="font-medium mb-2">Question Image (optional)</p>
              {selectedQuestion?.image_url && (
                <div className="mb-3">
                  <Image src={selectedQuestion.image_url} alt="Question" width={300} height={200} className="rounded-lg" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = await uploadImage(file);
                    if (url) setSelectedQuestion({ ...selectedQuestion, image_url: url });
                  }
                }}
              />
            </div>

            <Textarea label="Explanation" value={selectedQuestion?.explanation || ""} onValueChange={(v) => setSelectedQuestion({ ...selectedQuestion, explanation: v })} />

            <Select
              label="Type"
              selectedKeys={selectedQuestion?.type ? [selectedQuestion.type] : []}
              onSelectionChange={(keys: any) => {
                const type = Array.from(keys)[0] as string;
                let newData: any = { type };
                if (type === "mcq") {
                  newData.options = Array.from({ length: 5 }, (_, i) => ({
                    letter: String.fromCharCode(65 + i),
                    text: "",
                    image_url: "",
                    is_correct: 0,
                  }));
                  newData.statements = [];
                } else if (type === "abcd") {
                  newData.options = Array.from({ length: 4 }, (_, i) => ({
                    letter: String.fromCharCode(65 + i),
                    text: "",
                    image_url: "",
                    is_correct: 0,
                  }));
                  newData.statements = [];
                } else {
                  newData.options = [];
                  newData.statements = selectedQuestion?.statements || [];
                }
                setSelectedQuestion({ ...selectedQuestion, ...newData });
              }}
            >
              <SelectItem key="mcq">MCQ (5 options A-E)</SelectItem>
              <SelectItem key="abcd">ABCD (4 options A-D)</SelectItem>
              <SelectItem key="statement">Statement-based</SelectItem>
            </Select>

            {/* Options with Image Upload */}
            {selectedQuestion?.type && selectedQuestion.type !== "statement" && (
              <>
                <p className="font-medium">Options</p>
                {(selectedQuestion.type === "mcq" ? [0,1,2,3,4] : [0,1,2,3]).map((i) => {
                  const letter = String.fromCharCode(65 + i);
                  const opt = selectedQuestion.options?.find((o: any) => o.letter === letter) || { text: "", image_url: "", is_correct: 0 };

                  return (
                    <div key={letter} className="border p-5 rounded-xl space-y-4">
                      <div className="flex items-center gap-4">
                        <span className="font-semibold w-6">{letter}.</span>
                        <Input
                          placeholder="Option text"
                          value={opt.text}
                          onValueChange={(v) => {
                            const newOptions = [...(selectedQuestion.options || [])];
                            const idx = newOptions.findIndex((o: any) => o.letter === letter);
                            if (idx !== -1) newOptions[idx].text = v;
                            setSelectedQuestion({ ...selectedQuestion, options: newOptions });
                          }}
                        />
                        <Checkbox
                          isSelected={!!opt.is_correct}
                          onValueChange={(c) => {
                            const newOptions = (selectedQuestion.options || []).map((o: any) =>
                              o.letter === letter ? { ...o, is_correct: c ? 1 : 0 } : o
                            );
                            setSelectedQuestion({ ...selectedQuestion, options: newOptions });
                          }}
                        >
                          Correct
                        </Checkbox>
                      </div>

                      {/* Option Image Upload */}
                      <div>
                        <p className="text-sm text-default-500 mb-1">Option Image (optional)</p>
                        {opt.image_url && (
                          <div className="mb-3">
                            <Image src={opt.image_url} alt={`Option ${letter}`} width={200} height={140} className="rounded" />
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = await uploadImage(file);
                              if (url) {
                                const newOptions = [...(selectedQuestion.options || [])];
                                const idx = newOptions.findIndex((o: any) => o.letter === letter);
                                if (idx !== -1) newOptions[idx].image_url = url;
                                setSelectedQuestion({ ...selectedQuestion, options: newOptions });
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                <Input label="Points" type="number" value={selectedQuestion?.points || 5} onValueChange={(v) => setSelectedQuestion({ ...selectedQuestion, points: Number(v) })} />
              </>
            )}

            {selectedQuestion?.type === "statement" && (
              <div className="text-default-500 italic">Statement questions - image support coming soon</div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={qOnClose}>Cancel</Button>
            <Button color="primary" onPress={handleSaveLocalQuestion}>Save to Quiz</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}