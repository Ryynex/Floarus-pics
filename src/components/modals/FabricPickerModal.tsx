"use client";

import React, { useState } from "react";
import { Search, X, Check, Layers, Sparkles, Feather } from "lucide-react";
import { PRESET_FABRICS, CatalogFabric } from "@/lib/catalogData";

interface FabricPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFabric: CatalogFabric;
  onSelect: (fabric: CatalogFabric) => void;
}

export function FabricPickerModal({
  isOpen,
  onClose,
  selectedFabric,
  onSelect,
}: FabricPickerModalProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [customText, setCustomText] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  if (!isOpen) return null;

  const categories = [
    { id: "all", label: `All Fabrics (${PRESET_FABRICS.length})` },
    { id: "silks", label: "Silks & Brocades (5)" },
    { id: "sheers", label: "Sheers & Flowy (5)" },
    { id: "cottons", label: "Cottons & Linens (2)" },
    { id: "luxe", label: "Luxe & Draped (3)" },
  ];

  const filteredFabrics = PRESET_FABRICS.filter((f) => {
    const matchesCategory =
      activeCategory === "all" || f.category === activeCategory || f.isCustom;
    const q = search.toLowerCase();
    const matchesSearch =
      f.name.toLowerCase().includes(q) ||
      f.categoryLabel.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      f.drapePhysics.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    onSelect({
      id: "custom",
      name: `Custom: ${customText.trim()}`,
      category: "luxe",
      categoryLabel: "Custom Blend",
      description: customText.trim(),
      drapePhysics: `custom tailored fabric: ${customText.trim()} with authentic physical drape gravity and true weave reflection`,
      isCustom: true,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-surface border border-muted-purple rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-surface">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-fuchsia-accent" />
            <h3 className="text-base font-bold text-ink tracking-wide">
              Select Garment Fabric ({PRESET_FABRICS.length} Main Weaves)
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-faint" />
              <input
                type="text"
                placeholder="Search fabrics (e.g. Silk, Chiffon)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-8 py-1.5 text-xs w-44 sm:w-60"
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

        {/* Category Tabs */}
        <div className="px-6 py-2.5 bg-sand border-b border-line flex items-center gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-fuchsia-accent text-[#1F1A15] shadow-sm font-bold"
                  : "bg-surface border border-line text-ink-soft hover:text-ink hover:border-fuchsia-accent/40"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          {showCustomInput && (
            <form
              onSubmit={handleCustomSubmit}
              className="flex flex-col gap-3 p-4 bg-clay-soft/40 border border-fuchsia-accent/40 rounded-xl animate-fade-in"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-fuchsia-accent" />
                  Describe Custom Fabric or Blend
                </span>
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
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="e.g. Modal Silk with Antique Muted Silver Zari, heavy flowing fall"
                className="input-field text-xs py-2 px-3 w-full"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomInput(false)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!customText.trim()}
                  className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50 cursor-pointer"
                >
                  Use Custom Fabric
                </button>
              </div>
            </form>
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredFabrics.map((fabric) => {
              const isSelected = selectedFabric.id === fabric.id;
              return (
                <div
                  key={fabric.id}
                  onClick={() => {
                    onSelect(fabric);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group relative ${
                    isSelected
                      ? "border-fuchsia-accent bg-fuchsia-accent/10 ring-2 ring-fuchsia-accent/30 shadow-sm"
                      : "border-line bg-surface hover:border-fuchsia-accent/50 hover:bg-clay-soft/30"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-ink truncate group-hover:text-fuchsia-accent transition-colors">
                          {fabric.name}
                        </span>
                        {fabric.badge && (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-sand border border-line text-ink-soft px-1.5 py-0.5 rounded shrink-0">
                            {fabric.badge}
                          </span>
                        )}
                      </div>
                      {isSelected ? (
                        <div className="h-4 w-4 rounded-full bg-fuchsia-accent flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-[#1F1A15] stroke-[3]" />
                        </div>
                      ) : null}
                    </div>

                    <div className="text-[10px] font-semibold text-fuchsia-accent mb-1 uppercase tracking-wider">
                      {fabric.categoryLabel}
                    </div>

                    <p className="text-[11px] text-ink-soft leading-relaxed line-clamp-2">
                      {fabric.description}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-line/60 flex items-center gap-1.5 text-[10px] text-ink-faint">
                    <Feather className="h-3 w-3 text-ink-faint shrink-0" />
                    <span className="truncate italic">
                      Drape: {fabric.drapePhysics.split(",")[0]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredFabrics.length === 0 && (
            <div className="text-center py-10 flex flex-col items-center justify-center">
              <Layers className="h-8 w-8 text-ink-faint mb-2" />
              <p className="text-sm font-bold text-ink">No fabrics matched &quot;{search}&quot;</p>
              <p className="text-xs text-ink-faint mt-1">
                Try searching for silk, chiffon, organza, or cotton
              </p>
            </div>
          )}

          {/* Custom Fabric Button */}
          {!showCustomInput && (
            <div className="pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="w-full py-2.5 px-4 rounded-xl border border-dashed border-line hover:border-fuchsia-accent text-xs font-semibold text-ink-soft hover:text-fuchsia-accent transition-all flex items-center justify-center gap-2 cursor-pointer bg-sand/50 hover:bg-sand"
              >
                <Sparkles className="h-3.5 w-3.5 text-fuchsia-accent" />
                <span>Specify Custom Fabric / Hybrid Blend...</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
