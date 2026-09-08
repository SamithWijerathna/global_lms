"use client";

import React, { useState, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Eye,
  Edit3,
  CornerDownLeft,
} from "lucide-react";
import RichTextRenderer from "./RichTextRenderer";

interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({
  label = "Description",
  value = "",
  onChange,
  placeholder = "Write detailed description here...",
  className = "",
}: RichTextEditorProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Insert formatting tag or text at current selection cursor
  const insertFormat = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + before + after);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const replacement = before + selectedText + after;

    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    // Restore focus and position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };


  // Format line prefix (e.g. Bullet list or Heading)
  const formatLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lines = value.substring(start, end).split("\n");

    const formatted = lines.map(line => `${prefix}${line}`).join("\n");
    const newValue = value.substring(0, start) + formatted + value.substring(end);
    onChange(newValue);
  };

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      <div className="flex items-center justify-between">
        {label && <label className="text-xs font-semibold text-default-700">{label}</label>}
        <div className="flex items-center gap-1 bg-default-100 dark:bg-default-50/10 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 font-medium ${
              activeTab === "edit" ? "bg-background text-primary shadow-sm" : "text-default-500 hover:text-foreground"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 font-medium ${
              activeTab === "preview" ? "bg-background text-primary shadow-sm" : "text-default-500 hover:text-foreground"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
        </div>
      </div>

      {activeTab === "edit" ? (
        <div className="border border-default-200 dark:border-default-800 rounded-xl overflow-hidden bg-content1 shadow-sm">
          {/* Formatting Toolbar */}
          <div className="flex flex-wrap items-center gap-1 p-2 bg-default-100/60 dark:bg-default-50/5 border-b border-default-200/60 dark:border-default-800 text-xs">
            {/* Text Sizing / Headings */}
            <button
              type="button"
              onClick={() => formatLinePrefix("# ")}
              className="p-1.5 rounded hover:bg-default-200/70 transition-colors text-foreground"
              title="Large Heading"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => formatLinePrefix("## ")}
              className="p-1.5 rounded hover:bg-default-200/70 transition-colors text-foreground"
              title="Medium Subheading"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => formatLinePrefix("### ")}
              className="p-1.5 rounded hover:bg-default-200/70 transition-colors text-foreground"
              title="Small Heading"
            >
              <Heading3 className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-default-300 mx-1" />

            {/* Bolding & Style */}
            <button
              type="button"
              onClick={() => insertFormat("**", "**")}
              className="p-1.5 rounded hover:bg-default-200/70 transition-colors font-bold text-foreground"
              title="Bold Text (**text**)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormat("*", "*")}
              className="p-1.5 rounded hover:bg-default-200/70 transition-colors italic text-foreground"
              title="Italic Text (*text*)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormat("<u>", "</u>")}
              className="p-1.5 rounded hover:bg-default-200/70 transition-colors underline text-foreground"
              title="Underline Text"
            >
              <Underline className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormat("~~", "~~")}
              className="p-1.5 rounded hover:bg-default-200/70 transition-colors text-foreground"
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-default-300 mx-1" />

            {/* Lists & Spacing */}
            <button
              type="button"
              onClick={() => formatLinePrefix("🌀 ")}
              className="p-1.5 rounded hover:bg-default-200/70 transition-colors text-foreground font-semibold flex items-center gap-1"
              title="Spiral Bullet List (🌀)"
            >
              <List className="w-4 h-4 text-primary" />
            </button>
            <button
              type="button"
              onClick={() => formatLinePrefix("• ")}
              className="p-1.5 rounded hover:bg-default-200/70 transition-colors text-foreground"
              title="Standard Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => formatLinePrefix("1. ")}
              className="p-1.5 rounded hover:bg-default-200/70 transition-colors text-foreground"
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormat("\n\n")}
              className="p-1.5 rounded hover:bg-default-200/70 transition-colors text-foreground flex items-center gap-1"
              title="Paragraph Spacing (Line Break)"
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Text Area Input */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={6}
            className="w-full p-3 bg-transparent text-sm text-foreground focus:outline-none resize-y min-h-[140px] leading-relaxed font-sans"
          />
        </div>
      ) : (
        /* Live Preview Mode */
        <div className="border border-default-200 dark:border-default-800 rounded-xl p-4 min-h-[180px] bg-content1 shadow-sm">
          <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-2">Live Description Preview</p>
          <RichTextRenderer content={value} />
        </div>
      )}
    </div>
  );
}
