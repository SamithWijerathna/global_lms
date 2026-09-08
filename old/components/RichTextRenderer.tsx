"use client";

import React from "react";

interface RichTextRendererProps {
  content?: string | null;
  className?: string;
}

export default function RichTextRenderer({ content, className = "" }: RichTextRendererProps) {
  if (!content || !content.trim()) {
    return <p className="text-foreground/50 italic text-xs">No description provided.</p>;
  }

  // Parse lines and apply formatting
  const lines = content.split("\n");

  const parseInlineFormatting = (text: string) => {
    // Bold: **text** or <b>text</b>
    let parts: (string | React.ReactNode)[] = [text];

    // Helper to replace regex pattern with JSX element
    const replacePattern = (
      inputParts: (string | React.ReactNode)[],
      regex: RegExp,
      renderNode: (match: string, index: number) => React.ReactNode
    ) => {
      const result: (string | React.ReactNode)[] = [];
      inputParts.forEach((part) => {
        if (typeof part !== "string") {
          result.push(part);
          return;
        }

        let lastIndex = 0;
        let match: RegExpExecArray | null;
        let keyIdx = 0;

        while ((match = regex.exec(part)) !== null) {
          if (match.index > lastIndex) {
            result.push(part.substring(lastIndex, match.index));
          }
          result.push(renderNode(match[1] || match[0], keyIdx++));
          lastIndex = regex.lastIndex;
        }

        if (lastIndex < part.length) {
          result.push(part.substring(lastIndex));
        }
      });
      return result;
    };

    // Replace **bold**
    parts = replacePattern(parts, /\*\*(.*?)\*\*/g, (boldText, idx) => (
      <strong key={`b-${idx}`} className="font-bold text-foreground drop-shadow-xs">
        {boldText}
      </strong>
    ));

    // Replace <b>bold</b>
    parts = replacePattern(parts, /<b>(.*?)<\/b>/g, (boldText, idx) => (
      <strong key={`b2-${idx}`} className="font-bold text-foreground drop-shadow-xs">
        {boldText}
      </strong>
    ));

    // Replace *italic*
    parts = replacePattern(parts, /\*(.*?)\*/g, (italicText, idx) => (
      <em key={`i-${idx}`} className="italic">
        {italicText}
      </em>
    ));

    // Replace <u>underline</u>
    parts = replacePattern(parts, /<u>(.*?)<\/u>/g, (uText, idx) => (
      <u key={`u-${idx}`} className="underline underline-offset-2">
        {uText}
      </u>
    ));

    return parts;
  };

  return (
    <div className={`space-y-1.5 text-xs md:text-sm text-foreground/90 leading-relaxed ${className}`}>
      {lines.map((line, index) => {
        const trimmed = line.trim();

        // Empty line -> paragraph gap
        if (!trimmed) {
          return <div key={index} className="h-2" />;
        }

        // Headings (# , ## , ### )
        if (trimmed.startsWith("# ")) {
          return (
            <h2 key={index} className="text-base md:text-lg font-bold text-primary tracking-tight mt-3 mb-1">
              {parseInlineFormatting(trimmed.substring(2))}
            </h2>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={index} className="text-sm md:text-base font-bold text-foreground mt-2 mb-1">
              {parseInlineFormatting(trimmed.substring(3))}
            </h3>
          );
        }
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={index} className="text-xs md:text-sm font-semibold text-foreground/90 mt-1 mb-0.5">
              {parseInlineFormatting(trimmed.substring(4))}
            </h4>
          );
        }

        // Spiral Bullet list item (🌀 )
        if (trimmed.startsWith("🌀")) {
          return (
            <div key={index} className="flex items-start gap-2 my-1 pl-1">
              <span className="text-base shrink-0 leading-none">🌀</span>
              <div className="flex-1">{parseInlineFormatting(trimmed.replace(/^🌀\s*/, ""))}</div>
            </div>
          );
        }

        // Standard Bullet list item (• or - )
        if (trimmed.startsWith("• ") || trimmed.startsWith("- ")) {
          return (
            <div key={index} className="flex items-start gap-2 my-0.5 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-2" />
              <div className="flex-1">{parseInlineFormatting(trimmed.substring(2))}</div>
            </div>
          );
        }

        // Default line
        return (
          <div key={index} className="leading-relaxed">
            {parseInlineFormatting(line)}
          </div>
        );
      })}
    </div>
  );
}
