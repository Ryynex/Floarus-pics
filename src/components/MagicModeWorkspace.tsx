"use client";

import React, { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
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
  saveFabricPreference
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
import { compressImageClient } from "@/lib/imageCompression";

interface UploadedPhoto {
  id: string;
  url: string;
  note: string;
  name: string;
  slotLabel?: string;
}

const DEFAULT_SLOT_LABELS = [
  "Main body fabric / Saree",
  "Pallu / Border accent",
  "Blouse / Contrast fabric"
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
  // Hydrate once per mount: all localStorage reads and preset validation live
  // in this lazy initializer so ordinary re-renders never touch storage.
  const [hydration] = useState(() => {
    const prefs = getSavedMagicPreferences();
    const models = getSavedCustomModels();
    const garments = getSavedGarments("magic");

    const pose = !prefs?.selectedPose
      ? PRESET_POSES[0]
      : prefs.selectedPose.id === "custom"
        ? prefs.selectedPose
        : PRESET_POSES.find(
            (p) => p.id === prefs.selectedPose?.id || p.imageUrl === prefs.selectedPose?.imageUrl
          ) || PRESET_POSES[0];

    const background = !prefs?.selectedBackground
      ? PRESET_BACKGROUNDS[0]
      : prefs.selectedBackground.id === "custom"
        ? prefs.selectedBackground
        : PRESET_BACKGROUNDS.find(
            (b) => b.id === prefs.selectedBackground?.id || b.imageUrl === prefs.selectedBackground?.imageUrl
          ) || PRESET_BACKGROUNDS[0];

    const model = !prefs?.selectedModel
      ? (models.length > 0 ? models[0] : PRESET_MODELS[0])
      : prefs.selectedModel.category === "custom"
        ? prefs.selectedModel
        : PRESET_MODELS.find(
            (m) => m.id === prefs.selectedModel?.id || m.imageUrl === prefs.selectedModel?.imageUrl
          ) || (models.length > 0 ? models[0] : PRESET_MODELS[0]);

    return { prefs, garments, pose, background, model };
  });

  const { prefs: initialPrefs, pose: validatedPose, background: validatedBackground, model: validatedModel } = hydration;
  const initialGarments = hydration.garments;

  // 1. Creative Direction Selectors
  const [selectedModel, setSelectedModel] = useState<CatalogModel>(validatedModel);
  const [selectedPose, setSelectedPose] = useState<CatalogPose>(validatedPose);
  const [selectedBackground, setSelectedBackground] = useState<CatalogBackground>(validatedBackground);
  const [backgroundMode, setBackgroundMode] = useState<"fixed" | "inspiration">(
    () => initialPrefs?.backgroundMode ?? "inspiration"
  );
  const [selectedHairstyle, setSelectedHairstyle] = useState<CatalogHairstyle>(
    () => initialPrefs?.selectedHairstyle ?? PRESET_HAIRSTYLES[0]
  );
  const [selectedJewellery, setSelectedJewellery] = useState<CatalogJewellery>(
    () => initialPrefs?.selectedJewellery ?? PRESET_JEWELLERY[0]
  );
  const [selectedFabric, setSelectedFabric] = useState<CatalogFabric>(
    () => initialPrefs?.selectedFabric ?? getSavedFabricPreference() ?? PRESET_FABRICS[0]
  );

  const [showAdvancedStyling, setShowAdvancedStyling] = useState(false);

  // Modal Visibility States
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isPoseModalOpen, setIsPoseModalOpen] = useState(false);
  const [isBgModalOpen, setIsBgModalOpen] = useState(false);
  const [isHairModalOpen, setIsHairModalOpen] = useState(false);
  const [isJewelModalOpen, setIsJewelModalOpen] = useState(false);
  const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);

  // 2. Outfit Type & Garment Uploads
  const [outfitType, setOutfitType] = useState<string>(
    () => initialPrefs?.outfitType ?? "Wholesale Saree (6-Yard)"
  );
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
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // 3. Execution & Output States
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(
    () => initialPrefs?.outputUrl ?? null
  );
  const [showLightbox, setShowLightbox] = useState(false);
  const [recentGenerations, setRecentGenerations] = useState<string[]>(
    () => initialPrefs?.recentGenerations ?? []
  );

  // Auto-save user selections locally
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
      customStylingNotes,
      outputUrl,
      recentGenerations
    });
    saveFabricPreference(selectedFabric);
  }, [
    selectedModel,
    selectedPose,
    selectedBackground,
    backgroundMode,
    selectedHairstyle,
    selectedJewellery,
    selectedFabric,
    outfitType,
    customStylingNotes,
    outputUrl,
    recentGenerations
  ]);

  // Toast Notifications
  const { toasts, toast: addToast, dismiss: dismissToast } = useToasts();

  // Custom Model Upload Handler (passed to ModelPickerModal)
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

      // Base64 fallback if storage bucket has issue
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

  // Upload Garment Photos with Compression & Storage + Data URL Fallback
  const processFiles = async (files: File[]) => {
    const remainingSlots = Math.max(0, MAX_GARMENT_REFERENCES - photos.length);
    if (remainingSlots <= 0) {
      addToast("error", `Maximum of ${MAX_GARMENT_REFERENCES} garment photos allowed. Remove a photo to upload another.`);
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      addToast("info", `Taking ${remainingSlots} photo(s) to respect the maximum limit of ${MAX_GARMENT_REFERENCES}.`);
    }

    setIsUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const folder = session?.user?.id || "guest";
      const newPhotos: UploadedPhoto[] = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const rawFile = filesToUpload[i];
        const compressedFile = await compressImageClient(rawFile, 640, 0.85);
        let finalUrl = "";

        if (session?.user) {
          try {
            const fileName = `${folder}/uploads/magic-${Date.now()}-${i}-${compressedFile.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;
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
            console.warn("Storage upload notice, using client buffer fallback:", storageErr);
          }
        }

        // Fallback to base64 Data URL if storage is unavailable
        if (!finalUrl) {
          finalUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(compressedFile);
          });
        }

        const slotIndex = photos.length + i;
        newPhotos.push({
          id: `photo-${Date.now()}-${i}`,
          url: finalUrl,
          note: "",
          name: rawFile.name || `Outfit Photo ${slotIndex + 1}`,
          slotLabel: DEFAULT_SLOT_LABELS[slotIndex] || `Layer ${slotIndex + 1}`
        });
      }

      setPhotos((prev) => {
        const merged = [...prev, ...newPhotos];
        saveGarmentsToStorage("magic", 
          merged.map((p) => ({
            id: p.id,
            url: p.url,
            note: p.note,
            name: p.name,
            slotLabel: p.slotLabel
          }))
        );
        return merged;
      });

      addToast("success", `Added ${newPhotos.length} garment reference photo(s).`);
    } catch (err) {
      console.error("Garment upload error:", err);
      addToast("error", "Failed to upload photo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (fileList: FileList) => {
    if (fileList && fileList.length > 0) {
      processFiles(Array.from(fileList));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const clearPhotos = () => {
    setPhotos([]);
    saveGarmentsToStorage("magic", []);
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      saveGarmentsToStorage("magic", 
        filtered.map((p) => ({
          id: p.id,
          url: p.url,
          note: p.note,
          name: p.name,
          slotLabel: p.slotLabel
        }))
      );
      return filtered;
    });
  };

  const handleUpdateNote = (id: string, note: string) => {
    setPhotos((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, note } : p));
      saveGarmentsToStorage("magic", 
        updated.map((p) => ({
          id: p.id,
          url: p.url,
          note: p.note,
          name: p.name,
          slotLabel: p.slotLabel
        }))
      );
      return updated;
    });
  };

  // Generate Lookbook Action
  const handleGenerateAll = async () => {
    if (photos.length === 0) {
      addToast("error", "Please upload at least 1 garment photo to generate a lookbook.");
      return;
    }

    setLoading(true);
    setOutputUrl(null);

    // Advance the progress indicator on a best-effort cadence while the
    // render runs - the API does not stream real stage updates.
    const stageTimers = GENERATION_STEPS.map((_, i) =>
      setTimeout(() => setActiveStep(i), 2000 + i * 2500)
    );

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired, please sign in again");

      // One idempotency key per logical generation: a network retry of this
      // exact request cannot charge the wallet twice.
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-0000-4000-8000-000000000000`.replace(/[^0-9a-f-]/gi, "0");

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token || ""}`
        },
        body: JSON.stringify({
          mode: "magic",
          idempotencyKey,
          outfitType,
          aspectRatio: "4:5",

          // 1. Model Persona
          modelId: selectedModel.id,
          modelName: selectedModel.name,
          modelFaceUrl: selectedModel.imageUrl || null,
          customFaceUrl: selectedModel.category === "custom" ? selectedModel.imageUrl : null,
          faceMode: selectedModel.category === "custom" ? "custom_face" : "keep_original",

          // 2. Editorial Pose
          poseId: selectedPose.id,
          poseName: selectedPose.name,
          poseImageUrl: selectedPose.imageUrl,
          poseDescription: selectedPose.description,

          // 3. Setting & Background
          backgroundId: selectedBackground.id,
          backgroundName: selectedBackground.name,
          backgroundUrl: selectedBackground.imageUrl,
          backgroundDescription: selectedBackground.description,
          backgroundMode,

          // 4. Styling
          hairstyle: selectedHairstyle.name,
          hairstyleDescription: selectedHairstyle.description,
          jewellery: selectedJewellery.name,
          jewelleryDescription: selectedJewellery.description,
          fabric: selectedFabric.name,
          fabricDescription: selectedFabric.description,
          fabricDrapePhysics: selectedFabric.drapePhysics,

          // 5. Garment References
          customNotes: customStylingNotes,
          garments: photos.slice(0, MAX_GARMENT_REFERENCES).map((p, idx) => ({
            url: p.url,
            note: p.note,
            slotId: `layer-${idx + 1}`,
            slotLabel: p.slotLabel || `Garment Photo ${idx + 1}`
          }))
        })
      });

      stageTimers.forEach(clearTimeout);

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const message = result?.error || "Generation request failed";
        // 5xx (engine unavailable / reference failed to load) never reaches
        // billing, so make that explicit instead of leaving users guessing.
        if (response.status >= 500) {
          addToast("error", `${message} No credits were deducted.`);
        } else {
          addToast("error", message);
        }
        return;
      }

      setOutputUrl(result.outputUrl);
      if (result.outputUrl) {
        setRecentGenerations((prev) => [result.outputUrl, ...prev.slice(0, 5)]);
      }
      const remaining =
        typeof result.remainingCredits === "number"
          ? result.remainingCredits
          : typeof result.newBalance === "number"
            ? creditsFromBalance(result.newBalance)
            : null;
      addToast(
        "success",
        `Lookbook generated! Deducted 1 Credit.${remaining !== null ? ` Balance: ${remaining} Credits.` : ""}`
      );

      window.dispatchEvent(new Event("profile-updated"));
    } catch (err) {
      console.error("Magic Generation error:", err);
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred during synthesis.";
      addToast("error", errMsg);
    } finally {
      stageTimers.forEach(clearTimeout);
      setLoading(false);
      setActiveStep(0);
    }
  };

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

  const viewportStatus = loading ? "loading" : outputUrl ? "ready" : "idle";

  return (
    <div className="flex w-full flex-col gap-6">
      <LookbookHeader
        icon={<Sparkles className="h-[18px] w-[18px]" />}
        title="Custom Lookbooks"
        description="Direct the shoot yourself: model, pose, setting and styling, then render a catalog-ready frame from your garment photos."
        actions={<WorkflowSwitcher active="custom" />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ------------------------------------------------------------ */}
        {/* Configuration                                                   */}
        {/* ------------------------------------------------------------ */}
        <section className="card flex flex-col gap-6 p-4 sm:p-6 lg:col-span-7">
          <Step index={1} title="Garment references" hint={`Up to ${MAX_GARMENT_REFERENCES} angles`}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {OUTFIT_TYPES.map((type) => (
                  <OptionChip key={type} active={outfitType === type} onClick={() => setOutfitType(type)}>
                    {type}
                  </OptionChip>
                ))}
              </div>

              <GarmentUploader
                items={photos}
                max={MAX_GARMENT_REFERENCES}
                uploading={isUploading}
                dragActive={isDragOver}
                onFiles={handleFileUpload}
                onNote={handleUpdateNote}
                onRemove={handleRemovePhoto}
                onClear={clearPhotos}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                emptyLabel="Upload garment photos"
                emptyHint="Flat-lay, mannequin or folded fabric"
                addLabel="Add another angle"
                notePlaceholder="e.g. Silk body drape, zari border detail"
              />
            </div>
          </Step>

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
            note="Costs 1 credit (Rs 49), deducted only on a successful render."
            loadingLabel="Generating..."
            disabled={photos.length === 0 || isUploading}
            loading={loading}
            onGenerate={handleGenerateAll}
          />
        </section>

        {/* ------------------------------------------------------------ */}
        {/* Preview                                                        */}
        {/* ------------------------------------------------------------ */}
        <section className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
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
                    onCopy={() => {
                      navigator.clipboard.writeText(outputUrl);
                      addToast("success", "Public lookbook URL copied to clipboard.");
                    }}
                  />
                ) : null
              }
            />
          </div>
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
