"use client";

import React, { useState } from "react";
import { Search, X, Check, Sparkles } from "lucide-react";
import { PRESET_JEWELLERY, CatalogJewellery } from "@/lib/catalogData";

interface JewelleryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedJewellery: CatalogJewellery;
  onSelect: (jewellery: CatalogJewellery) => void;
}

export function JewelleryPickerModal({
  isOpen,
  onClose,
  selectedJewellery,
  onSelect
}: JewelleryPickerModalProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [customText, setCustomText] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  if (!isOpen) return null;

  const categories = [
    { id: "all", label: "All Jewellery" },
    { id: "traditional_gold", label: "22K Traditional Gold" },
    { id: "uncut_kundan", label: "Uncut Kundan & Polki" },
    { id: "silver_tribal", label: "Oxidised Silver & Tribal" },
    { id: "minimal_modern", label: "Minimal & Modern" },
    { id: "specialty", label: "Specialty (Floral/Earrings)" },
  ];

  const filteredJewellery = PRESET_JEWELLERY.filter((j) => {
    const matchesCategory = activeCategory === "all" || j.category === activeCategory || j.isCustom;
    const matchesSearch =
      j.name.toLowerCase().includes(search.toLowerCase()) ||
      (j.description && j.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    onSelect({
      id: "custom",
      name: `Custom: ${customText.trim()}`,
      category: "specialty",
      description: customText.trim(),
      isCustom: true
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-surface border border-muted-purple rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-surface">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-accent" />
            <h3 className="text-base font-bold text-ink tracking-wide">
              Choose a jewellery style ({PRESET_JEWELLERY.length} styles)
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-faint" />
              <input
                type="text"
                placeholder="Search jewellery..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-8 py-1.5 text-xs w-40 sm:w-52"
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

        {/* Category Pills Bar */}
        <div className="px-6 py-2.5 bg-sand border-b border-line flex items-center gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-purple-accent text-[#1F1A15] shadow-sm"
                  : "bg-surface border border-line text-ink-soft hover:text-ink hover:border-purple-accent/40"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          {showCustomInput && (
            <form onSubmit={handleCustomSubmit} className="flex flex-col gap-3 p-4 bg-gold-soft/50 border border-purple-accent/40 rounded-xl">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-ink">Describe custom jewellery ornaments</span>
                <button
                  type="button"
                  onClick={() => setShowCustomInput(false)}
                  className="text-xs text-ink-faint hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="e.g. 24K Matte temple gold choker with green emerald drops and matching jhumkas"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="input-field text-xs"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-purple-accent text-[#1F1A15] text-xs font-bold uppercase tracking-wide cursor-pointer hover:bg-[#e0b85c] transition-colors"
              >
                Apply Custom Jewellery
              </button>
            </form>
          )}

          {/* Grid of Jewellery Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredJewellery.map((jewel) => {
              const isSelected = selectedJewellery.id === jewel.id;
              if (jewel.isCustom) {
                return (
                  <button
                    key={jewel.id}
                    type="button"
                    onClick={() => setShowCustomInput(true)}
                    className="p-3.5 rounded-xl border border-dashed border-purple-accent/50 bg-gold-soft/40 hover:bg-gold-soft/70 text-left flex flex-col justify-between gap-1 transition-all cursor-pointer group"
                  >
                    <span className="text-sm font-semibold text-purple-accent group-hover:text-ink">
                      {jewel.name}
                    </span>
                    <span className="text-[10px] text-ink-faint">
                      Specify custom stones, metals, or sets
                    </span>
                  </button>
                );
              }

              return (
                <button
                  key={jewel.id}
                  type="button"
                  onClick={() => {
                    onSelect(jewel);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer relative border ${
                    isSelected
                      ? "bg-gold-soft border-purple-accent/50 shadow-sm ring-2 ring-purple-accent/15"
                      : "bg-surface border-line hover:border-purple-accent/40 hover:bg-gold-soft/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">{jewel.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-purple-accent" />}
                  </div>
                  {jewel.description && (
                    <span className="text-[10px] text-ink-soft line-clamp-1">
                      {jewel.description}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-line bg-surface flex justify-between items-center text-xs text-ink-faint">
          <span>Active: <strong className="text-ink">{selectedJewellery.name}</strong></span>
          <span className="text-[11px]">High-precision ethnic jewellery synthesis</span>
        </div>
      </div>
    </div>
  );
}
