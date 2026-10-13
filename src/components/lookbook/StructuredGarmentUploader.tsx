"use client";

import React, { useRef, useState } from "react";
import { Upload, X, Plus, Sparkles, Shirt, ChevronDown, Check, Layers } from "lucide-react";
import { FALLBACK_IMAGE } from "./ui";

export interface StructuredGarmentSlot {
  id: string;
  role: "main_drape" | "pallu" | "body" | "chest" | "blouse" | "extra";
  label: string;
  subtitle: string;
  url?: string;
  note?: string;
  isOptional?: boolean;
}

export const DRAPING_STYLES = [
  { id: "default", name: "Default drape", desc: "Signature catalog drape with natural pallu flow" },
  { id: "floating_pallu", name: "Floating / Open Pallu", desc: "Pallu open and gracefully cascading over the arm" },
  { id: "pleated_pallu", name: "Neatly Pleated Pallu", desc: "Even, crisp pleats pinned securely at the shoulder" },
  { id: "gujarati", name: "Gujarati / Seedha Pallu", desc: "Pallu brought from back over the right shoulder" },
  { id: "royal_bengali", name: "Royal Traditional Drape", desc: "Classic box-pleated ceremonial pallu drape" },
  { id: "modern_casual", name: "Contemporary Clean Drape", desc: "Sleek, minimalist modern fashion drape" }
];

export const BLOUSE_STYLES = [
  { id: "auto", name: "Auto-coordinate with border & zari (Default)" },
  { id: "matching", name: "Matching saree body fabric" },
  { id: "contrast", name: "Contrast ethnic designer blouse" },
  { id: "elbow_sleeves", name: "Classic elbow-length sleeves" },
  { id: "sleeveless", name: "Modern sleeveless / thin strap" }
];

interface StructuredGarmentUploaderProps {
  slots: StructuredGarmentSlot[];
  onUploadSlot: (role: string, file: File) => void;
  onRemoveSlot: (role: string) => void;
  onUpdateNote: (role: string, note: string) => void;
  uploading: boolean;
  drapingStyle: string;
  onSelectDrapingStyle: (style: string) => void;
  blouseStyle: string;
  onSelectBlouseStyle: (style: string) => void;
  onAddExtraSlot?: () => void;
}

