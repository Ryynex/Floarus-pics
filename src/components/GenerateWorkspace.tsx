"use client";

import React, { useState, useEffect } from "react";
import { Layers, Sparkles, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  MASTER_SHOOTS,
  MasterShoot,
  CatalogModel,
  CatalogFabric,
  MAX_GARMENT_REFERENCES,
  PRESET_MODELS,
  PRESET_FABRICS,
  getSavedCustomModels,
  getSavedGarments,
  saveGarmentsToStorage,
  getSavedStudioPreferences,
  saveStudioPreferences,
  getSavedFabricPreference,
  saveFabricPreference
} from "@/lib/catalogData";
import { MasterShootPickerModal } from "./modals/MasterShootPickerModal";
import { ModelPickerModal } from "./modals/ModelPickerModal";
import { FabricPickerModal } from "./modals/FabricPickerModal";
import {
  AdvancedPanel,
  FALLBACK_IMAGE,
  GarmentUploader,
  GenerateBar,
  Lightbox,
  LookbookHeader,
  MediaCard,
  OutputActions,
  PreviewViewport,
  SelectOption,
  Step,
  ToastStack,
  WorkflowSwitcher,
  useToasts
} from "./lookbook/ui";
import { compressImageClient } from "@/lib/imageCompression";

interface UploadedGarment {
  id: string;
  url: string;
  note: string;
  slotId?: string;
  slotLabel?: string;
}

const DEFAULT_SLOT_LABELS = [
  "Main body / fabric",
  "Pallu / border",
  "Blouse / contrast"
];

const GENERATION_STEPS = [
  "Locking photoshoot reference",
  "Mapping fabric drape & pleats",
  "Rendering editorial composite",
  "Relighting at full resolution"
];

const FACE_MODES: {
  value: "keep_original" | "custom_face" | "random_face";
  label: string;
  description: string;
}[] = [
  { value: "keep_original", label: "Keep shoot face", description: "Uses the face from the photoshoot reference." },
  { value: "custom_face", label: "Brand model", description: "Uses your own uploaded brand model." },
  { value: "random_face", label: "Diverse model", description: "A fresh Indian model for every look." }
];

