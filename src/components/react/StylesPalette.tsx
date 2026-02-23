import { useState } from "react";
import type {
  SectionStyleOverrides,
  ThemeColorKey,
  ThemeFontKey,
} from "../../types/cms";
import { useTheme } from "../../utils/useTheme";

const THEME_COLOR_KEYS: ThemeColorKey[] = [
  "primary",
  "secondary",
  "background",
  "text",
  "textSecondary",
  "accent",
];

const THEME_FONT_KEYS: ThemeFontKey[] = ["heading", "body"];

export interface StylesPaletteProps {
  /** Current style overrides value */
  styles: SectionStyleOverrides;
  /** Called whenever a style value changes */
  onChange: (styles: SectionStyleOverrides) => void;
  /**
   * When true (default), the palette is wrapped in a collapsible toggle.
   * When false, the palette content is always visible (use inside panels).
   */
  collapsible?: boolean;
  /** Label shown on the toggle button. Default: "Styles" */
  label?: string;
}

/**
 * Reusable style-overrides palette.
 * Mirrors the style panel in the page editor section sidebar so the same
 * colour / font / spacing UI is available wherever components are configured.
 */
export default function StylesPalette({
  styles,
  onChange,
  collapsible = true,
  label = "Styles",
}: StylesPaletteProps) {
  const { colors, fonts, spacing } = useTheme();
  const [open, setOpen] = useState(false);

  const hasAny = Object.values(styles).some(Boolean);

  const set = (key: keyof SectionStyleOverrides, value: string | undefined) =>
    onChange({ ...styles, [key]: value || undefined });

  const clear = () => onChange({});

  // ── sub-components ──────────────────────────────────────────────────────────

  const Row = ({
    label: rowLabel,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="py-1.5">
      <span
        className="block text-xs mb-1"
        style={{ color: colors.textSecondary }}
      >
        {rowLabel}
      </span>
      <div>{children}</div>
    </div>
  );

  const textInput = (key: keyof SectionStyleOverrides, placeholder: string) => (
    <input
      type="text"
      value={(styles[key] as string) ?? ""}
      onChange={(e) => set(key, e.target.value)}
      placeholder={placeholder}
      className="w-full px-2 py-1 text-xs rounded border"
      style={{
        borderColor: colors.secondary,
        backgroundColor: colors.background,
        color: colors.text,
      }}
    />
  );

  const ColorSwatches = ({
    field,
  }: {
    field: "backgroundColor" | "textColor";
  }) => (
    <div className="flex flex-wrap gap-1.5 items-center">
      {THEME_COLOR_KEYS.map((key) => {
        const hex = (colors[key] || "").trim();
        if (!hex) return null;
        const active = styles[field] === hex;
        return (
          <button
            key={key}
            title={`${key}: ${hex}`}
            onClick={() => set(field, active ? "" : hex)}
            className="w-8 h-8 rounded border-2 transition-all"
            style={{
              backgroundColor: hex,
              borderColor: active ? colors.text : "#00000033",
              outline: active ? `2px solid ${hex}` : "none",
              outlineOffset: "2px",
            }}
          />
        );
      })}
      {styles[field] && (
        <>
          <span
            className="text-xs font-mono"
            style={{ color: colors.textSecondary }}
          >
            {styles[field]}
          </span>
          <button
            onClick={() => set(field, "")}
            className="text-xs px-1.5 rounded hover:opacity-80"
            style={{ color: colors.textSecondary }}
            title="Clear"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );

  const spacingKeys = Object.keys(spacing);

  // ── body ────────────────────────────────────────────────────────────────────

  const body = (
    <div className="space-y-1">
      <Row label="Background color">
        <ColorSwatches field="backgroundColor" />
      </Row>

      <Row label="Background image">
        {textInput("backgroundImage", "https://...")}
      </Row>

      {styles.backgroundImage && (
        <>
          <Row label="Bg size">
            <div className="flex gap-1">
              {(["cover", "contain", "auto"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => set("backgroundSize", v)}
                  className="px-2 py-1 text-xs rounded border"
                  style={{
                    borderColor:
                      styles.backgroundSize === v
                        ? colors.primary
                        : colors.secondary,
                    color:
                      styles.backgroundSize === v
                        ? colors.primary
                        : colors.text,
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Bg position">
            {textInput("backgroundPosition", "center")}
          </Row>
        </>
      )}

      <Row label="Text color">
        <ColorSwatches field="textColor" />
      </Row>

      <Row label="Font family">
        <div className="flex gap-1 flex-wrap">
          {THEME_FONT_KEYS.map((k) => {
            const fontValue = fonts[k];
            const active = styles.fontFamily === fontValue;
            return (
              <button
                key={k}
                onClick={() => set("fontFamily", active ? "" : fontValue)}
                className="px-3 py-1 text-xs rounded border"
                style={{
                  borderColor: active ? colors.primary : colors.secondary,
                  color: active ? colors.primary : colors.text,
                  fontFamily: fontValue,
                }}
              >
                {k}
              </button>
            );
          })}
          {styles.fontFamily && (
            <button
              onClick={() => set("fontFamily", "")}
              className="text-xs px-1.5 hover:opacity-80"
              style={{ color: colors.textSecondary }}
              title="Clear"
            >
              ✕
            </button>
          )}
        </div>
      </Row>

      {spacingKeys.length > 0 ? (
        <>
          <Row label="Padding top">
            <div className="flex flex-wrap gap-1">
              {spacingKeys.map((k) => {
                const cssVal = spacing[k];
                const active = styles.paddingTop === cssVal;
                return (
                  <button
                    key={k}
                    title={`${k}: ${cssVal}`}
                    onClick={() => set("paddingTop", active ? "" : cssVal)}
                    className="px-2 py-1 text-xs rounded border"
                    style={{
                      borderColor: active ? colors.primary : colors.secondary,
                      color: active ? colors.primary : colors.text,
                    }}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          </Row>
          <Row label="Padding bottom">
            <div className="flex flex-wrap gap-1">
              {spacingKeys.map((k) => {
                const cssVal = spacing[k];
                const active = styles.paddingBottom === cssVal;
                return (
                  <button
                    key={k}
                    title={`${k}: ${cssVal}`}
                    onClick={() => set("paddingBottom", active ? "" : cssVal)}
                    className="px-2 py-1 text-xs rounded border"
                    style={{
                      borderColor: active ? colors.primary : colors.secondary,
                      color: active ? colors.primary : colors.text,
                    }}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          </Row>
        </>
      ) : (
        <>
          <Row label="Padding top">{textInput("paddingTop", "e.g. 2rem")}</Row>
          <Row label="Padding bottom">
            {textInput("paddingBottom", "e.g. 4rem")}
          </Row>
        </>
      )}

      <Row label="Extra classes">
        {textInput("customClasses", "e.g. rounded-xl shadow-lg")}
      </Row>

      {hasAny && (
        <button
          onClick={clear}
          className="mt-2 w-full py-1 text-xs rounded border hover:opacity-80"
          style={{ borderColor: "#ef4444", color: "#ef4444" }}
        >
          Clear all style overrides
        </button>
      )}
    </div>
  );

  if (!collapsible) {
    return body;
  }

  // ── collapsible wrapper (matching the page-editor side panel style) ─────────
  return (
    <div className="border-t" style={{ borderColor: colors.secondary }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold hover:opacity-80"
        style={{ color: colors.text }}
      >
        <div className="flex items-center gap-2">
          <span>[S] {label}</span>
          {hasAny && (
            <span
              className="px-1.5 py-0.5 rounded text-xs"
              style={{
                backgroundColor: colors.primary + "22",
                color: colors.primary,
              }}
            >
              overrides active
            </span>
          )}
        </div>
        <span style={{ color: colors.textSecondary }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && <div className="px-4 pb-4">{body}</div>}
    </div>
  );
}
