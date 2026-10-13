"use client";

import { STAGING_TEMPLATES } from "@/lib/flatlayData";

import React, { useRef, useState } from "react";
import {
  Upload,
  X,
  Plus,
  Info,
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles,
  Layers,
  Scissors
} from "lucide-react";
import { FALLBACK_IMAGE } from "./ui";

export type SuitSlotKey = "kameez" | "chest_design" | "dupatta" | "bottom" | "complete_set";

export interface SuitEntry {
  id: string;
  suitNumber: number;
  kameezUrl?: string;
  chestDesignUrl?: string;
  dupattaUrl?: string;
  bottomUrl?: string;
  completeSetUrl?: string;
  kameezNote?: string;
  chestDesignNote?: string;
  dupattaNote?: string;
  bottomNote?: string;
  completeSetNote?: string;
}

export const SUIT_SLOT_COLUMNS: Array<{
  key: SuitSlotKey;
  label: string;
  buttonLabel: string;
  description: string;
}> = [
  {
    key: "kameez",
    label: "Kameez",
    buttonLabel: "+ Kameez",
    description: "Main kurta / kameez fabric length"
  },
  {
    key: "chest_design",
    label: "Chest Design",
    buttonLabel: "+ Chest Design",
    description: "Neckline embroidery & gala patch"
  },
  {
    key: "dupatta",
    label: "Dupatta",
    buttonLabel: "+ Dupatta",
    description: "Dupatta drape, borders & print"
  },
  {
    key: "bottom",
    label: "Bottom",
    buttonLabel: "+ Bottom",
    description: "Salwar, pants or churidar fabric"
  },
  {
    key: "complete_set",
    label: "Complete Set",
    buttonLabel: "+ Complete Set",
    description: "Catalog ensemble or flat-lay reference"
  }
];

export const SLOT_URL_KEYS: Record<SuitSlotKey, keyof SuitEntry> = {
  kameez: "kameezUrl",
  chest_design: "chestDesignUrl",
  dupatta: "dupattaUrl",
  bottom: "bottomUrl",
  complete_set: "completeSetUrl"
};

export function getSuitSlotUrl(suit: SuitEntry, slotKey: SuitSlotKey): string | undefined {
  const camelKey = SLOT_URL_KEYS[slotKey];
  const legacyKey = `${slotKey}Url` as keyof SuitEntry;
  return (suit[camelKey] as string | undefined) || (suit[legacyKey] as string | undefined);
}

export const SUIT_SILHOUETTES = [
  {
    id: "auto",
    name: "✨ AI Auto-Detect (Default)",
    desc: "AI automatically identifies whether it's a straight suit, Anarkali, Pakistani lawn, sharara, or co-ord"
  },
  {
    id: "straight_kurta",
    name: "Straight Cut Kameez Set",
    desc: "Crisp tailored straight-fit kameez paired with sleek cigarette trousers"
  },
  {
    id: "pakistani_lawn",
    name: "Pakistani Lawn Long Kurta",
    desc: "Long relaxed silhouette with wide embroidered hem and flowing pants"
  },
  {
    id: "anarkali_flared",
    name: "Flared Anarkali Suit",
    desc: "Flared kalidar silhouette with gathered churidar and sweeping flare"
  },
  {
    id: "sharara_gharara",
    name: "Sharara / Gharara Suit",
    desc: "Short fitted kurta with voluminous tiered flare sharara pants"
  },
  {
    id: "aline_kurta",
    name: "A-Line Kurta with Pants",
    desc: "Graceful gentle flare A-line silhouette with tailored ankle trousers"
  },
  {
    id: "patiala_suit",
    name: "Classic Patiala Salwar Suit",
    desc: "Fitted short kameez with traditional multi-pleat voluminous patiala"
  }
];

