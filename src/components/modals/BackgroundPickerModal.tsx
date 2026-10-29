"use client";

import React, { useState } from "react";
import { Search, X, Check, Image as ImageIcon, Edit3, Sparkles, UploadCloud, Trash2, Edit2 } from "lucide-react";
import {
  PRESET_BACKGROUNDS,
  CatalogBackground,
  getSavedCustomBackgrounds,
  saveCustomBackground,
  updateCustomBackground,
  deleteSavedCustomBackground
} from "@/lib/catalogData";
import { compressImageClient } from "@/lib/imageCompression";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read '${file.name}'`));
    reader.readAsDataURL(file);
  });
}

interface BackgroundPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBackground: CatalogBackground;
  backgroundMode?: "fixed" | "inspiration";
  onSelect: (background: CatalogBackground) => void;
  onModeChange?: (mode: "fixed" | "inspiration") => void;
  onCustomUpload?: (file: File) => Promise<string | null>;
}

export function BackgroundPickerModal({
  isOpen,
  onClose,
  selectedBackground,
  backgroundMode = "inspiration",
  onSelect,
  onModeChange,
  onCustomUpload
}: BackgroundPickerModalProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [displayCount, setDisplayCount] = useState<number>(24);
  const [customBackgrounds, setCustomBackgrounds] = useState<CatalogBackground[]>(getSavedCustomBackgrounds);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Upload Photo Mode State
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [bgNameInput, setBgNameInput] = useState<string>("");
  const [bgDescInput, setBgDescInput] = useState<string>("");

  // Describe Background Mode State
  const [showDescribeMode, setShowDescribeMode] = useState(false);
  const [describeNameInput, setDescribeNameInput] = useState<string>("");
  const [describeTextInput, setDescribeTextInput] = useState<string>("");

  // Edit Existing Background State
  const [editingBg, setEditingBg] = useState<CatalogBackground | null>(null);
  const [editNameInput, setEditNameInput] = useState<string>("");
  const [editDescInput, setEditDescInput] = useState<string>("");

  // Refresh saved custom backgrounds on open
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setCustomBackgrounds(getSavedCustomBackgrounds());
      setPendingFile(null);
      setPendingPreview(null);
      setBgNameInput("");
      setBgDescInput("");
      setShowDescribeMode(false);
      setDescribeNameInput("");
      setDescribeTextInput("");
      setEditingBg(null);
      setUploadError(null);
    }
  }

  if (!isOpen) return null;

  const clearPendingUpload = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setBgNameInput("");
    setBgDescInput("");
    setUploadError(null);
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
    setShowDescribeMode(false);
    setUploadError(null);
    const cleanDefaultName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[-_]/g, " ")
      .slice(0, 32);
    setBgNameInput(cleanDefaultName || "Custom Backdrop");
    setBgDescInput("");
  };

  const handleSaveUploadedBackground = async () => {
    if (!pendingFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const compressedFile = await compressImageClient(pendingFile, 1000, 0.85);
      let url = "";
      if (onCustomUpload) {
        const uploadedUrl = await onCustomUpload(compressedFile);
        if (uploadedUrl) url = uploadedUrl;
      }
      if (!url) {
        url = await fileToDataUrl(compressedFile);
      }

      const finalName = bgNameInput.trim() || "Custom Backdrop";
      const newBg: CatalogBackground = {
        id: `custom-bg-${Date.now()}`,
        name: finalName,
        category: "custom",
        imageUrl: url,
        description: bgDescInput.trim() || finalName,
        isCustom: true
      };

      const updated = saveCustomBackground(newBg);
      setCustomBackgrounds(updated);
      onSelect(newBg);
      clearPendingUpload();
      onClose();
    } catch (err) {
      console.error("Failed to save custom background:", err);
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload custom background image. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSaveDescribedBackground = () => {
    if (!describeTextInput.trim()) return;
    const desc = describeTextInput.trim();
    const finalName = describeNameInput.trim() || `Custom: ${desc.slice(0, 24)}...`;

    const newBg: CatalogBackground = {
      id: `custom-bg-${Date.now()}`,
      name: finalName,
      category: "custom",
      imageUrl: "",
      description: desc,
      isCustom: true
    };

    const updated = saveCustomBackground(newBg);
    setCustomBackgrounds(updated);
    onSelect(newBg);
    setShowDescribeMode(false);
    setDescribeNameInput("");
    setDescribeTextInput("");
    onClose();
  };

  const handleDeleteCustomBackground = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = deleteSavedCustomBackground(id);
    setCustomBackgrounds(updated);
    if (selectedBackground.id === id) {
      onSelect(PRESET_BACKGROUNDS[0]);
    }
  };

  const handleStartEdit = (e: React.MouseEvent, bg: CatalogBackground) => {
    e.stopPropagation();
    setEditingBg(bg);
    setEditNameInput(bg.name);
    setEditDescInput(bg.description || "");
  };

  const handleSaveEdit = () => {
    if (!editingBg || !editNameInput.trim()) return;
    const updatedName = editNameInput.trim();
    const updatedDesc = editDescInput.trim() || updatedName;
    const updatedList = updateCustomBackground(editingBg.id, {
      name: updatedName,
      description: updatedDesc
    });
    setCustomBackgrounds(updatedList);
    if (selectedBackground.id === editingBg.id) {
      onSelect({
        ...editingBg,
        name: updatedName,
        description: updatedDesc
      });
    }
    setEditingBg(null);
  };

  const categories = [
    { id: "all", label: "All Backgrounds" },
    ...(customBackgrounds.length > 0 ? [{ id: "custom", label: `My Backdrops (${customBackgrounds.length})` }] : []),
    { id: "heritage", label: "Heritage & Palaces" },
    { id: "festive", label: "Festive & Courtyards" },
    { id: "studio", label: "Clean Studio (High Focus)" },
    { id: "gardens", label: "Gardens & Balconies" },
    { id: "luxury_interiors", label: "Luxury Interiors" },
  ];

  const filteredPresets = PRESET_BACKGROUNDS.filter((b) => {
    if (activeCategory === "custom") return false;
    const matchesCategory = activeCategory === "all" || b.category === activeCategory;
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    if (activeCategory === "studio" || activeCategory === "all") {
      if (a.id === "bg-b32") return -1;
      if (b.id === "bg-b32") return 1;
      if (a.id === "bg-b22") return -1;
      if (b.id === "bg-b22") return 1;
    }
    return 0;
  });

  const visiblePresets = filteredPresets.slice(0, displayCount);

  const filteredCustomBackgrounds = customBackgrounds.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-surface border border-muted-purple rounded-xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-line bg-surface gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <ImageIcon className="h-5 w-5 text-fuchsia-accent" />
            <h3 className="text-sm sm:text-base font-bold text-ink tracking-wide">
              Choose Background ({PRESET_BACKGROUNDS.length + customBackgrounds.length} styles)
            </h3>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-faint" />
              <input
                type="text"
                placeholder="Search backdrops..."
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

        {/* Fixed vs Inspiration Mode Toggle */}
        <div className="flex flex-col items-center justify-center pt-2.5 pb-2 px-4 sm:px-6 border-b border-line bg-surface gap-1 text-center">
          <div className="flex items-center p-1 rounded-xl bg-sand border border-line w-fit">
            <button
              type="button"
              onClick={() => onModeChange && onModeChange("fixed")}
              className={`px-3 sm:px-4 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                backgroundMode === "fixed"
                  ? "bg-fuchsia-accent text-[#05130A] shadow-sm"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              Fixed
            </button>
            <button
              type="button"
              onClick={() => onModeChange && onModeChange("inspiration")}
              className={`px-3 sm:px-4 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                backgroundMode === "inspiration" || !backgroundMode
                  ? "bg-fuchsia-accent text-[#05130A] shadow-sm"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              Inspiration
            </button>
          </div>
          <p className="text-[10px] sm:text-[11px] text-ink-faint max-w-lg">
            {backgroundMode === "fixed"
              ? "Fixed — the AI adheres strictly to the physical architecture, horizon, and geometry of the background."
              : "Inspiration — the AI draws atmosphere and ambient lighting from the background and harmonizes it naturally."}
          </p>
        </div>

        {/* Category Pills Bar */}
        <div className="px-4 sm:px-6 py-2 bg-sand border-b border-line flex items-center gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-fuchsia-accent text-[#05130A] shadow-sm font-bold"
                  : "bg-surface border border-line text-ink-soft hover:text-ink hover:border-fuchsia-accent/30"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5 sm:gap-6 smooth-scroll-grid">

          {/* Upload or Describe Custom Background Banner */}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm font-semibold text-ink flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-fuchsia-accent" />
                <span>Upload or Describe Custom Background (Saved Permanently)</span>
              </span>
              <span className="text-[10px] sm:text-xs text-ink-faint hidden sm:inline">
                Permanent backdrops saved to your account until deleted
              </span>
            </div>

            {uploadError && (
              <div className="px-3 py-2 rounded-lg border border-brick/30 bg-brick-soft text-brick text-xs font-medium">
                {uploadError}
              </div>
            )}

            {pendingFile && pendingPreview ? (
              /* Inline Form: Set Background Name & Description with Image */
              <div className="p-4 rounded-xl border border-fuchsia-accent/50 bg-clay-soft/50 flex flex-col sm:flex-row items-start gap-4 animate-fade-in shadow-md">
                <div className="relative h-24 w-28 rounded-xl overflow-hidden border border-fuchsia-accent/40 shrink-0 shadow-sm bg-sand">
                  <img
                    src={pendingPreview}
                    alt="Pending Background"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2 w-full">
                  <div>
                    <label className="text-xs font-bold text-ink flex items-center justify-between mb-1">
                      <span>Background Name</span>
                      <span className="text-[10px] font-normal text-ink-faint">Visible in studio recipes</span>
                    </label>
                    <input
                      type="text"
                      value={bgNameInput}
                      onChange={(e) => setBgNameInput(e.target.value)}
                      placeholder="e.g. Royal Palace Balcony Courtyard"
                      className="input-field text-xs py-1.5 w-full font-semibold"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-ink flex items-center justify-between mb-1">
                      <span>Describe Environment / Atmosphere (Optional)</span>
                      <span className="text-[10px] font-normal text-ink-faint">Lighting, marble, arches, foliage</span>
                    </label>
                    <input
                      type="text"
                      value={bgDescInput}
                      onChange={(e) => setBgDescInput(e.target.value)}
                      placeholder="e.g. Warm golden hour sunlight filtering through carved marble jharokha arches..."
                      className="input-field text-xs py-1.5 w-full"
                    />
                  </div>
                </div>
                <div className="flex sm:flex-col items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={clearPendingUpload}
                    disabled={uploading}
                    className="btn-secondary py-1.5 px-3 rounded-xl text-xs font-medium cursor-pointer w-full sm:w-auto text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveUploadedBackground}
                    disabled={uploading || !bgNameInput.trim()}
                    className="btn-primary py-1.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 w-full sm:w-auto"
                  >
                    {uploading ? (
                      <>
                        <Sparkles className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Save & Select</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : showDescribeMode ? (
              /* Inline Form: Text-only Describe Mode */
              <div className="p-4 rounded-xl border border-fuchsia-accent/50 bg-clay-soft/50 flex flex-col gap-3 animate-fade-in shadow-md">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <Edit3 className="h-3.5 w-3.5 text-fuchsia-accent" />
                    Describe Custom Background
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDescribeMode(false)}
                    className="text-ink-faint hover:text-ink text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="text-xs font-bold text-ink block mb-1">Background Name</label>
                    <input
                      type="text"
                      value={describeNameInput}
                      onChange={(e) => setDescribeNameInput(e.target.value)}
                      placeholder="e.g. Modern Minimalist Penthouse"
                      className="input-field text-xs py-1.5 w-full font-semibold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-ink flex justify-between items-center mb-1">
                      <span>Environment Description</span>
                      <span className="text-[10px] text-ink-faint">{describeTextInput.length}/500</span>
                    </label>
                    <textarea
                      rows={2}
                      value={describeTextInput}
                      maxLength={500}
                      onChange={(e) => setDescribeTextInput(e.target.value)}
                      placeholder="e.g. Modern minimalist luxury penthouse with warm sunset light, beige travertine walls and marble arches..."
                      className="input-field text-xs resize-none w-full"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex justify-end items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDescribeMode(false);
                      setDescribeTextInput("");
                      setDescribeNameInput("");
                    }}
                    className="btn-secondary py-1.5 px-3 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDescribedBackground}
                    disabled={!describeTextInput.trim()}
                    className="btn-primary py-1.5 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Save & Select Backdrop</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Action Options: Upload Photo or Describe */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="p-3 sm:p-4 rounded-xl border border-dashed border-fuchsia-accent/50 bg-clay-soft/40 hover:bg-clay-soft/70 flex items-center justify-between gap-3 cursor-pointer transition-all group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelected}
                    className="hidden"
                    disabled={uploading}
                  />
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-surface border border-fuchsia-accent/30 flex items-center justify-center text-fuchsia-accent group-hover:scale-105 transition-transform shrink-0">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-bold text-ink group-hover:text-fuchsia-accent transition-colors">
                        + Upload Background Photo
                      </span>
                      <span className="text-[11px] text-ink-soft">
                        Upload custom location image with custom name
                      </span>
                    </div>
                  </div>
                  <span className="btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0">
                    Upload
                  </span>
                </label>

                <div
                  onClick={() => setShowDescribeMode(true)}
                  className="p-3 sm:p-4 rounded-xl border border-dashed border-line bg-surface hover:border-fuchsia-accent/40 hover:bg-sand/40 flex items-center justify-between gap-3 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-sand border border-line flex items-center justify-center text-fuchsia-accent group-hover:scale-105 transition-transform shrink-0">
                      <Edit3 className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-bold text-ink group-hover:text-fuchsia-accent transition-colors">
                        + Describe With Text
                      </span>
                      <span className="text-[11px] text-ink-soft">
                        Specify setting, lighting, decor or architectural mood
                      </span>
                    </div>
                  </div>
                  <span className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0">
                    Describe
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Permanent Custom Backgrounds Gallery */}
          {customBackgrounds.length > 0 && (activeCategory === "all" || activeCategory === "custom") && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-line pb-2">
                <span className="text-sm font-bold text-sage flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  <span>My Permanent Backdrops ({filteredCustomBackgrounds.length})</span>
                </span>
                <span className="text-xs text-ink-faint">Saved permanently • Tap pencil to edit name</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {filteredCustomBackgrounds.map((custom) => {
                  const isSelected = selectedBackground.id === custom.id;
                  const isUnsplashDummy = custom.imageUrl?.includes("photo-1582650625119-3a31f8418b7d") || custom.imageUrl?.includes("unsplash.com");

                  return (
                    <div
                      key={custom.id}
                      onClick={() => {
                        onSelect(custom);
                        onClose();
                      }}
                      className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all flex flex-col bg-surface img-perf-card ${
                        isSelected
                          ? "border-sage ring-2 ring-sage/30 shadow-md"
                          : "border-line hover:border-sage/50"
                      }`}
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-sand">
                        {custom.imageUrl && !isUnsplashDummy ? (
                          <img
                            src={custom.imageUrl}
                            alt={custom.name}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="h-full w-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-fuchsia-accent/10 to-purple-accent/10">
                            <ImageIcon className="h-7 w-7 text-fuchsia-accent/60 mb-2" />
                            <span className="text-[10px] font-bold text-ink uppercase tracking-wider">
                              Prompt-Direct
                            </span>
                            <span className="text-[9px] text-ink-faint line-clamp-3 mt-1">
                              {custom.description}
                            </span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent opacity-80" />

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={(e) => handleStartEdit(e, custom)}
                          className="absolute top-2 left-2 p-1.5 rounded-md bg-black/60 text-white hover:bg-black/90 transition-colors cursor-pointer z-20 shadow-sm"
                          title="Edit name & description"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCustomBackground(e, custom.id)}
                          className="absolute top-2 left-9 p-1.5 rounded-md bg-brick/80 text-white hover:bg-brick transition-colors cursor-pointer z-20 shadow-sm"
                          title="Delete permanently"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>

                        {/* Selected Indicator */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-sage text-[#05130A] flex items-center justify-center shadow-md z-20">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>

                      <div className="p-2.5 bg-surface border-t border-line flex flex-col justify-center min-h-[48px]">
                        <span className="text-xs font-bold text-ink leading-snug line-clamp-1">
                          {custom.name}
                        </span>
                        <span className="text-[10px] text-sage font-medium line-clamp-1 mt-0.5">
                          {custom.description || "Permanent Custom Backdrop"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Standard Presets Grid */}
          {activeCategory !== "custom" && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-line pb-2">
                <span className="text-sm font-semibold text-ink">
                  Standard Catalog Backdrops ({filteredPresets.length})
                </span>
                <span className="text-xs text-ink-faint">
                  High-fidelity architectural environments
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {visiblePresets.map((bg) => {
                  const isSelected = selectedBackground.id === bg.id;
                  return (
                    <div
                      key={bg.id}
                      onClick={() => {
                        onSelect(bg);
                        onClose();
                      }}
                      className={`group rounded-xl overflow-hidden border cursor-pointer transition-all flex flex-col bg-surface img-perf-card ${
                        isSelected
                          ? "border-fuchsia-accent ring-2 ring-fuchsia-accent/20 shadow-sm"
                          : "border-line hover:border-fuchsia-accent/40"
                      }`}
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-sand">
                        <img
                          src={bg.imageUrl}
                          alt={bg.name}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = PRESET_BACKGROUNDS[0].imageUrl;
                          }}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />

                        {isSelected && (
                          <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-fuchsia-accent text-[#05130A] flex items-center justify-center shadow-md">
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

              {/* Load More Button */}
              {filteredPresets.length > displayCount && (
                <div className="flex justify-center pt-3 pb-1">
                  <button
                    type="button"
                    onClick={() => setDisplayCount((prev) => prev + 24)}
                    className="btn-secondary px-5 py-2 rounded-xl text-xs font-bold text-ink hover:text-fuchsia-accent flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                  >
                    <span>Load More Backdrops ({filteredPresets.length - displayCount} remaining)</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Edit Modal Dialog for Custom Background */}
        {editingBg && (
          <div
            className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setEditingBg(null)}
          >
            <div
              className="w-full max-w-md bg-surface border border-muted-purple rounded-xl shadow-2xl p-5 flex flex-col gap-4 animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="text-sm font-bold text-ink flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-fuchsia-accent" />
                  Edit Custom Background
                </span>
                <button
                  type="button"
                  onClick={() => setEditingBg(null)}
                  className="p-1 rounded-lg text-ink-faint hover:text-ink cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">Background Name</label>
                  <input
                    type="text"
                    value={editNameInput}
                    onChange={(e) => setEditNameInput(e.target.value)}
                    placeholder="Enter backdrop name..."
                    className="input-field text-xs py-2 w-full font-semibold"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-ink block mb-1">
                    Environment & Lighting Details
                  </label>
                  <textarea
                    rows={3}
                    value={editDescInput}
                    onChange={(e) => setEditDescInput(e.target.value)}
                    placeholder="Describe architectural style, colors, time of day, atmosphere..."
                    className="input-field text-xs resize-none w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingBg(null)}
                  className="btn-secondary py-1.5 px-3 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={!editNameInput.trim()}
                  className="btn-primary py-1.5 px-4 rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-line bg-surface flex justify-between items-center text-xs text-ink-faint">
          <span>Active Setting: <strong className="text-ink">{selectedBackground.name}</strong></span>
          <span className="text-[11px] hidden sm:inline">Ambient light synchronization enabled</span>
        </div>
      </div>
    </div>
  );
}
