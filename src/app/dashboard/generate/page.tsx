"use client";

import React, { Suspense } from "react";
import { GenerateWorkspace } from "@/components/GenerateWorkspace";

export default function GeneratePage() {
  return (
    <Suspense fallback={
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full animate-pulse">
        <div className="lg:col-span-7 h-[500px] bg-surface rounded-2xl border border-muted-purple/40" />
        <div className="lg:col-span-5 h-[500px] bg-surface rounded-2xl border border-muted-purple/40" />
      </div>
    }>
      <GenerateWorkspace />
    </Suspense>
  );
}
