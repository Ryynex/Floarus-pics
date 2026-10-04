"use client";

import React, { useState } from "react";
import { Search, X, Check, Image as ImageIcon } from "lucide-react";
import { PRESET_BACKGROUNDS, CatalogBackground } from "@/lib/catalogData";

interface BackgroundPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBackground: CatalogBackground;
  backgroundMode: "fixed" | "inspiration";
  onSelect: (background: CatalogBackground) => void;
  onModeChange: (mode: "fixed" | "inspiration") => void;
}

export function BackgroundPickerModal({
  isOpen,
  onClose,
  selectedBackground,
  backgroundMode,
  onSelect,
  onModeChange
}: BackgroundPickerModalProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  if (!isOpen) return null;

  const categories = [
    { id: "all", label: "All Backgrounds" },
    { id: "heritage", label: "Heritage & Palaces" },
    { id: "festive", label: "Festive & Courtyards" },
    { id: "studio", label: "Clean Studio (High Focus)" },
    { id: "gardens", label: "Gardens & Balconies" },
    { id: "luxury_interiors", label: "Luxury Interiors" },
  ];

  const filteredBackgrounds = PRESET_BACKGROUNDS.filter((b) => {
    const matchesCategory = activeCategory === "all" || b.category === activeCategory;
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-surface border border-muted-purple rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[88vh] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-surface">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-fuchsia-accent" />
            <h3 className="text-base font-bold text-ink tracking-wide">
              Choose a background ({PRESET_BACKGROUNDS.length} styles)
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-faint" />
              <input
                type="text"
                placeholder="Search backdrops..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-8 py-1.5 text-xs w-44 sm:w-56"
              />
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-sand transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mode Toggle Bar (Fixed vs Inspiration) */}
        <div className="px-6 py-2.5 bg-sand border-b border-line flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="inline-flex p-1 rounded-xl bg-surface border border-line shrink-0">
            <button
              type="button"
              onClick={() => onModeChange("fixed")}
              className={`px-3.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                backgroundMode === "fixed"
                  ? "bg-fuchsia-accent text-[#1F1A15] shadow-sm"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              Fixed
            </button>
            <button
              type="button"
              onClick={() => onModeChange("inspiration")}
              className={`px-3.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                backgroundMode === "inspiration"
                  ? "bg-fuchsia-accent text-[#1F1A15] shadow-sm"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              Inspiration
            </button>
          </div>

          <p className="text-[11px] text-ink-soft text-center sm:text-right max-w-lg">
            {backgroundMode === "inspiration"
              ? "Inspiration — the AI draws on the background lighting and atmosphere and re-imagines it harmoniously."
              : "Fixed — the AI places the model into the exact background with synchronized ambient lighting and shadows."}
          </p>
        </div>

        {/* Category Pills Bar */}
        <div className="px-6 py-2 border-b border-line flex items-center gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-fuchsia-accent text-[#1F1A15] shadow-sm"
                  : "bg-surface border border-line text-ink-soft hover:text-ink hover:border-fuchsia-accent/30"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Backgrounds Grid */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredBackgrounds.map((bg) => {
              const isSelected = selectedBackground.id === bg.id;
              return (
                <div
                  key={bg.id}
                  onClick={() => {
                    onSelect(bg);
                    onClose();
                  }}
                  className={`group rounded-xl overflow-hidden border cursor-pointer transition-all flex flex-col bg-surface ${
                    isSelected
                      ? "border-fuchsia-accent ring-2 ring-fuchsia-accent/20 shadow-sm"
                      : "border-line hover:border-fuchsia-accent/40"
                  }`}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-sand">
                    <img
                      src={bg.imageUrl}
                      alt={bg.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />

                    {isSelected && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-fuchsia-accent text-[#1F1A15] flex items-center justify-center shadow-md">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 bg-surface border-t border-line flex flex-col justify-center min-h-[48px]">
                    <span className="text-xs font-semibold text-ink leading-snug line-clamp-2">
                      {bg.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-line bg-surface flex justify-between items-center text-xs text-ink-faint">
          <span>Active Setting: <strong className="text-ink">{selectedBackground.name}</strong></span>
          <span className="text-[11px]">Ambient light synchronization enabled</span>
        </div>
      </div>
    </div>
  );
}
