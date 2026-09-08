"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Command } from "cmdk";
import {
  Search,
  PlusCircle,
  BookOpen,
  List,
  Users,
  User,
  GraduationCap,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

// Correct individual HeroUI imports
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Kbd } from "@heroui/kbd";
import { ScrollShadow } from "@heroui/scroll-shadow"; // Optional: for fade shadows

const staticActions = [
  { name: "Add Class", path: "/admin/classes/add", icon: PlusCircle },
  { name: "Add Material", path: "/admin/classes/materials/add", icon: BookOpen },
  { name: "Class List", path: "/admin/classes", icon: List },
  { name: "Student Management", path: "/admin/students", icon: Users },
];

type SearchResults = {
  students: {
    uuid: string;
    student_id: string;
    first_name: string;
    last_name: string;
  }[];
  classes: {
    id: number;
    class_name: string;
    batch: string;
  }[];
};
export const commandMenu = {
  open: () => {},
  close: () => {},
};
export function CommandMenu() {
  
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<SearchResults>({
    students: [],
    classes: [],
  });
  const router = useRouter();
React.useEffect(() => {
    commandMenu.open = () => setOpen(true);
    commandMenu.close = () => setOpen(false);
  }, []);
  // CMD + K toggle
 React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Debounced search
  React.useEffect(() => {
    if (!query || query.length < 2) {
      setResults({ students: [], classes: [] });
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          setResults({
            students: data.students || [],
            classes: data.classes || [],
          });
        })
        .catch((err) => {
          if (err.name !== "AbortError") console.error(err);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  return (
    <Modal hideCloseButton isOpen={open} onOpenChange={setOpen} backdrop="blur">
      <ModalContent className="p-0 max-w-2xl w-full overflow-hidden border border-gray-200 dark:border-gray-800">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15 }}
        >
          {/* Header */}
          <ModalHeader className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
            <Search className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search students, classes, or actions..."
              className="h-9 border-0 focus:ring-0 text-base bg-transparent"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              onPress={() => setOpen(false)}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </ModalHeader>

          {/* Scrollable Body with optional ScrollShadow */}
          <ModalBody className="p-0">
            <ScrollShadow className="max-h-96"> {/* Remove if you don't want shadows */}
              <Command className="px-2 py-3">
                {/* Quick Actions, Loading, Empty State, Students, Classes... (same as before) */}
                <Command.Group heading="Quick Actions">
                  {staticActions.map((action) => (
                    <Command.Item
                      key={action.path}
                      onSelect={() => {
                        router.push(action.path);
                        setOpen(false);
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg data-[selected=true]:bg-indigo-100 dark:data-[selected=true]:bg-indigo-900/30 cursor-pointer transition-colors"
                    >
                      <action.icon className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                      <span className="font-medium">{action.name}</span>
                    </Command.Item>
                  ))}
                </Command.Group>

                {loading && (
                  <div className="flex justify-center py-10">
                    <div className="flex gap-2">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="h-2 w-2 rounded-full bg-gray-400"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {!loading && query.length >= 2 && results.students.length === 0 && results.classes.length === 0 && (
                  <Command.Empty>
                    <div className="py-10 text-center text-gray-500">
                      <p className="text-sm">
                        No results found for "<span className="font-medium">{query}</span>"
                      </p>
                      <p className="text-xs mt-2">Try a different search term.</p>
                    </div>
                  </Command.Empty>
                )}

                {!loading && results.students.length > 0 && (
                  <Command.Group heading="Students">
                    {results.students.map((s) => (
                      <Command.Item
                        key={s.uuid}
                        onSelect={() => {
                          router.push(`/admin/students/${s.uuid}`);
                          setOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg data-[selected=true]:bg-blue-100 dark:data-[selected=true]:bg-blue-900/30 cursor-pointer transition-colors"
                      >
                        <User className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{s.first_name} {s.last_name}</p>
                        </div>
                        <span className="text-sm text-gray-500 font-mono">{s.student_id}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {!loading && results.classes.length > 0 && (
                  <Command.Group heading="Classes">
                    {results.classes.map((c) => (
                      <Command.Item
                        key={c.id}
                        onSelect={() => {
                          router.push(`/admin/classes/${c.id}`);
                          setOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg data-[selected=true]:bg-green-100 dark:data-[selected=true]:bg-green-900/30 cursor-pointer transition-colors"
                      >
                        <GraduationCap className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{c.class_name}</p>
                        </div>
                        <span className="text-sm text-gray-500">{c.batch}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command>
            </ScrollShadow>
          </ModalBody>

          {/* Footer */}
          <ModalFooter className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 px-4 py-2.5 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">↑↓ <span className="text-gray-400">navigate</span></span>
              <span className="flex items-center gap-1"><Kbd>↵</Kbd> <span className="text-gray-400">select</span></span>
            </div>
            <span className="flex items-center gap-1"><Kbd>Esc</Kbd> <span className="text-gray-400">close</span></span>
          </ModalFooter>
        </motion.div>
      </ModalContent>
    </Modal>
  );
}