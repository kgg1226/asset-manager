"use client";

import { ToastProvider } from "./toast";
import { I18nProvider } from "@/lib/i18n";
import { LifecycleVisibilityProvider } from "./_components/lifecycle-gauge";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <LifecycleVisibilityProvider>
        <ToastProvider>{children}</ToastProvider>
      </LifecycleVisibilityProvider>
    </I18nProvider>
  );
}
