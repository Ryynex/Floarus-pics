"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Layers, Scissors } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { creditsFromBalance } from "@/lib/pricing";
import {
  CatalogModel,
  CatalogPose,
  CatalogBackground,
  CatalogHairstyle,
  CatalogJewellery,
  CatalogFabric,
  PRESET_MODELS,
  PRESET_POSES,
  PRESET_BACKGROUNDS,
  PRESET_HAIRSTYLES,
  PRESET_JEWELLERY,
  PRESET_FABRICS,
  MAX_GARMENT_REFERENCES,
  getSavedCustomModels,
  getSavedGarments,
  saveGarmentsToStorage,
  getSavedMagicPreferences,
  saveMagicPreferences,
  getSavedFabricPreference,
  saveFabricPreference,
  getSavedMagicSuits,
  saveMagicSuits
} from "@/lib/catalogData";
import { ModelPickerModal } from "./modals/ModelPickerModal";
import { PosePickerModal } from "./modals/PosePickerModal";
import { BackgroundPickerModal } from "./modals/BackgroundPickerModal";
import { HairstylePickerModal } from "./modals/HairstylePickerModal";
import { JewelleryPickerModal } from "./modals/JewelleryPickerModal";
import { FabricPickerModal } from "./modals/FabricPickerModal";
import {
  AdvancedPanel,
  GarmentUploader,
  GenerateBar,
  Lightbox,
  LookbookHeader,
  MediaCard,
  OptionChip,
  OutputActions,
  PreviewViewport,
  SelectOption,
  Step,
  ToastStack,
  WorkflowSwitcher,
  useToasts
} from "./lookbook/ui";
import {
  StructuredGarmentUploader,
  StructuredGarmentSlot,
  INITIAL_STRUCTURED_SLOTS
} from "./lookbook/StructuredGarmentUploader";
import {
  StructuredSuitUploader,
  SuitEntry,
  SuitSlotKey,
  SUIT_SILHOUETTES,
  DUPATTA_DRAPING_STYLES,
  SLOT_URL_KEYS
} from "./lookbook/StructuredSuitUploader";
import { compressImageClient } from "@/lib/imageCompression";

interface UploadedPhoto {
  id: string;
  url: string;
  note: string;
  name: string;
  slotLabel?: string;
}

const DEFAULT_SLOT_LABELS = [
  "Saree Photo / Fabric",
  "Blouse Photo (Optional)",
  "Pallu / Border Detail 1 (Optional)",
  "Pallu / Border Detail 2 (Optional)"
];

const INITIAL_SUITS: SuitEntry[] = [
  {
    id: "suit_1",
    suitNumber: 1
  }
];

const OUTFIT_TYPES = [
  "Wholesale Saree (6-Yard)",
  "Lehenga Choli",
  "Anarkali & Suit",
  "Kurta Set",
  "Indo-Western Gown",
  "Bespoke Blouse"
];

const GENERATION_STEPS = [
  "Analysing weave, pleats & texture",
  "Aligning pose and drape gravity",
  "Matching lighting & scene depth",
  "Rendering publication-grade output"
];

