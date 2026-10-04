"use client";

import React from "react";
import { WORKFLOW_MODES } from "@/lib/catalogData";
import { ArrowRight, Sparkles, Shirt, Layers, UserCheck } from "lucide-react";

interface CategoryWorkflowSelectorProps {
  activeModeId: string;
  onSelectMode: (modeId: "sarees" | "suits" | "magic" | "pose") => void;
}

export function CategoryWorkflowSelector({
  activeModeId,
  onSelectMode
}: CategoryWorkflowSelectorProps) {
  const getIcon = (id: string) => {
    switch (id) {
      case "sarees":
        return <Shirt className="h-6 w-6 text-fuchsia-accent" />;
      case "suits":
        return <Layers className="h-6 w-6 text-purple-accent" />;
      case "magic":
        return <Sparkles className="h-6 w-6 text-sage" />;
      case "pose":
        return <UserCheck className="h-6 w-6 text-amber-warm" />;
      default:
        return <Sparkles className="h-6 w-6 text-fuchsia-accent" />;
    }
  };

  const getActiveRing = (id: string, isSelected: boolean) => {
    if (!isSelected) return "border-line bg-surface hover:border-fuchsia-accent/40 hover:bg-sand/40";
    switch (id) {
      case "sarees":
        return "border-fuchsia-accent/50 bg-clay-soft ring-2 ring-fuchsia-accent/15";
      case "suits":
        return "border-purple-accent/50 bg-gold-soft ring-2 ring-purple-accent/15";
      case "magic":
        return "border-sage/50 bg-sage-soft ring-2 ring-sage/15";
      case "pose":
        return "border-amber-warm/50 bg-amber-soft ring-2 ring-amber-warm/15";
      default:
        return "border-fuchsia-accent/50 bg-clay-soft ring-2 ring-fuchsia-accent/15";
    }
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Title */}
      <div className="flex flex-col items-center text-center gap-1.5 py-2">
        <div className="h-12 w-12 rounded-2xl bg-fuchsia-accent flex items-center justify-center shadow-sm mb-2">
          <span className="text-xl font-bold text-[#1F1A15]">FL</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Choose a workflow
        </h2>
        <p className="text-sm text-ink-soft max-w-md">
          AI-powered catalog generation for ethnic wear and fashion brands
        </p>
      </div>

      {/* 2x2 Grid of Workflow Mode Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
        {WORKFLOW_MODES.map((mode) => {
          const isSelected = activeModeId === mode.id;
          return (
            <div
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-5 group relative overflow-hidden ${getActiveRing(
                mode.id,
                isSelected
              )}`}
            >
              <div className="flex justify-between items-start">
                {/* Circular Icon Container */}
                <div className="h-12 w-12 rounded-full bg-surface border border-line flex items-center justify-center group-hover:scale-105 transition-transform">
                  {getIcon(mode.id)}
                </div>

                <div className="flex items-center gap-2">
                  {mode.badge && (
                    <span className="pill-neutral text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full">
                      {mode.badge}
                    </span>
                  )}
                  <div className="h-8 w-8 rounded-full bg-sand border border-line flex items-center justify-center text-ink-faint group-hover:text-fuchsia-accent group-hover:border-fuchsia-accent/40 transition-colors">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <h3 className="text-base font-semibold text-ink group-hover:text-fuchsia-accent transition-colors flex items-center gap-2">
                  {mode.title}
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  {mode.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
