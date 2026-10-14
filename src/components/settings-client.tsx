"use client";

import { useUserPreferences } from "@/components/user-preferences-provider";
import { preferencePalettes, themeModes } from "@/lib/user-preferences";
import type { PortalRole } from "@/lib/roles";

const paletteDetails = {
  NU_BLUE: { label: "NU Blue", primary: "#35408f", soft: "#eef0fb" },
  EMERALD: { label: "Emerald", primary: "#147d5a", soft: "#e5f5ed" },
  VIOLET: { label: "Violet", primary: "#6941a5", soft: "#f0eafb" },
  AMBER: { label: "Amber", primary: "#9b5d07", soft: "#fff2d9" },
} as const;

const themeLabels = {
  LIGHT: "Light",
  DARK: "Dark",
  SYSTEM: "System",
} as const;

const roleLabels: Record<PortalRole, string> = {
  STUDENT: "Student",
  REGISTRAR: "Registrar",
  TREASURY: "Treasury",
};

type SettingsAccount = {
  name: string;
  email: string;
  studentNumber: string | null;
  course: string | null;
  role: PortalRole;
};

export function SettingsClient({ account }: { account: SettingsAccount }) {
  const { preferences, saving, error, updatePreference } = useUserPreferences();

  return (
    <div className="settings-content">
      <header className="settings-title">
        <span className="eyebrow">Account</span>
        <h1 className="page-title">Settings</h1>
        <p className="muted">Manage your appearance and accessibility preferences.</p>
      </header>

      {error && <p className="notice notice-blue" role="alert">{error}</p>}
      <p className="settings-save-status" role="status" aria-live="polite">
        {saving ? "Saving preference…" : "Changes are saved automatically."}
      </p>

      <section className="surface pad settings-section" aria-labelledby="settings-appearance-heading">
        <div className="settings-section-heading">
          <h2 id="settings-appearance-heading">Appearance</h2>
          <p className="muted">Choose an accent palette and color mode. Your palette works with every mode.</p>
        </div>
        <fieldset className="settings-fieldset">
          <legend>Color palette</legend>
          <div className="settings-palette-grid">
            {preferencePalettes.map((palette) => {
              const item = paletteDetails[palette];
              const selected = preferences.palette === palette;
              return (
                <button
                  className="settings-palette-option"
                  key={palette}
                  type="button"
                  aria-pressed={selected}
                  disabled={saving}
                  onClick={() => updatePreference("palette", palette)}
                >
                  <span className="settings-palette-preview" aria-hidden="true">
                    <i style={{ backgroundColor: item.primary }} />
                    <i style={{ backgroundColor: item.soft }} />
                  </span>
                  <span>{item.label}</span>
                  <span className="settings-selection-indicator" aria-hidden="true">{selected ? "✓" : ""}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="settings-fieldset">
          <legend>Theme mode</legend>
          <div className="settings-choice-row">
            {themeModes.map((mode) => (
              <button
                className="settings-choice"
                key={mode}
                type="button"
                aria-pressed={preferences.themeMode === mode}
                disabled={saving}
                onClick={() => updatePreference("themeMode", mode)}
              >
                <span className={`settings-mode-preview settings-mode-${mode.toLowerCase()}`} aria-hidden="true" />
                <span>{themeLabels[mode]}</span>
                {mode === "SYSTEM" && <small>Follows your device</small>}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="surface pad settings-section" aria-labelledby="settings-account-heading">
        <div className="settings-section-heading">
          <h2 id="settings-account-heading">Account</h2>
          <p className="muted">Information associated with your signed-in account.</p>
        </div>
        <dl className="settings-account-grid">
          <div><dt>Name</dt><dd>{account.name}</dd></div>
          <div><dt>Role</dt><dd>{roleLabels[account.role]}</dd></div>
          <div><dt>Email</dt><dd>{account.email}</dd></div>
          {account.studentNumber && <div><dt>Identifier</dt><dd>{account.studentNumber}</dd></div>}
          {account.course && <div><dt>Course</dt><dd>{account.course}</dd></div>}
        </dl>
        <p className="settings-support-note">Profile editing is available from the Student Profile page where supported. Password changes are not available in Settings.</p>
      </section>

      <section className="surface pad settings-section" aria-labelledby="settings-notifications-heading">
        <div className="settings-section-heading">
          <h2 id="settings-notifications-heading">Notifications</h2>
          <p className="muted">NU Docs currently provides in-app request and payment updates only.</p>
        </div>
        <div className="settings-locked-preference">
          <span className="settings-preference-check" aria-hidden="true">✓</span>
          <span><strong>Request and payment updates</strong><small>Always enabled so important status changes remain visible.</small></span>
          <span className="settings-always-on">Always on</span>
        </div>
        <p className="settings-support-note">Email and push notification delivery are not currently supported.</p>
      </section>

      <section className="surface pad settings-section" aria-labelledby="settings-accessibility-heading">
        <div className="settings-section-heading">
          <h2 id="settings-accessibility-heading">Accessibility</h2>
          <p className="muted">Adjust text size and motion throughout your authenticated portal.</p>
        </div>
        <PreferenceToggle
          title="Larger text"
          description="Increase common text sizes for easier reading."
          checked={preferences.largeText}
          disabled={saving}
          onChange={(checked) => updatePreference("largeText", checked)}
        />
        <PreferenceToggle
          title="Reduced animations"
          description="Reduce interface transitions. Your device motion preference is respected too."
          checked={preferences.reducedMotion}
          disabled={saving}
          onChange={(checked) => updatePreference("reducedMotion", checked)}
        />
      </section>

      <section className="surface pad settings-section" aria-labelledby="settings-about-heading">
        <div className="settings-section-heading">
          <h2 id="settings-about-heading">About</h2>
        </div>
        <p><strong>NU Docs</strong></p>
        <p className="muted">Online School Document Request and Tracking System.</p>
      </section>
    </div>
  );
}

function PreferenceToggle({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="settings-toggle-row">
      <span><strong>{title}</strong><small>{description}</small></span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
