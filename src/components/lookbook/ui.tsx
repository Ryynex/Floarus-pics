"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Expand,
  Info,
  Layers,
  Loader2,
  Package,
  RefreshCw,
  Sparkles,
  UploadCloud,
  X
} from "lucide-react";

export const FALLBACK_IMAGE = "/images/florus_logo.png";

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

export function useToasts(timeout = 5000) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (type: ToastType, message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
      window.setTimeout(() => dismiss(id), timeout);
    },
    [dismiss, timeout]
  );

  return { toasts, toast, dismiss };
}

const TOAST_TONE: Record<ToastType, { wrap: string; icon: React.ReactNode }> = {
  success: {
    wrap: "border-sage/30 bg-sage-soft",
    icon: <CheckCircle2 className="h-4 w-4 text-sage" />,
  },
  error: {
    wrap: "border-brick/30 bg-brick-soft",
    icon: <AlertCircle className="h-4 w-4 text-brick" />,
  },
  info: {
    wrap: "border-line bg-sand",
    icon: <Info className="h-4 w-4 text-fuchsia-accent" />,
  },
};

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-96">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`animate-slide-up pointer-events-auto flex w-full items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl ${TOAST_TONE[t.type].wrap}`}
        >
          <span className="mt-0.5 shrink-0">{TOAST_TONE[t.type].icon}</span>
          <span className="flex-1 text-xs leading-relaxed text-ink">{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="shrink-0 cursor-pointer text-ink-faint transition-colors hover:text-ink"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Workflow switcher                                                   */
/* ------------------------------------------------------------------ */

export type WorkflowKey = "studio" | "custom" | "flatlay";

const WORKFLOWS: { key: WorkflowKey; tab: string; label: string }[] = [
  { key: "studio", tab: "generate", label: "Studio Lookbooks" },
  { key: "custom", tab: "magic", label: "Custom Lookbooks" },
  { key: "flatlay", tab: "flatlay", label: "Build Your Suits" },
];

export function WorkflowSwitcher({ active }: { active: WorkflowKey }) {
  const router = useRouter();

  return (
    <div
      role="tablist"
      aria-label="Lookbook workflow"
      className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-line bg-sand p-1"
    >
      {WORKFLOWS.map((wf) => {
        const isActive = wf.key === active;
        const Icon = wf.key === "studio" ? Layers : wf.key === "flatlay" ? Package : Sparkles;
        return (
          <button
            key={wf.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => router.push(`/dashboard?tab=${wf.tab}`)}
            className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              isActive
                ? "bg-surface text-ink shadow-sm ring-1 ring-line"
                : "text-ink-faint hover:text-ink-soft"
            }`}
          >
            <Icon className={`h-3.5 w-3.5 ${isActive ? "text-fuchsia-accent" : ""}`} />
            <span>{wf.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page header                                                         */
/* ------------------------------------------------------------------ */

export function LookbookHeader({
  icon,
  title,
  description,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-sand text-fuchsia-accent">
          {icon}
        </span>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-ink-soft">{description}</p>
        </div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Step                                                                */
/* ------------------------------------------------------------------ */

export function Step({
  index,
  title,
  hint,
  action,
  children,
}: {
  index: number;
  title: string;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-line bg-sand text-[11px] font-semibold tabular-nums text-fuchsia-accent">
            {index}
          </span>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {hint ? <span className="text-[11px] text-ink-faint">{hint}</span> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Option chips                                                        */
/* ------------------------------------------------------------------ */

export function OptionChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-fuchsia-accent/60 bg-clay-soft text-ink"
          : "border-line bg-sand/60 text-ink-soft hover:border-muted-purple hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Selectable option rows (face mode, hair, jewellery, fabric...)      */
/* ------------------------------------------------------------------ */

export function SelectOption({
  active,
  onClick,
  title,
  description,
  accent = "default",
  leading,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  accent?: "default" | "success";
  leading?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
        active
          ? "border-fuchsia-accent/60 bg-clay-soft"
          : "border-line bg-surface hover:border-muted-purple hover:bg-sand/60"
      }`}
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-ink">{title}</span>
        {description ? (
          <span className="mt-0.5 block truncate text-[11px] text-ink-faint">{description}</span>
        ) : null}
      </span>
      {active ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-fuchsia-accent" strokeWidth={3} />
      ) : accent === "success" ? (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sage/60" />
      ) : null}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Media selection card (model / pose / setting / shoot)               */
/* ------------------------------------------------------------------ */

export function MediaCard({
  label,
  name,
  meta,
  imageUrl,
  alt,
  fallbackUrl,
  onClick,
  actionLabel = "Change",
  badge,
}: {
  label: string;
  name: string;
  meta?: string;
  imageUrl?: string;
  alt: string;
  fallbackUrl?: string;
  onClick: () => void;
  actionLabel?: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex cursor-pointer flex-col gap-2 rounded-xl border border-line bg-surface p-2.5 text-left transition-colors hover:border-fuchsia-accent/50 hover:bg-sand/60 focus-ring"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
          {label}
        </span>
        <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-fuchsia-accent">
          {actionLabel}
          <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>

      <span className="relative block aspect-[3/4] w-full overflow-hidden rounded-lg border border-line bg-sand">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={alt}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              if (fallbackUrl) {
                e.currentTarget.src = fallbackUrl;
              } else {
                (e.currentTarget as HTMLElement).style.display = "none";
              }
            }}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-3 text-center bg-gradient-to-br from-fuchsia-accent/10 via-surface to-clay-soft">
            <Sparkles className="h-6 w-6 text-fuchsia-accent/80" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
              Prompt Direct
            </span>
            <span className="text-[9px] text-ink-faint line-clamp-2">
              Generated directly from your description
            </span>
          </span>
        )}
        {badge ? (
          <span className="absolute bottom-1.5 left-1.5 rounded bg-void/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-soft backdrop-blur-sm">
            {badge}
          </span>
        ) : null}
      </span>

      <span className="flex min-w-0 flex-col px-0.5 pb-0.5">
        <span className="truncate text-xs font-semibold text-ink transition-colors group-hover:text-fuchsia-accent">
          {name}
        </span>
        {meta ? <span className="truncate text-[11px] text-ink-faint">{meta}</span> : null}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Garment uploader                                                    */
/* ------------------------------------------------------------------ */

export interface GarmentSlot {
  id: string;
  url: string;
  note: string;
  slotLabel?: string;
}

export function GarmentUploader({
  items,
  max,
  uploading,
  dragActive = false,
  onFiles,
  onNote,
  onRemove,
  onClear,
  onDragOver,
  onDragLeave,
  onDrop,
  notePlaceholder,
  emptyLabel,
  emptyHint,
  addLabel,
}: {
  items: GarmentSlot[];
  max: number;
  uploading: boolean;
  dragActive?: boolean;
  onFiles: (fileList: FileList) => void;
  onNote: (id: string, note: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  notePlaceholder: string;
  emptyLabel: string;
  emptyHint: string;
  addLabel: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const full = items.length >= max;

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
        }}
      />

      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="group flex items-center gap-3 rounded-xl border border-line bg-sand/50 p-2.5 transition-colors hover:border-muted-purple"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-surface">
              <img
                src={item.url}
                alt={`${item.slotLabel || "Garment"} ${index + 1}`}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`Remove garment ${index + 1}`}
                className="absolute right-1 top-1 cursor-pointer rounded-md bg-void/75 p-0.5 text-ink-soft opacity-0 transition-all hover:bg-brick hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
              <span className="absolute bottom-1 left-1 rounded bg-void/75 px-1 text-[9px] font-semibold tabular-nums text-ink-soft">
                {index + 1}
              </span>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                {item.slotLabel || `Reference ${index + 1}`}
              </span>
              <input
                type="text"
                value={item.note}
                onChange={(e) => onNote(item.id, e.target.value)}
                placeholder={notePlaceholder}
                aria-label={`Draping note for ${item.slotLabel || `reference ${index + 1}`}`}
                className="input-field py-1.5 text-xs"
              />
            </div>
          </div>
        ))}
      </div>

      {!full && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-5 text-center transition-colors ${
            dragActive
              ? "border-fuchsia-accent bg-clay-soft"
              : "border-line bg-sand/30 hover:border-fuchsia-accent/50 hover:bg-sand/60"
          } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-fuchsia-accent" />
          ) : (
            <UploadCloud className="h-5 w-5 text-fuchsia-accent" />
          )}
          <span className="text-xs font-semibold text-ink">
            {uploading
              ? "Uploading & compressing…"
              : items.length === 0
              ? emptyLabel
              : addLabel}
          </span>
          <span className="text-[11px] text-ink-faint">
            {emptyHint} · {items.length}/{max} used
          </span>
        </div>
      )}

      {items.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="self-start cursor-pointer text-[11px] font-medium text-ink-faint transition-colors hover:text-brick"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Collapsible advanced panel                                          */
/* ------------------------------------------------------------------ */

export function AdvancedPanel({
  open,
  onToggle,
  title,
  summary,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  summary?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-sand/30">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-sand/70"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-semibold text-ink">{title}</span>
          <span className="rounded-full border border-line bg-surface px-2 py-px text-[10px] font-medium text-ink-faint">
            Optional
          </span>
        </span>
        <span className="flex min-w-0 shrink-0 items-center gap-2">
          {summary && !open ? (
            <span className="hidden max-w-[9rem] truncate text-[11px] text-fuchsia-accent sm:block">
              {summary}
            </span>
          ) : null}
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div className="animate-fade-in flex flex-col gap-3 border-t border-line p-3.5">
          {children}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Credit / generate action bar                                        */
/* ------------------------------------------------------------------ */

export function GenerateBar({
  note,
  loadingLabel,
  disabled,
  loading,
  onGenerate,
  imageCount,
  onImageCountChange,
  countOptions = [1, 2, 3, 4],
  customButtonLabel,
  batchDescription,
}: {
  note: string;
  loadingLabel: string;
  disabled?: boolean;
  loading: boolean;
  onGenerate: () => void;
  imageCount?: number;
  onImageCountChange?: (count: number) => void;
  countOptions?: number[];
  customButtonLabel?: string;
  batchDescription?: string;
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-line pt-4">
      {onImageCountChange && countOptions && countOptions.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sand/40 border border-line p-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-fuchsia-accent/15 text-fuchsia-accent">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-ink">
                Batch Generation
              </span>
              <span className="text-[11px] text-ink-faint">
                {batchDescription || "Generate multiple unique variations at a time"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-surface/80 p-1 rounded-xl border border-line">
            {countOptions.map((n) => {
              const active = imageCount === n;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={loading}
                  onClick={() => onImageCountChange(n)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    active
                      ? "bg-fuchsia-accent text-white shadow-xs"
                      : "text-ink-soft hover:text-ink hover:bg-sand"
                  }`}
                >
                  {n}x
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] leading-relaxed text-ink-faint sm:max-w-md">{note}</p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={disabled || loading}
          className="btn-primary flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-sm disabled:cursor-not-allowed sm:w-auto"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>{loadingLabel}</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>
                {customButtonLabel || (imageCount && imageCount > 1 ? `Generate ${imageCount} Lookbooks` : "Generate Lookbook")}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Preview viewport                                                    */
/* ------------------------------------------------------------------ */

export interface ViewportSummaryRow {
  label: string;
  value: string;
}

export function PreviewViewport({
  status,
  url,
  placeholderUrl,
  title,
  hint,
  steps,
  activeStep = 0,
  caption,
  summaryTitle = "Output details",
  summary,
  thumbUrls,
  activeThumb,
  onSelectThumb,
  actions,
}: {
  status: "idle" | "loading" | "ready";
  url?: string | null;
  placeholderUrl?: string | null;
  title: string;
  hint: string;
  steps?: string[];
  activeStep?: number;
  caption?: string;
  summaryTitle?: string;
  summary?: ViewportSummaryRow[];
  thumbUrls?: string[];
  activeThumb?: string | null;
  onSelectThumb?: (url: string) => void;
  actions?: React.ReactNode;
}) {
  // Track which URL finished decoding instead of a boolean + reset effect, so
  // switching between session variations resets the placeholder for free.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const loaded = Boolean(url) && loadedUrl === url;

  return (
    <div className="card flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
        <h2 className="text-[13px] font-semibold text-ink">Preview</h2>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            status === "ready"
              ? "border-sage/25 bg-sage-soft text-sage"
              : status === "loading"
              ? "border-fuchsia-accent/25 bg-clay-soft text-fuchsia-accent"
              : "border-line bg-sand text-ink-faint"
          }`}
        >
          {status === "ready" ? "Rendered" : status === "loading" ? "Rendering" : "4:5 Portrait"}
        </span>
      </div>

      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-line bg-sand/60">
        {status === "loading" ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface">
              <Loader2 className="h-5 w-5 animate-spin text-fuchsia-accent" />
            </span>
            <div className="flex w-full flex-col gap-2">
              {title ? (
                <p className="text-sm font-semibold text-ink">{title}</p>
              ) : null}
              {steps && steps.length > 0 && (
                <ol className="flex flex-col gap-1.5 text-left">
                  {steps.map((step, i) => {
                    const done = i < activeStep;
                    const active = i === activeStep;
                    return (
                      <li key={step} className="flex items-center gap-2 text-[11px]">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            done
                              ? "bg-sage"
                              : active
                              ? "animate-pulse bg-fuchsia-accent"
                              : "bg-muted-purple"
                          }`}
                        />
                        <span
                          className={
                            done
                              ? "text-ink-soft"
                              : active
                              ? "text-ink"
                              : "text-ink-faint"
                          }
                        >
                          {step}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
              {hint ? <p className="text-[11px] leading-relaxed text-ink-faint">{hint}</p> : null}
            </div>
          </div>
        ) : status === "ready" && url ? (
          <>
            {placeholderUrl && (
              <img
                src={placeholderUrl}
                alt=""
                aria-hidden
                decoding="async"
                className="absolute inset-0 h-full w-full scale-105 object-cover blur-lg transition-opacity duration-500"
                style={{ opacity: loaded ? 0 : 1 }}
              />
            )}
            <img
              src={url}
              alt={caption || title || "Generated lookbook"}
              decoding="async"
              onLoad={() => setLoadedUrl(url)}
              onError={(e) => {
                e.currentTarget.src = FALLBACK_IMAGE;
              }}
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
              style={{ opacity: loaded ? 1 : 0 }}
            />
            {caption ? (
              <span className="absolute left-3 top-3 rounded-md border border-line bg-surface/90 px-2 py-1 text-[10px] font-medium text-ink-soft backdrop-blur-sm">
                {caption}
              </span>
            ) : null}
            {!loaded && (
              <span className="absolute inset-0 flex items-center justify-center bg-void/40">
                <span className="flex items-center gap-2 rounded-lg border border-line bg-surface/95 px-3 py-1.5 text-[11px] text-ink-soft">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-fuchsia-accent" />
                  Loading image
                </span>
              </span>
            )}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-fuchsia-accent">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="text-xs leading-relaxed text-ink-soft">{hint}</p>
            </div>
          </div>
        )}
      </div>

      {actions}

      {summary && summary.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-sand/40 p-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            {summaryTitle}
          </span>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {summary.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-2">
                <dt className="shrink-0 text-[11px] text-ink-faint">{row.label}</dt>
                <dd className="min-w-0 truncate text-right text-[11px] font-medium text-ink">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {thumbUrls && thumbUrls.length > 1 && onSelectThumb && (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Session variations
          </span>
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
            {thumbUrls.map((thumb, i) => (
              <button
                key={`${thumb}-${i}`}
                type="button"
                onClick={() => onSelectThumb(thumb)}
                aria-label={`View variation ${i + 1}`}
                aria-pressed={activeThumb === thumb}
                className={`h-14 w-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border transition-colors ${
                  activeThumb === thumb
                    ? "border-fuchsia-accent"
                    : "border-line opacity-70 hover:opacity-100"
                }`}
              >
                <img
                  src={thumb}
                  alt={`Variation ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lightbox                                                            */
/* ------------------------------------------------------------------ */

export function Lightbox({
  url,
  caption,
  onClose,
  onDownload,
}: {
  url: string;
  caption?: string;
  onClose: () => void;
  onDownload: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="animate-fade-in fixed inset-0 z-[70] flex items-center justify-center bg-void/90 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full max-w-5xl flex-col items-center gap-3"
      >
        <img
          src={url}
          alt={caption || "Lookbook preview"}
          className="max-h-[78vh] w-auto max-w-full rounded-xl border border-line object-contain shadow-2xl"
        />
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[11px] text-ink-faint">
            {caption || "Generated lookbook"}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold"
            >
              <X className="mr-1.5 inline h-3.5 w-3.5" />
              Close
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="btn-primary cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold"
            >
              <Download className="mr-1.5 inline h-3.5 w-3.5" />
              Download PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Output actions                                                      */
/* ------------------------------------------------------------------ */

export function OutputActions({
  onExpand,
  onDownload,
  onCopy,
  onDownloadAll,
  totalCount,
}: {
  onExpand: () => void;
  onDownload: () => void;
  onCopy?: () => void;
  onDownloadAll?: () => void;
  totalCount?: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onExpand}
          className="btn-secondary flex cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold"
        >
          <Expand className="h-3.5 w-3.5" />
          Fullscreen
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="btn-primary flex cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold shadow-sm"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </button>
      </div>
      {onDownloadAll && totalCount && totalCount > 1 ? (
        <button
          type="button"
          onClick={onDownloadAll}
          className="btn-secondary flex cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold border-fuchsia-accent/30 text-fuchsia-accent hover:bg-fuchsia-accent/10"
        >
          <Download className="h-3.5 w-3.5" />
          Download All {totalCount} Images
        </button>
      ) : null}
      {onCopy ? (
        <button
          type="button"
          onClick={onCopy}
          className="btn-secondary flex cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-medium"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy shareable link
        </button>
      ) : null}
    </div>
  );
}
