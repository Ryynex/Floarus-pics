"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Layers, Scissors } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { creditsFromBalance, CREDIT_PRICE_INR } from "@/lib/pricing";
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

  // Creative Shots (Multi-Look per Garment)
  const [activeShotIndex, setActiveShotIndex] = useState<number>(0);
  const [creativeShots, setCreativeShots] = useState<Array<{
    id: string;
    shotNumber: number;
    model: CatalogModel;
    pose: CatalogPose;
    background: CatalogBackground;
    backgroundMode: "fixed" | "inspiration";
    hairstyle: CatalogHairstyle;
    jewellery: CatalogJewellery;
    fabric: CatalogFabric;
  }>>(() => {
    const baseModel = initialPrefs?.selectedModel ?? PRESET_MODELS[0];
    const basePose = initialPrefs?.selectedPose ?? PRESET_POSES[0];
    const baseBg = initialPrefs?.selectedBackground ?? PRESET_BACKGROUNDS[0];
    const baseMode = initialPrefs?.backgroundMode === "inspiration" ? "inspiration" : "fixed";
    const baseHair = initialPrefs?.selectedHairstyle ?? PRESET_HAIRSTYLES[0];
    const baseJewel = initialPrefs?.selectedJewellery ?? PRESET_JEWELLERY[0];
    const baseFabric = getSavedFabricPreference() ?? initialPrefs?.selectedFabric ?? PRESET_FABRICS[0];

    return [
      { id: "shot_1", shotNumber: 1, model: baseModel, pose: basePose, background: baseBg, backgroundMode: baseMode, hairstyle: baseHair, jewellery: baseJewel, fabric: baseFabric },
      { id: "shot_2", shotNumber: 2, model: baseModel, pose: basePose, background: baseBg, backgroundMode: baseMode, hairstyle: baseHair, jewellery: baseJewel, fabric: baseFabric },
      { id: "shot_3", shotNumber: 3, model: baseModel, pose: basePose, background: baseBg, backgroundMode: baseMode, hairstyle: baseHair, jewellery: baseJewel, fabric: baseFabric },
      { id: "shot_4", shotNumber: 4, model: baseModel, pose: basePose, background: baseBg, backgroundMode: baseMode, hairstyle: baseHair, jewellery: baseJewel, fabric: baseFabric },
    ];
  });

  const [shotsCustomizedIndividually, setShotsCustomizedIndividually] = useState<boolean>(false);

  const currentShot = creativeShots[activeShotIndex] || creativeShots[0];
  const selectedModel = currentShot.model;
  const selectedPose = currentShot.pose;
  const selectedBackground = currentShot.background;
  const backgroundMode = currentShot.backgroundMode;
  const selectedHairstyle = currentShot.hairstyle;
  const selectedJewellery = currentShot.jewellery;
  const selectedFabric = currentShot.fabric;

  const setSelectedModel = (model: CatalogModel) => {
    setCreativeShots((prev) =>
      prev.map((s, idx) => (!shotsCustomizedIndividually || idx === activeShotIndex ? { ...s, model } : s))
    );
  };

  const setSelectedPose = (pose: CatalogPose) => {
    setCreativeShots((prev) =>
      prev.map((s, idx) => (!shotsCustomizedIndividually || idx === activeShotIndex ? { ...s, pose } : s))
    );
  };

  const setSelectedBackground = (background: CatalogBackground) => {
    setCreativeShots((prev) =>
      prev.map((s, idx) => (!shotsCustomizedIndividually || idx === activeShotIndex ? { ...s, background } : s))
    );
  };

  const setBackgroundMode = (backgroundMode: "fixed" | "inspiration") => {
    setCreativeShots((prev) =>
      prev.map((s, idx) => (!shotsCustomizedIndividually || idx === activeShotIndex ? { ...s, backgroundMode } : s))
    );
  };

  const setSelectedHairstyle = (hairstyle: CatalogHairstyle) => {
    setCreativeShots((prev) =>
      prev.map((s, idx) => (!shotsCustomizedIndividually || idx === activeShotIndex ? { ...s, hairstyle } : s))
    );
  };

  const setSelectedJewellery = (jewellery: CatalogJewellery) => {
    setCreativeShots((prev) =>
      prev.map((s, idx) => (!shotsCustomizedIndividually || idx === activeShotIndex ? { ...s, jewellery } : s))
    );
  };

  const setSelectedFabric = (fabric: CatalogFabric) => {
    setCreativeShots((prev) =>
      prev.map((s, idx) => (!shotsCustomizedIndividually || idx === activeShotIndex ? { ...s, fabric } : s))
    );
    saveFabricPreference(fabric);
  };

  const handleAutoDiversifyShots = () => {
    setShotsCustomizedIndividually(true);
    const curatedPoses = [
      PRESET_POSES[0],
      PRESET_POSES[1] || PRESET_POSES[0],
      PRESET_POSES[2] || PRESET_POSES[0],
      PRESET_POSES[3] || PRESET_POSES[0]
    ];
    const curatedBgs = [
      PRESET_BACKGROUNDS[0],
      PRESET_BACKGROUNDS[1] || PRESET_BACKGROUNDS[0],
      PRESET_BACKGROUNDS[2] || PRESET_BACKGROUNDS[0],
      PRESET_BACKGROUNDS[3] || PRESET_BACKGROUNDS[0]
    ];

    setCreativeShots((prev) =>
      prev.map((s, idx) => ({
        ...s,
        pose: curatedPoses[idx % curatedPoses.length] || s.pose,
        background: curatedBgs[idx % curatedBgs.length] || s.background
      }))
    );
    addToast("success", "Auto-diversified poses & backdrops across all shots!");
  };

  const handleSyncAllShots = () => {
    setShotsCustomizedIndividually(false);
    const active = creativeShots[activeShotIndex] || creativeShots[0];
    setCreativeShots((prev) =>
      prev.map((s) => ({
        ...s,
        model: active.model,
        pose: active.pose,
        background: active.background,
        backgroundMode: active.backgroundMode,
        hairstyle: active.hairstyle,
        jewellery: active.jewellery,
        fabric: active.fabric,
      }))
    );
    addToast("info", "All shots synchronized to the current pose & background!");
  };

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

  const handleCustomPoseUpload = async (file: File): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const compressedFile = await compressImageClient(file, 640, 0.85);

      if (session?.user) {
        const folder = session.user.id;
        const fileName = `${folder}/poses/custom-pose-${Date.now()}-${compressedFile.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;
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
      console.error("Custom pose upload failed:", err);
      return null;
    }
  };

  const handleCustomBackgroundUpload = async (file: File): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const compressedFile = await compressImageClient(file, 640, 0.85);

      if (session?.user) {
        const folder = session.user.id;
        const fileName = `${folder}/backgrounds/custom-bg-${Date.now()}-${compressedFile.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;
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
      console.error("Custom background upload failed:", err);
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

      setSuits((prev) =>
        prev.map((s) => {
          if (s.id !== suitId) return s;
          if (slotKey === "main_dress" || slotKey === "kameez" || slotKey === "complete_set") {
            return { ...s, mainDressUrl: finalUrl, kameezUrl: finalUrl, completeSetUrl: finalUrl };
          }
          if (slotKey === "detail_1" || slotKey === "chest_design") {
            return { ...s, detail1Url: finalUrl, chestDesignUrl: finalUrl };
          }
          if (slotKey === "detail_2" || slotKey === "dupatta") {
            return { ...s, detail2Url: finalUrl, dupattaUrl: finalUrl };
          }
          if (slotKey === "detail_3" || slotKey === "bottom") {
            return { ...s, detail3Url: finalUrl, bottomUrl: finalUrl };
          }
          const propKey = SLOT_URL_KEYS[slotKey] || `${slotKey}Url`;
          return { ...s, [propKey]: finalUrl };
        })
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
    setSuits((prev) =>
      prev.map((s) => {
        if (s.id !== suitId) return s;
        if (slotKey === "main_dress" || slotKey === "kameez" || slotKey === "complete_set") {
          return { ...s, mainDressUrl: undefined, kameezUrl: undefined, completeSetUrl: undefined, mainDressNote: undefined, kameezNote: undefined };
        }
        if (slotKey === "detail_1" || slotKey === "chest_design") {
          return { ...s, detail1Url: undefined, chestDesignUrl: undefined, detail1Note: undefined, chestDesignNote: undefined };
        }
        if (slotKey === "detail_2" || slotKey === "dupatta") {
          return { ...s, detail2Url: undefined, dupattaUrl: undefined, detail2Note: undefined, dupattaNote: undefined };
        }
        if (slotKey === "detail_3" || slotKey === "bottom") {
          return { ...s, detail3Url: undefined, bottomUrl: undefined, detail3Note: undefined, bottomNote: undefined };
        }
        const propKey = SLOT_URL_KEYS[slotKey] || `${slotKey}Url`;
        return { ...s, [propKey]: undefined };
      })
    );
  };

  const handleUpdateSuitNote = (suitId: string, slotKey: SuitSlotKey, note: string) => {
    setSuits((prev) =>
      prev.map((s) => {
        if (s.id !== suitId) return s;
        if (slotKey === "main_dress" || slotKey === "kameez" || slotKey === "complete_set") {
          return { ...s, mainDressNote: note, kameezNote: note };
        }
        if (slotKey === "detail_1" || slotKey === "chest_design") {
          return { ...s, detail1Note: note, chestDesignNote: note };
        }
        if (slotKey === "detail_2" || slotKey === "dupatta") {
          return { ...s, detail2Note: note, dupattaNote: note };
        }
        if (slotKey === "detail_3" || slotKey === "bottom") {
          return { ...s, detail3Note: note, bottomNote: note };
        }
        return { ...s, [`${slotKey}Note`]: note };
      })
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
    (s) =>
      s.mainDressUrl ||
      s.detail1Url ||
      s.detail2Url ||
      s.detail3Url ||
      s.kameezUrl ||
      s.completeSetUrl ||
      s.chestDesignUrl ||
      s.bottomUrl ||
      s.dupattaUrl
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
      shot?: typeof creativeShots[0];
    }

    let tasks: GenerationTask[] = [];

    if (isSuitCategory) {
      if (activeSuits.length === 0) {
        addToast(
          "error",
          "Please upload at least 1 dress photo to generate."
        );
        return;
      }

      if (activeSuits.length > 1) {
        // Multi-Suit batch: Generate each configured suit!
        tasks = activeSuits.map((s, sIdx) => {
          const gList: GenerationTask["garments"] = [];
          const mainUrl = s.mainDressUrl || s.kameezUrl || s.completeSetUrl;
          const detail1Url = s.detail1Url || s.chestDesignUrl;
          const detail2Url = s.detail2Url || s.dupattaUrl;
          const detail3Url = s.detail3Url || s.bottomUrl;

          if (mainUrl) gList.push({ url: mainUrl, note: s.mainDressNote || s.kameezNote || "Full Dress Photo", slotId: "main_dress", slotLabel: "Full Dress", role: "main_dress" });
          if (detail1Url) gList.push({ url: detail1Url, note: s.detail1Note || s.chestDesignNote || "Detail 1 (Bodice / Neckline)", slotId: "detail_1", slotLabel: "Detail 1", role: "detail_1" });
          if (detail2Url) gList.push({ url: detail2Url, note: s.detail2Note || s.dupattaNote || "Detail 2 (Dupatta / Scarf / Sleeve)", slotId: "detail_2", slotLabel: "Detail 2", role: "detail_2" });
          if (detail3Url) gList.push({ url: detail3Url, note: s.detail3Note || s.bottomNote || "Detail 3 (Bottom / Trouser / Hemline)", slotId: "detail_3", slotLabel: "Detail 3", role: "detail_3" });
          const shot = creativeShots[sIdx % creativeShots.length] || creativeShots[0];
          return { garments: gList, label: `Readymade Suit ${s.suitNumber} (${shot.pose.name})`, suitNumber: s.suitNumber, shot };
        });
      } else {
        // Single suit: Generate batchCount variations with DIFFERENT poses and backgrounds!
        const targetSuit = activeSuits[0] || suits[0];
        const gList: GenerationTask["garments"] = [];
        const mainUrl = targetSuit.mainDressUrl || targetSuit.kameezUrl || targetSuit.completeSetUrl;
        const detail1Url = targetSuit.detail1Url || targetSuit.chestDesignUrl;
        const detail2Url = targetSuit.detail2Url || targetSuit.dupattaUrl;
        const detail3Url = targetSuit.detail3Url || targetSuit.bottomUrl;

        if (mainUrl) gList.push({ url: mainUrl, note: targetSuit.mainDressNote || targetSuit.kameezNote || "Full Dress Photo", slotId: "main_dress", slotLabel: "Full Dress", role: "main_dress" });
        if (detail1Url) gList.push({ url: detail1Url, note: targetSuit.detail1Note || targetSuit.chestDesignNote || "Detail 1 (Bodice / Neckline)", slotId: "detail_1", slotLabel: "Detail 1", role: "detail_1" });
        if (detail2Url) gList.push({ url: detail2Url, note: targetSuit.detail2Note || targetSuit.dupattaNote || "Detail 2 (Dupatta / Scarf / Sleeve)", slotId: "detail_2", slotLabel: "Detail 2", role: "detail_2" });
        if (detail3Url) gList.push({ url: detail3Url, note: targetSuit.detail3Note || targetSuit.bottomNote || "Detail 3 (Bottom / Trouser / Hemline)", slotId: "detail_3", slotLabel: "Detail 3", role: "detail_3" });

        tasks = Array.from({ length: batchCount }, (_, i) => {
          const shot = creativeShots[i] || creativeShots[0];
          return {
            garments: gList,
            label: batchCount > 1 ? `Readymade Suit (Shot ${i + 1}: ${shot.pose.name})` : "Readymade Suit",
            shot
          };
        });
      }
    } else {
      // Wholesale Saree: Generate batchCount variations with DIFFERENT poses and backgrounds!
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

      tasks = Array.from({ length: batchCount }, (_, i) => {
        const shot = creativeShots[i] || creativeShots[0];
        return {
          garments: sGarments.length > 0 ? sGarments : photos.map((p, idx) => ({
            url: p.url,
            note: p.note,
            slotId: `layer-${idx + 1}`,
            slotLabel: p.slotLabel || `Garment Photo ${idx + 1}`
          })),
          label: batchCount > 1 ? `Saree Lookbook (Shot ${i + 1}: ${shot.pose.name})` : "Saree Lookbook",
          shot
        };
      });
    }

    setLoading(true);
    let successCount = 0;
    const stageTimers: NodeJS.Timeout[] = [];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired, please sign in again");

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const shot = task.shot || currentShot;

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
            necklineCut: "Auto-detected from dress and detail photos",
            idempotencyKey,
            outfitType: isSuitCategory ? (suitSilhouette || "Readymade Suit Ensemble") : outfitType,
            drapingStyle,
            blouseStyle,
            aspectRatio: "4:5",
            modelId: shot.model.id,
            modelName: shot.model.name,
            modelFaceUrl: shot.model.imageUrl || null,
            customFaceUrl: shot.model.imageUrl || null,
            faceMode: (shot.model.category === "custom" || Boolean(shot.model.imageUrl)) ? "custom_face" : "keep_original",
            poseId: shot.pose.id,
            poseName: shot.pose.name,
            poseCategory: shot.pose.category,
            poseImageUrl: shot.pose.imageUrl,
            poseDescription: shot.pose.description,
            backgroundId: shot.background.id,
            backgroundName: shot.background.name,
            backgroundCategory: shot.background.category,
            backgroundUrl: shot.background.imageUrl,
            backgroundDescription: shot.background.description,
            backgroundMode: shot.backgroundMode,
            hairstyle: shot.hairstyle.name,
            hairstyleDescription: shot.hairstyle.description,
            jewellery: shot.jewellery.name,
            jewelleryDescription: shot.jewellery.description,
            fabric: shot.fabric.name,
            fabricDescription: shot.fabric.description,
            fabricDrapePhysics: shot.fabric.drapePhysics,
            customNotes: tasks.length > 1 ? `${customStylingNotes} (Shot ${i + 1}: ${shot.pose.name} in ${shot.background.name})` : customStylingNotes,
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
        description="Bespoke luxury model lookbooks tailored from your readymade suit sets and wholesale saree fabrics."
        actions={<WorkflowSwitcher active="custom" />}
      />

      {/* Category Tabs: Wholesale Saree vs Readymade Suit */}
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
            <span>Readymade Suit (Build your suits)</span>
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
              onUpdateNote={handleUpdateSuitNote}
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
            {batchCount > 1 && (
              <div className="flex flex-col gap-2.5 pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink">
                      Different Poses & Settings per Shot:
                    </span>
                    <span className="text-[10px] font-semibold text-fuchsia-accent bg-fuchsia-accent/10 px-2 py-0.5 rounded-full border border-fuchsia-accent/20">
                      Same Garment • {batchCount} Unique Looks
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {shotsCustomizedIndividually && (
                      <button
                        type="button"
                        onClick={handleSyncAllShots}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-line bg-surface hover:border-ink hover:text-ink text-ink-soft transition-colors cursor-pointer shadow-xs"
                        title="Reset and synchronize all shots to match the active shot's pose and background"
                      >
                        <span>Sync All to Shot {activeShotIndex + 1}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAutoDiversifyShots}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-line bg-surface hover:border-fuchsia-accent hover:text-fuchsia-accent text-ink-soft transition-colors cursor-pointer shadow-xs"
                      title="Automatically assign distinct poses and backgrounds to each shot"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-fuchsia-accent" />
                      <span>Auto-Vary Poses & Settings</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {creativeShots.slice(0, batchCount).map((shot, idx) => {
                    const isActive = activeShotIndex === idx;
                    return (
                      <button
                        key={shot.id || idx}
                        type="button"
                        onClick={() => {
                          setActiveShotIndex(idx);
                          if (idx > 0) setShotsCustomizedIndividually(true);
                        }}
                        className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isActive
                            ? "border-fuchsia-accent bg-clay-soft ring-2 ring-fuchsia-accent/20 shadow-xs"
                            : "border-line bg-surface hover:border-muted-purple hover:bg-sand/40"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`text-[11px] font-bold ${isActive ? "text-fuchsia-accent" : "text-ink"}`}>
                            Shot {idx + 1}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-fuchsia-accent bg-fuchsia-accent/15 px-1.5 py-0.2 rounded">
                              Editing
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-ink font-semibold truncate w-full mt-1">
                          {shot.pose.name}
                        </span>
                        <span className="text-[10px] text-ink-faint truncate w-full">
                          {shot.background.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {(() => {
              const isPosePhotoAvailable = Boolean(
                selectedPose.imageUrl &&
                selectedPose.imageUrl.trim() !== "" &&
                !selectedPose.imageUrl.includes("photo-1515886657613-9f3515b0c78f") &&
                !selectedPose.imageUrl.includes("unsplash.com")
              );
              const isBgPhotoAvailable = Boolean(
                selectedBackground.imageUrl &&
                selectedBackground.imageUrl.trim() !== "" &&
                !selectedBackground.imageUrl.includes("photo-1582650625119-3a31f8418b7d") &&
                !selectedBackground.imageUrl.includes("unsplash.com")
              );

              return (
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
                    imageUrl={isPosePhotoAvailable ? selectedPose.imageUrl : undefined}
                    fallbackUrl={isPosePhotoAvailable ? PRESET_POSES[0].imageUrl : undefined}
                    alt={selectedPose.name}
                    badge={!isPosePhotoAvailable ? "Prompt Only" : undefined}
                    onClick={() => setIsPoseModalOpen(true)}
                  />
                  <MediaCard
                    label="Setting"
                    name={selectedBackground.name}
                    meta={selectedBackground.category ? `${selectedBackground.category} atmosphere` : "Studio"}
                    imageUrl={isBgPhotoAvailable ? selectedBackground.imageUrl : undefined}
                    fallbackUrl={isBgPhotoAvailable ? PRESET_BACKGROUNDS[0].imageUrl : undefined}
                    alt={selectedBackground.name}
                    badge={!isBgPhotoAvailable ? "Prompt Only" : undefined}
                    onClick={() => setIsBgModalOpen(true)}
                  />
                </div>
              );
            })()}
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
                : `Costs ${batchCount} credit${batchCount > 1 ? "s" : ""} (Rs ${batchCount * CREDIT_PRICE_INR}), deducted only on successful render.`
            }
            loadingLabel={loadingLabel}
            imageCount={isMultiSuit ? activeSuits.length : batchCount}
            onImageCountChange={
              isMultiSuit
                ? undefined
                : (cnt) => {
                    setBatchCount(cnt);
                    if (activeShotIndex >= cnt) setActiveShotIndex(0);
                  }
            }
            countOptions={[1, 2, 3, 4]}
            batchDescription={
              category === "suits"
                ? isMultiSuit
                  ? `Batch multi-suit: Generating all ${activeSuits.length} configured suits`
                  : batchCount > 1
                  ? `Generating all ${batchCount} shots at once with different poses & settings`
                  : "Generate single lookbook or increase count to vary poses & settings"
                : batchCount > 1
                ? `Generating all ${batchCount} shots at once with different poses & settings`
                : "Generate single lookbook or increase count to vary poses & settings"
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
        onCustomUpload={handleCustomPoseUpload}
      />

      <BackgroundPickerModal
        isOpen={isBgModalOpen}
        onClose={() => setIsBgModalOpen(false)}
        selectedBackground={selectedBackground}
        backgroundMode={backgroundMode}
        onSelect={(bg) => setSelectedBackground(bg)}
        onModeChange={(mode) => setBackgroundMode(mode)}
        onCustomUpload={handleCustomBackgroundUpload}
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
