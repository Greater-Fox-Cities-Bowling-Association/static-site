import { useEffect, useState } from 'react';
import type { Theme } from '../types/cms';

/**
 * Hook to use theme colors and fonts in React components
 * Returns CSS variable values that update when theme changes
 */
export function useTheme() {
  const [theme, setTheme] = useState<Partial<Theme> | null>(null);

  useEffect(() => {
    // Load theme from sessionStorage, content files, or root CSS variables
    const loadTheme = async () => {
      try {
        // 1. Try sessionStorage first (set by ThemeEditor on save)
        if (typeof sessionStorage !== 'undefined') {
          const cached = sessionStorage.getItem('active-theme');
          if (cached) {
            setTheme(JSON.parse(cached));
            return;
          }
        }

        // 2. Try loading directly from theme JSON files via import.meta.glob
        //    Works in the admin context where CSS vars are not injected
        try {
          const themeModules = import.meta.glob('/src/content/themes/*.json', { eager: true });
          for (const mod of Object.values(themeModules)) {
            const t = ((mod as any).default ?? mod) as Theme;
            if (t?.isActive) {
              setTheme(t);
              return;
            }
          }
          // No isActive flag — try default.json
          for (const [path, mod] of Object.entries(themeModules)) {
            if (path.endsWith('/default.json')) {
              setTheme(((mod as any).default ?? mod) as Theme);
              return;
            }
          }
        } catch {
          // glob may fail in some environments — fall through
        }

        // 3. Fallback: read from computed CSS variables (only when they are set)
        const root = document.documentElement;
        const style = getComputedStyle(root);
        const primary = style.getPropertyValue('--color-primary').trim();

        if (primary) {
          setTheme({
            colors: {
              primary,
              secondary: style.getPropertyValue('--color-secondary').trim(),
              background: style.getPropertyValue('--color-background').trim(),
              text: style.getPropertyValue('--color-text').trim(),
              textSecondary: style.getPropertyValue('--color-text-secondary').trim(),
              accent: style.getPropertyValue('--color-accent').trim(),
            },
            fonts: {
              heading: style.getPropertyValue('--font-heading').trim(),
              body: style.getPropertyValue('--font-body').trim(),
            },
          } as Partial<Theme>);
        }
        // else: theme stays null → hardcoded defaults used
      } catch (error) {
        console.warn('Failed to load theme:', error);
      }
    };

    loadTheme();

    // Listen for theme changes dispatched by ThemeEditor after save
    const handleThemeChange = () => { loadTheme(); };
    window.addEventListener('theme-change', handleThemeChange);

    return () => {
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  return {
    theme,
    colors: theme?.colors || {
      primary: '#2563eb',
      secondary: '#64748b',
      background: '#ffffff',
      text: '#1f2937',
      textSecondary: '#6b7280',
      accent: '#3b82f6',
    },
    fonts: theme?.fonts || {
      heading: 'Outfit, sans-serif',
      body: 'Inter, system-ui, sans-serif',
    },
    spacing: theme?.spacing ?? {},
  };
}

/**
 * Get theme color that adapts to light/dark themes
 * Returns contrasting text color for the given background
 */
export function getContrastColor(backgroundColor: string): string {
  // Remove # and convert to RGB
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return white text for dark backgrounds, black for light
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Create inline styles using theme colors
 * Useful for React components that need theme-aware styling
 */
export function useThemeStyles() {
  const { colors, fonts } = useTheme();

  return {
    button: {
      backgroundColor: colors.primary,
      color: getContrastColor(colors.primary),
      border: 'none',
      borderRadius: '0.5rem',
      padding: '0.5rem 1rem',
      fontWeight: 500,
      cursor: 'pointer',
      fontFamily: fonts.body,
    },
    buttonSecondary: {
      backgroundColor: colors.secondary,
      color: getContrastColor(colors.secondary),
      border: 'none',
      borderRadius: '0.5rem',
      padding: '0.5rem 1rem',
      fontWeight: 500,
      cursor: 'pointer',
      fontFamily: fonts.body,
    },
    card: {
      backgroundColor: colors.background,
      border: `1px solid ${colors.secondary}`,
      borderRadius: '0.5rem',
      padding: '1.5rem',
    },
    text: {
      color: colors.text,
      fontFamily: fonts.body,
    },
    heading: {
      color: colors.text,
      fontFamily: fonts.heading,
    },
    input: {
      backgroundColor: colors.background,
      color: colors.text,
      borderColor: colors.secondary,
      fontFamily: fonts.body,
    },
  };
}
