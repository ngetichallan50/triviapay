"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdBanner } from "@/components/AdBanner";
import { AdNative } from "@/components/AdNative";
import { AppHeader } from "@/components/AppHeader";
import { CategoryCard } from "@/components/CategoryCard";
import { EarnPromptModal } from "@/components/EarnPromptModal";
import { GradientButton } from "@/components/GradientButton";
import { useAuth } from "@/providers/AuthProvider";
import { useMaterial } from "@/providers/MaterialProvider";

export default function HomePage() {
  const router = useRouter();
  const { isLoggedIn, profile } = useAuth();
  const { categories, progressFor, isReady, readyCount, isLoading, retry } =
    useMaterial();

  const [selected, setSelected] = useState<string[]>([]);
  const [showEarn, setShowEarn] = useState(false);
  const [starting, setStarting] = useState(false);

  const readyCategories = useMemo(
    () => categories.filter((c) => isReady(c.id)),
    [categories, isReady],
  );
  const selectedReady = selected.filter((id) => isReady(id));

  function toggle(id: string) {
    if (!isReady(id)) return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleAll() {
    if (
      readyCategories.length > 0 &&
      selectedReady.length >= readyCategories.length
    ) {
      setSelected([]);
    } else {
      setSelected(readyCategories.map((c) => c.id));
    }
  }

  function launch() {
    setStarting(true);
    sessionStorage.setItem("tpweb_selected", JSON.stringify(selectedReady));
    router.push("/quiz");
  }

  function start() {
    if (selectedReady.length === 0) return;
    if (!isLoggedIn) {
      setShowEarn(true);
      return;
    }
    launch();
  }

  const greeting =
    isLoggedIn && profile?.name?.trim()
      ? `Habari, ${profile.name.trim().split(" ")[0]}! 👋`
      : "Habari! Welcome 👋";

  return (
    <div className="min-h-screen pb-28">
      <AppHeader />

      <main className="mx-auto max-w-3xl px-4">
        <section className="pt-6">
          <h1 className="text-2xl font-extrabold text-slate-900">
            {greeting}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {isLoggedIn
              ? "Pick one or more categories, then tap Start."
              : "Pick categories and play free — sign in to earn on M-Pesa."}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <p
              className={`flex-1 text-[13px] font-bold ${
                selectedReady.length > 0 ? "text-brand" : "text-slate-400"
              }`}
            >
              {selectedReady.length > 0
                ? `${selectedReady.length} ${
                    selectedReady.length === 1 ? "category" : "categories"
                  } selected`
                : isLoading
                  ? `${readyCount} of ${categories.length} categories ready…`
                  : "Tap a category to select it."}
            </p>
            <button
              type="button"
              onClick={toggleAll}
              disabled={readyCategories.length === 0}
              className="rounded-xl px-3 py-1.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
            >
              {selectedReady.length > 0 &&
              selectedReady.length >= readyCategories.length
                ? "Clear all"
                : "Select all"}
            </button>
          </div>
        </section>

        <AdBanner unit="medium" className="mt-4" />

        <section className="mt-4 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              selected={selectedReady.includes(category.id)}
              progress={progressFor(category.id)}
              onToggle={() => toggle(category.id)}
              onRetry={() => retry(category.id)}
            />
          ))}
        </section>

        <AdNative className="mt-6" />
        <AdBanner unit="leaderboard" className="mt-6 hidden sm:block" />
        <AdBanner unit="mobile" className="mt-6 sm:hidden" />
      </main>

      {selectedReady.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-3xl px-5 py-3.5">
            <GradientButton
              onClick={start}
              busy={starting}
              icon={<span>▶</span>}
            >
              Start ({selectedReady.length}{" "}
              {selectedReady.length === 1 ? "category" : "categories"})
            </GradientButton>
          </div>
        </div>
      )}

      {showEarn && (
        <EarnPromptModal
          onPlayFree={() => {
            setShowEarn(false);
            launch();
          }}
          onClose={() => setShowEarn(false)}
        />
      )}
    </div>
  );
}
