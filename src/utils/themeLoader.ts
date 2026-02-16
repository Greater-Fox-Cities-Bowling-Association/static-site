import type { Theme } from '../types/cms';

/**
 * Load the active theme from cache or local files
 * @param forceRefresh - Skip cache and reload from source
 */
export async function loadActiveTheme(forceRefresh: boolean = false): Promise<Theme | null> {
  try {
    // Check sessionStorage cache (unless forceRefresh is true)
    if (!forceRefresh && typeof sessionStorage !== 'undefined') {
      const cachedTheme = sessionStorage.getItem('active-theme');
      if (cachedTheme) {
        try {
          return JSON.parse(cachedTheme);
        } catch (e) {
          console.warn('Failed to parse cached theme, reloading from source');
        }
      }
    }

    // Import all themes dynamically
    if (typeof import.meta === 'undefined' || !import.meta.glob) {
      console.warn('import.meta.glob not available, using fallback');
      return null;
    }

    const themeModules = import.meta.glob('/src/content/themes/*.json', { eager: true });
    
    for (const [, module] of Object.entries(themeModules)) {
      const theme = (module as any).default;
      if (theme && theme.isActive) {
        // Cache the theme
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('active-theme', JSON.stringify(theme));
        }
        console.log('✅ Active theme loaded:', theme.id);
        return theme;
      }
    }

    // If no active theme found, use default
    const defaultPath = '/src/content/themes/default.json';
    const defaultModule = themeModules[defaultPath] as any;
    if (defaultModule) {
      const defaultTheme = defaultModule.default;
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('active-theme', JSON.stringify(defaultTheme));
      }
      console.log('✅ Default theme loaded (no active theme found):', defaultTheme.id);
      return defaultTheme;
    }

    console.warn('No themes found at all');
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
 * @param forceRefresh - Skip cache and reload from source
 */
export async function initializeTheme(forceRefresh: boolean = false): Promise<Theme | null> {
  try {
    console.log('🎨 Initializing theme system...');
    const theme = await loadActiveTheme(forceRefresh);
    
    if (theme) {
      console.log(`✅ Applying theme: ${theme.name}`);
      applyThemeToCssVariables(theme);
      console.log('✅ Theme CSS variables applied');
    } else {
      console.warn('⚠️ No theme loaded, using browser defaults');
    }
    
    return theme;
  } catch (error) {
    console.error('❌ Error initializing theme:', error);
    return null;
  }
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
