"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  UploadCloud,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  ImageIcon,
  Download,
  AlertCircle,
  X,
  User,
  ChevronRight,
  ChevronDown,
  Shirt,
  Camera,
  MapPin,
  Sun,
  Check,
  Layers
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  OUTFIT_TYPES,
  MASTER_SHOOTS,
  MasterShoot,
  CatalogModel,
  PRESET_MODELS,
  getSavedCustomModels,
  getSavedGarments,
  saveGarmentsToStorage
} from "@/lib/catalogData";
import { MasterShootPickerModal } from "./modals/MasterShootPickerModal";
import { ModelPickerModal } from "./modals/ModelPickerModal";

interface UploadedGarment {
  id: string;
  url: string;
  note: string;
  slotId?: string;
  slotLabel?: string;
}

export function GenerateWorkspace() {
  const router = useRouter();
  // 1. Master Photoshoot Reference Anchor (Pose, Hands & Environment)
  const [selectedShoot, setSelectedShoot] = useState<MasterShoot>(MASTER_SHOOTS[0]);
  const [isShootModalOpen, setIsShootModalOpen] = useState(false);

  // 2. Model Face Option: "keep_original" | "custom_face" | "random_face"
  const [faceMode, setFaceMode] = useState<"keep_original" | "custom_face" | "random_face">("keep_original");
  const [selectedModel, setSelectedModel] = useState<CatalogModel>(PRESET_MODELS[0]);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);

  // 3. Outfit & Product Garment Uploads
  const [outfitType, setOutfitType] = useState<string>("Wholesale Saree (6-Yard)");
  const [garments, setGarments] = useState<UploadedGarment[]>([]);
  const [customStylingNotes, setCustomStylingNotes] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  // Execution & Output States
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [blurPlaceholderUrl, setBlurPlaceholderUrl] = useState<string | null>(null);

  // Load custom saved models and permanent garments on mount
  useEffect(() => {
    const savedModels = getSavedCustomModels();
    if (savedModels.length > 0) {
      setSelectedModel(savedModels[0]);
    }
    const savedGarments = getSavedGarments();
    if (savedGarments.length > 0) {
      setGarments(
        savedGarments.map((g, idx) => ({
          id: g.id,
          url: g.url,
          note: g.note || "",
          slotLabel: g.slotLabel || `Fabric Angle ${idx + 1}`
        }))
      );
    }
  }, []);

  // Toast Notifications
  interface Toast {
    id: string;
    type: "success" | "error" | "info";
    message: string;
  }
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Date.now().toString() + Math.random().toString().substring(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const costEstimation = 49.00;

  // Upload Garment Photos to Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (garments.length + files.length > 5) {
      addToast("error", "You can upload up to 5 reference photos max.");
      return;
    }

    setIsUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Unauthorized: Session is required");
      const folder = session.user.id;

      const newGarments: UploadedGarment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `${folder}/uploads/garment-${Date.now()}-${i}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;

        const { error } = await supabase.storage
          .from("generated-lookbooks")
          .upload(fileName, file, {
            contentType: file.type,
            upsert: true
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from("generated-lookbooks")
          .getPublicUrl(fileName);

        newGarments.push({
          id: `garm-${Date.now()}-${i}`,
          url: publicUrl,
          note: "",
          slotLabel: `Fabric Angle ${garments.length + i + 1}`
        });
      }

      setGarments((prev) => {
        const updated = [...prev, ...newGarments];
        saveGarmentsToStorage(
          updated.map((g) => ({
            id: g.id,
            url: g.url,
            note: g.note,
            slotLabel: g.slotLabel
          }))
        );
        return updated;
      });
      addToast("success", `Uploaded ${files.length} fabric photo(s). Saved permanently to your account!`);
    } catch (err) {
      console.error("Upload error:", err);
      const errMsg = err instanceof Error ? err.message : "Upload failed";
      addToast("error", errMsg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUpdateNote = (id: string, note: string) => {
    setGarments((prev) => {
      const updated = prev.map((g) => (g.id === id ? { ...g, note } : g));
      saveGarmentsToStorage(
        updated.map((g) => ({
          id: g.id,
          url: g.url,
          note: g.note,
          slotLabel: g.slotLabel
        }))
      );
      return updated;
    });
  };

  const handleRemoveGarment = (id: string) => {
    setGarments((prev) => {
      const updated = prev.filter((g) => g.id !== id);
      saveGarmentsToStorage(
        updated.map((g) => ({
          id: g.id,
          url: g.url,
          note: g.note,
          slotLabel: g.slotLabel
        }))
      );
      return updated;
    });
  };

  // Custom Model Upload Handler (passed to ModelPickerModal)
  const handleCustomModelUpload = async (file: File): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;
      const folder = session.user.id;
      const fileName = `${folder}/models/custom-model-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;

      const { error } = await supabase.storage
        .from("generated-lookbooks")
        .upload(fileName, file, { contentType: file.type, upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("generated-lookbooks")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error("Custom model upload failed:", err);
      return null;
    }
  };

  // Generate Catalog Lookbook via Florus AI Multi-Image Engine
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (garments.length === 0) {
      addToast("error", "Please upload at least one garment fabric reference photo.");
      return;
    }

    setLoading(true);
    setLoadingStage("Generating editorial lookbook...");
    setOutputUrl(null);
    setBlurPlaceholderUrl(null);
    setImageLoaded(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired, please sign in again");

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token || ""}`
        },
        body: JSON.stringify({
          mode: "sarees",
          outfitType,
          aspectRatio: "4:5",
          
          // Master photoshoot reference (Anchors hands, pose, and ambient lighting)
          shootId: selectedShoot.id,
          shootTitle: selectedShoot.title,
          shootImageUrl: selectedShoot.imageUrl,
          shootSetting: selectedShoot.settingTitle,
          shootPose: selectedShoot.poseDescription,

          // Face Mode
          faceMode,
          customFaceUrl: faceMode === "custom_face" ? (selectedModel.imageUrl || null) : null,

          customNotes: customStylingNotes,
          garments: garments.map((g) => ({
            url: g.url,
            note: g.note,
            slotId: g.slotId,
            slotLabel: g.slotLabel
          }))
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Generation request failed");
      }

      setOutputUrl(result.outputUrl);
      setBlurPlaceholderUrl(result.blurPlaceholderUrl);
      addToast(
        "success",
        `Lookbook generated successfully! Deducted 1 Credit. Balance: ${result.remainingCredits || (result.newBalance / 49).toFixed(1)} Credits.`
      );

      window.dispatchEvent(new Event("profile-updated"));
    } catch (err) {
      console.error("Generation error:", err);
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred during synthesis.";
      addToast("error", errMsg);
    } finally {
      setLoading(false);
      setLoadingStage("");
    }
  };

  // Download Lossless PNG
  const downloadImage = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-7xl mx-auto">
      {/* Workflow Mode Quick Switcher Bar */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-sand border border-line w-fit">
        <button
          type="button"
          onClick={() => router.push("/dashboard?tab=generate")}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-surface border border-line text-ink shadow-sm"
        >
          <Layers className="h-3.5 w-3.5 text-fuchsia-accent" />
          <span>Studio Lookbooks (Wholesale Sarees)</span>
        </button>

        <button
          type="button"
          onClick={() => router.push("/dashboard?tab=magic")}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-ink-soft hover:text-ink hover:bg-surface/50"
        >
          <Sparkles className="h-3.5 w-3.5 text-fuchsia-accent" />
          <span>Custom Lookbooks</span>
        </button>
      </div>

      {/* Main 2-Column Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 w-full">

        {/* Left Column: Configuration & Garment Uploads */}
        <section className="lg:col-span-7 flex flex-col gap-5 sm:gap-6">
          <div className="card p-4 sm:p-6 md:p-7 flex flex-col gap-5 sm:gap-6 shadow-xl">

            {/* Header */}
            <div className="flex flex-col gap-2 border-b border-line pb-4 sm:pb-5">
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-fuchsia-accent/20 border border-fuchsia-accent/40 flex items-center justify-center text-xs font-bold text-fuchsia-accent shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-ink tracking-wide">
                    AI Fashion Lookbook Studio
                  </h3>
                </div>
                <span className="pill-success text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full uppercase shrink-0">
                  Zero Hallucination
                </span>
              </div>
              <p className="text-xs text-ink-soft leading-relaxed">
                Choose a real photoshoot reference to anchor your model&apos;s natural pose, hands, and ambient lighting. Upload your garment flat-lays to drape directly.
              </p>
            </div>

            {/* 1. MASTER PHOTOSHOOT REFERENCE TILE */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-fuchsia-accent" />
                  <span>Photoshoot Reference (Pose & Setting)</span>
                  <span className="text-brick">*</span>
                </label>
                <span className="text-[10px] sm:text-[11px] font-semibold text-fuchsia-accent">
                  28 Shoots Available
                </span>
              </div>

              {/* Clickable Shoot Tile -> Opens Pop-Up Modal with all 28 Photos */}
              <div
                onClick={() => setIsShootModalOpen(true)}
                className="p-3 sm:p-4 rounded-xl border-2 border-line bg-surface hover:border-fuchsia-accent/60 hover:bg-clay-soft/30 transition-all cursor-pointer flex items-center justify-between group shadow-sm gap-2"
              >
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                  <div className="relative h-13 w-11 sm:h-14 sm:w-12 rounded-xl overflow-hidden border border-fuchsia-accent/40 bg-sand shrink-0 shadow-xs">
                    <img
                      src={selectedShoot.imageUrl}
                      alt={selectedShoot.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
                      className="group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-xs font-bold text-ink truncate group-hover:text-fuchsia-accent transition-colors">
                        {selectedShoot.title}
                      </span>
                      {selectedShoot.badge && (
                        <span className="bg-sand border border-line text-ink-soft text-[8px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 hidden xs:inline sm:inline">
                          {selectedShoot.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-ink-faint truncate mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-fuchsia-accent shrink-0" />
                      <span className="truncate">{selectedShoot.settingTitle}</span>
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-sage font-medium truncate flex items-center gap-1 mt-0.5">
                      <Sun className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{selectedShoot.lighting}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5 text-fuchsia-accent font-semibold text-xs shrink-0 pl-1 sm:pl-2">
                  <span className="hidden xs:inline sm:inline">Browse</span>
                  <span className="xs:hidden">Photos</span>
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>

            {/* 2. MODEL FACE OPTION (3 SIMPLE BUTTONS) */}
            <div className="flex flex-col gap-2 pt-1">
              <label className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-fuchsia-accent" />
                <span>Model Face Option</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                {/* Mode 1: Keep Shoot Face */}
                <button
                  type="button"
                  onClick={() => setFaceMode("keep_original")}
                  className={`p-2.5 sm:p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer relative ${
                    faceMode === "keep_original"
                      ? "border-fuchsia-accent bg-fuchsia-accent/10 ring-2 ring-fuchsia-accent/30 shadow-sm"
                      : "border-line bg-surface hover:border-fuchsia-accent/40 hover:bg-clay-soft/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">Keep Shoot Face</span>
                    {faceMode === "keep_original" && (
                      <Check className="h-3.5 w-3.5 text-fuchsia-accent stroke-[3]" />
                    )}
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-sage font-bold uppercase">100% Natural Lighting</span>
                  <span className="text-[10px] text-ink-soft leading-tight mt-0.5">
                    Authentic model face from the photoshoot reference.
                  </span>
                </button>

                {/* Mode 2: Brand Custom Face */}
                <button
                  type="button"
                  onClick={() => {
                    setFaceMode("custom_face");
                    setIsModelModalOpen(true);
                  }}
                  className={`p-2.5 sm:p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer relative ${
                    faceMode === "custom_face"
                      ? "border-fuchsia-accent bg-fuchsia-accent/10 ring-2 ring-fuchsia-accent/30 shadow-sm"
                      : "border-line bg-surface hover:border-fuchsia-accent/40 hover:bg-clay-soft/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">Brand Custom Face</span>
                    {faceMode === "custom_face" && (
                      <Check className="h-3.5 w-3.5 text-fuchsia-accent stroke-[3]" />
                    )}
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-fuchsia-accent font-semibold">Upload Brand Model</span>
                  <span className="text-[10px] text-ink-soft leading-tight mt-0.5">
                    {selectedModel.category === "custom" ? selectedModel.name : "Select or upload brand face"}
                  </span>
                </button>

                {/* Mode 3: Diverse Indian Face */}
                <button
                  type="button"
                  onClick={() => setFaceMode("random_face")}
                  className={`p-2.5 sm:p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer relative ${
                    faceMode === "random_face"
                      ? "border-fuchsia-accent bg-fuchsia-accent/10 ring-2 ring-fuchsia-accent/30 shadow-sm"
                      : "border-line bg-surface hover:border-fuchsia-accent/40 hover:bg-clay-soft/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">Diverse Indian Face</span>
                    {faceMode === "random_face" && (
                      <Check className="h-3.5 w-3.5 text-fuchsia-accent stroke-[3]" />
                    )}
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-purple-accent font-semibold">Catalog Diversity</span>
                  <span className="text-[10px] text-ink-soft leading-tight mt-0.5">
                    Fresh Indian model face per generation.
                  </span>
                </button>
              </div>

              {/* If Custom Face is chosen, show active brand model picker banner */}
              {faceMode === "custom_face" && (
                <div className="p-2.5 sm:p-3 bg-fuchsia-accent/5 border border-fuchsia-accent/30 rounded-xl flex items-center justify-between gap-3 animate-fade-in mt-1">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-lg overflow-hidden bg-sand border border-line shrink-0">
                      {selectedModel.imageUrl ? (
                        <img src={selectedModel.imageUrl} alt={selectedModel.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-fuchsia-accent">
                          <User className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-ink truncate">{selectedModel.name}</span>
                      <span className="text-[10px] text-ink-soft truncate">{selectedModel.subtitle}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModelModalOpen(true)}
                    className="btn-secondary text-xs py-1.5 px-2.5 sm:px-3 rounded-lg cursor-pointer shrink-0"
                  >
                    Change Face
                  </button>
                </div>
              )}
            </div>

            {/* 3. PRODUCT FABRIC PHOTOS & PER-PHOTO NOTES */}
            <div className="flex flex-col gap-2.5 sm:gap-3 pt-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-fuchsia-accent" />
                  <span>Product Fabric Photos & Notes</span>
                  <span className="text-brick">*</span>
                </label>
                {garments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setGarments([])}
                    className="text-[11px] sm:text-xs font-medium text-ink-faint hover:text-brick uppercase cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                multiple
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Uploaded Photos with Dedicated Note Boxes (Compact on mobile) */}
              <div className="flex flex-col gap-2.5 sm:gap-3">
                {garments.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-2.5 sm:p-3 bg-sand border border-line rounded-xl flex flex-row items-center gap-3"
                  >
                    <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-lg overflow-hidden border border-line bg-surface shrink-0">
                      <img src={item.url} alt={`Garment ${index + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveGarment(item.id)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-brick/90 text-white hover:bg-brick cursor-pointer"
                        title="Remove photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 px-1 rounded bg-black/70 text-[8px] text-white font-medium">
                        #{index + 1}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col gap-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-fuchsia-accent truncate">
                          {item.slotLabel || `Fabric Layer ${index + 1}`}
                        </span>
                        <span className="text-[9px] text-ink-faint shrink-0">Draping note</span>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. 'Pallu close-up', 'Pleats detail', 'Contrast blouse'"
                        value={item.note}
                        onChange={(e) => handleUpdateNote(item.id, e.target.value)}
                        className="input-field text-xs py-1.5"
                      />
                    </div>
                  </div>
                ))}

                {/* Upload Button */}
                {garments.length < 5 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed border-line hover:border-fuchsia-accent/50 hover:bg-clay-soft/40 rounded-xl p-3.5 sm:p-5 flex flex-col items-center justify-center gap-1.5 sm:gap-2 text-center transition-all cursor-pointer bg-sand/40 ${
                      isUploading ? "animate-pulse" : ""
                    }`}
                  >
                    <UploadCloud className="h-5 w-5 sm:h-6 sm:w-6 text-fuchsia-accent" />
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-semibold text-ink">
                        {garments.length === 0 ? "Upload Product Fabric Photos" : "+ Add Another Fabric Angle"}
                      </span>
                      <span className="text-[10px] sm:text-xs text-ink-faint mt-0.5">
                        Upload mannequin photo, folded saree, or flat-lay. Up to 5 photos.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. PROMPT & CUSTOM STYLING INSTRUCTIONS (OPTIONAL) */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-fuchsia-accent" />
                  <span>Prompt / Styling Guidance (Optional)</span>
                </label>
                <span className="text-[10px] text-ink-faint">Freeform instructions</span>
              </div>
              <textarea
                rows={3}
                placeholder="e.g. Pallu flowing in breeze, traditional pleated drape, soft smile, high silk sheen, delicate zari borders..."
                value={customStylingNotes}
                onChange={(e) => setCustomStylingNotes(e.target.value)}
                className="input-field resize-none text-xs leading-relaxed"
              />
            </div>

            {/* ACTION SUBMIT BUTTON */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading || isUploading}
              className="btn-primary w-full py-3.5 sm:py-4 mt-1 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>{loadingStage}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Editorial Lookbook (1 Credit)</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

          </div>
        </section>

        {/* Right Column: Output Canvas Display */}
        <section className="lg:col-span-5 flex flex-col gap-5 sm:gap-6">
          <div className="card p-4 sm:p-6 flex flex-col gap-4 min-h-[380px] sm:min-h-[480px] md:min-h-[520px] justify-between relative overflow-hidden shadow-xl">

            {/* Header */}
            <div className="flex justify-between items-center text-sm border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="text-ink font-bold text-xs sm:text-sm">Florus AI Output</span>
                <span className="pill-success text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                  5MP Ultra-Resolution
                </span>
              </div>
              <span className="text-xs font-semibold text-fuchsia-accent">
                1 Credit / Look
              </span>
            </div>

            {/* Synthesis Canvas Frame */}
            {loading ? (
              <div className="flex-1 flex flex-col justify-center items-center py-8 sm:py-12 px-4 sm:px-6 gap-5 sm:gap-6">
                <div className="relative h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-fuchsia-accent flex items-center justify-center shadow-lg">
                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white animate-pulse" />
                  </div>
                </div>

                {/* Real Progress Steps */}
                <div className="w-full max-w-xs flex flex-col gap-2.5 sm:gap-3 text-xs text-ink-soft">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <span className="text-[11px] sm:text-xs">1. Master photoshoot</span>
                    <span className="text-sage font-semibold text-[11px] sm:text-xs truncate max-w-[140px]">✓ {selectedShoot.title}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <span className="text-[11px] sm:text-xs">2. Fabric drape & pleats</span>
                    <span className="text-sage font-semibold text-[11px] sm:text-xs flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-sage animate-pulse" /> {garments.length} photo(s)
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <span className="text-[11px] sm:text-xs">3. Florus AI Try-On</span>
                    <span className="text-fuchsia-accent font-semibold text-[11px] sm:text-xs animate-pulse">Synthesizing...</span>
                  </div>
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[11px] sm:text-xs">4. High-Res Relight</span>
                    <span className="text-purple-accent font-semibold text-[11px] sm:text-xs animate-pulse">Queued</span>
                  </div>
                </div>

                <div className="text-center flex flex-col gap-1 mt-1 sm:mt-2">
                  <span className="text-xs sm:text-sm font-bold text-ink uppercase tracking-wide">Synthesizing Lookbook</span>
                  <p className="text-[11px] sm:text-xs text-ink-soft max-w-[260px] leading-relaxed">
                    This typically takes 8–14 seconds on Florus AI GPU cluster.
                  </p>
                </div>
              </div>
            ) : outputUrl ? (
              <div className="flex-1 flex flex-col gap-3.5 sm:gap-4">
                <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden border border-line bg-sand group">
                  {blurPlaceholderUrl && (
                    <img
                      src={blurPlaceholderUrl}
                      alt="Blurred preview"
                      className="absolute inset-0 object-cover w-full h-full filter blur-md scale-105 transition-opacity duration-500"
                      style={{ opacity: imageLoaded ? 0 : 1 }}
                    />
                  )}
                  <img
                    src={outputUrl}
                    alt="Runway Output"
                    onLoad={() => setImageLoaded(true)}
                    className="absolute inset-0 object-cover w-full h-full transition-opacity duration-500 ease-in-out group-hover:scale-[1.02]"
                    style={{ opacity: imageLoaded ? 1 : 0 }}
                  />

                  {imageLoaded && (
                    <>
                      <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 bg-surface/95 border border-line px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[9px] sm:text-[10px] font-medium text-ink select-none shadow-sm flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                        <span className="truncate max-w-[160px]">{selectedShoot.title}</span>
                      </div>
                      <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 bg-surface/95 border border-line px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[9px] sm:text-[10px] font-bold text-fuchsia-accent select-none shadow-sm">
                        FLORUS AI LOOKBOOK
                      </div>
                    </>
                  )}

                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-xs">
                      <div className="flex items-center gap-2 bg-surface/95 border border-line px-3 py-1.5 rounded-lg text-xs text-ink-soft animate-pulse">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-fuchsia-accent" />
                        <span>Rendering asset...</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLightbox(true)}
                    className="btn-secondary py-2.5 px-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ImageIcon className="h-4 w-4 shrink-0" />
                    <span>Fullscreen</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadImage(outputUrl, `florus-lookbook.png`)}
                    className="btn-primary py-2.5 px-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Download className="h-4 w-4 shrink-0" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10 sm:py-16 text-center border-2 border-dashed border-line rounded-xl bg-sand/40 relative overflow-hidden px-4">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-surface border border-line flex items-center justify-center shadow-sm">
                  <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6 text-fuchsia-accent" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-ink uppercase tracking-wide">Studio Canvas Ready</span>
                <p className="text-[11px] sm:text-xs text-ink-soft max-w-[260px] leading-relaxed">
                  Select your photoshoot reference above, upload your product fabric photos, and click generate to synthesize your editorial lookbook.
                </p>
              </div>
            )}

            {/* Footer Engine Guarantee */}
            <div className="border-t border-line pt-3 sm:pt-4 flex justify-between items-center text-[11px] sm:text-xs text-ink-faint">
              <span className="truncate mr-2">Florus AI Multi-Reference Engine</span>
              <span className="text-sage font-semibold flex items-center gap-1 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-sage" /> Engine Online
              </span>
            </div>

          </div>
        </section>

      </div>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {showLightbox && outputUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4 md:p-8 animate-fade-in"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-5xl w-full h-full flex flex-col justify-between items-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex justify-between items-center text-sm text-white py-2 border-b border-white/10 mb-2 sm:mb-4 gap-2">
              <span className="font-semibold text-xs sm:text-sm truncate">Studio Preview — {selectedShoot.title}</span>
              <button
                onClick={() => setShowLightbox(false)}
                className="btn-secondary px-3 py-1 rounded-md text-xs cursor-pointer text-white shrink-0"
              >
                Close
              </button>
            </div>

            <div className="flex-1 w-full relative flex items-center justify-center overflow-auto rounded-xl sm:rounded-2xl border border-white/10 bg-black/40 p-1 sm:p-2">
              <img
                src={outputUrl}
                alt="High-Res Runway Composition"
                className="max-h-full max-w-full object-contain rounded-lg sm:rounded-xl shadow-2xl"
              />
            </div>

            <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-2 mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-white/10 text-sm text-white">
              <span className="text-[11px] sm:text-xs text-zinc-400">Photorealistic 5MP Uncompressed Asset</span>
              <button
                type="button"
                onClick={() => downloadImage(outputUrl, `florus-5k.png`)}
                className="btn-primary w-full sm:w-auto px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 text-xs uppercase tracking-wide cursor-pointer shadow-md"
              >
                <Download className="h-4 w-4" /> Save PNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MASTER PHOTOSHOOT POP-UP MODAL (28 REAL CURATED PHOTOS) */}
      <MasterShootPickerModal
        isOpen={isShootModalOpen}
        onClose={() => setIsShootModalOpen(false)}
        selectedShoot={selectedShoot}
        onSelect={(shoot) => setSelectedShoot(shoot)}
      />

      {/* MODEL PICKER MODAL (For Custom Brand Face) */}
      <ModelPickerModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        selectedModel={selectedModel}
        onSelect={(model) => setSelectedModel(model)}
        onCustomUpload={handleCustomModelUpload}
      />

      {/* TOAST NOTIFICATION CONTAINER STACK */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col gap-2.5 pointer-events-none max-w-sm w-full px-3 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl border flex items-start gap-3 shadow-xl transition-all duration-300 animate-fade-in ${
              toast.type === "success"
                ? "bg-sage-soft border-sage/30 text-sage"
                : toast.type === "error"
                ? "bg-brick-soft border-brick/30 text-brick"
                : "bg-surface border-line text-fuchsia-accent"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === "success" ? (
                <ShieldCheck className="h-4 w-4 text-sage" />
              ) : toast.type === "error" ? (
                <AlertCircle className="h-4 w-4 text-brick" />
              ) : (
                <Sparkles className="h-4 w-4 text-fuchsia-accent" />
              )}
            </div>
            <div className="flex-1 flex flex-col gap-0.5">
              <span className="text-xs leading-relaxed font-medium">{toast.message}</span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-ink-faint hover:text-ink shrink-0 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
