"use client";

import React, { useState } from "react";
import { Search, X, Check, Activity, Edit3, Sparkles, UploadCloud, Trash2, Edit2 } from "lucide-react";
import {
  PRESET_POSES,
  CatalogPose,
  getSavedCustomPoses,
  saveCustomPose,
  updateCustomPose,
  deleteSavedCustomPose
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

interface PosePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPose: CatalogPose;
  onSelect: (pose: CatalogPose) => void;
  onCustomUpload?: (file: File) => Promise<string | null>;
}

export function PosePickerModal({
  isOpen,
  onClose,
  selectedPose,
  onSelect,
  onCustomUpload
}: PosePickerModalProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [customPoses, setCustomPoses] = useState<CatalogPose[]>(getSavedCustomPoses);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Upload Photo Mode State
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [poseNameInput, setPoseNameInput] = useState<string>("");
  const [poseDescInput, setPoseDescInput] = useState<string>("");

  // Describe Pose Mode State
  const [showDescribeMode, setShowDescribeMode] = useState(false);
  const [describeNameInput, setDescribeNameInput] = useState<string>("");
  const [describeTextInput, setDescribeTextInput] = useState<string>("");

  // Edit Existing Pose State
  const [editingPose, setEditingPose] = useState<CatalogPose | null>(null);
  const [editNameInput, setEditNameInput] = useState<string>("");
  const [editDescInput, setEditDescInput] = useState<string>("");

  // Refresh saved custom poses whenever the modal opens
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setCustomPoses(getSavedCustomPoses());
      setPendingFile(null);
      setPendingPreview(null);
      setPoseNameInput("");
      setPoseDescInput("");
      setShowDescribeMode(false);
      setDescribeNameInput("");
      setDescribeTextInput("");
      setEditingPose(null);
      setUploadError(null);
    }
  }

  if (!isOpen) return null;

  const clearPendingUpload = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setPoseNameInput("");
    setPoseDescInput("");
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
    setPoseNameInput(cleanDefaultName || "Custom Pose");
    setPoseDescInput("");
  };

  const handleSaveUploadedPose = async () => {
    if (!pendingFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const compressedFile = await compressImageClient(pendingFile, 800, 0.85);
      let url = "";
      if (onCustomUpload) {
        const uploadedUrl = await onCustomUpload(compressedFile);
        if (uploadedUrl) url = uploadedUrl;
      }
      if (!url) {
        url = await fileToDataUrl(compressedFile);
      }

      const finalName = poseNameInput.trim() || "Custom Pose";
      const newPose: CatalogPose = {
        id: `custom-pose-${Date.now()}`,
        name: finalName,
        category: "custom",
        imageUrl: url,
        description: poseDescInput.trim() || finalName,
        isCustom: true
      };

      const updated = saveCustomPose(newPose);
      setCustomPoses(updated);
      onSelect(newPose);
      clearPendingUpload();
      onClose();
    } catch (err) {
      console.error("Failed to save custom pose:", err);
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload custom pose image. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSaveDescribedPose = () => {
    if (!describeTextInput.trim()) return;
    const desc = describeTextInput.trim();
    const finalName = describeNameInput.trim() || `Custom: ${desc.slice(0, 24)}...`;

    const newPose: CatalogPose = {
      id: `custom-pose-${Date.now()}`,
      name: finalName,
      category: "custom",
      imageUrl: "",
      description: desc,
      isCustom: true
    };

    const updated = saveCustomPose(newPose);
    setCustomPoses(updated);
    onSelect(newPose);
    setShowDescribeMode(false);
    setDescribeNameInput("");
    setDescribeTextInput("");
    onClose();
  };

  const handleDeleteCustomPose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = deleteSavedCustomPose(id);
    setCustomPoses(updated);
    if (selectedPose.id === id) {
      onSelect(PRESET_POSES[0]);
    }
  };

  const handleStartEdit = (e: React.MouseEvent, pose: CatalogPose) => {
    e.stopPropagation();
    setEditingPose(pose);
    setEditNameInput(pose.name);
    setEditDescInput(pose.description || "");
  };

  const handleSaveEdit = () => {
    if (!editingPose || !editNameInput.trim()) return;
    const updatedName = editNameInput.trim();
    const updatedDesc = editDescInput.trim() || updatedName;
    const updatedList = updateCustomPose(editingPose.id, {
      name: updatedName,
      description: updatedDesc
    });
    setCustomPoses(updatedList);
    if (selectedPose.id === editingPose.id) {
      onSelect({
        ...editingPose,
        name: updatedName,
        description: updatedDesc
      });
    }
    setEditingPose(null);
  };

  const categories = [
    { id: "all", label: "All Poses" },
    ...(customPoses.length > 0 ? [{ id: "custom", label: `My Poses (${customPoses.length})` }] : []),
    { id: "standing", label: "Standing & Drape" },
    { id: "motion", label: "Motion & Walking" },
    { id: "seated", label: "Seated" },
    { id: "regal", label: "Regal & Royal" },
    { id: "details", label: "Close-up Details" },
  ];

  const filteredPresets = PRESET_POSES.filter((p) => {
    if (activeCategory === "custom") return false;
    const matchesCategory = activeCategory === "all" || p.category === activeCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredCustomPoses = customPoses.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
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
            <Activity className="h-5 w-5 text-fuchsia-accent" />
            <h3 className="text-sm sm:text-base font-bold text-ink tracking-wide">
              Choose Pose ({PRESET_POSES.length + customPoses.length} styles)
            </h3>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-faint" />
              <input
                type="text"
                placeholder="Search poses..."
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

        {/* Category Pills Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-sand border-b border-line flex items-center gap-2 overflow-x-auto no-scrollbar">
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
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5 sm:gap-6">

          {/* Upload or Describe Custom Pose Banner */}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm font-semibold text-ink flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-fuchsia-accent" />
                <span>Upload or Describe Custom Pose (Saved Permanently)</span>
              </span>
              <span className="text-[10px] sm:text-xs text-ink-faint hidden sm:inline">
                Permanent reference saved to your account until deleted
              </span>
            </div>

            {uploadError && (
              <div className="px-3 py-2 rounded-lg border border-brick/30 bg-brick-soft text-brick text-xs font-medium">
                {uploadError}
              </div>
            )}

            {pendingFile && pendingPreview ? (
              /* Inline Form: Set Pose Name & Description with Image */
              <div className="p-4 rounded-xl border border-fuchsia-accent/50 bg-clay-soft/50 flex flex-col sm:flex-row items-start gap-4 animate-fade-in shadow-md">
                <div className="relative h-24 w-20 rounded-xl overflow-hidden border border-fuchsia-accent/40 shrink-0 shadow-sm bg-sand">
                  <img
                    src={pendingPreview}
                    alt="Pending Pose"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2 w-full">
                  <div>
                    <label className="text-xs font-bold text-ink flex items-center justify-between mb-1">
                      <span>Pose Name</span>
                      <span className="text-[10px] font-normal text-ink-faint">Visible in studio recipes</span>
                    </label>
                    <input
                      type="text"
                      value={poseNameInput}
                      onChange={(e) => setPoseNameInput(e.target.value)}
                      placeholder="e.g. Side Profile Looking Down"
                      className="input-field text-xs py-1.5 w-full font-semibold"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-ink flex items-center justify-between mb-1">
                      <span>Describe Image / Specific Guidance (Optional)</span>
                      <span className="text-[10px] font-normal text-ink-faint">Angle, close-up, hand placement</span>
                    </label>
                    <input
                      type="text"
                      value={poseDescInput}
                      onChange={(e) => setPoseDescInput(e.target.value)}
                      placeholder="e.g. Waist-up close shot, one hand gracefully resting on necklace..."
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
                    onClick={handleSaveUploadedPose}
                    disabled={uploading || !poseNameInput.trim()}
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
                    Describe Custom Pose
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
                    <label className="text-xs font-bold text-ink block mb-1">Pose Name</label>
                    <input
                      type="text"
                      value={describeNameInput}
                      onChange={(e) => setDescribeNameInput(e.target.value)}
                      placeholder="e.g. Royal Balcony Stance"
                      className="input-field text-xs py-1.5 w-full font-semibold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-ink flex justify-between items-center mb-1">
                      <span>Pose Description</span>
                      <span className="text-[10px] text-ink-faint">{describeTextInput.length}/500</span>
                    </label>
                    <textarea
                      rows={2}
                      value={describeTextInput}
                      maxLength={500}
                      onChange={(e) => setDescribeTextInput(e.target.value)}
                      placeholder="e.g. An elegant side profile standing with gentle head tilt, hand resting lightly on collarbone..."
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
                    onClick={handleSaveDescribedPose}
                    disabled={!describeTextInput.trim()}
                    className="btn-primary py-1.5 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Save & Select Pose</span>
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
                        + Upload Pose Photo
                      </span>
                      <span className="text-[11px] text-ink-soft">
                        Upload custom reference image with custom name
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
                        Specify angle, posture or close-up instructions
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

          {/* Permanent Custom Poses Gallery */}
          {customPoses.length > 0 && (activeCategory === "all" || activeCategory === "custom") && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-line pb-2">
                <span className="text-sm font-bold text-sage flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  <span>My Permanent Poses ({filteredCustomPoses.length})</span>
                </span>
                <span className="text-xs text-ink-faint">Saved permanently • Tap pencil to edit name</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {filteredCustomPoses.map((custom) => {
                  const isSelected = selectedPose.id === custom.id;
                  const isUnsplashDummy = custom.imageUrl?.includes("photo-1515886657613-9f3515b0c78f") || custom.imageUrl?.includes("unsplash.com");

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
                      <div className="relative aspect-[3/4] w-full overflow-hidden bg-sand">
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
                            <Activity className="h-8 w-8 text-fuchsia-accent/60 mb-2" />
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
                          onClick={(e) => handleDeleteCustomPose(e, custom.id)}
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

                      <div className="p-2.5 bg-surface border-t border-line flex flex-col justify-center min-h-[50px]">
                        <span className="text-xs font-bold text-ink leading-snug line-clamp-1">
                          {custom.name}
                        </span>
                        <span className="text-[10px] text-sage font-medium line-clamp-1 mt-0.5">
                          {custom.description || "Permanent Custom Pose"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Standard Preset Poses */}
          {activeCategory !== "custom" && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-line pb-2">
                <span className="text-sm font-semibold text-ink">
                  Standard Catalog Poses ({filteredPresets.length})
                </span>
                <span className="text-xs text-ink-faint">
                  Engineered with natural limbs & accurate fabric gravity
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredPresets.map((pose) => {
                  const isSelected = selectedPose.id === pose.id;
                  return (
                    <div
                      key={pose.id}
                      onClick={() => {
                        onSelect(pose);
                        onClose();
                      }}
                      className={`group rounded-xl overflow-hidden border cursor-pointer transition-all flex flex-col bg-surface img-perf-card ${
                        isSelected
                          ? "border-fuchsia-accent ring-2 ring-fuchsia-accent/20 shadow-sm"
                          : "border-line hover:border-fuchsia-accent/40"
                      }`}
                    >
                      <div className="relative aspect-[3/4] w-full overflow-hidden bg-sand">
                        <img
                          src={pose.imageUrl}
                          alt={pose.name}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = PRESET_POSES[0].imageUrl;
                          }}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-70 group-hover:opacity-40 transition-opacity" />

                        {isSelected && (
                          <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-fuchsia-accent text-[#05130A] flex items-center justify-center shadow-md">
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
              </div>
            </div>
          )}

        </div>

        {/* Edit Modal Dialog for Custom Pose */}
        {editingPose && (
          <div
            className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setEditingPose(null)}
          >
            <div
              className="w-full max-w-md bg-surface border border-muted-purple rounded-xl shadow-2xl p-5 flex flex-col gap-4 animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="text-sm font-bold text-ink flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-fuchsia-accent" />
                  Edit Custom Pose
                </span>
                <button
                  type="button"
                  onClick={() => setEditingPose(null)}
                  className="p-1 rounded-lg text-ink-faint hover:text-ink cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">Pose Name</label>
                  <input
                    type="text"
                    value={editNameInput}
                    onChange={(e) => setEditNameInput(e.target.value)}
                    placeholder="Enter pose name..."
                    className="input-field text-xs py-2 w-full font-semibold"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-ink block mb-1">
                    Description & Directives
                  </label>
                  <textarea
                    rows={3}
                    value={editDescInput}
                    onChange={(e) => setEditDescInput(e.target.value)}
                    placeholder="Describe posture, camera distance, angle, or details..."
                    className="input-field text-xs resize-none w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingPose(null)}
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
          <span>Active Selection: <strong className="text-ink">{selectedPose.name}</strong></span>
          <span className="text-[11px] hidden sm:inline">Custom poses persist in your browser storage permanently</span>
        </div>
      </div>
    </div>
  );
}