export const DUPATTA_DRAPING_STYLES = [
  {
    id: "auto",
    name: "✨ AI Auto-Coordinate Drape (Default)",
    desc: "AI selects the most harmonious drape for the detected silhouette"
  },
  {
    id: "one_shoulder",
    name: "Pinned on One Shoulder",
    desc: "Gracefully pleated dupatta pinned at shoulder, flowing naturally downward"
  },
  {
    id: "both_shoulders",
    name: "Draped Across Both Shoulders",
    desc: "Formal royal U-drape across chest covering both shoulders"
  },
  {
    id: "forearms_flow",
    name: "Flowing Over Forearms",
    desc: "Contemporary relaxed drape resting across forearms and elbows"
  },
  {
    id: "diagonal_sash",
    name: "Diagonal Cross-Body Drape",
    desc: "Sash-style drape across torso showcasing intricate borders"
  },
  {
    id: "head_drape",
    name: "Regal Head Dupatta Drape",
    desc: "Festive drape resting over head and shoulders for traditional elegance"
  }
];

export interface StructuredSuitUploaderProps {
  suits: SuitEntry[];
  onUploadSlot: (suitId: string, slotKey: SuitSlotKey, file: File) => void;
  onRemoveSlot: (suitId: string, slotKey: SuitSlotKey) => void;
  onAddSuit: () => void;
  onRemoveSuit: (suitId: string) => void;
  uploading: boolean;
  uploadingSlotKey?: string | null;
  suitSilhouette?: string;
  onSelectSilhouette?: (silhouette: string) => void;
  dupattaDrape?: string;
  onSelectDupattaDrape?: (drape: string) => void;
  stepNumber?: number | string;
  sectionTitle?: string;
  sectionSubtitle?: string;
  renderSuitExtra?: (suit: SuitEntry) => React.ReactNode;
  variant?: "standard" | "flatlay";
}

