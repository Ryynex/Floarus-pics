"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Search, X, Check, Upload, Sparkles, Camera, MapPin, Sun } from "lucide-react";
import { MASTER_SHOOTS, MasterShoot, getSavedCustomShoots, saveCustomShoot } from "@/lib/catalogData";
import { supabase } from "@/lib/supabaseClient";

interface MasterShootPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedShoot: MasterShoot;
  onSelect: (shoot: MasterShoot) => void;
}

export function MasterShootPickerModal({
  isOpen,
  onClose,
  selectedShoot,
  onSelect
}: MasterShootPickerModalProps) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [allShoots, setAllShoots] = useState<MasterShoot[]>(MASTER_SHOOTS);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user's saved custom photoshoot references
  useEffect(() => {
    if (isOpen) {
      const saved = getSavedCustomShoots();
      if (saved.length > 0) {
        setAllShoots([...saved, ...MASTER_SHOOTS]);
      } else {
        setAllShoots(MASTER_SHOOTS);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter shoots
  const filteredShoots = allShoots.filter((shoot) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "custom" && shoot.category === "custom") ||
      shoot.category === activeTab;

    const matchesSearch =
      shoot.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shoot.modelPersona.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shoot.settingTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shoot.poseDescription.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  // Handle custom photoshoot upload
  const handleUploadCustomShoot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || "anonymous";
      const fileExt = file.name.split(".").pop();
      const fileName = `shoot-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${userId}/custom-shoots/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("garments")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("garments")
        .getPublicUrl(filePath);

      const customShoot: MasterShoot = {
        id: `custom_shoot_${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, "").substring(0, 30) || "Custom Brand Shoot",
        category: "custom",
        imageUrl: publicUrl,
        modelPersona: "Custom model reference photo uploaded by brand",
        settingTitle: "Brand custom reference setting & lighting",
        lighting: "Authentic camera lighting from uploaded reference",
        poseDescription: "Reference pose and body geometry from uploaded photo",
        badge: "Brand Upload"
      };

      saveCustomShoot(customShoot);
      setAllShoots([customShoot, ...allShoots]);
      onSelect(customShoot);
      onClose();
    } catch (err) {
      console.error("Custom shoot upload failed:", err);
      // Fallback: create data URL for local session
      const reader = new FileReader();
      reader.onload = () => {
        const customShoot: MasterShoot = {
          id: `custom_shoot_${Date.now()}`,
          title: "Custom Brand Shoot",
          category: "custom",
          imageUrl: reader.result as string,
          modelPersona: "Uploaded brand reference photo",
          settingTitle: "Custom studio / outdoor setting",
          lighting: "Custom reference lighting",
          poseDescription: "Custom reference pose & hands",
          badge: "Brand Upload"
        };
        saveCustomShoot(customShoot);
        setAllShoots([customShoot, ...allShoots]);
        onSelect(customShoot);
        onClose();
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[94vh] sm:max-h-[90vh] bg-surface border border-line rounded-xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-5 md:p-6 border-b border-line flex flex-col gap-3 sm:gap-4 bg-sand/30">
          <div className="flex justify-between items-start gap-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="pill-success text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Zero Hallucination
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-fuchsia-accent">
                  Real Editorial Shoots
                </span>
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-ink">
                Select Master Photoshoot Reference
              </h2>
              <p className="text-xs sm:text-xs md:text-sm text-ink-soft line-clamp-2 sm:line-clamp-none">
                Choose a real photoshoot reference to anchor your model&apos;s pose, hand anatomy, and background lighting.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-ink-faint hover:text-ink hover:bg-sand cursor-pointer transition-all shrink-0"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search & Actions Bar */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint" />
              <input
                type="text"
                placeholder="Search haveli, studio, temple, twirl..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-surface border border-line rounded-xl text-ink placeholder:text-ink-faint focus:outline-none focus:border-fuchsia-accent"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleUploadCustomShoot}
              />
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary text-xs py-1.5 sm:py-2 px-3 sm:px-3.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm w-full sm:w-auto"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>{isUploading ? "Uploading..." : "+ Upload Custom Shoot"}</span>
              </button>
            </div>
          </div>

          {/* Filter Categories Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none text-xs">
            {[
              { id: "all", label: "All Shoots (28)" },
              { id: "heritage", label: "Palace & Haveli" },
              { id: "studio", label: "Clean Studio" },
              { id: "garden", label: "Botanical Garden" },
              { id: "festive_temple", label: "Temple & Festive" },
              { id: "terrace", label: "Royal Balcony" },
              { id: "custom", label: "Custom Uploads" }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded-lg font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-all ${
                  activeTab === tab.id
                    ? "bg-fuchsia-accent text-white shadow-sm"
                    : "bg-surface border border-line text-ink-soft hover:text-ink hover:border-line-hover"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Shoots Grid - 2 columns on phone, 3 on tablet, 4 on desktop */}
        <div
          className="flex-1 overflow-y-auto p-2.5 sm:p-4 md:p-6 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4"
          style={{ minHeight: "0px" }}
        >
          {filteredShoots.map((shoot) => {
            const isSelected = selectedShoot.id === shoot.id;
            return (
              <div
                key={shoot.id}
                onClick={() => {
                  onSelect(shoot);
                  onClose();
                }}
                className={`group relative rounded-xl sm:rounded-2xl border-2 overflow-hidden cursor-pointer transition-all duration-200 bg-surface shadow-md flex flex-col min-h-[290px] sm:min-h-[350px] ${
                  isSelected
                    ? "border-fuchsia-accent ring-2 ring-fuchsia-accent/40 shadow-xl"
                    : "border-line hover:border-fuchsia-accent/50 hover:shadow-xl"
                }`}
              >
                {/* Photo Container with Responsive Height (210px phone / 260px desktop) */}
                <div
                  className="relative w-full bg-sand overflow-hidden shrink-0 h-[200px] sm:h-[260px]"
                >
                  <img
                    src={shoot.imageUrl}
                    alt={shoot.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "top",
                      display: "block"
                    }}
                    className="transition-transform duration-500 ease-out group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Badges Overlay */}
                  <div className="absolute top-2 sm:top-2.5 left-2 sm:left-2.5 right-2 sm:right-2.5 flex justify-between items-center pointer-events-none z-10">
                    {shoot.badge && (
                      <span className="bg-black/85 backdrop-blur-xs text-white text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border border-white/20 uppercase tracking-wider shadow-sm">
                        {shoot.badge}
                      </span>
                    )}
                    {isSelected && (
                      <span className="ml-auto bg-fuchsia-accent text-white p-1 sm:p-1.5 rounded-full shadow-md">
                        <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  {/* Gradient shadow for text readability */}
                  <div
                    className="absolute inset-0 pointer-events-none z-0"
                    style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0) 100%)"
                    }}
                  />

                  {/* Overlay Meta */}
                  <div className="absolute bottom-2 sm:bottom-2.5 left-2.5 sm:left-3 right-2.5 sm:right-3 text-white flex flex-col gap-0.5 pointer-events-none z-10">
                    <span className="text-[9px] sm:text-[10px] text-zinc-300 font-medium line-clamp-1 flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5 text-fuchsia-accent shrink-0" />
                      {shoot.settingTitle}
                    </span>
                    <h3 className="text-[11px] sm:text-xs font-bold text-white line-clamp-1 leading-tight">
                      {shoot.title}
                    </h3>
                  </div>
                </div>

                {/* Card Footer Details */}
                <div
                  className="p-2 sm:p-3 flex flex-col justify-between border-t border-line/60 bg-surface flex-1 min-h-[70px] sm:min-h-[80px]"
                >
                  <span className="text-[9px] sm:text-[10px] text-ink-soft line-clamp-2 leading-tight sm:leading-relaxed">
                    {shoot.poseDescription}
                  </span>
                  <div className="flex items-center gap-1 text-[8px] sm:text-[9px] font-semibold text-fuchsia-accent mt-1">
                    <Sun className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                    <span className="line-clamp-1">{shoot.lighting}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-line bg-sand/30 flex justify-between items-center text-xs text-ink-soft">
          <span className="text-[11px] sm:text-xs truncate mr-2">
            Showing <strong className="text-ink">{filteredShoots.length}</strong> photoshoot references
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-1.5 px-3.5 sm:px-4 rounded-xl cursor-pointer shrink-0"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
