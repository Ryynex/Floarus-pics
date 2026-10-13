"use client";

import React, { useState, useEffect } from "react";
import { Layers, Sparkles, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { creditsFromBalance } from "@/lib/pricing";
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
import {
  StructuredGarmentUploader,
  StructuredGarmentSlot,
  INITIAL_STRUCTURED_SLOTS
} from "./lookbook/StructuredGarmentUploader";
import { compressImageClient } from "@/lib/imageCompression";

interface UploadedGarment {
  id: string;
  url: string;
  note: string;
  slotId?: string;
  slotLabel?: string;
  role?: string;
}

const DEFAULT_SLOT_LABELS = [
  "Saree Photo / Fabric",
  "Blouse Photo (Optional)",
  "Pallu / Border Detail 1 (Optional)",
  "Pallu / Border Detail 2 (Optional)"
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
  const [selectedShoot, setSelectedShoot] = useState<MasterShoot>(
    () => getSavedStudioPreferences()?.selectedShoot ?? MASTER_SHOOTS[0]
  );
  const [selectedModel, setSelectedModel] = useState<CatalogModel>(
    () => getSavedStudioPreferences()?.selectedModel ?? PRESET_MODELS[0]
  );
  const [faceMode, setFaceMode] = useState<"keep_original" | "custom_face" | "random_face">(
    () => getSavedStudioPreferences()?.faceMode ?? "keep_original"
  );
  const [selectedFabric, setSelectedFabric] = useState<CatalogFabric>(
    () => getSavedFabricPreference() ?? getSavedStudioPreferences()?.selectedFabric ?? PRESET_FABRICS[0]
  );
  const [structuredSlots, setStructuredSlots] = useState<StructuredGarmentSlot[]>(() => {
    const saved = getSavedGarments("studio");
    const hasRoles = saved.some((g) => Boolean(g.role));
    return INITIAL_STRUCTURED_SLOTS.map((slot, idx) => {
      const match = hasRoles
        ? saved.find((g) => g.role === slot.role || g.id === slot.id)
        : saved[idx];
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
  const [garments, setGarments] = useState<UploadedGarment[]>(() => {
    const saved = getSavedGarments("studio");
    return saved.slice(0, MAX_GARMENT_REFERENCES).map((g, idx) => ({
      id: g.id,
      url: g.url,
      note: g.note || "",
      slotId: g.slotId || (g as any).role || `slot-${idx + 1}`,
      slotLabel: g.slotLabel || (g as any).name || DEFAULT_SLOT_LABELS[idx] || `Fabric Layer ${idx + 1}`,
      role: g.role
    }));
  });
  const [outfitType] = useState<string>("Wholesale Saree");
  const [customStylingNotes, setCustomStylingNotes] = useState<string>(
    () => getSavedStudioPreferences()?.customStylingNotes ?? ""
  );

  // Batch Generation State
  const [batchCount, setBatchCount] = useState<number>(1);
  const [loadingLabel, setLoadingLabel] = useState<string>("Generating...");

  const [isShootModalOpen, setIsShootModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(
    () => getSavedStudioPreferences()?.outputUrl ?? null
  );
  const [blurPlaceholderUrl, setBlurPlaceholderUrl] = useState<string | null>(null);
  const [recentGenerations, setRecentGenerations] = useState<string[]>(
    () => getSavedStudioPreferences()?.recentGenerations ?? []
  );
  const [showLightbox, setShowLightbox] = useState(false);
  const [isStylingOpen, setIsStylingOpen] = useState(false);

  useEffect(() => {
    saveStudioPreferences({
      selectedShoot,
      selectedModel,
      faceMode,
      selectedFabric,
      customStylingNotes,
      outputUrl,
      recentGenerations
    });
  }, [selectedShoot, selectedModel, faceMode, selectedFabric, customStylingNotes, outputUrl, recentGenerations]);

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
        slotId: s.id
      }));
    setGarments(active);
    saveGarmentsToStorage("studio", active);
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
          const fileName = `${folder}/uploads/studio-${Date.now()}-${role}-${compressedFile.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;
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
      console.error("Garment upload error:", err);
      addToast("error", "Failed to upload garment photo.");
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

  const downloadAllImages = async () => {
    for (let i = 0; i < recentGenerations.length; i++) {
      const url = recentGenerations[i];
      await downloadImage(url, `florus-studio-lookbook-${i + 1}-${Date.now()}.png`);
      await new Promise((r) => setTimeout(r, 250));
    }
  };

  // Submit generation request (Supports Multiple Images Batch)
  const handleGenerate = async () => {
    const activeGarments = structuredSlots
      .filter((s) => Boolean(s.url))
      .map((s) => ({
        url: s.url!,
        note: s.note || "",
        slotId: s.id,
        slotLabel: s.label,
        role: s.role
      }));

    if (activeGarments.length === 0) {
      addToast("error", "Please upload at least one saree photo to generate.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      document.getElementById("studio-preview-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);

    let successCount = 0;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired, please sign in again");

      for (let i = 0; i < batchCount; i++) {
        setLoadingLabel(
          batchCount > 1
            ? `Rendering photo ${i + 1} of ${batchCount}...`
            : "Generating..."
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
            mode: "sarees",
            idempotencyKey,
            outfitType,
            aspectRatio: "4:5",
            shootId: selectedShoot.id,
            shootTitle: selectedShoot.title,
            shootImageUrl: selectedShoot.imageUrl,
            shootSetting: selectedShoot.settingTitle,
            shootPose: selectedShoot.poseDescription,
            faceMode,
            customFaceUrl: faceMode === "custom_face" ? (selectedModel.imageUrl || null) : null,
            fabric: selectedFabric.name,
            fabricDescription: selectedFabric.description,
            customNotes: batchCount > 1 ? `${customStylingNotes} (Angle variation ${i + 1})` : customStylingNotes,
            garments: activeGarments.slice(0, MAX_GARMENT_REFERENCES).map((g) => ({
              url: g.url,
              note: g.note,
              slotId: g.slotId,
              slotLabel: g.slotLabel,
              role: g.role
            }))
          })
        });

        const result = await response.json().catch(() => null);

        if (!response.ok || !result?.outputUrl) {
          const message = result?.error || "Generation request failed";
          addToast("error", `Photo ${i + 1} failed: ${message}`);
        } else {
          successCount++;
          setOutputUrl(result.outputUrl);
          setBlurPlaceholderUrl(result.blurPlaceholderUrl ?? null);
          setRecentGenerations((prev) => [result.outputUrl, ...prev.filter((u) => u !== result.outputUrl)]);
        }
      }

      if (successCount > 0) {
        addToast(
          "success",
          `Generated ${successCount} studio photo${successCount > 1 ? "s" : ""} successfully! Deducted ${successCount} Credit${successCount > 1 ? "s" : ""}.`
        );
        window.dispatchEvent(new Event("profile-updated"));
      }
    } catch (err) {
      console.error("Studio generation error:", err);
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred during synthesis.";
      addToast("error", errMsg);
    } finally {
      setLoading(false);
      setLoadingLabel("Generating...");
    }
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

      {/* ------------------------------------------------------------ */}
      {/* Unified Studio Layout (Preview Rendered at the Last)         */}
      {/* ------------------------------------------------------------ */}
      <div className="flex flex-col gap-6 w-full">
        {/* 1. Garment & Optional Blouse References */}
        <section className="card p-4 sm:p-6 shadow-sm">
          <Step
            index={1}
            title="Garment & Blouse Reference"
            hint="Only 1 saree photo required, blouse is optional"
          >
            <StructuredGarmentUploader
              slots={structuredSlots}
              onUploadSlot={handleUploadSlot}
              onRemoveSlot={handleRemoveSlot}
              onUpdateNote={handleUpdateSlotNote}
              uploading={isUploading}
            />
          </Step>
        </section>

        {/* 2. Creative Direction & Styling */}
        <section className="card flex flex-col gap-6 p-4 sm:p-6 shadow-sm">
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
            note={`Costs ${batchCount} credit${batchCount > 1 ? "s" : ""}, deducted only on successful render.`}
            loadingLabel={loadingLabel}
            imageCount={batchCount}
            onImageCountChange={setBatchCount}
            countOptions={[1, 2, 3, 4]}
            batchDescription="Generate multiple unique angles & poses at a time"
            customButtonLabel={
              batchCount > 1
                ? `Generate ${batchCount} Studio Photos (${batchCount} Credits)`
                : "Generate Lookbook"
            }
            disabled={structuredSlots.filter((s) => Boolean(s.url)).length === 0 || isUploading}
            loading={loading}
            onGenerate={handleGenerate}
          />
        </section>

        {/* 3. Rendered Studio Preview at the Last */}
        <section id="studio-preview-section" className="w-full max-w-2xl mx-auto pt-2">
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
            thumbUrls={recentGenerations}
            activeThumb={outputUrl}
            onSelectThumb={setOutputUrl}
            actions={
              outputUrl && !loading ? (
                <OutputActions
                  onExpand={() => setShowLightbox(true)}
                  onDownload={() => downloadImage(outputUrl, "florus-studio-lookbook.png")}
                  onDownloadAll={recentGenerations.length > 1 ? downloadAllImages : undefined}
                  totalCount={recentGenerations.length}
                />
              ) : null
            }
          />
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