export function StructuredSuitUploader({
  suits,
  onUploadSlot,
  onRemoveSlot,
  onAddSuit,
  onRemoveSuit,
  uploading,
  uploadingSlotKey,
  suitSilhouette,
  onSelectSilhouette,
  dupattaDrape,
  onSelectDupattaDrape,
  stepNumber = 2,
  sectionTitle = "Your Suits",
  sectionSubtitle = "Upload kameez fabric photo first, then add chest design and dupatta close-ups",
  renderSuitExtra,
  variant = "standard"
}: StructuredSuitUploaderProps) {
  const [showTips, setShowTips] = useState(false);
  const [silhouetteDropdownOpen, setSilhouetteDropdownOpen] = useState(false);
  const [dupattaDropdownOpen, setDupattaDropdownOpen] = useState(false);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  return (
    <div className="flex flex-col gap-5 text-ink">
      {/* ----------------------------------------------------------------- */}
      {/* 1. Collapsible Photo Tips Banner                                   */}
      {/* ----------------------------------------------------------------- */}
      <div className="rounded-xl border border-line bg-surface/80 overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowTips((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-sand/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold text-ink">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-fuchsia-accent/15 text-fuchsia-accent text-[11px] font-bold">
              !
            </div>
            <span>How to click photos for best results</span>
          </div>
          <div className="text-ink-faint">
            {showTips ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {showTips && (
          <div className="px-4 pb-4 pt-1 border-t border-line/60 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-ink-soft animate-in fade-in-50">
            <div className="p-2.5 rounded-lg bg-sand/50 border border-line/50">
              <span className="font-bold text-ink block mb-1">1. Kameez & Chest</span>
              <p className="text-[11px] text-ink-faint leading-relaxed">
                Capture the front panel flat or on a hanger in uniform daylight. Include a separate close-up of the neck embroidery.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-sand/50 border border-line/50">
              <span className="font-bold text-ink block mb-1">2. Dupatta & Bottom</span>
              <p className="text-[11px] text-ink-faint leading-relaxed">
                Fold or spread the dupatta to show border lace and tassels. Keep bottom fabric flat and true to its fabric shade.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-sand/50 border border-line/50">
              <span className="font-bold text-ink block mb-1">3. Complete Set (AI Detection)</span>
              <p className="text-[11px] text-ink-faint leading-relaxed">
                Upload a flat-lay of all pieces together. AI auto-detects whether to tailor a suit, Anarkali, sharara, or co-ord!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 2. Section Header: (2) Your Suits                          1 / 20 */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-accent text-white font-bold text-xs shadow-xs">
            {stepNumber}
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              {sectionTitle}
              <span className="pill-neutral text-[9px] font-bold px-2 py-0.5 rounded-full bg-fuchsia-accent/10 text-fuchsia-accent border border-fuchsia-accent/20">
                AI Auto-Detection Active
              </span>
            </h3>
            <p className="text-xs text-ink-soft mt-0.5">
              {sectionSubtitle}
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-sand border border-line px-2.5 py-1 text-xs font-bold text-ink-soft">
          {suits.length} / 20
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 3. Suit Cards                                                     */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col gap-4">
        {suits.map((suit) => {
          return (
            <div
              key={suit.id}
              className="rounded-2xl border border-line bg-surface/90 p-4 sm:p-5 flex flex-col gap-4 shadow-sm relative"
            >
              {/* Card Header: "Suit 1" + Remove 'x' */}
              <div className="flex items-center justify-between border-b border-line/60 pb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-500">
                  Suit {suit.suitNumber}
                </span>

                {suits.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveSuit(suit.id)}
                    className="p-1 rounded-md text-ink-faint hover:text-brick hover:bg-brick-soft transition-colors cursor-pointer"
                    title="Remove this suit"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {variant === "flatlay" ? (
                /* ------------------------------------------------------------- */
                /* Flatlay: 1 Primary Suit Photo Slot + Optional Close-up Accordion */
                /* ------------------------------------------------------------- */
                (() => {
                  const mainUrl = getSuitSlotUrl(suit, "kameez") || suit.completeSetUrl;
                  const dragId = `${suit.id}_kameez`;
                  const isDragOver = dragOverKey === dragId;
                  const inputId = `suit-input-${suit.id}-kameez`;
                  const isSlotUploading =
                    uploadingSlotKey === `${suit.id}_kameez` ||
                    uploadingSlotKey === `${suit.id}_complete_set`;

                  const hasExtraPhotos = Boolean(suit.chestDesignUrl || suit.dupattaUrl || suit.bottomUrl);
                  const isDetailsOpen = expandedDetails[suit.id] ?? hasExtraPhotos;

                  const OPTIONAL_DETAILS: Array<{
                    key: SuitSlotKey;
                    label: string;
                    buttonLabel: string;
                    desc: string;
                  }> = [
                    {
                      key: "chest_design",
                      label: "Neckline Embroidery",
                      buttonLabel: "+ Chest Detail",
                      desc: "Gala embroidery close-up (Optional)"
                    },
                    {
                      key: "dupatta",
                      label: "Dupatta Scarf",
                      buttonLabel: "+ Dupatta",
                      desc: "Dupatta border & drape (Optional)"
                    },
                    {
                      key: "bottom",
                      label: "Bottom / Salwar",
                      buttonLabel: "+ Bottom",
                      desc: "Trouser fabric swatch (Optional)"
                    }
                  ];

                  return (
                    <div className="flex flex-col gap-3.5">
                      {/* Main Suit Photo Card */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-ink">
                              Suit Photo / Fabric
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              Only 1 image needed
                            </span>
                          </div>
                          <span className="text-[11px] text-ink-faint">
                            Folded suit, unstitched fabric, or catalog shot
                          </span>
                        </div>

                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverKey(dragId);
                          }}
                          onDragLeave={() => setDragOverKey(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOverKey(null);
                            const file = e.dataTransfer.files[0];
                            if (file) onUploadSlot(suit.id, "kameez", file);
                          }}
                          className={`relative h-48 sm:h-52 rounded-xl border flex flex-col items-center justify-center overflow-hidden transition-all ${
                            isDragOver
                              ? "border-fuchsia-accent bg-fuchsia-accent/10"
                              : mainUrl
                                ? "border-line bg-black/30"
                                : "border-dashed border-line/80 bg-sand/30 hover:border-fuchsia-accent/60 hover:bg-sand/60"
                          }`}
                        >
                          {isSlotUploading ? (
                            <div className="flex flex-col items-center justify-center gap-2 p-3 text-center h-full w-full">
                              <div className="h-6 w-6 animate-spin rounded-full border-2 border-fuchsia-accent border-t-transparent" />
                              <span className="text-[11px] font-semibold text-fuchsia-accent">Uploading suit photo...</span>
                            </div>
                          ) : mainUrl ? (
                            <>
                              <img
                                src={mainUrl}
                                alt={`Suit ${suit.suitNumber}`}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
                                }}
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveSlot(suit.id, "kameez");
                                  onRemoveSlot(suit.id, "complete_set");
                                }}
                                className="absolute right-2.5 top-2.5 h-7 w-7 rounded-full bg-black/75 hover:bg-brick text-white flex items-center justify-center transition-colors cursor-pointer shadow-md z-10"
                                title="Remove this photo"
                              >
                                <X className="h-4 w-4" />
                              </button>

                              <div className="absolute left-2.5 bottom-2.5 rounded-md px-2 py-1 bg-black/80 backdrop-blur-xs text-[11px] font-semibold text-white flex items-center gap-1.5 shadow-xs">
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                <span>Suit Photo Uploaded</span>
                              </div>
                            </>
                          ) : (
                            <label
                              htmlFor={inputId}
                              className="flex flex-col items-center justify-center gap-2 p-4 text-center cursor-pointer h-full w-full group select-none"
                            >
                              <div className="h-10 w-10 rounded-full bg-fuchsia-accent/10 text-fuchsia-accent flex items-center justify-center group-hover:scale-105 transition-transform">
                                <Upload className="h-5 w-5" />
                              </div>
                              <span className="text-sm font-bold text-ink group-hover:text-fuchsia-accent transition-colors">
                                + Upload Suit Photo
                              </span>
                              <span className="text-xs text-ink-faint leading-snug max-w-sm px-2">
                                Click to browse or drag & drop. Only this single photo is needed to stage your flat-lay.
                              </span>
                            </label>
                          )}

                          <input
                            id={inputId}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) onUploadSlot(suit.id, "kameez", file);
                              e.target.value = "";
                            }}
                          />
                        </div>
                      </div>

                      {/* Optional Close-Up Detail Slots Accordion */}
                      <div className="flex flex-col gap-2 pt-1 border-t border-line/40">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedDetails((prev) => ({
                              ...prev,
                              [suit.id]: !isDetailsOpen
                            }))
                          }
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-fuchsia-accent self-start transition-colors cursor-pointer py-1"
                        >
                          {isDetailsOpen ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                          <span>
                            {isDetailsOpen
                              ? "Hide optional close-ups"
                              : "+ Add optional close-up details (Neckline, Dupatta, Bottom)"}
                          </span>
                          <span className="text-[10px] text-ink-faint">(Optional)</span>
                        </button>

                        {isDetailsOpen && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                            {OPTIONAL_DETAILS.map((col) => {
                              const currentUrl = getSuitSlotUrl(suit, col.key);
                              const detailDragId = `${suit.id}_${col.key}`;
                              const isDetailDragOver = dragOverKey === detailDragId;
                              const detailInputId = `suit-input-${suit.id}-${col.key}`;
                              const isDetailUploading = uploadingSlotKey === `${suit.id}_${col.key}`;

                              return (
                                <div key={col.key} className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-ink truncate">
                                      {col.label}
                                    </span>
                                    <span className="text-[9px] text-ink-faint">Optional</span>
                                  </div>

                                  <div
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      setDragOverKey(detailDragId);
                                    }}
                                    onDragLeave={() => setDragOverKey(null)}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      setDragOverKey(null);
                                      const file = e.dataTransfer.files[0];
                                      if (file) onUploadSlot(suit.id, col.key, file);
                                    }}
                                    className={`relative h-36 rounded-xl border flex flex-col items-center justify-center overflow-hidden transition-all ${
                                      isDetailDragOver
                                        ? "border-fuchsia-accent bg-fuchsia-accent/10"
                                        : currentUrl
                                          ? "border-line bg-black/30"
                                          : "border-dashed border-line/80 bg-sand/30 hover:border-fuchsia-accent/60 hover:bg-sand/60"
                                    }`}
                                  >
                                    {isDetailUploading ? (
                                      <div className="flex flex-col items-center justify-center gap-1.5 p-2 text-center h-full w-full">
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-fuchsia-accent border-t-transparent" />
                                        <span className="text-[10px] font-semibold text-fuchsia-accent">Uploading...</span>
                                      </div>
                                    ) : currentUrl ? (
                                      <>
                                        <img
                                          src={currentUrl}
                                          alt={col.label}
                                          className="h-full w-full object-cover"
                                          onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
                                          }}
                                        />
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveSlot(suit.id, col.key);
                                          }}
                                          className="absolute right-1.5 top-1.5 h-6 w-6 rounded-full bg-black/75 hover:bg-brick text-white flex items-center justify-center transition-colors cursor-pointer shadow-md z-10"
                                          title={`Remove ${col.label}`}
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                        <div className="absolute left-1.5 bottom-1.5 rounded px-1.5 py-0.5 bg-black/75 backdrop-blur-xs text-[10px] font-semibold text-white flex items-center gap-1">
                                          <Check className="h-3 w-3 text-emerald-400" />
                                          <span>Uploaded</span>
                                        </div>
                                      </>
                                    ) : (
                                      <label
                                        htmlFor={detailInputId}
                                        className="flex flex-col items-center justify-center gap-1 p-2 text-center cursor-pointer h-full w-full group select-none"
                                      >
                                        <span className="text-xs font-semibold text-ink-soft group-hover:text-fuchsia-accent transition-colors">
                                          {col.buttonLabel}
                                        </span>
                                        <span className="text-[9px] text-ink-faint leading-tight px-1 line-clamp-2">
                                          {col.desc}
                                        </span>
                                      </label>
                                    )}

                                    <input
                                      id={detailInputId}
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) onUploadSlot(suit.id, col.key, file);
                                        e.target.value = "";
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* ------------------------------------------------------------- */
                /* Standard 5 Column Grid for Custom / Model Lookbooks           */
                /* ------------------------------------------------------------- */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {SUIT_SLOT_COLUMNS.map((col) => {
                    const currentUrl = getSuitSlotUrl(suit, col.key);
                    const dragId = `${suit.id}_${col.key}`;
                    const isDragOver = dragOverKey === dragId;
                    const inputId = `suit-input-${suit.id}-${col.key}`;
                    const isSlotUploading = uploadingSlotKey === `${suit.id}_${col.key}`;

                    return (
                      <div key={col.key} className="flex flex-col gap-1.5">
                        {/* Column Title */}
                        <span className="text-xs font-bold text-ink truncate">
                          {col.label}
                        </span>

                        {/* Upload Box */}
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverKey(dragId);
                          }}
                          onDragLeave={() => setDragOverKey(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOverKey(null);
                            const file = e.dataTransfer.files[0];
                            if (file) onUploadSlot(suit.id, col.key, file);
                          }}
                          className={`relative h-44 rounded-xl border flex flex-col items-center justify-center overflow-hidden transition-all ${
                            isDragOver
                              ? "border-fuchsia-accent bg-fuchsia-accent/10"
                              : currentUrl
                                ? "border-line bg-black/30"
                                : "border-dashed border-line/80 bg-sand/30 hover:border-fuchsia-accent/60 hover:bg-sand/60"
                          }`}
                        >
                          {isSlotUploading ? (
                            <div className="flex flex-col items-center justify-center gap-2 p-3 text-center h-full w-full">
                              <div className="h-6 w-6 animate-spin rounded-full border-2 border-fuchsia-accent border-t-transparent" />
                              <span className="text-[11px] font-semibold text-fuchsia-accent">Uploading...</span>
                            </div>
                          ) : currentUrl ? (
                            <>
                              <img
                                src={currentUrl}
                                alt={col.label}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
                                }}
                              />
                              {/* Remove button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveSlot(suit.id, col.key);
                                }}
                                className="absolute right-2 top-2 h-6 w-6 rounded-full bg-black/75 hover:bg-brick text-white flex items-center justify-center transition-colors cursor-pointer shadow-md z-10"
                                title={`Remove ${col.label}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>

                              {/* Done Badge */}
                              <div className="absolute left-2 bottom-2 rounded px-1.5 py-0.5 bg-black/75 backdrop-blur-xs text-[10px] font-semibold text-white flex items-center gap-1">
                                <Check className="h-3 w-3 text-emerald-400" />
                                <span>Uploaded</span>
                              </div>
                            </>
                          ) : (
                            <label
                              htmlFor={inputId}
                              className="flex flex-col items-center justify-center gap-2 p-3 text-center cursor-pointer h-full w-full group select-none"
                            >
                              <span className="text-xs font-semibold text-ink-soft group-hover:text-fuchsia-accent transition-colors">
                                {col.buttonLabel}
                              </span>
                              <span className="text-[10px] text-ink-faint leading-tight line-clamp-2 px-1">
                                {col.description}
                              </span>
                            </label>
                          )}

                          <input
                            id={inputId}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) onUploadSlot(suit.id, col.key, file);
                              e.target.value = "";
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Extra per-suit options (e.g. Staging Template selector for Flatlay) */}
              {renderSuitExtra && renderSuitExtra(suit)}
            </div>
          );
        })}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 4. Add Another Suit Button                                        */}
      {/* ----------------------------------------------------------------- */}
      <button
        type="button"
        onClick={onAddSuit}
        disabled={suits.length >= 20}
        className="w-full py-3 rounded-2xl border border-dashed border-line hover:border-fuchsia-accent/70 hover:bg-sand/40 text-xs font-bold text-ink-soft hover:text-ink flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
      >
        <Plus className="h-4 w-4 text-fuchsia-accent" />
        <span>+ Add Another Suit</span>
      </button>

      {/* ----------------------------------------------------------------- */}
      {/* 5. AI Tailoring Silhouettes & Drape Overrides                      */}
      {/* ----------------------------------------------------------------- */}
      {Boolean(onSelectSilhouette || onSelectDupattaDrape) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Silhouette Selector */}
          {onSelectSilhouette && (
            <div className="relative">
              <div className="flex items-center justify-between rounded-xl border border-line bg-sand/60 px-3.5 py-2.5 transition-colors hover:border-muted-purple">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-clay-soft text-fuchsia-accent">
                    <Scissors className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[9px] font-semibold uppercase tracking-wider text-ink-faint truncate">
                      Garment Silhouette
                    </span>
                    <span className="block text-xs font-semibold text-ink truncate">
                      {suitSilhouette || "AI Auto-Detect"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSilhouetteDropdownOpen((v) => !v)}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-fuchsia-accent hover:text-fuchsia-accent cursor-pointer"
                >
                  Change
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>

              {silhouetteDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1.5 flex flex-col gap-1 rounded-xl border border-line bg-surface p-2 shadow-xl backdrop-blur-md">
                  {SUIT_SILHOUETTES.map((s) => {
                    const active = s.name === suitSilhouette;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          onSelectSilhouette(s.name);
                          setSilhouetteDropdownOpen(false);
                        }}
                        className={`flex items-start justify-between rounded-lg p-2 text-left text-xs transition-colors cursor-pointer ${
                          active
                            ? "bg-fuchsia-accent/10 font-medium text-fuchsia-accent"
                            : "text-ink-soft hover:bg-sand hover:text-ink"
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{s.name}</div>
                          <div className="text-[10px] text-ink-faint">{s.desc}</div>
                        </div>
                        {active && <Check className="h-3.5 w-3.5 shrink-0 text-fuchsia-accent ml-2 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Dupatta Drape Selector */}
          {onSelectDupattaDrape && (
            <div className="relative">
              <div className="flex items-center justify-between rounded-xl border border-line bg-sand/60 px-3.5 py-2.5 transition-colors hover:border-muted-purple">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-clay-soft text-purple-accent">
                    <Layers className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[9px] font-semibold uppercase tracking-wider text-ink-faint truncate">
                      Dupatta Drape
                    </span>
                    <span className="block text-xs font-semibold text-ink truncate">
                      {dupattaDrape || "Classic Shoulder Drape"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDupattaDropdownOpen((v) => !v)}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-purple-accent hover:text-purple-accent cursor-pointer"
                >
                  Change
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>

              {dupattaDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1.5 flex flex-col gap-1 rounded-xl border border-line bg-surface p-2 shadow-xl backdrop-blur-md">
                  {DUPATTA_DRAPING_STYLES.map((d) => {
                    const active = d.name === dupattaDrape;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          onSelectDupattaDrape(d.name);
                          setDupattaDropdownOpen(false);
                        }}
                        className={`flex items-start justify-between rounded-lg p-2 text-left text-xs transition-colors cursor-pointer ${
                          active
                            ? "bg-purple-accent/10 font-medium text-purple-accent"
                            : "text-ink-soft hover:bg-sand hover:text-ink"
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{d.name}</div>
                          <div className="text-[10px] text-ink-faint">{d.desc}</div>
                        </div>
                        {active && <Check className="h-3.5 w-3.5 shrink-0 text-purple-accent ml-2 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
