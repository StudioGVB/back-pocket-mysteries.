"use client";

import React, { useState } from "react";
import { Check, X, Calendar } from "lucide-react";

export function toLocalDateTimeInputValue(isoString?: string | null): string {
  const d = isoString ? new Date(isoString) : new Date();
  const safeDate = Number.isNaN(d.getTime()) ? new Date() : d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${safeDate.getFullYear()}-${pad(safeDate.getMonth() + 1)}-${pad(
    safeDate.getDate()
  )}T${pad(safeDate.getHours())}:${pad(safeDate.getMinutes())}`;
}

interface InlineDateTimeEditorProps {
  value: string | null | undefined;
  onSave: (newIsoDate: string) => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
}

export function InlineDateTimeEditor({
  value,
  onSave,
  children,
  className = "",
}: InlineDateTimeEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState("");
  const [initialDraftValue, setInitialDraftValue] = useState("");
  const [saving, setSaving] = useState(false);

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    const initial = toLocalDateTimeInputValue(value);
    setDraftValue(initial);
    setInitialDraftValue(initial);
    setIsEditing(true);
  };

  const handleSave = async (e?: React.MouseEvent | React.FormEvent) => {
    e?.stopPropagation();
    if (!draftValue || saving) return;
    const parsed = new Date(draftValue);
    if (Number.isNaN(parsed.getTime())) return;

    try {
      setSaving(true);
      await onSave(parsed.toISOString());
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleContainerBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // If focus moved to another element inside this editor (e.g. Save/Cancel buttons), do nothing
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) {
      return;
    }
    // If the user picked a new date/time and clicked outside, auto-save it!
    if (draftValue && draftValue !== initialDraftValue && !saving) {
      void handleSave();
    }
  };

  if (isEditing) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onBlur={handleContainerBlur}
        className="inline-flex flex-wrap items-center gap-1.5 bg-white border-2 border-brand-pink rounded-xl px-2.5 py-1.5 shadow-md z-20"
      >
        <Calendar className="h-3.5 w-3.5 text-brand-pink shrink-0" />
        <input
          type="datetime-local"
          value={draftValue}
          autoFocus
          disabled={saving}
          onChange={(e) => setDraftValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSave();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setIsEditing(false);
            }
          }}
          className="text-xs font-bold text-brand-dark bg-transparent focus:outline-none"
        />
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          title="Save new date & time (Enter)"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-pink text-white hover:bg-brand-dark text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
        >
          <Check className="h-3 w-3" />
          <span>{saving ? "Saving..." : "Save"}</span>
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(false);
          }}
          title="Cancel (Esc)"
          className="p-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={startEditing}
      onDoubleClick={startEditing}
      title="Click to change posting date & time"
      className={`cursor-pointer select-none group/date relative inline-block rounded-lg transition-colors hover:ring-1 hover:ring-brand-pink/40 ${className}`}
    >
      {children}
    </div>
  );
}

