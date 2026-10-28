"use client";

import React, { useState } from "react";
import {
  Upload,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles,
  Layers,
  Scissors
} from "lucide-react";
import { FALLBACK_IMAGE } from "./ui";

export type SuitSlotKey =
  | "main_dress"
  | "detail_1"
  | "detail_2"
  | "detail_3"
  // Legacy keys retained for backwards compatibility
  | "kameez"
  | "chest_design"
  | "dupatta"
  | "bottom"
  | "complete_set";

export interface SuitEntry {
  id: string;
  suitNumber: number;
  mainDressUrl?: string;
  detail1Url?: string;
  detail2Url?: string;
  detail3Url?: string;
  mainDressNote?: string;
  detail1Note?: string;
  detail2Note?: string;
  detail3Note?: string;
  // Legacy fields
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

export const SUIT_DETAIL_SLOTS: Array<{
  key: SuitSlotKey;
  label: string;
  buttonLabel: string;
  subtitle: string;
  placeholderNote: string;
}> = [
  {
    key: "detail_1",
    label: "Detail Photo 1 (Optional)",
    buttonLabel: "+ Add Detail 1",
    subtitle: "Neckline, embroidery, collar or bodice close-up",
    placeholderNote: "e.g. Intricate gold zari embroidery on neckline"
  },
  {
    key: "detail_2",
    label: "Detail Photo 2 (Optional)",
    buttonLabel: "+ Add Detail 2",
    subtitle: "Dupatta, scarf, sleeve or print close-up",
    placeholderNote: "e.g. Dupatta drape, borders & print detail"
  },
  {
    key: "detail_3",
    label: "Detail Photo 3 (Optional)",
    buttonLabel: "+ Add Detail 3",
    subtitle: "Bottom, trouser, hemline or texture close-up",
    placeholderNote: "e.g. Pants hemline, salwar or fabric texture"
  }
];

export const SLOT_URL_KEYS: Record<string, keyof SuitEntry> = {
  main_dress: "mainDressUrl",
  detail_1: "detail1Url",
  detail_2: "detail2Url",
  detail_3: "detail3Url",
  // Legacy mappings
  kameez: "mainDressUrl",
  complete_set: "mainDressUrl",
  chest_design: "detail1Url",
  dupatta: "detail2Url",
  bottom: "detail3Url"
};

export function getSuitSlotUrl(suit: SuitEntry, slotKey: SuitSlotKey): string | undefined {
  if (slotKey === "main_dress" || slotKey === "kameez" || slotKey === "complete_set") {
    return suit.mainDressUrl || suit.kameezUrl || suit.completeSetUrl;
  }
  if (slotKey === "detail_1" || slotKey === "chest_design") {
    return suit.detail1Url || suit.chestDesignUrl;
  }
  if (slotKey === "detail_2" || slotKey === "dupatta") {
    return suit.detail2Url || suit.dupattaUrl;
  }
  if (slotKey === "detail_3" || slotKey === "bottom") {
    return suit.detail3Url || suit.bottomUrl;
  }
  return (suit as unknown as Record<string, unknown>)[`${slotKey}Url`] as string | undefined;
}

export function getSuitSlotNote(suit: SuitEntry, slotKey: SuitSlotKey): string {
  if (slotKey === "main_dress" || slotKey === "kameez" || slotKey === "complete_set") {
    return suit.mainDressNote || suit.kameezNote || "";
  }
  if (slotKey === "detail_1" || slotKey === "chest_design") {
    return suit.detail1Note || suit.chestDesignNote || "";
  }
  if (slotKey === "detail_2" || slotKey === "dupatta") {
    return suit.detail2Note || suit.dupattaNote || "";
  }
  if (slotKey === "detail_3" || slotKey === "bottom") {
    return suit.detail3Note || suit.bottomNote || "";
  }
  return ((suit as unknown as Record<string, unknown>)[`${slotKey}Note`] as string | undefined) || "";
}

export const SUIT_SILHOUETTES = [
  {
    id: "auto",
    name: "✨ AI Auto-Detect (Default)",
    desc: "AI automatically identifies whether it's a straight suit, Anarkali, Pakistani lawn, sharara, or co-ord"
  },
  {
    id: "straight_kurta",
    name: "Straight Cut Suit Set",
    desc: "Crisp tailored straight-fit suit paired with sleek cigarette trousers"
  },
  {
    id: "pakistani_lawn",
    name: "Pakistani Lawn Long Suit",
    desc: "Long relaxed silhouette with wide embroidered hem and flowing pants"
  },
  {
    id: "anarkali_flared",
    name: "Flared Anarkali Suit / Gown",
    desc: "Flared kalidar silhouette with gathered churidar and sweeping flare"
  },
  {
    id: "sharara_gharara",
    name: "Sharara / Gharara Suit",
    desc: "Fitted top with voluminous tiered flare sharara pants"
  },
  {
    id: "aline_kurta",
    name: "A-Line Suit with Pants",
    desc: "Graceful gentle flare A-line silhouette with tailored ankle trousers"
  },
  {
    id: "patiala_suit",
    name: "Classic Patiala Salwar Suit",
    desc: "Fitted short top with traditional multi-pleat voluminous patiala"
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
  onUpdateNote?: (suitId: string, slotKey: SuitSlotKey, note: string) => void;
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
  onUpdateNote,
  onAddSuit,
  onRemoveSuit,
  uploading,
  uploadingSlotKey,
  suitSilhouette,
  onSelectSilhouette,
  dupattaDrape,
  onSelectDupattaDrape,
  stepNumber = 2,
  sectionTitle = "Your Readymade Suits",
  sectionSubtitle = "Upload full dress photo first, then add optional detail close-ups",
  renderSuitExtra,
  variant = "standard"
}: StructuredSuitUploaderProps) {
  const [showTips, setShowTips] = useState(false);
  const [silhouetteDropdownOpen, setSilhouetteDropdownOpen] = useState(false);
  const [dupattaDropdownOpen, setDupattaDropdownOpen] = useState(false);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

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
              <span className="font-bold text-ink block mb-1">1. Full Dress Photo</span>
              <p className="text-[11px] text-ink-faint leading-relaxed">
                Capture the full dress or suit set on a hanger, mannequin, or flat in uniform daylight. This single photo is all that is required.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-sand/50 border border-line/50">
              <span className="font-bold text-ink block mb-1">2. Detail Photos (Optional)</span>
              <p className="text-[11px] text-ink-faint leading-relaxed">
                Optionally add close-up photos of neckline embroidery, dupatta drape, or bottom finish for heightened accuracy.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-sand/50 border border-line/50">
              <span className="font-bold text-ink block mb-1">3. AI Auto-Detection</span>
              <p className="text-[11px] text-ink-faint leading-relaxed">
                AI automatically recognizes the ensemble silhouette (straight suit, Anarkali, sharara, or co-ord) and tailors it with photorealism.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 2. Section Header: (2) Your Readymade Suits                 1 / 20 */}
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
      {/* 3. Readymade Suit Cards                                           */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col gap-5">
        {suits.map((suit) => {
          const mainUrl = getSuitSlotUrl(suit, "main_dress");
          const mainNote = getSuitSlotNote(suit, "main_dress");
          const isMainUploading = uploadingSlotKey === `${suit.id}_main_dress`;
          const mainDragId = `${suit.id}_main_dress`;
          const mainInputId = `suit-input-${suit.id}-main_dress`;

          return (
            <div
              key={suit.id}
              className="rounded-2xl border border-line bg-surface/90 p-4 sm:p-5 flex flex-col gap-4 shadow-sm relative"
            >
              {/* Card Header: "Readymade Suit 1" + Remove 'x' */}
              <div className="flex items-center justify-between border-b border-line/60 pb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-500">
                  Readymade Suit {suit.suitNumber}
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

              {/* ----------------------------------------------------------- */}
              {/* Main Option: Full Dress Photo (Only 1 Image Needed)         */}
              {/* ----------------------------------------------------------- */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink">
                      Full Dress Photo
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Only 1 image needed
                    </span>
                  </div>
                  <span className="text-[11px] text-ink-faint">
                    Full-length dress, readymade suit, mannequin or flat-lay
                  </span>
                </div>

                <input
                  id={mainInputId}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onUploadSlot(suit.id, "main_dress", file);
                      e.target.value = "";
                    }
                  }}
                />

                {mainUrl ? (
                  <div className="group relative flex flex-col sm:flex-row items-center gap-3.5 rounded-xl border border-line bg-sand/40 p-3.5 transition-colors hover:border-muted-purple">
                    <div className="relative h-28 w-28 sm:h-32 sm:w-32 shrink-0 overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
                      <img
                        src={mainUrl}
                        alt="Full Dress"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
                        }}
                      />
                      <div className="absolute left-1.5 bottom-1.5 rounded-md px-1.5 py-0.5 bg-black/80 backdrop-blur-xs text-[10px] font-semibold text-white flex items-center gap-1 shadow-xs">
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span>Full Dress</span>
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-2.5 w-full">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-ink flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-fuchsia-accent" />
                            Full Dress Photo
                          </h3>
                          <p className="text-[11px] text-ink-faint">
                            Main ensemble image used to tailor the complete lookbook
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label
                            htmlFor={mainInputId}
                            className="cursor-pointer rounded-lg border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-soft hover:border-muted-purple hover:text-ink transition-colors"
                          >
                            Replace
                          </label>
                          <button
                            type="button"
                            onClick={() => onRemoveSlot(suit.id, "main_dress")}
                            className="cursor-pointer rounded-lg border border-line bg-surface p-1 text-ink-faint hover:bg-brick/10 hover:text-brick hover:border-brick transition-colors"
                            aria-label="Remove photo"
                            title="Remove dress photo"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={mainNote}
                        onChange={(e) => onUpdateNote?.(suit.id, "main_dress", e.target.value)}
                        placeholder="Detail note (e.g. Navy blue printed Anarkali gown with embellished yoke)"
                        className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-faint/60 focus:border-fuchsia-accent focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverKey(mainDragId);
                    }}
                    onDragLeave={() => setDragOverKey(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverKey(null);
                      if (e.dataTransfer.files?.[0]) {
                        onUploadSlot(suit.id, "main_dress", e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => {
                      const input = document.getElementById(mainInputId) as HTMLInputElement;
                      input?.click();
                    }}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-7 text-center transition-all ${
                      dragOverKey === mainDragId
                        ? "border-fuchsia-accent bg-clay-soft"
                        : "border-line bg-sand/30 hover:border-fuchsia-accent/60 hover:bg-sand/60"
                    }`}
                  >
                    {isMainUploading ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-4">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-fuchsia-accent border-t-transparent" />
                        <span className="text-xs font-semibold text-fuchsia-accent">Uploading Full Dress Photo...</span>
                      </div>
                    ) : (
                      <>
                        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-fuchsia-accent/10 text-fuchsia-accent shadow-xs group-hover:scale-105 transition-transform">
                          <Upload className="h-5 w-5" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-ink">
                          + Upload Full Dress Photo
                        </span>
                        <span className="mt-1 max-w-sm text-[11px] text-ink-faint leading-relaxed px-2">
                          Full-length photo of the dress or suit set on mannequin, hanger, or flat-lay. Only this single photo is needed to generate your lookbook.
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* ----------------------------------------------------------- */}
              {/* 3 Optional Detail Sections (Same like the saree section)    */}
              {/* ----------------------------------------------------------- */}
              <div className="flex flex-col gap-2 pt-2 border-t border-line/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink">
                      Optional Detail Photos
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      All 3 Optional
                    </span>
                  </div>
                  <span className="text-[11px] text-ink-faint">
                    Only 1 full dress photo above is needed to generate
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {SUIT_DETAIL_SLOTS.map((detail) => {
                    const detailUrl = getSuitSlotUrl(suit, detail.key);
                    const detailNote = getSuitSlotNote(suit, detail.key);
                    const isDrag = dragOverKey === `${suit.id}_${detail.key}`;
                    const inputId = `suit-input-${suit.id}-${detail.key}`;
                    const isSlotUploading = uploadingSlotKey === `${suit.id}_${detail.key}`;

                    return (
                      <div
                        key={detail.key}
                        className={`relative flex flex-col rounded-xl border transition-all p-3 ${
                          detailUrl
                            ? "border-line bg-sand/40"
                            : "border-dashed border-line bg-sand/20 hover:border-muted-purple hover:bg-sand/40"
                        } ${isDrag ? "border-fuchsia-accent bg-clay-soft" : ""}`}
                      >
                        <input
                          id={inputId}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              onUploadSlot(suit.id, detail.key, file);
                              e.target.value = "";
                            }
                          }}
                        />

                        {detailUrl ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-surface">
                                <img
                                  src={detailUrl}
                                  alt={detail.label}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => onRemoveSlot(suit.id, detail.key)}
                                  className="absolute right-1 top-1 rounded-full bg-black/75 p-1 text-white hover:bg-brick transition-colors cursor-pointer"
                                  title={`Remove ${detail.label}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>

                              <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <span className="text-xs font-bold text-ink truncate">
                                  {detail.label}
                                </span>
                                <span className="text-[10px] text-ink-faint line-clamp-2">
                                  {detail.subtitle}
                                </span>
                              </div>
                            </div>

                            <input
                              type="text"
                              value={detailNote}
                              onChange={(e) => onUpdateNote?.(suit.id, detail.key, e.target.value)}
                              placeholder={detail.placeholderNote}
                              className="w-full rounded-lg border border-line bg-surface px-2 py-1 text-[11px] text-ink placeholder:text-ink-faint/60 focus:border-fuchsia-accent focus:outline-none"
                            />
                          </div>
                        ) : (
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragOverKey(`${suit.id}_${detail.key}`);
                            }}
                            onDragLeave={() => setDragOverKey(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setDragOverKey(null);
                              if (e.dataTransfer.files?.[0]) {
                                onUploadSlot(suit.id, detail.key, e.dataTransfer.files[0]);
                              }
                            }}
                            onClick={() => {
                              const input = document.getElementById(inputId) as HTMLInputElement;
                              input?.click();
                            }}
                            className="flex cursor-pointer flex-col items-center justify-center gap-1.5 p-4 text-center select-none h-full min-h-[110px]"
                          >
                            {isSlotUploading ? (
                              <div className="flex flex-col items-center justify-center gap-2">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-fuchsia-accent border-t-transparent" />
                                <span className="text-[10px] font-semibold text-fuchsia-accent">Uploading...</span>
                              </div>
                            ) : (
                              <>
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sand text-ink-soft">
                                  <Plus className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-semibold text-ink">
                                  {detail.buttonLabel}
                                </span>
                                <span className="text-[10px] text-ink-faint leading-tight">
                                  {detail.subtitle}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

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
