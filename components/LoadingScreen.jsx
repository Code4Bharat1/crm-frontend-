"use client";

import React from "react";
import { Building2, Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingScreen({
  message = "Loading workspace & enterprise modules...",
  subtext = "Connecting services",
  className
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30 p-4 transition-all animate-in fade-in duration-200",
        className
      )}
    >
      {/* Centered Glass Card */}
      <div className="flex flex-col items-center text-center max-w-sm w-full p-8 rounded-3xl bg-white/85 dark:bg-card/85 backdrop-blur-xl border border-blue-200/70 dark:border-border/60 shadow-xl shadow-blue-500/5 space-y-6">
        
        {/* Animated Brand Glow Icon */}
        <div className="relative">
          <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 opacity-25 blur-lg animate-pulse" />
          <div className="relative size-16 sm:size-18 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Building2 className="size-8 text-white animate-bounce" style={{ animationDuration: "2s" }} />
          </div>
          <div className="absolute -bottom-1 -right-1 p-1 bg-amber-500 text-white rounded-full ring-2 ring-white dark:ring-card">
            <Sparkles className="size-3" />
          </div>
        </div>

        {/* Brand Text */}
        <div className="space-y-1.5">
          <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 dark:text-white">
            CONTECH <span className="text-blue-600 dark:text-blue-400">CRM</span>
          </h2>
          <p className="text-xs text-muted-foreground font-medium">
            {message}
          </p>
        </div>

        {/* Shimmering Progress Bar */}
        <div className="w-full space-y-2">
          <div className="h-1.5 w-full bg-blue-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
            <div className="h-full w-1/2 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 rounded-full animate-progress" />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
            <span>{subtext}</span>
            <span>Secured 256-bit</span>
          </div>
        </div>

        {/* Footer Security Badge */}
        <div className="pt-1">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-muted/50 px-3 py-1 rounded-full border border-slate-200/60 dark:border-border">
            <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Enterprise Workspace Ready</span>
          </span>
        </div>

      </div>
    </div>
  );
}

export default LoadingScreen;