export function StructuredGarmentUploader({
  slots,
  onUploadSlot,
  onRemoveSlot,
  onUpdateNote,
  uploading,
  drapingStyle,
  onSelectDrapingStyle,
  blouseStyle,
  onSelectBlouseStyle,
  onAddExtraSlot
}: StructuredGarmentUploaderProps) {
  const [drapeDropdownOpen, setDrapeDropdownOpen] = useState(false);
  const [blouseDropdownOpen, setBlouseDropdownOpen] = useState(false);
  const [dragOverRole, setDragOverRole] = useState<string | null>(null);

  const mainSlot = slots.find((s) => s.role === "main_drape") || slots[0];
  const subSlots = slots.filter((s) => s.role !== "main_drape");

  const mainInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-4">
      {/* ----------------------------------------------------------------- */}
      {/* Draping Style Selector Bar                                         */}
      {/* ----------------------------------------------------------------- */}
      <div className="relative">
        <div className="flex items-center justify-between rounded-xl border border-line bg-sand/60 px-3.5 py-2.5 transition-colors hover:border-muted-purple">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-clay-soft text-fuchsia-accent">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                Draping Style
              </span>
              <span className="block text-xs font-semibold text-ink">
                {drapingStyle}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDrapeDropdownOpen((v) => !v)}
            className="flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-fuchsia-accent hover:text-fuchsia-accent"
          >
            Change
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {drapeDropdownOpen && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1.5 flex flex-col gap-1 rounded-xl border border-line bg-surface p-2 shadow-xl backdrop-blur-md">
            {DRAPING_STYLES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  onSelectDrapingStyle(d.name);
                  setDrapeDropdownOpen(false);
                }}
                className={`flex items-start justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                  drapingStyle === d.name
                    ? "bg-clay-soft text-ink font-semibold"
                    : "text-ink-soft hover:bg-sand/60 hover:text-ink"
                }`}
              >
                <div>
                  <span className="block text-xs">{d.name}</span>
                  <span className="block text-[10px] text-ink-faint">{d.desc}</span>
                </div>
                {drapingStyle === d.name && (
                  <Check className="h-4 w-4 shrink-0 text-fuchsia-accent mt-0.5" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Hero Slot 1: Full Mannequin / Saree Drape                          */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col gap-1.5">
        <input
          ref={mainInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              onUploadSlot(mainSlot.role, e.target.files[0]);
            }
          }}
        />

        {mainSlot.url ? (
          <div className="group relative flex flex-col sm:flex-row items-center gap-3.5 rounded-xl border border-line bg-sand/40 p-3 transition-colors hover:border-muted-purple">
            <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
              <img
                src={mainSlot.url}
                alt={mainSlot.label}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
              />
              <span className="absolute bottom-1.5 left-1.5 rounded-md bg-void/80 px-1.5 py-0.5 text-[9px] font-semibold text-fuchsia-accent">
                Slot 1 • Main Drape
              </span>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2 w-full">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-fuchsia-accent" />
                    {mainSlot.label}
                  </h3>
                  <p className="text-[11px] text-ink-faint">{mainSlot.subtitle}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => mainInputRef.current?.click()}
                    className="cursor-pointer rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-medium text-ink-soft hover:border-muted-purple hover:text-ink"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveSlot(mainSlot.role)}
                    className="cursor-pointer rounded-lg border border-line bg-surface p-1 text-ink-faint hover:bg-brick/10 hover:text-brick hover:border-brick"
                    aria-label="Remove photo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={mainSlot.note || ""}
                onChange={(e) => onUpdateNote(mainSlot.role, e.target.value)}
                placeholder="Detail note (e.g. Pure organza with gold zari borders, full length)"
                className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-faint/60 focus:border-fuchsia-accent focus:outline-none"
              />
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverRole(mainSlot.role);
            }}
            onDragLeave={() => setDragOverRole(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverRole(null);
              if (e.dataTransfer.files?.[0]) {
                onUploadSlot(mainSlot.role, e.dataTransfer.files[0]);
              }
            }}
            onClick={() => mainInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
              dragOverRole === mainSlot.role
                ? "border-fuchsia-accent bg-clay-soft"
                : "border-line bg-sand/30 hover:border-muted-purple hover:bg-sand/60"
            }`}
          >
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-clay-soft text-fuchsia-accent shadow-sm">
              <Upload className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold text-ink">
              Upload full mannequin photo (slot 1)
            </span>
            <span className="mt-0.5 max-w-sm text-[11px] text-ink-faint">
              Saree draped on a mannequin or flat-lay — full length, portrait, pallu at the top
            </span>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Sub-Slots Grid (Pallu, Body, Chest, Blouse)                       */}
      {/* ----------------------------------------------------------------- */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider">
            Mannequin close-up angles & blouse
          </span>
          <span className="text-[10px] text-ink-faint">
            Blouse is optional (a separate blouse the model will wear)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {subSlots.map((slot) => {
            const inputRef = React.createRef<HTMLInputElement>();
            const isBlouse = slot.role === "blouse";

            return (
              <div
                key={slot.role}
                className={`relative flex flex-col rounded-xl border transition-all ${
                  slot.url
                    ? "border-line bg-sand/40 p-2 hover:border-muted-purple"
                    : isBlouse
                    ? "border-dashed border-fuchsia-accent/40 bg-clay-soft/40 p-2.5 hover:border-fuchsia-accent"
                    : "border-dashed border-line bg-sand/20 p-2.5 hover:border-muted-purple"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      onUploadSlot(slot.role, e.target.files[0]);
                    }
                  }}
                />

                {slot.url ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-line bg-surface">
                      <img
                        src={slot.url}
                        alt={slot.label}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_IMAGE;
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => onRemoveSlot(slot.role)}
                        className="absolute right-1 top-1 rounded bg-void/80 p-1 text-ink-soft hover:bg-brick hover:text-white transition-colors"
                        aria-label="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 rounded bg-void/80 px-1 text-[8px] font-semibold text-ink-soft">
                        {slot.label}
                      </span>
                    </div>

                    <input
                      type="text"
                      value={slot.note || ""}
                      onChange={(e) => onUpdateNote(slot.role, e.target.value)}
                      placeholder="Layer note..."
                      className="w-full rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] text-ink placeholder:text-ink-faint/50 focus:border-fuchsia-accent focus:outline-none"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverRole(slot.role);
                    }}
                    onDragLeave={() => setDragOverRole(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverRole(null);
                      if (e.dataTransfer.files?.[0]) {
                        onUploadSlot(slot.role, e.dataTransfer.files[0]);
                      }
                    }}
                    className="flex flex-1 flex-col items-center justify-center gap-1.5 py-4 text-center cursor-pointer"
                  >
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                        isBlouse
                          ? "border-fuchsia-accent/50 bg-clay-soft text-fuchsia-accent"
                          : "border-line bg-surface text-ink-soft"
                      }`}
                    >
                      {isBlouse ? <Shirt className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </div>
                    <span className="block text-[11px] font-semibold text-ink leading-tight">
                      {slot.label}
                    </span>
                    <span className="block text-[9px] text-ink-faint leading-tight">
                      {slot.subtitle}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Blouse Styling Preference Bar (when blouse is optional/derived)   */}
      {/* ----------------------------------------------------------------- */}
      <div className="relative rounded-xl border border-line bg-sand/30 p-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shirt className="h-4 w-4 text-fuchsia-accent shrink-0" />
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                Blouse Styling Directive
              </span>
              <span className="block text-xs font-medium text-ink">
                {blouseStyle}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setBlouseDropdownOpen((v) => !v)}
            className="flex items-center gap-1 self-start sm:self-auto rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-fuchsia-accent"
          >
            Options
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        {blouseDropdownOpen && (
          <div className="absolute left-3 right-3 top-full z-30 mt-1.5 flex flex-col gap-1 rounded-xl border border-line bg-surface p-2 shadow-xl backdrop-blur-md">
            {BLOUSE_STYLES.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  onSelectBlouseStyle(b.name);
                  setBlouseDropdownOpen(false);
                }}
                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                  blouseStyle === b.name
                    ? "bg-clay-soft text-ink font-semibold"
                    : "text-ink-soft hover:bg-sand/60 hover:text-ink"
                }`}
              >
                <span>{b.name}</span>
                {blouseStyle === b.name && (
                  <Check className="h-3.5 w-3.5 text-fuchsia-accent" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
