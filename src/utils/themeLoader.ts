import type { Theme } from '../types/cms';

/**
 * Load the active theme from cache or local files
 */
export async function loadActiveTheme(): Promise<Theme | null> {
  try {
    // First check if theme is cached in session storage
    const cachedTheme = sessionStorage.getItem('active-theme');
    if (cachedTheme) {
      return JSON.parse(cachedTheme);
    }

    // Import all themes dynamically
    const themeModules = import.meta.glob('/src/content/themes/*.json', { eager: true });
    
    for (const [, module] of Object.entries(themeModules)) {
      const theme = (module as any).default;
      if (theme.isActive) {
        // Cache the theme
        sessionStorage.setItem('active-theme', JSON.stringify(theme));
        return theme;
      }
    }

    // If no active theme found, use default
    const defaultPath = '/src/content/themes/default.json';
    const defaultModule = themeModules[defaultPath] as any;
    if (defaultModule) {
      const defaultTheme = defaultModule.default;
      sessionStorage.setItem('active-theme', JSON.stringify(defaultTheme));
      return defaultTheme;
    }

    return null;
  } catch (error) {
    console.error('Error loading active theme:', error);
    return null;
  }
}

/**
 * Apply theme colors as CSS custom properties (variables)
 */
export function applyThemeToCssVariables(theme: Theme): void {
  const root = document.documentElement;
  
  // Set color variables
  root.style.setProperty('--color-primary', theme.colors.primary);
  root.style.setProperty('--color-secondary', theme.colors.secondary);
  root.style.setProperty('--color-background', theme.colors.background);
  root.style.setProperty('--color-text', theme.colors.text);
  root.style.setProperty('--color-text-secondary', theme.colors.textSecondary || '#6b7280');
  root.style.setProperty('--color-accent', theme.colors.accent || '#3b82f6');
  
  // Set font variables
  root.style.setProperty('--font-heading', theme.fonts.heading);
  root.style.setProperty('--font-body', theme.fonts.body);
  
  // Update body background and text color
  document.body.style.backgroundColor = theme.colors.background;
  document.body.style.color = theme.colors.text;
}

/**
 * Load and apply the active theme
 */
export async function initializeTheme(): Promise<Theme | null> {
  const theme = await loadActiveTheme();
  
  if (theme) {
    applyThemeToCssVariables(theme);
  }
  
  return theme;
}

/**
 * Create a style element with theme-specific CSS
 */
export function createThemeStyleSheet(theme: Theme): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --color-primary: ${theme.colors.primary};
      --color-secondary: ${theme.colors.secondary};
      --color-background: ${theme.colors.background};
      --color-text: ${theme.colors.text};
      --color-text-secondary: ${theme.colors.textSecondary || '#6b7280'};
      --color-accent: ${theme.colors.accent || '#3b82f6'};
      --font-heading: ${theme.fonts.heading};
      --font-body: ${theme.fonts.body};
    }
    
    body {
      background-color: ${theme.colors.background};
      color: ${theme.colors.text};
    }
    
    h1, h2, h3, h4, h5, h6 {
      font-family: ${theme.fonts.heading};
      color: ${theme.colors.text};
    }
    
    body {
      font-family: ${theme.fonts.body};
    }
    
    a {
      color: ${theme.colors.primary};
    }
    
    a:hover {
      color: ${theme.colors.accent};
    }
    
    button, [role="button"] {
      background-color: ${theme.colors.primary};
      color: ${theme.colors.background};
    }
    
    button:hover, [role="button"]:hover {
      background-color: ${theme.colors.secondary};
    }
  `;
  
  return style;
}
