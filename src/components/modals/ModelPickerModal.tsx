"use client";

import React, { useState, useEffect } from "react";
import { Search, X, UploadCloud, Check, User, Trash2, Sparkles } from "lucide-react";
import {
  PRESET_MODELS,
  CatalogModel,
  getSavedCustomModels,
  saveCustomModel,
  deleteSavedCustomModel
} from "@/lib/catalogData";

interface ModelPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: CatalogModel;
  onSelect: (model: CatalogModel) => void;
  onCustomUpload?: (file: File) => Promise<string | null>;
}

export function ModelPickerModal({
  isOpen,
  onClose,
  selectedModel,
  onSelect,
  onCustomUpload
}: ModelPickerModalProps) {
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [customModels, setCustomModels] = useState<CatalogModel[]>([]);

  // Load permanent custom models from localStorage on mount and when modal opens
  useEffect(() => {
    if (isOpen) {
      setCustomModels(getSavedCustomModels());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      let url = "";
      if (onCustomUpload) {
        const uploadedUrl = await onCustomUpload(file);
        if (uploadedUrl) url = uploadedUrl;
      }
      if (!url) {
        url = URL.createObjectURL(file);
      }

      const modelName = file.name.replace(/\.[^/.]+$/, "").substring(0, 18);
      const newModel: CatalogModel = {
        id: `custom-${Date.now()}`,
        name: modelName || "My Custom Model",
        category: "custom",
        imageUrl: url,
        subtitle: "Saved Permanent Model Profile",
        description: "Your permanent model face and identity reference."
      };

      // Save permanently
      const updated = saveCustomModel(newModel);
      setCustomModels(updated);

      // Immediately select as the permanent active model
      onSelect(newModel);
      onClose();
    } catch (err) {
      console.error("Custom model upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCustomModel = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = deleteSavedCustomModel(id);
    setCustomModels(updated);
    if (selectedModel.id === id) {
      // Revert to first standard demographic model if active was deleted
      onSelect(PRESET_MODELS[0]);
    }
  };

  const filteredDemographics = PRESET_MODELS.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.subtitle.toLowerCase().includes(search.toLowerCase()) ||
    m.description.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCustomModels = customModels.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-surface border border-muted-purple rounded-xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-line bg-surface gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <User className="h-5 w-5 text-fuchsia-accent" />
            <h3 className="text-sm sm:text-base font-bold text-ink tracking-wide">Model Profile</h3>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-faint" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-7 py-1 text-xs w-32 sm:w-56"
              />
            </div>
            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-sand transition-colors cursor-pointer shrink-0"
              title="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5 sm:gap-6">

          {/* Section 1: Upload Your Model Photo (Becomes Permanent) */}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm font-semibold text-ink flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-fuchsia-accent" />
                <span>Upload Brand Model (Saved Permanently)</span>
              </span>
              <span className="text-[10px] sm:text-xs text-ink-faint hidden sm:inline">
                Uploaded models stay saved to your account
              </span>
            </div>

            <label className={`w-full p-3 sm:p-4 rounded-xl border border-dashed border-fuchsia-accent/50 bg-clay-soft/40 hover:bg-clay-soft/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer transition-all group ${uploading ? "animate-pulse" : ""}`}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-surface border border-fuchsia-accent/30 flex items-center justify-center text-fuchsia-accent group-hover:scale-105 transition-transform shrink-0">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm font-bold text-ink group-hover:text-fuchsia-accent transition-colors">
                    {uploading ? "Uploading model photo..." : "+ Upload New Model Face Photo"}
                  </span>
                  <span className="text-[11px] sm:text-xs text-ink-soft mt-0.5">
                    Upload your contracted model or brand face. It will be permanently stored.
                  </span>
                </div>
              </div>
              <span className="btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 self-end sm:self-center">
                Select Photo
              </span>
            </label>
          </div>

          {/* Section 2: Permanent Uploaded Models Gallery (If any exist) */}
          {customModels.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-line pb-2">
                <span className="text-sm font-semibold text-sage flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  <span>My Permanent Models ({customModels.length})</span>
                </span>
                <span className="text-xs text-ink-faint">Tap to select as active shoot model</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {filteredCustomModels.map((custom) => {
                  const isSelected = selectedModel.id === custom.id;
                  return (
                    <div
                      key={custom.id}
                      onClick={() => {
                        onSelect(custom);
                        onClose();
                      }}
                      className={`group relative aspect-[3/4] rounded-xl overflow-hidden border cursor-pointer transition-all flex flex-col justify-end p-3 ${
                        isSelected
                          ? "border-sage ring-2 ring-sage/30"
                          : "border-line hover:border-sage/50 bg-sand"
                      }`}
                    >
                      {custom.imageUrl && (
                        <img
                          src={custom.imageUrl}
                          alt={custom.name}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                      {/* Delete permanent model button */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustomModel(e, custom.id)}
                        className="absolute top-2 left-2 p-1 rounded-md bg-brick/90 text-white hover:bg-brick transition-colors cursor-pointer z-20"
                        title="Delete permanently"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>

                      {/* Selected Badge */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-sage text-[#1F1A15] flex items-center justify-center shadow-md z-20">
                          <Check className="h-3 w-3" />
                        </div>
                      )}

                      <div className="relative z-10 flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-white tracking-wide truncate">
                          {custom.name}
                        </span>
                        <span className="text-[9px] text-sage font-semibold">
                          Active Permanent
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Demographic Models (Archetypes WITHOUT stock model photos) */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-line pb-2">
              <span className="text-sm font-semibold text-ink">
                Standard Demographic Archetypes
              </span>
              <span className="text-xs text-ink-faint">
                AI synthesizes authentic facial geometry according to persona
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredDemographics.map((demo) => {
                const isSelected = selectedModel.id === demo.id;
                return (
                  <div
                    key={demo.id}
                    onClick={() => {
                      onSelect(demo);
                      onClose();
                    }}
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-2.5 transition-all cursor-pointer relative group ${
                      isSelected
                        ? "bg-clay-soft border-fuchsia-accent/50 shadow-sm ring-2 ring-fuchsia-accent/15"
                        : "bg-surface border-line hover:border-fuchsia-accent/40 hover:bg-sand/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="h-9 w-9 rounded-lg bg-sand border border-line flex items-center justify-center text-fuchsia-accent shrink-0 group-hover:scale-105 transition-transform">
                        <User className="h-4.5 w-4.5" />
                      </div>
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-fuchsia-accent text-[#1F1A15] flex items-center justify-center shadow-md shrink-0">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-ink group-hover:text-fuchsia-accent transition-colors">
                        {demo.name}
                      </span>
                      <span className="text-xs text-purple-accent font-medium">
                        {demo.subtitle}
                      </span>
                      <p className="text-xs text-ink-soft leading-relaxed mt-0.5 line-clamp-2">
                        {demo.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-line bg-surface flex justify-between items-center text-xs text-ink-faint">
          <span>Active Selection: <strong className="text-ink">{selectedModel.name}</strong></span>
          <span className="text-[11px]">Model face remains consistent across all product batches</span>
        </div>
      </div>
    </div>
  );
}
