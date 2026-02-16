import { useEffect, useState } from 'react';
import type { Theme } from '../types/cms';

/**
 * Hook to use theme colors and fonts in React components
 * Returns CSS variable values that update when theme changes
 */
export function useTheme() {
  const [theme, setTheme] = useState<Partial<Theme> | null>(null);

  useEffect(() => {
    // Load theme from sessionStorage or root CSS variables
    const loadTheme = () => {
      try {
        // Try to get from sessionStorage first
        if (typeof sessionStorage !== 'undefined') {
          const cached = sessionStorage.getItem('active-theme');
          if (cached) {
            setTheme(JSON.parse(cached));
            return;
          }
        }

        // Fallback: read from computed CSS variables
        const root = document.documentElement;
        const style = getComputedStyle(root);

        const themeData = {
          colors: {
            primary: style.getPropertyValue('--color-primary').trim(),
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
        };

        setTheme(themeData);
      } catch (error) {
        console.warn('Failed to load theme:', error);
      }
    };

    loadTheme();

    // Listen for theme changes via custom event
    const handleThemeChange = () => {
      loadTheme();
    };

    window.addEventListener('theme-change', handleThemeChange);

    // Also check periodically for CSS variable changes
    const interval = setInterval(() => {
      loadTheme();
    }, 1000);

    return () => {
      window.removeEventListener('theme-change', handleThemeChange);
      clearInterval(interval);
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
