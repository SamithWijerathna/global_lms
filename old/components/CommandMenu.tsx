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
  Home,
  BarChart3,
  Package,
  CheckSquare,
  FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";

// Correct individual HeroUI imports
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Kbd } from "@heroui/kbd";
import { ScrollShadow } from "@heroui/scroll-shadow"; // Optional: for fade shadows

const staticActions = [
  { name: "Dashboard", path: "/dashboard", icon: Home },
  { name: "Performance", path: "/performance", icon: BarChart3 },
  { name: "Class Store", path: "/classStore", icon: Package },
  { name: "My Classes", path: "/myClasses", icon: List },
  { name: "Quiz", path: "/quiz", icon: CheckSquare },
  { name: "Class Materials", path: "/classMaterials", icon: BookOpen },
  { name: "Edit Profile", path: "/settings/editProfile", icon: User },
  { name: "Payment History", path: "/settings/paymentHistory", icon: FileText },
];

type SearchResults = {
  classes: {
    class_id: string;
    class_title: string;
    batch: string;
    class_description?: string;
  }[];
  materials: {
    material_id: string;
    material_title: string;
    material_description?: string;
    material_type: string;
    class_id: string;
    class_title: string;
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
    classes: [],
    materials: [],
  });
  const router = useRouter();
React.useEffect(() => {
    console.log('CommandMenu effect running - setting up open/close functions');
    commandMenu.open = () => {
      console.log('commandMenu.open() called, setting open to true');
      setOpen(true);
    };
    commandMenu.close = () => {
      console.log('commandMenu.close() called, setting open to false');
      setOpen(false);
    };
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
      setResults({ classes: [], materials: [] });
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
          console.log('CommandMenu - search API response:', data);
          if (data.error) {
            console.error('CommandMenu - API error:', data.error, data.details);
          }
          setResults({
            classes: data.classes || [],
            materials: data.materials || [],
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
              placeholder="Search classes, class materials, or actions..."
              className="h-9 border-0 focus:ring-0 text-base bg-transparent"
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
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
                {/* Show Quick Actions - all when not searching, filtered when searching */}
                {(() => {
                  const filteredActions = query.length >= 2
                    ? staticActions.filter(action => 
                        action.name.toLowerCase().includes(query.toLowerCase())
                      )
                    : staticActions;
                  
                  if (filteredActions.length > 0) {
                    return (
                      <Command.Group heading="Quick Actions">
                        {filteredActions.map((action) => (
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
                    );
                  }
                })()}

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

                {!loading && query.length >= 2 && (() => {
                  const hasFilteredActions = staticActions.some(action => 
                    action.name.toLowerCase().includes(query.toLowerCase())
                  );
                  return !hasFilteredActions && results.classes.length === 0 && results.materials.length === 0;
                })() && (
                  <Command.Empty>
                    <div className="py-10 text-center text-gray-500">
                      <p className="text-sm">
                        No results found for "<span className="font-medium">{query}</span>"
                      </p>
                      <p className="text-xs mt-2">Try a different search term.</p>
                    </div>
                  </Command.Empty>
                )}

                {!loading && results.materials.length > 0 && (
                  <Command.Group heading="Materials">
                    {results.materials.map((m) => (
                      <Command.Item
                        key={m.material_id}
                        onSelect={() => {
                          router.push(`/classMaterials?material=${m.material_id}`);
                          setOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg data-[selected=true]:bg-purple-100 dark:data-[selected=true]:bg-purple-900/30 cursor-pointer transition-colors"
                      >
                        <BookOpen className="h-5 w-5 text-purple-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{m.material_title}</p>
                          {m.material_description && (
                            <p className="text-xs text-gray-500 truncate">{m.material_description}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{m.class_title}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {!loading && results.classes.length > 0 && (
                  <Command.Group heading="Classes">
                    {results.classes.map((c) => (
                      <Command.Item
                        key={c.class_id}
                        onSelect={() => {
                          router.push(`/myClasses?class=${c.class_id}`);
                          setOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg data-[selected=true]:bg-green-100 dark:data-[selected=true]:bg-green-900/30 cursor-pointer transition-colors"
                      >
                        <GraduationCap className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{c.class_title}</p>
                          {c.class_description && (
                            <p className="text-xs text-gray-500 truncate">{c.class_description}</p>
                          )}
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