export function GenerateWorkspace() {
  // Hydrate from localStorage during the initial render (lazy useState initializers)
  // rather than in a mount effect. This avoids a cascading re-render on every load
  // and means the save-on-change effect never has to guard against "not loaded yet".
  const initialPrefs = getSavedStudioPreferences();
  const initialModels = getSavedCustomModels();
  const initialGarments = getSavedGarments();

  // 1. Master Photoshoot Reference Anchor (Pose, Hands & Environment)
  const [selectedShoot, setSelectedShoot] = useState<MasterShoot>(
    initialPrefs?.selectedShoot ?? MASTER_SHOOTS[0]
  );
  const [isShootModalOpen, setIsShootModalOpen] = useState(false);

  // 2. Model Face Option: "keep_original" | "custom_face" | "random_face"
  const [faceMode, setFaceMode] = useState<"keep_original" | "custom_face" | "random_face">(
    initialPrefs?.faceMode ?? "keep_original"
  );
  const [selectedModel, setSelectedModel] = useState<CatalogModel>(
    initialPrefs?.selectedModel ?? (initialModels.length > 0 ? initialModels[0] : PRESET_MODELS[0])
  );
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);

  // 3. Garment Fabric Selection (15 Main Saree Weaves)
  const [selectedFabric, setSelectedFabric] = useState<CatalogFabric>(
    initialPrefs?.selectedFabric ?? getSavedFabricPreference() ?? PRESET_FABRICS[0]
  );
  const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);

  // 3. Outfit & Product Garment Uploads
  // Studio mode has no outfit-type selector, so this is read-only and persisted.
  const [outfitType] = useState<string>(
    initialPrefs?.outfitType ?? "Wholesale Saree (6-Yard)"
  );
  const [garments, setGarments] = useState<UploadedGarment[]>(() =>
    initialGarments.slice(0, MAX_GARMENT_REFERENCES).map((g, idx) => ({
      id: g.id,
      url: g.url,
      note: g.note || "",
      slotLabel: g.slotLabel || `Fabric Angle ${idx + 1}`
    }))
  );
  const [customStylingNotes, setCustomStylingNotes] = useState<string>(
    initialPrefs?.customStylingNotes ?? ""
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isStylingOpen, setIsStylingOpen] = useState(false);

  // Execution & Output States
  const [loading, setLoading] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(initialPrefs?.outputUrl ?? null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [blurPlaceholderUrl, setBlurPlaceholderUrl] = useState<string | null>(null);

  // Automatically save all user choices locally whenever any option changes
  useEffect(() => {
    saveStudioPreferences({
      selectedShoot,
      faceMode,
      selectedModel,
      selectedFabric,
      outfitType,
      customStylingNotes,
      outputUrl
    });
    saveFabricPreference(selectedFabric);
  }, [
    selectedShoot,
    faceMode,
    selectedModel,
    selectedFabric,
    outfitType,
    customStylingNotes,
    outputUrl
  ]);

  // Toast Notifications
  const { toasts, toast: addToast, dismiss: dismissToast } = useToasts();

  const [isDragOver, setIsDragOver] = useState(false);

  // Upload Garment Photos to Supabase Storage with Client Compression (Max MAX_GARMENT_REFERENCES)
  const handleFiles = async (fileList: FileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const remainingSlots = Math.max(0, MAX_GARMENT_REFERENCES - garments.length);
    if (remainingSlots <= 0) {
      addToast("error", `Maximum ${MAX_GARMENT_REFERENCES} garment reference photos reached. Please remove a photo to upload another.`);
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      addToast("info", `Uploading ${remainingSlots} photo(s) to respect the maximum limit of ${MAX_GARMENT_REFERENCES} garments.`);
    }

    setIsUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Unauthorized: Session is required");
      const folder = session.user.id;

      const newGarments: UploadedGarment[] = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const rawFile = filesToUpload[i];
        // Automatically compress garment photo client-side before upload
        const compressedFile = await compressImageClient(rawFile, 640, 0.85);
        const fileName = `${folder}/uploads/garment-${Date.now()}-${i}-${compressedFile.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;

        const { error } = await supabase.storage
          .from("generated-lookbooks")
          .upload(fileName, compressedFile, {
            contentType: compressedFile.type,
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
          slotLabel: DEFAULT_SLOT_LABELS[garments.length + i] || `Fabric Angle ${garments.length + i + 1}`
        });
      }

      setGarments((prev) => {
        const updated = [...prev, ...newGarments].slice(0, MAX_GARMENT_REFERENCES);
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
      addToast("success", `Compressed & saved ${newGarments.length} fabric photo(s) permanently!`);
    } catch (err) {
      console.error("Upload error:", err);
      const errMsg = err instanceof Error ? err.message : "Upload failed";
      addToast("error", errMsg);
    } finally {
      setIsUploading(false);
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
      const compressedFile = await compressImageClient(file, 640, 0.85);
      const fileName = `${folder}/models/custom-model-${Date.now()}-${compressedFile.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;

      const { error } = await supabase.storage
        .from("generated-lookbooks")
        .upload(fileName, compressedFile, { contentType: compressedFile.type, upsert: true });

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
  const handleGenerate = async () => {
    if (garments.length === 0) {
      addToast("error", "Please upload at least one garment fabric reference photo.");
      return;
    }

    setLoading(true);
    setOutputUrl(null);
    setBlurPlaceholderUrl(null);

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

          // Fabric Specification
          fabric: selectedFabric.name,
          fabricDescription: selectedFabric.description,
          fabricDrapePhysics: selectedFabric.drapePhysics,

          customNotes: customStylingNotes,
          // Strictly limit to the maximum garment reference count
          garments: garments.slice(0, MAX_GARMENT_REFERENCES).map((g) => ({
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

  const clearGarments = () => {
    setGarments([]);
    saveGarmentsToStorage([]);
  };

  const viewportStatus = loading ? "loading" : outputUrl ? "ready" : "idle";

  return (
    <div className="flex w-full flex-col gap-6">
      <LookbookHeader
        icon={<Layers className="h-[18px] w-[18px]" />}
        title="Studio Lookbooks"
        description="Wholesale saree catalog photography anchored to a real photoshoot reference, so drape, pose and lighting stay authentic."
        actions={<WorkflowSwitcher active="studio" />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ------------------------------------------------------------ */}
        {/* Configuration                                                   */}
        {/* ------------------------------------------------------------ */}
        <section className="card flex flex-col gap-6 p-4 sm:p-6 lg:col-span-7">
          <Step
            index={1}
            title="Garment references"
            hint={`Up to ${MAX_GARMENT_REFERENCES} angles`}
          >
            <GarmentUploader
              items={garments}
              max={MAX_GARMENT_REFERENCES}
              uploading={isUploading}
              dragActive={isDragOver}
              onFiles={handleFiles}
              onNote={handleUpdateNote}
              onRemove={handleRemoveGarment}
              onClear={clearGarments}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
              }}
              emptyLabel="Upload garment photos"
              emptyHint="Flat-lay, mannequin or folded fabric"
              addLabel="Add another angle"
              notePlaceholder="e.g. Front pallu close-up, contrast blouse"
            />
          </Step>

          <Step index={2} title="Photoshoot reference" hint={outfitType}>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MediaCard
                  label="Reference shoot"
                  name={selectedShoot.title}
                  meta={`${selectedShoot.settingTitle} - ${selectedShoot.lighting}`}
                  imageUrl={selectedShoot.imageUrl}
                  fallbackUrl={FALLBACK_IMAGE}
                  alt={selectedShoot.title}
                  badge={selectedShoot.badge}
                  actionLabel="Browse"
                  onClick={() => setIsShootModalOpen(true)}
                />
                <MediaCard
                  label="Brand model"
                  name={selectedModel.name}
                  meta={selectedModel.subtitle}
                  imageUrl={selectedModel.imageUrl}
                  alt={selectedModel.name}
                  actionLabel="Browse"
                  onClick={() => {
                    setFaceMode("custom_face");
                    setIsModelModalOpen(true);
                  }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  <User className="h-3 w-3" />
                  Face mode
                </span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {FACE_MODES.map((mode) => (
                    <SelectOption
                      key={mode.value}
                      active={faceMode === mode.value}
                      title={mode.label}
                      description={
                        mode.value === "custom_face" && selectedModel.category === "custom"
                          ? selectedModel.name
                          : mode.description
                      }
                      onClick={() => {
                        setFaceMode(mode.value);
                        if (mode.value === "custom_face") setIsModelModalOpen(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Step>

          <AdvancedPanel
            open={isStylingOpen}
            onToggle={() => setIsStylingOpen((v) => !v)}
            title="Weave & styling guidance"
            summary={selectedFabric.name}
          >
            <button
              type="button"
              onClick={() => setIsFabricModalOpen(true)}
              className="group flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-fuchsia-accent/50 hover:bg-sand/60"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-sand text-fuchsia-accent">
                <Layers className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                  Fabric override
                </span>
                <span className="block truncate text-xs font-semibold text-ink transition-colors group-hover:text-fuchsia-accent">
                  {selectedFabric.name}
                </span>
                <span className="block truncate text-[11px] text-ink-faint">
                  {selectedFabric.description}
                </span>
              </span>
            </button>

            <label className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                <Sparkles className="h-3 w-3" />
                Prompt
              </span>
              <textarea
                rows={3}
                placeholder="e.g. Pallu flowing in breeze, traditional pleated drape, soft smile, high silk sheen."
                value={customStylingNotes}
                onChange={(e) => setCustomStylingNotes(e.target.value)}
                className="input-field resize-none text-xs leading-relaxed"
              />
            </label>
          </AdvancedPanel>

          <GenerateBar
            note="Costs 1 credit, deducted only on a successful render."
            loadingLabel="Generating..."
            disabled={garments.length === 0 || isUploading}
            loading={loading}
            onGenerate={handleGenerate}
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
              placeholderUrl={blurPlaceholderUrl}
              title="Synthesising your lookbook"
              hint="Rendering usually takes 8-14 seconds. Keep this tab open."
              steps={GENERATION_STEPS}
              caption={selectedShoot.title}
              summaryTitle="Look recipe"
              summary={[
                { label: "Shoot", value: selectedShoot.title },
                { label: "Setting", value: selectedShoot.settingTitle },
                { label: "Lighting", value: selectedShoot.lighting },
                { label: "Fabric", value: selectedFabric.name },
                { label: "Face", value: FACE_MODES.find((m) => m.value === faceMode)?.label ?? "-" },
                { label: "References", value: `${garments.length} photo${garments.length === 1 ? "" : "s"}` }
              ]}
              actions={
                outputUrl && !loading ? (
                  <OutputActions
                    onExpand={() => setShowLightbox(true)}
                    onDownload={() => downloadImage(outputUrl, "florus-studio-lookbook.png")}
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
          caption={`${selectedShoot.title} - ${outfitType}`}
          onClose={() => setShowLightbox(false)}
          onDownload={() => downloadImage(outputUrl, "florus-studio-lookbook.png")}
        />
      )}

      <MasterShootPickerModal
        isOpen={isShootModalOpen}
        onClose={() => setIsShootModalOpen(false)}
        selectedShoot={selectedShoot}
        onSelect={(shoot) => setSelectedShoot(shoot)}
        onUploadError={(msg) => addToast("error", msg)}
      />

      <ModelPickerModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        selectedModel={selectedModel}
        onSelect={(model) => setSelectedModel(model)}
        onCustomUpload={handleCustomModelUpload}
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