export function MagicModeWorkspace() {
  const [hydration] = useState(() => {
    const prefs = getSavedMagicPreferences();
    const models = getSavedCustomModels();
    const garments = getSavedGarments("magic");
    const savedSuits = getSavedMagicSuits();

    return {
      prefs,
      models,
      garments,
      suits: savedSuits.length > 0 ? (savedSuits as SuitEntry[]) : INITIAL_SUITS
    };
  });

  const {
    prefs: initialPrefs,
    models: initialCustomModels,
    garments: initialGarments,
    suits: initialSuits
  } = hydration;

  const [selectedModel, setSelectedModel] = useState<CatalogModel>(
    () => initialPrefs?.selectedModel ?? PRESET_MODELS[0]
  );
  const [selectedPose, setSelectedPose] = useState<CatalogPose>(
    () => initialPrefs?.selectedPose ?? PRESET_POSES[0]
  );
  const [selectedBackground, setSelectedBackground] = useState<CatalogBackground>(
    () => initialPrefs?.selectedBackground ?? PRESET_BACKGROUNDS[0]
  );
  const [backgroundMode, setBackgroundMode] = useState<"fixed" | "inspiration">(
    () => (initialPrefs?.backgroundMode === "inspiration" ? "inspiration" : "fixed")
  );
  const [selectedHairstyle, setSelectedHairstyle] = useState<CatalogHairstyle>(
    () => initialPrefs?.selectedHairstyle ?? PRESET_HAIRSTYLES[0]
  );
  const [selectedJewellery, setSelectedJewellery] = useState<CatalogJewellery>(
    () => initialPrefs?.selectedJewellery ?? PRESET_JEWELLERY[0]
  );
  const [selectedFabric, setSelectedFabric] = useState<CatalogFabric>(
    () => getSavedFabricPreference() ?? initialPrefs?.selectedFabric ?? PRESET_FABRICS[0]
  );

  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isPoseModalOpen, setIsPoseModalOpen] = useState(false);
  const [isBgModalOpen, setIsBgModalOpen] = useState(false);
  const [isHairModalOpen, setIsHairModalOpen] = useState(false);
  const [isJewelModalOpen, setIsJewelModalOpen] = useState(false);
  const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);

  // Category Routing & Outfit Type
  const searchParams = useSearchParams();
  const router = useRouter();
  const category = searchParams.get("category") || "saree";

  // Suit Specific States
  const [suits, setSuits] = useState<SuitEntry[]>(initialSuits);
  const [suitSilhouette, setSuitSilhouette] = useState(SUIT_SILHOUETTES[0].name);
  const [dupattaDrape, setDupattaDrape] = useState(DUPATTA_DRAPING_STYLES[0].name);

  // Sync suit changes to localStorage so uploaded photos persist until manually removed
  useEffect(() => {
    saveMagicSuits(suits);
  }, [suits]);

  // Batch generation states
  const [batchCount, setBatchCount] = useState<number>(1);
  const [loadingLabel, setLoadingLabel] = useState<string>("Generating...");

  const [outfitType, setOutfitType] = useState<string>(
    () => initialPrefs?.outfitType ?? "Wholesale Saree (6-Yard)"
  );
  const [drapingStyle, setDrapingStyle] = useState<string>(
    () => initialPrefs?.drapingStyle ?? "Default drape"
  );
  const [blouseStyle, setBlouseStyle] = useState<string>(
    () => initialPrefs?.blouseStyle ?? "Auto-coordinate with border & zari (Default)"
  );
  const [structuredSlots, setStructuredSlots] = useState<StructuredGarmentSlot[]>(() => {
    const hasRoles = initialGarments.some((g) => Boolean(g.role));
    return INITIAL_STRUCTURED_SLOTS.map((slot: StructuredGarmentSlot, idx: number) => {
      const match = hasRoles
        ? initialGarments.find((g) => g.role === slot.role || g.id === slot.id)
        : initialGarments[idx];
      if (match) {
        return {
          ...slot,
          url: match.url,
          note: match.note || ""
        };
      }
      return slot;
    });
  });
  const [photos, setPhotos] = useState<UploadedPhoto[]>(() =>
    initialGarments.slice(0, MAX_GARMENT_REFERENCES).map((g, idx) => ({
      id: g.id,
      url: g.url,
      note: g.note || "",
      name: g.name || `Outfit Photo ${idx + 1}`,
      slotLabel: g.slotLabel || DEFAULT_SLOT_LABELS[idx] || `Garment Layer ${idx + 1}`
    }))
  );
  const [customStylingNotes, setCustomStylingNotes] = useState<string>(
    () => initialPrefs?.customStylingNotes ?? ""
  );

  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(
    () => initialPrefs?.outputUrl ?? null
  );
  const [recentGenerations, setRecentGenerations] = useState<string[]>(
    () => initialPrefs?.recentGenerations ?? []
  );
  const [showLightbox, setShowLightbox] = useState(false);
  const [showAdvancedStyling, setShowAdvancedStyling] = useState(false);

  useEffect(() => {
    saveMagicPreferences({
      selectedModel,
      selectedPose,
      selectedBackground,
      backgroundMode,
      selectedHairstyle,
      selectedJewellery,
      selectedFabric,
      outfitType,
      drapingStyle,
      blouseStyle,
      customStylingNotes,
      outputUrl,
      recentGenerations
    });
  }, [
    selectedModel,
    selectedPose,
    selectedBackground,
    backgroundMode,
    selectedHairstyle,
    selectedJewellery,
    selectedFabric,
    outfitType,
    drapingStyle,
    blouseStyle,
    customStylingNotes,
    outputUrl,
    recentGenerations
  ]);

  const { toasts, toast: addToast, dismiss: dismissToast } = useToasts();

  const handleCustomModelUpload = async (file: File): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const compressedFile = await compressImageClient(file, 640, 0.85);

      if (session?.user) {
        const folder = session.user.id;
        const fileName = `${folder}/models/custom-model-${Date.now()}-${compressedFile.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;
        const { error } = await supabase.storage
          .from("generated-lookbooks")
          .upload(fileName, compressedFile, { contentType: compressedFile.type, upsert: true });

        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from("generated-lookbooks")
            .getPublicUrl(fileName);
          return publicUrl;
        }
      }

      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(compressedFile);
      });
    } catch (err) {
      console.error("Custom model upload failed:", err);
      return null;
    }
  };

  const syncSlotsToStorage = (updated: StructuredGarmentSlot[]) => {
    const active = updated
      .filter((s) => Boolean(s.url))
      .map((s) => ({
        id: s.id,
        url: s.url!,
        note: s.note || "",
        name: s.label,
        slotLabel: s.label,
        role: s.role,
      }));
    setPhotos(active);
    saveGarmentsToStorage(
      "magic",
      active.map((p) => ({
        id: p.id,
        url: p.url,
        note: p.note,
        name: p.name,
        slotLabel: p.slotLabel,
        role: p.role,
      }))
    );
  };

  const handleUploadSlot = async (role: string, file: File) => {
    setIsUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const folder = session?.user?.id || "guest";
      const compressedFile = await compressImageClient(file, 640, 0.85);
      let finalUrl = "";

      if (session?.user) {
        try {
          const fileName = `${folder}/uploads/magic-${Date.now()}-${role}-${compressedFile.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;
          const { error: uploadErr } = await supabase.storage
            .from("generated-lookbooks")
            .upload(fileName, compressedFile, {
              contentType: compressedFile.type,
              upsert: true
            });

          if (!uploadErr) {
            const { data: { publicUrl } } = supabase.storage
              .from("generated-lookbooks")
              .getPublicUrl(fileName);
            finalUrl = publicUrl;
          }
        } catch (storageErr) {
          console.warn("Storage upload notice:", storageErr);
        }
      }

      if (!finalUrl) {
        finalUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(compressedFile);
        });
      }

      setStructuredSlots((prev) => {
        const next = prev.map((s) => (s.role === role ? { ...s, url: finalUrl } : s));
        syncSlotsToStorage(next);
        return next;
      });

      addToast("success", `Uploaded ${role.replace("_", " ")} photo.`);
    } catch (err) {
      console.error("Slot upload error:", err);
      addToast("error", "Failed to upload photo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveSlot = (role: string) => {
    setStructuredSlots((prev) => {
      const next = prev.map((s) => (s.role === role ? { ...s, url: undefined, note: "" } : s));
      syncSlotsToStorage(next);
      return next;
    });
  };

  const handleUpdateSlotNote = (role: string, note: string) => {
    setStructuredSlots((prev) => {
      const next = prev.map((s) => (s.role === role ? { ...s, note } : s));
      syncSlotsToStorage(next);
      return next;
    });
  };

  const handleUploadSuitSlot = async (suitId: string, slotKey: SuitSlotKey, file: File) => {
    setIsUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const folder = session?.user?.id || "guest";
      const compressedFile = await compressImageClient(file, 640, 0.85);
      let finalUrl = "";

      if (session?.user) {
        try {
          const fileName = `${folder}/uploads/suit-${Date.now()}-${suitId}-${slotKey}-${compressedFile.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;
          const { error: uploadErr } = await supabase.storage
            .from("generated-lookbooks")
            .upload(fileName, compressedFile, {
              contentType: compressedFile.type,
              upsert: true
            });

          if (!uploadErr) {
            const { data: { publicUrl } } = supabase.storage
              .from("generated-lookbooks")
              .getPublicUrl(fileName);
            finalUrl = publicUrl;
          }
        } catch (storageErr) {
          console.warn("Storage upload notice:", storageErr);
        }
      }

      if (!finalUrl) {
        finalUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(compressedFile);
        });
      }

      const propKey = SLOT_URL_KEYS[slotKey];
      setSuits((prev) =>
        prev.map((s) => (s.id === suitId ? { ...s, [propKey]: finalUrl, [`${slotKey}Url`]: finalUrl } : s))
      );

      addToast("success", `Uploaded ${slotKey.replace("_", " ")} photo.`);
    } catch (err) {
      console.error("Suit slot upload error:", err);
      addToast("error", "Failed to upload photo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveSuitSlot = (suitId: string, slotKey: SuitSlotKey) => {
    const propKey = SLOT_URL_KEYS[slotKey];
    setSuits((prev) =>
      prev.map((s) => (s.id === suitId ? { ...s, [propKey]: undefined, [`${slotKey}Url`]: undefined } : s))
    );
  };

  const handleAddSuit = () => {
    setSuits((prev) => {
      if (prev.length >= 20) return prev;
      const nextNum = prev.length + 1;
      return [
        ...prev,
        {
          id: `suit_${Date.now()}_${nextNum}`,
          suitNumber: nextNum
        }
      ];
    });
  };

  const handleRemoveSuit = (suitId: string) => {
    setSuits((prev) => {
      if (prev.length <= 1) return prev;
      const filtered = prev.filter((s) => s.id !== suitId);
      return filtered.map((s, idx) => ({ ...s, suitNumber: idx + 1 }));
    });
  };

  // Active suits helper
  const activeSuits = suits.filter(
    (s) => s.kameezUrl || s.completeSetUrl || s.chestDesignUrl || s.bottomUrl || s.dupattaUrl
  );
  const isMultiSuit = category === "suits" && activeSuits.length > 1;

  // Download Output Image
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

  // Download All Images Helper
  const downloadAllImages = async () => {
    for (let i = 0; i < recentGenerations.length; i++) {
      const url = recentGenerations[i];
      await downloadImage(url, `florus-custom-lookbook-${i + 1}-${Date.now()}.png`);
      await new Promise((r) => setTimeout(r, 250));
    }
  };

  // Generate Lookbook Action (Supports Single & Multi-Image / Multi-Suit Batch)
  const handleGenerateAll = async () => {
    setTimeout(() => {
      document.getElementById("magic-preview-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    const isSuitCategory = category === "suits";

    interface GenerationTask {
      garments: Array<{ url: string; note: string; slotId: string; slotLabel: string; role?: string }>;
      label: string;
      suitNumber?: number;
    }

    let tasks: GenerationTask[] = [];

    if (isSuitCategory) {
      if (activeSuits.length === 0) {
        addToast(
          "error",
          "Please upload at least 1 fabric photo (Kameez, Chest Design, Dupatta, Bottom, or Complete Set) to generate."
        );
        return;
      }

      if (activeSuits.length > 1) {
        // Multi-Suit batch: Generate each configured suit!
        tasks = activeSuits.map((s) => {
          const gList: GenerationTask["garments"] = [];
          if (s.kameezUrl) gList.push({ url: s.kameezUrl, note: "Kameez / Kurta Top Fabric", slotId: "kameez", slotLabel: "Kameez / Top", role: "kameez" });
          if (s.chestDesignUrl) gList.push({ url: s.chestDesignUrl, note: "Chest Design / Neckline", slotId: "chest_design", slotLabel: "Chest Design / Neckline", role: "chest_design" });
          if (s.dupattaUrl) gList.push({ url: s.dupattaUrl, note: "Dupatta Drape", slotId: "dupatta", slotLabel: "Dupatta", role: "dupatta" });
          if (s.bottomUrl) gList.push({ url: s.bottomUrl, note: "Bottom / Pants", slotId: "bottom", slotLabel: "Bottom Fabric", role: "bottom" });
          if (s.completeSetUrl) gList.push({ url: s.completeSetUrl, note: "Complete Ensemble Reference", slotId: "complete_set", slotLabel: "Complete Set", role: "complete_set" });
          return { garments: gList, label: `Suit ${s.suitNumber}`, suitNumber: s.suitNumber };
        });
      } else {
        // Single suit: Generate batchCount variations
        const targetSuit = activeSuits[0] || suits[0];
        const gList: GenerationTask["garments"] = [];
        if (targetSuit.kameezUrl) gList.push({ url: targetSuit.kameezUrl, note: "Kameez / Kurta Top Fabric", slotId: "kameez", slotLabel: "Kameez / Top", role: "kameez" });
        if (targetSuit.chestDesignUrl) gList.push({ url: targetSuit.chestDesignUrl, note: "Chest Design / Neckline", slotId: "chest_design", slotLabel: "Chest Design / Neckline", role: "chest_design" });
        if (targetSuit.dupattaUrl) gList.push({ url: targetSuit.dupattaUrl, note: "Dupatta Drape", slotId: "dupatta", slotLabel: "Dupatta", role: "dupatta" });
        if (targetSuit.bottomUrl) gList.push({ url: targetSuit.bottomUrl, note: "Bottom / Pants", slotId: "bottom", slotLabel: "Bottom Fabric", role: "bottom" });
        if (targetSuit.completeSetUrl) gList.push({ url: targetSuit.completeSetUrl, note: "Complete Ensemble Reference", slotId: "complete_set", slotLabel: "Complete Set", role: "complete_set" });

        tasks = Array.from({ length: batchCount }, (_, i) => ({
          garments: gList,
          label: batchCount > 1 ? `Suit Lookbook (${i + 1}/${batchCount})` : "Suit Lookbook"
        }));
      }
    } else {
      // Wholesale Saree
      const sGarments: GenerationTask["garments"] = structuredSlots
        .filter((s) => Boolean(s.url))
        .map((s) => ({
          url: s.url!,
          note: s.note || "",
          slotId: s.id,
          slotLabel: s.label,
          role: s.role,
        }));

      if (sGarments.length === 0 && photos.length === 0) {
        addToast("error", "Please upload at least 1 saree / garment photo to generate a lookbook.");
        return;
      }

      tasks = Array.from({ length: batchCount }, (_, i) => ({
        garments: sGarments.length > 0 ? sGarments : photos.map((p, idx) => ({
          url: p.url,
          note: p.note,
          slotId: `layer-${idx + 1}`,
          slotLabel: p.slotLabel || `Garment Photo ${idx + 1}`
        })),
        label: batchCount > 1 ? `Saree Lookbook (${i + 1}/${batchCount})` : "Saree Lookbook"
      }));
    }

    setLoading(true);
    let successCount = 0;
    const stageTimers: NodeJS.Timeout[] = [];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired, please sign in again");

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        setLoadingLabel(
          tasks.length > 1
            ? `Generating ${task.label} (${i + 1} of ${tasks.length})...`
            : "Generating..."
        );

        setActiveStep(0);
        stageTimers.push(
          ...GENERATION_STEPS.map((_, sIdx) =>
            setTimeout(() => setActiveStep(sIdx), 2000 + sIdx * 2500)
          )
        );

        const idempotencyKey =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${i}-4000-8000-${Math.random().toString(36).slice(2, 10)}`;

        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token || ""}`
          },
          body: JSON.stringify({
            mode: "magic",
            category,
            suitSilhouette,
            dupattaDrape,
            necklineCut: "Auto-detected from Chest Design photo",
            idempotencyKey,
            outfitType: isSuitCategory ? (suitSilhouette || "Unstitched Suit Set") : outfitType,
            drapingStyle,
            blouseStyle,
            aspectRatio: "4:5",
            modelId: selectedModel.id,
            modelName: selectedModel.name,
            modelFaceUrl: selectedModel.imageUrl || null,
            customFaceUrl: selectedModel.category === "custom" ? selectedModel.imageUrl : null,
            faceMode: selectedModel.category === "custom" ? "custom_face" : "keep_original",
            poseId: selectedPose.id,
            poseName: selectedPose.name,
            poseImageUrl: selectedPose.imageUrl,
            poseDescription: selectedPose.description,
            backgroundId: selectedBackground.id,
            backgroundName: selectedBackground.name,
            backgroundUrl: selectedBackground.imageUrl,
            backgroundDescription: selectedBackground.description,
            backgroundMode,
            hairstyle: selectedHairstyle.name,
            hairstyleDescription: selectedHairstyle.description,
            jewellery: selectedJewellery.name,
            jewelleryDescription: selectedJewellery.description,
            fabric: selectedFabric.name,
            fabricDescription: selectedFabric.description,
            fabricDrapePhysics: selectedFabric.drapePhysics,
            customNotes: tasks.length > 1 ? `${customStylingNotes} (Variation ${i + 1})` : customStylingNotes,
            garments: task.garments.slice(0, MAX_GARMENT_REFERENCES)
          })
        });

        stageTimers.forEach(clearTimeout);

        const result = await response.json().catch(() => null);

        if (!response.ok || !result?.outputUrl) {
          const message = result?.error || "Generation request failed";
          addToast("error", `Failed ${task.label}: ${message}`);
        } else {
          successCount++;
          setOutputUrl(result.outputUrl);
          setRecentGenerations((prev) => [result.outputUrl, ...prev.filter((u) => u !== result.outputUrl)]);
        }
      }

      if (successCount > 0) {
        addToast(
          "success",
          `Generated ${successCount} lookbook photo${successCount > 1 ? "s" : ""} successfully! Deducted ${successCount} Credit${successCount > 1 ? "s" : ""}.`
        );
        window.dispatchEvent(new Event("profile-updated"));
      }
    } catch (err) {
      console.error("Batch generation error:", err);
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred during synthesis.";
      addToast("error", errMsg);
    } finally {
      stageTimers.forEach(clearTimeout);
      setLoading(false);
      setLoadingLabel("Generating...");
    }
  };

  const viewportStatus = loading ? "loading" : outputUrl ? "ready" : "idle";

  return (
    <div className="flex w-full flex-col gap-6">
      <LookbookHeader
        icon={<Sparkles className="h-[18px] w-[18px]" />}
        title="Custom Lookbooks"
        description="Bespoke luxury model lookbooks tailored from your unstitched suit sets and wholesale saree fabrics."
        actions={<WorkflowSwitcher active="custom" />}
      />

      {/* Category Tabs: Wholesale Saree vs Unstitched Suits */}
      <div className="flex items-center gap-2 border-b border-line pb-3">
        <span className="text-xs font-semibold text-ink-faint mr-2">Category:</span>
        <div className="flex items-center gap-1.5 bg-sand/60 p-1 rounded-xl border border-line">
          <button
            type="button"
            onClick={() => router.push("/dashboard?tab=magic&category=saree")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              category !== "suits"
                ? "bg-surface text-ink shadow-xs border border-line"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <span>Wholesale Saree</span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard?tab=magic&category=suits")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              category === "suits"
                ? "bg-surface text-ink shadow-xs border border-line"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <span>Unstitched Suits (Build your suits)</span>
            <span className="pill-neutral text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-fuchsia-accent/15 text-fuchsia-accent border border-fuchsia-accent/30">
              1 Credit
            </span>
          </button>
        </div>
      </div>

      {/* Workspace container */}
      <div className="flex flex-col gap-6 w-full">
        {/* 1. Garment / Fabric Uploader */}
        <section className="card p-4 sm:p-6 shadow-sm">
          {category === "suits" ? (
            <StructuredSuitUploader
              suits={suits}
              onUploadSlot={handleUploadSuitSlot}
              onRemoveSlot={handleRemoveSuitSlot}
              onAddSuit={handleAddSuit}
              onRemoveSuit={handleRemoveSuit}
              uploading={isUploading}
              suitSilhouette={suitSilhouette}
              onSelectSilhouette={setSuitSilhouette}
              dupattaDrape={dupattaDrape}
              onSelectDupattaDrape={setDupattaDrape}
            />
          ) : (
            <Step index={1} title="Garment & Blouse Reference" hint="Saree drape, close-ups & dedicated blouse">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {OUTFIT_TYPES.map((type) => (
                    <OptionChip key={type} active={outfitType === type} onClick={() => setOutfitType(type)}>
                      {type}
                    </OptionChip>
                  ))}
                </div>

                <StructuredGarmentUploader
                  slots={structuredSlots}
                  onUploadSlot={handleUploadSlot}
                  onRemoveSlot={handleRemoveSlot}
                  onUpdateNote={handleUpdateSlotNote}
                  uploading={isUploading}
                  drapingStyle={drapingStyle}
                  onSelectDrapingStyle={setDrapingStyle}
                  blouseStyle={blouseStyle}
                  onSelectBlouseStyle={setBlouseStyle}
                />
              </div>
            </Step>
          )}
        </section>

        {/* 2. Creative Direction & Advanced Styling */}
        <section className="card flex flex-col gap-6 p-4 sm:p-6 shadow-sm">
          <Step index={2} title="Creative direction">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MediaCard
                label="Model"
                name={selectedModel.name}
                meta={selectedModel.subtitle}
                imageUrl={selectedModel.imageUrl}
                fallbackUrl={PRESET_MODELS[0].imageUrl}
                alt={selectedModel.name}
                onClick={() => setIsModelModalOpen(true)}
              />
              <MediaCard
                label="Pose"
                name={selectedPose.name}
                meta={selectedPose.category ? `${selectedPose.category} posture` : "Editorial stance"}
                imageUrl={selectedPose.imageUrl}
                fallbackUrl={PRESET_POSES[0].imageUrl}
                alt={selectedPose.name}
                onClick={() => setIsPoseModalOpen(true)}
              />
              <MediaCard
                label="Setting"
                name={selectedBackground.name}
                meta={selectedBackground.category ? `${selectedBackground.category} atmosphere` : "Studio"}
                imageUrl={selectedBackground.imageUrl}
                fallbackUrl={PRESET_BACKGROUNDS[0].imageUrl}
                alt={selectedBackground.name}
                onClick={() => setIsBgModalOpen(true)}
              />
            </div>
          </Step>

          <AdvancedPanel
            open={showAdvancedStyling}
            onToggle={() => setShowAdvancedStyling((v) => !v)}
            title="Hair, jewellery & fabric"
            summary={selectedFabric.name}
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <SelectOption
                active={false}
                onClick={() => setIsHairModalOpen(true)}
                title={selectedHairstyle.name}
                description="Hairstyle"
              />
              <SelectOption
                active={false}
                onClick={() => setIsJewelModalOpen(true)}
                title={selectedJewellery.name}
                description="Jewellery"
              />
              <SelectOption
                active={false}
                onClick={() => setIsFabricModalOpen(true)}
                title={selectedFabric.name}
                description="Fabric override"
              />
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                <Sparkles className="h-3 w-3" />
                Lighting & drape directives
              </span>
              <textarea
                rows={3}
                placeholder="e.g. Crisp pleat creases, warm ambient lighting, natural smile."
                value={customStylingNotes}
                onChange={(e) => setCustomStylingNotes(e.target.value)}
                className="input-field resize-none text-xs leading-relaxed"
              />
            </label>
          </AdvancedPanel>

          <GenerateBar
            note={
              isMultiSuit
                ? `Costs ${activeSuits.length} credits (${activeSuits.length} suits), deducted only on successful render.`
                : `Costs ${batchCount} credit${batchCount > 1 ? "s" : ""} (Rs ${batchCount * 49}), deducted only on successful render.`
            }
            loadingLabel={loadingLabel}
            imageCount={isMultiSuit ? activeSuits.length : batchCount}
            onImageCountChange={isMultiSuit ? undefined : setBatchCount}
            countOptions={[1, 2, 3, 4]}
            batchDescription={
              category === "suits"
                ? isMultiSuit
                  ? `Batch multi-suit: Generating all ${activeSuits.length} configured suits`
                  : "Generate multiple suit variations or add another suit above"
                : "Generate multiple unique lookbook variations at a time"
            }
            customButtonLabel={
              isMultiSuit
                ? `Generate All ${activeSuits.length} Suits (${activeSuits.length} Credits)`
                : batchCount > 1
                ? `Generate ${batchCount} Lookbooks (${batchCount} Credits)`
                : "Generate Lookbook"
            }
            disabled={
              (category === "suits"
                ? activeSuits.length === 0
                : structuredSlots.filter((s) => Boolean(s.url)).length === 0 && photos.length === 0) || isUploading
            }
            loading={loading}
            onGenerate={handleGenerateAll}
          />
        </section>

        {/* 3. Rendered Lookbook Preview at the Last */}
        <section id="magic-preview-section" className="w-full max-w-2xl mx-auto pt-2">
          <PreviewViewport
            status={viewportStatus}
            url={outputUrl}
            title="Synthesising your lookbook"
            hint="Rendering usually takes 8-14 seconds. Keep this tab open."
            steps={GENERATION_STEPS}
            activeStep={activeStep}
            caption={`${selectedModel.name} - ${selectedPose.name}`}
            summaryTitle="Look recipe"
            summary={[
              { label: "Model", value: selectedModel.name },
              { label: "Pose", value: selectedPose.name },
              { label: "Setting", value: selectedBackground.name },
              { label: "Hair", value: selectedHairstyle.name },
              { label: "Jewellery", value: selectedJewellery.name },
              { label: "Fabric", value: selectedFabric.name }
            ]}
            thumbUrls={recentGenerations}
            activeThumb={outputUrl}
            onSelectThumb={setOutputUrl}
            actions={
              outputUrl && !loading ? (
                <OutputActions
                  onExpand={() => setShowLightbox(true)}
                  onDownload={() =>
                    downloadImage(outputUrl, `florus-custom-lookbook-${Date.now()}.png`)
                  }
                  onDownloadAll={recentGenerations.length > 1 ? downloadAllImages : undefined}
                  totalCount={recentGenerations.length}
                  onCopy={() => {
                    navigator.clipboard.writeText(outputUrl);
                    addToast("success", "Public lookbook URL copied to clipboard.");
                  }}
                />
              ) : null
            }
          />
        </section>
      </div>

      {showLightbox && outputUrl && (
        <Lightbox
          url={outputUrl}
          caption={`${selectedModel.name} - ${selectedPose.name} - ${selectedBackground.name}`}
          onClose={() => setShowLightbox(false)}
          onDownload={() =>
            downloadImage(outputUrl, `florus-custom-lookbook-${Date.now()}.png`)
          }
        />
      )}

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

      <FabricPickerModal
        isOpen={isFabricModalOpen}
        onClose={() => setIsFabricModalOpen(false)}
        selectedFabric={selectedFabric}
        onSelect={(fabric) => {
          setSelectedFabric(fabric);
          saveFabricPreference(fabric);
        }}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
