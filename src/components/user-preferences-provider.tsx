"use client";

import { createContext, startTransition, useContext, useState } from "react";
import { updateUserPreference } from "@/lib/server/user-preference-actions";
import type { UpdatePreferenceResult } from "@/lib/server/user-preference-actions";
import type { UserPreferences } from "@/lib/user-preferences";

type PreferenceContextValue = {
  preferences: UserPreferences;
  saving: boolean;
  error: string;
  updatePreference: (key: keyof UserPreferences, value: string | boolean) => void;
};

const PreferenceContext = createContext<PreferenceContextValue | null>(null);

export function UserPreferencesProvider({
  children,
  initialPreferences,
}: {
  children: React.ReactNode;
  initialPreferences: UserPreferences;
}) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updatePreference(key: keyof UserPreferences, value: string | boolean) {
    const previous = preferences;
    const optimistic = { ...preferences, [key]: value } as UserPreferences;
    setPreferences(optimistic);
    setError("");
    setSaving(true);

    startTransition(async () => {
      try {
        const result: UpdatePreferenceResult = await updateUserPreference(key, value);
        if (result.error || !result.preferences) {
          setPreferences(previous);
          setError(result.error ?? "Unable to save this preference.");
          return;
        }
        setPreferences(result.preferences);
      } catch {
        setPreferences(previous);
        setError("Unable to save this preference. Please try again.");
      } finally {
        setSaving(false);
      }
    });
  }

  return (
    <PreferenceContext.Provider value={{ preferences, saving, error, updatePreference }}>
      <div
        className="user-preferences-theme"
        data-palette={preferences.palette.toLowerCase().replace("_", "-")}
        data-theme-mode={preferences.themeMode.toLowerCase()}
        data-large-text={preferences.largeText}
        data-reduced-motion={preferences.reducedMotion}
        style={{ display: "contents" }}
      >
        {children}
      </div>
    </PreferenceContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(PreferenceContext);
  if (!context) {
    throw new Error("User preferences are unavailable outside the authenticated preferences provider.");
  }
  return context;
}
