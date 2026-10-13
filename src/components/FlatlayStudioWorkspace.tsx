"use client";

import React, { useState, useEffect } from "react";
import { Package, Check } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { compressImageClient } from "@/lib/imageCompression";
import {
  STAGING_TEMPLATES,
  getSavedFlatlaySuits,
  saveFlatlaySuits,
  getSavedFlatlayPreferences,
  saveFlatlayPreferences
} from "@/lib/flatlayData";
import {
  GenerateBar,
  Lightbox,
  LookbookHeader,
  OutputActions,
  PreviewViewport,
  ToastStack,
  WorkflowSwitcher,
  useToasts
} from "@/components/lookbook/ui";
import {
  StructuredSuitUploader,
  SuitEntry,
  SuitSlotKey
} from "@/components/lookbook/StructuredSuitUploader";
import { creditsFromBalance, CREDIT_PRICE_INR } from "@/lib/pricing";

export interface FlatlaySlot {
  url?: string;
  name?: string;
}

export interface FlatlaySuit extends SuitEntry {
  templateId: string;
}

const GENERATION_STEPS = [
  "Preparing unstitched suit layers",
  "Aligning texture weave & embroidery",
  "Arranging flat-lay staging composition",
  "Rendering high-resolution catalog photo"
];

export function FlatlayStudioWorkspace() {
  // ---------------------------------------------------------------------------
  // Hydration & State
  // ---------------------------------------------------------------------------
  const [hydration] = useState(() => {
    const savedSuits = getSavedFlatlaySuits();
    const savedPrefs = getSavedFlatlayPreferences();
    return {
      suits: savedSuits.length > 0 ? (savedSuits as FlatlaySuit[]) : [
        {
          id: "suit_1",
          suitNumber: 1,
          templateId: "dark-teak"
        }
      ],
      outputUrl: savedPrefs?.outputUrl ?? null,
      recentGenerations: savedPrefs?.recentGenerations ?? [],
      imageCount: savedPrefs?.imageCount ?? 1
    };
  });

  const [suits, setSuits] = useState<FlatlaySuit[]>(hydration.suits);
  const [imageCount, setImageCount] = useState<number>(hydration.imageCount);
  const [aspectRatio] = useState<"4:5" | "3:4" | "1:1">("4:5");

  // Output & Generation State
  const [outputUrl, setOutputUrl] = useState<string | null>(hydration.outputUrl);
  const [recentGenerations, setRecentGenerations] = useState<string[]>(hydration.recentGenerations);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<string>("");
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);

  // Sync state changes to localStorage
  useEffect(() => {
    saveFlatlaySuits(suits);
  }, [suits]);

  useEffect(() => {
    saveFlatlayPreferences({
      outputUrl,
      recentGenerations,
      imageCount
    });
  }, [outputUrl, recentGenerations, imageCount]);

  // User & Credits
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const { toasts, toast: addToast, dismiss: dismissToast } = useToasts();

  // Fetch Wallet Balance
  const refreshWallet = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("balance_inr")
          .eq("id", session.user.id)
          .single();
        if (!error && data) {
          setWalletBalance(Number(data.balance_inr));
        }
      }
    } catch (err) {
      console.warn("Wallet refresh failed:", err);
    }
  };

  useEffect(() => {
    refreshWallet();
    const handleProfileUpdate = () => refreshWallet();
    window.addEventListener("profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("profile-updated", handleProfileUpdate);
  }, []);

  // ---------------------------------------------------------------------------
  // Suit Handlers
  // ---------------------------------------------------------------------------
  const handleAddSuit = () => {
    if (suits.length >= 20) {
      addToast("info", "Maximum of 20 suits per batch.");
      return;
    }
    const nextNum = suits.length + 1;
    const newSuitId = `suit_${Date.now()}_${nextNum}`;
    setSuits((prev) => [
      ...prev,
      {
        id: newSuitId,
        suitNumber: nextNum,
        templateId: "dark-teak"
      }
    ]);
    addToast("success", `Added Suit ${nextNum}`);
  };

  const handleRemoveSuit = (suitId: string) => {
    if (suits.length <= 1) return;
    setSuits((prev) => {
      const filtered = prev.filter((s) => s.id !== suitId);
      return filtered.map((s, idx) => ({ ...s, suitNumber: idx + 1 }));
    });
    addToast("info", "Suit removed.");
  };

  const handleSelectTemplate = (suitId: string, templateId: string) => {
    setSuits((prev) =>
      prev.map((s) => (s.id === suitId ? { ...s, templateId } : s))
    );
  };

  // Upload handler for suit components
  const handleUploadSlot = async (
    suitId: string,
    slotKey: SuitSlotKey,
    file: File
  ) => {
    const uploadKey = `${suitId}_${slotKey}`;
    setIsUploading(uploadKey);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const folder = session?.user?.id || "guest";
      const compressedFile = await compressImageClient(file, 640, 0.85);
      let finalUrl = "";

      if (session?.user) {
        try {
          const fileName = `${folder}/flatlay/${Date.now()}-${suitId}-${slotKey}-${compressedFile.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;
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

      const urlKeyMap: Record<SuitSlotKey, keyof SuitEntry> = {
        kameez: "kameezUrl",
        chest_design: "chestDesignUrl",
        dupatta: "dupattaUrl",
        bottom: "bottomUrl",
        complete_set: "completeSetUrl"
      };

      const propKey = urlKeyMap[slotKey];
      setSuits((prev) =>
        prev.map((s) => {
          if (s.id !== suitId) return s;
          const updated = { ...s, [propKey]: finalUrl, [`${slotKey}Url`]: finalUrl };
          if (slotKey === "kameez") {
            updated.completeSetUrl = finalUrl;
            (updated as any).complete_setUrl = finalUrl;
          }
          return updated;
        })
      );

      addToast("success", `Uploaded ${slotKey.replace("_", " ")} photo.`);
    } catch (err) {
      console.error("Flatlay slot upload error:", err);
      addToast("error", "Failed to upload photo.");
    } finally {
      setIsUploading(null);
    }
  };

  const handleRemoveSlot = (suitId: string, slotKey: SuitSlotKey) => {
    const urlKeyMap: Record<SuitSlotKey, keyof SuitEntry> = {
      kameez: "kameezUrl",
      chest_design: "chestDesignUrl",
      dupatta: "dupattaUrl",
      bottom: "bottomUrl",
      complete_set: "completeSetUrl"
    };
    const propKey = urlKeyMap[slotKey];
    setSuits((prev) =>
      prev.map((s) => {
        if (s.id !== suitId) return s;
        const updated = { ...s, [propKey]: undefined, [`${slotKey}Url`]: undefined };
        if (slotKey === "kameez") {
          updated.completeSetUrl = undefined;
          (updated as any).complete_setUrl = undefined;
        }
        return updated;
      })
    );
  };

  // ---------------------------------------------------------------------------
  // Validation & Costs
  // ---------------------------------------------------------------------------
  const isAllSuitsReady =
    suits.length > 0 &&
    suits.every((s) => Boolean(s.kameezUrl || s.completeSetUrl || s.chestDesignUrl || s.dupattaUrl || s.bottomUrl));
  const isMultiSuitMode = suits.length > 1;

  const availableCredits = creditsFromBalance(walletBalance ?? 0);
  const totalCreditsNeeded = isMultiSuitMode ? suits.length : imageCount;
  const hasSufficientCredits = availableCredits >= totalCreditsNeeded;

  // ---------------------------------------------------------------------------
  // Downloads
  // ---------------------------------------------------------------------------
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

  const handleDownloadAll = async () => {
    for (let i = 0; i < recentGenerations.length; i++) {
      const url = recentGenerations[i];
      await downloadImage(url, `florus-flatlay-${i + 1}-${Date.now()}.png`);
      await new Promise((r) => setTimeout(r, 250));
    }
  };

  // ---------------------------------------------------------------------------
  // Generation
  // ---------------------------------------------------------------------------
  const handleGenerate = async () => {
    if (!isAllSuitsReady) {
      addToast("error", "Please upload a suit photo for each suit to get started.");
      return;
    }
    if (!hasSufficientCredits) {
      addToast(
        "error",
        `Insufficient credits. Need ${totalCreditsNeeded} Credits, but you have ${availableCredits.toFixed(1)} Credits. Please top up your wallet.`
      );
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      addToast("error", "Unauthorized: Active user session required. Please sign in.");
      return;
    }

    setIsGenerating(true);
    const stageTimers: NodeJS.Timeout[] = [];
    setActiveStep(0);
    stageTimers.push(
      ...GENERATION_STEPS.map((_, sIdx) =>
        setTimeout(() => setActiveStep(sIdx), 2000 + sIdx * 2500)
      )
    );

    const newResults: string[] = [];

    try {
      const tasks: Array<{ suit: FlatlaySuit; variationIndex: number; total: number }> = [];

      if (isMultiSuitMode) {
        suits.forEach((suit, idx) => {
          tasks.push({ suit, variationIndex: idx + 1, total: suits.length });
        });
      } else {
        const singleSuit = suits[0];
        for (let i = 1; i <= imageCount; i++) {
          tasks.push({ suit: singleSuit, variationIndex: i, total: imageCount });
        }
      }

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const template =
          STAGING_TEMPLATES.find((t) => t.id === task.suit.templateId) || STAGING_TEMPLATES[0];

        if (isMultiSuitMode) {
          setGenerationStage(
            `Staging Suit ${task.suit.suitNumber} (${i + 1} of ${tasks.length})...`
          );
        } else {
          setGenerationStage(
            `Rendering Flat-lay ${i + 1} of ${tasks.length} (${template.name})...`
          );
        }

        const garmentsPayload: Array<{ url: string; role: string; slotLabel: string }> = [];
        const mainSuitUrl = task.suit.kameezUrl || task.suit.completeSetUrl;
        if (mainSuitUrl) {
          garmentsPayload.push({
            url: mainSuitUrl,
            role: "kameez",
            slotLabel: "Suit Fabric Photo"
          });
        }
        if (task.suit.chestDesignUrl) {
          garmentsPayload.push({
            url: task.suit.chestDesignUrl,
            role: "chest_design",
            slotLabel: "Chest Design / Gala Embroidery"
          });
        }
        if (task.suit.dupattaUrl) {
          garmentsPayload.push({
            url: task.suit.dupattaUrl,
            role: "dupatta",
            slotLabel: "Dupatta Scarf"
          });
        }
        if (task.suit.bottomUrl) {
          garmentsPayload.push({
            url: task.suit.bottomUrl,
            role: "bottom",
            slotLabel: "Bottom Salwar"
          });
        }
        if (garmentsPayload.length === 0) {
          const fallbackUrl =
            task.suit.completeSetUrl ||
            task.suit.chestDesignUrl ||
            task.suit.dupattaUrl ||
            task.suit.bottomUrl;
          if (fallbackUrl) {
            garmentsPayload.push({
              url: fallbackUrl,
              role: "kameez",
              slotLabel: "Suit Fabric Photo"
            });
          }
        }

        const idempotencyKey = crypto.randomUUID();

        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token || ""}`
          },
          body: JSON.stringify({
            mode: "flatlay",
            stagingTemplateUrl: template.image,
            stagingTemplateName: template.name,
            aspectRatio,
            garments: garmentsPayload,
            idempotencyKey
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Staging failed for Suit ${task.suit.suitNumber}`);
        }

        const data = await response.json();
        const finalUrl = data.outputUrl || data.output_url;
        if (finalUrl) {
          newResults.push(finalUrl);
          setOutputUrl(finalUrl);
          setRecentGenerations((prev) => [finalUrl, ...prev.filter((u) => u !== finalUrl)]);
        }
      }

      await refreshWallet();
      addToast("success", `Successfully staged ${newResults.length} flat-lay catalog photo(s)!`);
    } catch (err) {
      console.error("Flatlay generation failed:", err);
      const errMsg = err instanceof Error ? err.message : "Flat-lay staging failed. Please try again.";
      addToast("error", errMsg);
    } finally {
      stageTimers.forEach(clearTimeout);
      setIsGenerating(false);
      setGenerationStage("");
    }
  };

  const viewportStatus = isGenerating ? "loading" : outputUrl ? "ready" : "idle";
  const primaryTemplate =
    STAGING_TEMPLATES.find((t) => t.id === suits[0]?.templateId) || STAGING_TEMPLATES[0];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex w-full flex-col gap-6">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Standard Header matching Studio & Custom Lookbooks */}
      <LookbookHeader
        icon={<Package className="h-[18px] w-[18px]" />}
        title="Flat-Lay Studio"
        description="Commercial staging templates and luxury flat-lay photography for your unstitched suits and fabric sets."
        actions={<WorkflowSwitcher active="flatlay" />}
      />

      {/* Main Workspace Container */}
      <div className="flex flex-col gap-6 w-full">
        {/* 1. Build Your Suits Card */}
        <section className="card p-4 sm:p-6 shadow-sm flex flex-col gap-6">
          <StructuredSuitUploader
            suits={suits}
            onUploadSlot={handleUploadSlot}
            onRemoveSlot={handleRemoveSlot}
            onAddSuit={handleAddSuit}
            onRemoveSuit={handleRemoveSuit}
            uploading={Boolean(isUploading)}
            uploadingSlotKey={isUploading}
            variant="flatlay"
            stepNumber={1}
            sectionTitle="Upload your suits"
            sectionSubtitle="Only 1 photo per suit is needed. Upload your suit fabric photo and select your staging template below."
            renderSuitExtra={(suitEntry) => {
              const suit = suits.find((s) => s.id === suitEntry.id) || suits[0];
              const selectedTemplate =
                STAGING_TEMPLATES.find((t) => t.id === suit.templateId) || STAGING_TEMPLATES[0];

              return (
                <div className="flex flex-col gap-3 pt-3 border-t border-line/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-ink">
                        Staging template
                      </h4>
                      <span className="text-xs text-ink-faint">
                        how this suit is laid out
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-fuchsia-accent">
                      {selectedTemplate.name}
                    </span>
                  </div>

                  {/* Templates Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2.5 max-h-[300px] overflow-y-auto pr-1 smooth-scroll-grid">
                    {STAGING_TEMPLATES.map((tmpl) => {
                      const isSelected = tmpl.id === suit.templateId;

                      return (
                        <div
                          key={tmpl.id}
                          onClick={() => handleSelectTemplate(suit.id, tmpl.id)}
                          className={`group relative aspect-[3/4] rounded-xl overflow-hidden border cursor-pointer transition-all select-none ${
                            isSelected
                              ? "border-fuchsia-accent ring-2 ring-fuchsia-accent/50 shadow-md scale-[1.03]"
                              : "border-line hover:border-line-hover opacity-80 hover:opacity-100"
                          }`}
                          title={tmpl.name}
                        >
                          <img
                            src={tmpl.image}
                            alt={tmpl.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />

                          {/* Top Checkmark if selected */}
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-fuchsia-accent text-white flex items-center justify-center shadow-md">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </div>
                          )}

                          {/* Bottom Label Overlay */}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-1 text-center">
                            <span className="text-[9px] font-semibold text-white/95 line-clamp-1">
                              {tmpl.name}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }}
          />

          {/* Consistent GenerateBar (Same as Custom & Studio Lookbooks) */}
          <GenerateBar
            note={
              isMultiSuitMode
                ? `Costs ${suits.length} credits (${suits.length} suits), deducted only on successful render.`
                : `Costs ${imageCount} credit${imageCount > 1 ? "s" : ""} (Rs ${imageCount * 49}), deducted only on successful render.`
            }
            loadingLabel={generationStage || "Staging flat-lays..."}
            imageCount={isMultiSuitMode ? suits.length : imageCount}
            onImageCountChange={isMultiSuitMode ? undefined : setImageCount}
            countOptions={[1, 2, 3, 4]}
            batchDescription={
              isMultiSuitMode
                ? `Batch multi-suit: Staging all ${suits.length} configured suits`
                : "Generate multiple unique flat-lay variations or add another suit above"
            }
            customButtonLabel={
              isMultiSuitMode
                ? `Stage All ${suits.length} Suits (${suits.length} Credits)`
                : imageCount > 1
                ? `Stage ${imageCount} Flat-Lays (${imageCount} Credits)`
                : "Stage Flat-Lay Lookbook"
            }
            disabled={!isAllSuitsReady || isGenerating}
            loading={isGenerating}
            onGenerate={handleGenerate}
          />
        </section>

        {/* 2. Rendered Lookbook Preview at the Last (Matches All Other Lookbooks) */}
        <section id="flatlay-preview-section" className="w-full max-w-2xl mx-auto pt-2">
          <PreviewViewport
            status={viewportStatus}
            url={outputUrl}
            title="Staging your flat-lay lookbook"
            hint="Rendering usually takes 8-14 seconds. Keep this tab open."
            steps={GENERATION_STEPS}
            activeStep={activeStep}
            caption={
              suits[0]
                ? `Suit ${suits[0].suitNumber} · ${primaryTemplate.name}`
                : "Flat-Lay Catalog"
            }
            summaryTitle="Staging recipe"
            summary={[
              { label: "Suits", value: `${suits.length} Configured` },
              { label: "Template", value: primaryTemplate.name },
              { label: "Aspect ratio", value: aspectRatio },
              { label: "Suit photos", value: isAllSuitsReady ? "All uploaded" : "1 photo per suit needed" }
            ]}
            thumbUrls={recentGenerations}
            activeThumb={outputUrl}
            onSelectThumb={setOutputUrl}
            actions={
              outputUrl && !isGenerating ? (
                <OutputActions
                  onExpand={() => setShowLightbox(true)}
                  onDownload={() =>
                    downloadImage(outputUrl, `florus-flatlay-${Date.now()}.png`)
                  }
                  onDownloadAll={recentGenerations.length > 1 ? handleDownloadAll : undefined}
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

      {/* Lightbox Zoom Modal */}
      {showLightbox && outputUrl && (
        <Lightbox
          url={outputUrl}
          caption={`Flat-Lay Lookbook · ${primaryTemplate.name}`}
          onClose={() => setShowLightbox(false)}
          onDownload={() =>
            downloadImage(outputUrl, `florus-flatlay-${Date.now()}.png`)
          }
        />
      )}
    </div>
  );
}
