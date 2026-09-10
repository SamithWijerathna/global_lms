"use client";

import React, { useState } from "react";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface AppInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppInfoModal({ open, onOpenChange }: AppInfoModalProps) {
  const currentYear = new Date().getFullYear();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[450px] w-[92vw] bg-white dark:bg-[#161618] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-zinc-100 p-6 rounded-2xl shadow-2xl shadow-gray-900/10 dark:shadow-black/60 overflow-hidden gap-0 transition-colors duration-200"
      >
        {/* Header with App Icon, Title and Version */}
        <div className="flex items-center gap-3.5 mb-5">
          {/* Volit App Logo Icon */}
          <div className="w-12 h-12 rounded-xl bg-slate-100/90 dark:bg-white/10 p-1.5 flex items-center justify-center flex-shrink-0 shadow-sm dark:shadow-lg border border-slate-200/80 dark:border-white/15 overflow-hidden transition-colors">
            <img
              src="/assets/volit-logo.png"
              alt="Volit Logo"
              className="w-full h-full object-contain rounded-lg drop-shadow-sm"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                Volit
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700/60">
                v2.4.0
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium mt-0.5 truncate">
              Enterprise Learning Management & Education System
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-4 text-[13.5px] leading-relaxed text-gray-600 dark:text-zinc-300 font-normal">
          {/* Generated Concept Description */}
          <p>
            Volit is a next-generation learning management and educational platform engineered for high-performance course delivery, student enrollment, secure video streaming, automated grading, examination management, and multi-branch educational operations.
          </p>

          {/* Attribution Paragraph */}
          <p className="text-gray-700 dark:text-zinc-300">
            Powered by{" "}
            <a
              href="https://circleone.asia"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gray-900 dark:text-white underline underline-offset-2 decoration-gray-400 dark:decoration-zinc-500 hover:decoration-gray-900 dark:hover:decoration-white hover:text-primary dark:hover:text-emerald-400 transition-colors"
            >
              CircleOne (circleone.asia)
            </a>{" "}
            and Developed by{" "}
            <a
              href="https://cloudwave.asia"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gray-900 dark:text-white underline underline-offset-2 decoration-gray-400 dark:decoration-zinc-500 hover:decoration-gray-900 dark:hover:decoration-white hover:text-primary dark:hover:text-emerald-400 transition-colors"
            >
              Cloudwave PVT Ltd (cloudwave.asia)
            </a>
            .
          </p>

          {/* Sri Lanka Pride Tagline */}
          <p className="text-[12.5px] text-gray-500 dark:text-zinc-400 font-medium">
            Proudly designed and developed in Sri Lanka
          </p>
        </div>

        {/* Bottom Footer Meta Row */}
        <div className="border-t border-gray-200 dark:border-zinc-800/90 pt-4 mt-5 flex items-center justify-between text-xs text-gray-500 dark:text-zinc-500">
          <span>&copy; {currentYear} Cloudwave PVT Ltd.</span>
          <span className="font-semibold text-gray-700 dark:text-zinc-400">
            Sri Lanka
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AppInfoButtonProps {
  collapsed?: boolean;
  className?: string;
}

export function AppInfoButton({ collapsed = false, className = "" }: AppInfoButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`relative flex items-center h-10 px-3 rounded-lg text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800/80 transition-all duration-200 outline-none cursor-pointer group ${
          collapsed ? "justify-center w-10 mx-auto" : "w-full gap-3"
        } ${className}`}
        title="App Info"
      >
        <Info className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-zinc-400 group-hover:text-primary dark:group-hover:text-primary transition-colors" />
        {!collapsed && (
          <span className="truncate flex-1 text-left text-xs font-semibold">
            App Info
          </span>
        )}
        {collapsed && (
          <div className="absolute left-12 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-md">
            App Info
          </div>
        )}
      </button>

      <AppInfoModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}