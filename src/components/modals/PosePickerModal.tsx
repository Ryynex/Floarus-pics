"use client";

import React, { useState } from "react";
import { Search, X, Check, Activity, Edit3, Sparkles } from "lucide-react";
import { PRESET_POSES, CatalogPose } from "@/lib/catalogData";

interface PosePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPose: CatalogPose;
  onSelect: (pose: CatalogPose) => void;
}

export function PosePickerModal({
  isOpen,
  onClose,
  selectedPose,
  onSelect
}: PosePickerModalProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customPoseText, setCustomPoseText] = useState(
    selectedPose.id === "custom" ? selectedPose.description : ""
  );

  if (!isOpen) return null;

  const categories = [
    { id: "all", label: "All Poses" },
    { id: "standing", label: "Standing & Drape" },
    { id: "motion", label: "Motion & Walking" },
    { id: "seated", label: "Seated" },
    { id: "regal", label: "Regal & Royal" },
    { id: "details", label: "Close-up Details" },
  ];

  const filteredPoses = PRESET_POSES.filter((p) => {
    const matchesCategory = activeCategory === "all" || p.category === activeCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleApplyCustomPose = () => {
    if (!customPoseText.trim()) return;
    const customPose: CatalogPose = {
      id: "custom",
      name: `Custom: ${customPoseText.trim().substring(0, 30)}...`,
      category: "standing",
      imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80",
      description: customPoseText.trim()
    };
    onSelect(customPose);
    onClose();
  };

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
            <Activity className="h-5 w-5 text-fuchsia-accent" />
            <h3 className="text-base font-bold text-ink tracking-wide">Choose a pose ({PRESET_POSES.length} styles)</h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-faint" />
              <input
                type="text"
                placeholder="Search poses..."
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

        {/* Category Pills Bar */}
        <div className="px-6 py-2.5 bg-sand border-b border-line flex items-center gap-2 overflow-x-auto no-scrollbar">
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

        {/* Poses Grid */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredPoses.map((pose) => {
              const isSelected = selectedPose.id === pose.id;
              return (
                <div
                  key={pose.id}
                  onClick={() => {
                    setShowCustomInput(false);
                    onSelect(pose);
                    onClose();
                  }}
                  className={`group rounded-xl overflow-hidden border cursor-pointer transition-all flex flex-col bg-surface ${
                    isSelected
                      ? "border-fuchsia-accent ring-2 ring-fuchsia-accent/20 shadow-sm"
                      : "border-line hover:border-fuchsia-accent/40"
                  }`}
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-sand">
                    <img
                      src={pose.imageUrl}
                      alt={pose.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-70 group-hover:opacity-40 transition-opacity" />

                    {isSelected && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-fuchsia-accent text-[#1F1A15] flex items-center justify-center shadow-md">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 bg-surface border-t border-line flex flex-col justify-center min-h-[52px]">
                    <span className="text-xs font-semibold text-ink leading-snug line-clamp-2">
                      {pose.name}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Custom Pose Card matching video */}
            <div
              onClick={() => setShowCustomInput(true)}
              className={`group rounded-xl overflow-hidden border cursor-pointer transition-all flex flex-col justify-between p-4 bg-surface ${
                showCustomInput || selectedPose.id === "custom"
                  ? "border-fuchsia-accent ring-2 ring-fuchsia-accent/20 bg-clay-soft"
                  : "border-dashed border-line hover:border-fuchsia-accent/40 hover:bg-sand/40"
              }`}
            >
              <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                <div className="h-10 w-10 rounded-full bg-fuchsia-accent/15 border border-fuchsia-accent/30 flex items-center justify-center text-fuchsia-accent group-hover:scale-110 transition-transform">
                  <Edit3 className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-ink">
                  Custom — describe it yourself
                </span>
                <span className="text-[11px] text-ink-faint">
                  Write any posture or camera angle
                </span>
              </div>
            </div>
          </div>

          {/* Custom Pose Description Box (shown when clicked, matching video) */}
          {showCustomInput && (
            <div className="mt-6 p-4 rounded-xl border border-fuchsia-accent/30 bg-clay-soft/50 flex flex-col gap-3 animate-fade-in">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-fuchsia-accent" />
                  Describe the pose you want
                </label>
                <span className="text-[11px] text-ink-faint">
                  {customPoseText.length}/500
                </span>
              </div>

              <textarea
                rows={3}
                value={customPoseText}
                maxLength={500}
                onChange={(e) => setCustomPoseText(e.target.value)}
                placeholder="e.g. A back pose showing the back of the outfit, head turned slightly over one shoulder with left hand on waist..."
                className="input-field text-xs resize-none w-full"
              />

              <div className="flex justify-end items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCustomPoseText("")}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-ink-soft hover:text-ink hover:bg-sand cursor-pointer transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleApplyCustomPose}
                  disabled={!customPoseText.trim()}
                  className="btn-primary px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Use this description
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-line bg-surface flex justify-between items-center text-xs text-ink-faint">
          <span>Selected Pose: <strong className="text-ink">{selectedPose.name}</strong></span>
          <span className="text-[11px]">Poses maintain authentic fabric drape and pleat angles</span>
        </div>
      </div>
    </div>
  );
}
