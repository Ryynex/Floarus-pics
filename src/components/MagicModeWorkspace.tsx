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
  Layers,
  Scissors,
  Eye,
  Copy,
  Info,
  Sliders,
  Maximize2
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  CatalogModel,
  CatalogPose,
  CatalogBackground,
  CatalogHairstyle,
  CatalogJewellery,
  PRESET_MODELS,
  PRESET_POSES,
  PRESET_BACKGROUNDS,
  PRESET_HAIRSTYLES,
  PRESET_JEWELLERY,
  getSavedCustomModels
} from "@/lib/catalogData";
import { ModelPickerModal } from "./modals/ModelPickerModal";
import { PosePickerModal } from "./modals/PosePickerModal";
import { BackgroundPickerModal } from "./modals/BackgroundPickerModal";
import { HairstylePickerModal } from "./modals/HairstylePickerModal";
import { JewelleryPickerModal } from "./modals/JewelleryPickerModal";

interface UploadedPhoto {
  id: string;
  url: string;
  note: string;
  name: string;
}

export function MagicModeWorkspace() {
  const router = useRouter();
  // 1. Five Magic Mode Selectors
  const [selectedModel, setSelectedModel] = useState<CatalogModel>(PRESET_MODELS[0]);
  const [selectedPose, setSelectedPose] = useState<CatalogPose>(PRESET_POSES[0]);
  const [selectedBackground, setSelectedBackground] = useState<CatalogBackground>(PRESET_BACKGROUNDS[0]);
  const [backgroundMode, setBackgroundMode] = useState<"fixed" | "inspiration">("inspiration");
  const [selectedHairstyle, setSelectedHairstyle] = useState<CatalogHairstyle>(PRESET_HAIRSTYLES[0]);
  const [selectedJewellery, setSelectedJewellery] = useState<CatalogJewellery>(PRESET_JEWELLERY[0]);

  // Modal Visibility States
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isPoseModalOpen, setIsPoseModalOpen] = useState(false);
  const [isBgModalOpen, setIsBgModalOpen] = useState(false);
  const [isHairModalOpen, setIsHairModalOpen] = useState(false);
  const [isJewelModalOpen, setIsJewelModalOpen] = useState(false);

  // 2. Outfit Type & Garment Uploads
  const [outfitType, setOutfitType] = useState<string>("Generic outfit");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [customStylingNotes, setCustomStylingNotes] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  // 3. Execution & Output States
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [recentGenerations, setRecentGenerations] = useState<string[]>([]);

  // Load custom saved models on mount
  useEffect(() => {
    const savedModels = getSavedCustomModels();
    if (savedModels.length > 0) {
      setSelectedModel(savedModels[0]);
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

  // Upload Garment Photos to Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 5) {
      addToast("error", "You can upload up to 5 photos max for this outfit batch.");
      return;
    }

    setIsUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Unauthorized: Session is required");
      const folder = session.user.id;

      const newPhotos: UploadedPhoto[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `${folder}/uploads/magic-${Date.now()}-${i}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;

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

        newPhotos.push({
          id: `photo-${Date.now()}-${i}`,
          url: publicUrl,
          note: "",
          name: file.name
        });
      }

      setPhotos((prev) => [...prev, ...newPhotos]);
      addToast("success", `Uploaded ${files.length} photo(s). Add notes underneath for precision draping!`);
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
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, note } : p))
    );
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Generate All / Magic Mode Lookbook
  const handleGenerateAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photos.length === 0) {
      addToast("error", "Please upload at least one photo of your outfit.");
      return;
    }

    setLoading(true);
    setLoadingStage("Analyzing outfit & configuring AI drape pipeline...");
    setOutputUrl(null);
    setImageLoaded(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired, please sign in again");

      // Progress animation steps
      setTimeout(() => setLoadingStage("Mapping fabric pleats, zari & textures..."), 1200);
      setTimeout(() => setLoadingStage("Rendering 4MP photorealistic editorial lookbook..."), 2600);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token || ""}`
        },
        body: JSON.stringify({
          mode: "magic",
          outfitType,
          aspectRatio: "4:5",

          // 1. Model
          modelId: selectedModel.id,
          modelName: selectedModel.name,
          modelFaceUrl: selectedModel.imageUrl || null,
          customFaceUrl: selectedModel.category === "custom" ? selectedModel.imageUrl : null,
          faceMode: selectedModel.category === "custom" ? "custom_face" : "keep_original",

          // 2. Pose
          poseId: selectedPose.id,
          poseName: selectedPose.name,
          poseImageUrl: selectedPose.imageUrl,
          poseDescription: selectedPose.description,

          // 3. Background
          backgroundId: selectedBackground.id,
          backgroundName: selectedBackground.name,
          backgroundUrl: selectedBackground.imageUrl,
          backgroundDescription: selectedBackground.description,
          backgroundMode,

          // 4. Hairstyle & Jewellery
          hairstyle: selectedHairstyle.name,
          hairstyleDescription: selectedHairstyle.description,
          jewellery: selectedJewellery.name,
          jewelleryDescription: selectedJewellery.description,

          // 5. Custom Notes & Product Photos
          customNotes: customStylingNotes,
          garments: photos.map((p, idx) => ({
            url: p.url,
            note: p.note,
            slotId: `layer-${idx + 1}`,
            slotLabel: `Outfit Photo ${idx + 1}`
          }))
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Generation request failed");
      }

      setOutputUrl(result.outputUrl);
      if (result.outputUrl) {
        setRecentGenerations((prev) => [result.outputUrl, ...prev.slice(0, 5)]);
      }
      addToast(
        "success",
        `Custom Lookbook generated! Deducted 1 Credit. Balance: ${result.remainingCredits || (result.newBalance / 49).toFixed(1)} Credits.`
      );

      window.dispatchEvent(new Event("profile-updated"));
    } catch (err) {
      console.error("Magic Generation error:", err);
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred during synthesis.";
      addToast("error", errMsg);
    } finally {
      setLoading(false);
      setLoadingStage("");
    }
  };

  // Download Image
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
    <div className="flex flex-col gap-5 w-full max-w-7xl mx-auto animate-fade-in">
      {/* Workflow Mode Quick Switcher Bar */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-sand border border-line w-fit">
        <button
          type="button"
          onClick={() => router.push("/dashboard?tab=generate")}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-ink-soft hover:text-ink hover:bg-surface/50"
        >
          <Layers className="h-3.5 w-3.5 text-fuchsia-accent" />
          <span>Studio Lookbooks (Wholesale Sarees)</span>
        </button>

        <button
          type="button"
          onClick={() => router.push("/dashboard?tab=magic")}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-fuchsia-accent text-[#1F1A15] shadow-sm"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Custom Lookbooks</span>
        </button>
      </div>

      {/* Toast Notification Hub */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-2xl border backdrop-blur-md pointer-events-auto flex items-start gap-3 transition-all duration-300 animate-slide-up ${
              toast.type === "success"
                ? "bg-surface/95 border-sage/40 text-ink"
                : toast.type === "error"
                ? "bg-surface/95 border-rose-500/40 text-ink"
                : "bg-surface/95 border-line text-ink"
            }`}
          >
            {toast.type === "success" && <ShieldCheck className="h-5 w-5 text-sage shrink-0 mt-0.5" />}
            {toast.type === "error" && <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />}
            {toast.type === "info" && <Info className="h-5 w-5 text-fuchsia-accent shrink-0 mt-0.5" />}
            <span className="text-xs sm:text-sm font-medium leading-relaxed">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 w-full">
        {/* Left Column: Configuration & Uploader */}
        <section className="lg:col-span-7 flex flex-col gap-5 sm:gap-6">
          <div className="card p-4 sm:p-6 md:p-7 flex flex-col gap-5 sm:gap-6 shadow-xl">
            {/* Header with Title & Badge */}
            <div className="flex flex-col gap-2 border-b border-line pb-4 sm:pb-5">
              <div className="flex justify-between items-start gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
                      Create a new batch
                    </h2>
                    <span className="pill-neutral text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 bg-fuchsia-accent/15 border border-fuchsia-accent/30 text-fuchsia-accent">
                      <Sparkles className="h-3 w-3" /> Custom Lookbooks
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-ink-soft">
                    Upload product images to generate try-on results at scale.
                  </p>
                </div>
              </div>

              {/* Informational Guidance Box */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-sand/80 border border-line flex flex-col gap-1.5 mt-1">
                <div className="flex items-center gap-2 text-xs font-bold text-ink">
                  <span className="h-2 w-2 rounded-full bg-fuchsia-accent animate-pulse" />
                  <span>Custom Lookbooks</span>
                </div>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Upload photos of any outfit — saree, lehenga, kurta, suit — add a note per photo, and the AI drapes it on a beautiful model.
                </p>
                <p className="text-[11px] text-ink-faint leading-relaxed mt-1">
                  Choose a pose & background — tap a tile to browse examples. Hairstyle and jewellery are optional: leave them on Default to keep the usual look. Nothing quite right? Pick Custom on any of the four and describe what you want in your own words.
                </p>
              </div>
            </div>

            {/* 5 Interactive Selector Tiles (2x2 / 3x2 responsive grid matching video) */}
            <div className="flex flex-col gap-3">
              <span className="label-caps">1. Studio Styling & Model Setup</span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tile 1: MODEL */}
                <button
                  type="button"
                  onClick={() => setIsModelModalOpen(true)}
                  className="p-3.5 sm:p-4 rounded-xl border border-line bg-surface hover:border-fuchsia-accent/50 hover:bg-clay-soft/40 transition-all text-left flex items-start justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-clay-soft border border-line flex items-center justify-center text-fuchsia-accent shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                      {selectedModel.imageUrl ? (
                        <img src={selectedModel.imageUrl} alt={selectedModel.name} className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">
                        Model
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-ink truncate group-hover:text-fuchsia-accent transition-colors">
                        {selectedModel.name}
                      </span>
                      <span className="text-[11px] text-ink-soft truncate">
                        {selectedModel.subtitle}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-faint group-hover:text-fuchsia-accent transition-colors shrink-0 mt-2" />
                </button>

                {/* Tile 2: POSE */}
                <button
                  type="button"
                  onClick={() => setIsPoseModalOpen(true)}
                  className="p-3.5 sm:p-4 rounded-xl border border-line bg-surface hover:border-fuchsia-accent/50 hover:bg-clay-soft/40 transition-all text-left flex items-start justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-amber-soft border border-line flex items-center justify-center text-amber-warm shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                      {selectedPose.imageUrl ? (
                        <img src={selectedPose.imageUrl} alt={selectedPose.name} className="h-full w-full object-cover" />
                      ) : (
                        <Camera className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">
                        Pose
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-ink truncate group-hover:text-fuchsia-accent transition-colors">
                        {selectedPose.name}
                      </span>
                      <span className="text-[11px] text-ink-soft truncate">
                        {selectedPose.id === "custom" ? "Custom Description" : selectedPose.description}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-faint group-hover:text-fuchsia-accent transition-colors shrink-0 mt-2" />
                </button>

                {/* Tile 3: BACKGROUND */}
                <button
                  type="button"
                  onClick={() => setIsBgModalOpen(true)}
                  className="p-3.5 sm:p-4 rounded-xl border border-line bg-surface hover:border-fuchsia-accent/50 hover:bg-clay-soft/40 transition-all text-left flex items-start justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-sage-soft border border-line flex items-center justify-center text-sage shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                      {selectedBackground.imageUrl ? (
                        <img src={selectedBackground.imageUrl} alt={selectedBackground.name} className="h-full w-full object-cover" />
                      ) : (
                        <MapPin className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">
                        Background
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-ink truncate group-hover:text-fuchsia-accent transition-colors">
                        {selectedBackground.name}
                      </span>
                      <span className="text-[11px] text-ink-soft truncate">
                        {selectedBackground.id === "custom" ? "Custom Environment" : selectedBackground.description}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-faint group-hover:text-fuchsia-accent transition-colors shrink-0 mt-2" />
                </button>

                {/* Tile 4: HAIRSTYLE */}
                <button
                  type="button"
                  onClick={() => setIsHairModalOpen(true)}
                  className="p-3.5 sm:p-4 rounded-xl border border-line bg-surface hover:border-fuchsia-accent/50 hover:bg-clay-soft/40 transition-all text-left flex items-start justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-gold-soft border border-line flex items-center justify-center text-purple-accent shrink-0 group-hover:scale-105 transition-transform">
                      <Scissors className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">
                        Hairstyle
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-ink truncate group-hover:text-fuchsia-accent transition-colors">
                        {selectedHairstyle.name}
                      </span>
                      <span className="text-[11px] text-ink-soft truncate">
                        {selectedHairstyle.description || "Optional signature style"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-faint group-hover:text-fuchsia-accent transition-colors shrink-0 mt-2" />
                </button>

                {/* Tile 5: JEWELLERY (Full Width or 5th slot) */}
                <button
                  type="button"
                  onClick={() => setIsJewelModalOpen(true)}
                  className="sm:col-span-2 p-3.5 sm:p-4 rounded-xl border border-line bg-surface hover:border-fuchsia-accent/50 hover:bg-clay-soft/40 transition-all text-left flex items-start justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-clay-soft border border-line flex items-center justify-center text-amber-warm shrink-0 group-hover:scale-105 transition-transform">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">
                        Jewellery
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-ink truncate group-hover:text-fuchsia-accent transition-colors">
                        {selectedJewellery.name}
                      </span>
                      <span className="text-[11px] text-ink-soft truncate">
                        {selectedJewellery.description || "Optional ethnic ornaments"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-faint group-hover:text-fuchsia-accent transition-colors shrink-0 mt-2" />
                </button>
              </div>
            </div>

            {/* Outfit Type Selector matching video */}
            <div className="flex flex-col gap-2 pt-2">
              <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Shirt className="h-4 w-4 text-fuchsia-accent" />
                Outfit type
              </label>
              <select
                value={outfitType}
                onChange={(e) => setOutfitType(e.target.value)}
                className="input-field text-xs sm:text-sm font-medium w-full cursor-pointer py-2.5"
              >
                <option value="Generic outfit">Generic outfit</option>
                <option value="Kurta">Kurta</option>
                <option value="Suit">Suit</option>
                <option value="Lehenga">Lehenga</option>
                <option value="Saree">Saree</option>
                <option value="Blouse">Blouse</option>
                <option value="Indo-Western / Gown">Indo-Western / Gown</option>
                <option value="Menswear Sherwani / Kurta">Menswear Sherwani / Kurta</option>
              </select>
            </div>

            {/* Multi-Image Upload Area matching video */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-0.5">
                  <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <UploadCloud className="h-4 w-4 text-fuchsia-accent" />
                    Upload outfit photos
                  </label>
                  <p className="text-[11px] text-ink-faint">
                    Upload up to 5 photos of your outfit. A note box appears under each photo (optional) so you can tell the AI what it is or how to drape it.
                  </p>
                </div>
                <span className="pill-neutral text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                  {photos.length} / 5
                </span>
              </div>

              {/* Uploaded Photos Grid + Add Photo Button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="p-3 rounded-xl border border-line bg-surface flex flex-col gap-2 relative group shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative h-16 w-16 rounded-lg bg-sand overflow-hidden border border-line shrink-0">
                        <img
                          src={photo.url}
                          alt={`Uploaded Photo ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-bold text-ink truncate">
                          Photo {index + 1}
                        </span>
                        <span className="text-[10px] text-ink-faint truncate">
                          {photo.name || "Outfit Layer Reference"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo.id)}
                        className="p-1 rounded-md text-ink-faint hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                        title="Remove Photo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Per-Photo Drape Note Input */}
                    <input
                      type="text"
                      value={photo.note}
                      onChange={(e) => handleUpdateNote(photo.id, e.target.value)}
                      placeholder="e.g. Drape this pallu border over left shoulder..."
                      className="input-field text-[11px] py-1.5 w-full bg-sand/60"
                    />
                  </div>
                ))}

                {/* + Add Photo Tile */}
                {photos.length < 5 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-6 rounded-xl border-2 border-dashed border-line hover:border-fuchsia-accent/60 hover:bg-clay-soft/30 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer text-center min-h-[120px] ${
                      isUploading ? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    {isUploading ? (
                      <RefreshCw className="h-6 w-6 text-fuchsia-accent animate-spin" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-sand border border-line flex items-center justify-center text-ink-faint group-hover:text-fuchsia-accent">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                    )}
                    <span className="text-xs font-bold text-ink">
                      {isUploading ? "Uploading fabric..." : "+ Add photo"}
                    </span>
                    <span className="text-[10px] text-ink-faint">
                      PNG, JPG, WebP up to 25MB
                    </span>
                  </div>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Custom Drape & Styling Instructions (Optional) */}
            <div className="flex flex-col gap-1.5 pt-1">
              <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-fuchsia-accent" />
                Custom Styling & Drape Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={customStylingNotes}
                onChange={(e) => setCustomStylingNotes(e.target.value)}
                placeholder="e.g. Ensure pallu pleats are sharply ironed, match border gold zari luster with ambient light..."
                className="input-field text-xs resize-none w-full"
              />
            </div>

            {/* Action Bar: Generate All */}
            <div className="pt-2 border-t border-line flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-ink-soft">
                <span>Cost:</span>
                <span className="font-bold text-ink">1 Credit</span>
                <span className="text-[11px] text-ink-faint">(₹49.00 · FLUX 2 Pro)</span>
              </div>

              <button
                type="button"
                onClick={handleGenerateAll}
                disabled={loading || photos.length === 0}
                className="btn-primary w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate Lookbook (1 Credit)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Output Canvas & Showcase */}
        <section className="lg:col-span-5 flex flex-col gap-5 sm:gap-6">
          <div className="card p-4 sm:p-6 flex flex-col gap-4 shadow-xl min-h-[500px]">
            <div className="flex justify-between items-center border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-fuchsia-accent" />
                <h3 className="text-xs sm:text-sm font-bold text-ink tracking-wide">
                  Lookbook Canvas
                </h3>
              </div>
              {outputUrl && (
                <button
                  type="button"
                  onClick={() => setShowLightbox(true)}
                  className="p-1 rounded-lg text-ink-faint hover:text-ink hover:bg-sand cursor-pointer transition-colors"
                  title="Expand Fullscreen"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Canvas Display */}
            <div className="relative aspect-[4/5] w-full rounded-2xl bg-sand/60 border border-line overflow-hidden flex items-center justify-center">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 p-6 text-center animate-fade-in">
                  <div className="h-12 w-12 rounded-full bg-fuchsia-accent/15 border border-fuchsia-accent/30 flex items-center justify-center text-fuchsia-accent">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                  <span className="text-xs font-bold text-ink">
                    Synthesizing Lookbook...
                  </span>
                  <span className="text-[11px] text-ink-soft max-w-xs">
                    {loadingStage || "Applying AI fabric drape & pleats..."}
                  </span>
                </div>
              ) : outputUrl ? (
                <div className="relative h-full w-full group">
                  <img
                    src={outputUrl}
                    alt="Generated Magic Lookbook"
                    onLoad={() => setImageLoaded(true)}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Hover Overlay with Action Buttons */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 gap-2">
                    <button
                      type="button"
                      onClick={() => downloadImage(outputUrl, `florus-magic-${Date.now()}.png`)}
                      className="btn-primary w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Download className="h-4 w-4" />
                      Download Lossless 4MP Image
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(outputUrl);
                        addToast("success", "Public lookbook URL copied to clipboard!");
                      }}
                      className="btn-secondary w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy URL
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-ink-faint">
                  <Camera className="h-8 w-8 text-ink-faint" />
                  <span className="text-xs font-medium">No lookbook generated yet</span>
                  <span className="text-[10px]">
                    Configure model, pose & upload outfit fabrics to generate.
                  </span>
                </div>
              )}
            </div>

            {/* Quick Recipe Info */}
            {outputUrl && (
              <div className="p-3 rounded-xl bg-sand/60 border border-line flex flex-col gap-1.5 text-[11px] text-ink-soft">
                <span className="font-bold text-ink">Generation Recipe:</span>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <span>Model: <strong>{selectedModel.name}</strong></span>
                  <span>Pose: <strong>{selectedPose.name}</strong></span>
                  <span>Hair: <strong>{selectedHairstyle.name}</strong></span>
                  <span>Jewellery: <strong>{selectedJewellery.name}</strong></span>
                  <span className="col-span-2 truncate">Setting: <strong>{selectedBackground.name}</strong></span>
                </div>
              </div>
            )}

            {/* Recent Magic Lookbooks Session Gallery */}
            {recentGenerations.length > 1 && (
              <div className="flex flex-col gap-2 pt-2 border-t border-line">
                <span className="text-[11px] font-bold text-ink-soft">Session Lookbooks:</span>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  {recentGenerations.map((url, i) => (
                    <div
                      key={i}
                      onClick={() => setOutputUrl(url)}
                      className={`h-14 w-14 rounded-lg overflow-hidden border cursor-pointer shrink-0 transition-transform ${
                        outputUrl === url ? "border-fuchsia-accent ring-2 ring-fuchsia-accent/30" : "border-line hover:scale-105"
                      }`}
                    >
                      <img src={url} alt={`Session lookbook ${i + 1}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Lightbox Modal */}
      {showLightbox && outputUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center gap-3">
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-surface text-ink hover:bg-sand cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={outputUrl}
              alt="Full Resolution Magic Lookbook"
              className="max-h-[82vh] max-w-full rounded-2xl object-contain shadow-2xl border border-line"
            />
            <button
              onClick={() => downloadImage(outputUrl, `florus-magic-${Date.now()}.png`)}
              className="btn-primary px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Download className="h-4 w-4" /> Download Lossless 4MP Image
            </button>
          </div>
        </div>
      )}

      {/* 5 Modals for Magic Mode */}
      <ModelPickerModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        selectedModel={selectedModel}
        onSelect={(model) => setSelectedModel(model)}
        onCustomUpload={handleCustomModelUpload}
      />

      <PosePickerModal
        isOpen={isPoseModalOpen}
        onClose={() => setIsPoseModalOpen(false)}
        selectedPose={selectedPose}
        onSelect={(pose) => setSelectedPose(pose)}
      />

      <BackgroundPickerModal
        isOpen={isBgModalOpen}
        onClose={() => setIsBgModalOpen(false)}
        selectedBackground={selectedBackground}
        backgroundMode={backgroundMode}
        onSelect={(bg) => setSelectedBackground(bg)}
        onModeChange={(mode) => setBackgroundMode(mode)}
      />

      <HairstylePickerModal
        isOpen={isHairModalOpen}
        onClose={() => setIsHairModalOpen(false)}
        selectedHairstyle={selectedHairstyle}
        onSelect={(hair) => setSelectedHairstyle(hair)}
      />

      <JewelleryPickerModal
        isOpen={isJewelModalOpen}
        onClose={() => setIsJewelModalOpen(false)}
        selectedJewellery={selectedJewellery}
        onSelect={(jewel) => setSelectedJewellery(jewel)}
      />
    </div>
  );
}
