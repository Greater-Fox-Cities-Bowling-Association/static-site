import type { Theme } from '../types/cms';

/**
 * Load the active theme from local files
 * Always checks for the theme with isActive=true to ensure page refreshes load the correct theme
 */
export async function loadActiveTheme(): Promise<Theme | null> {
  try {
    let loadedTheme: Theme | null = null;

    // On the server side (Astro components), we need to read files directly
    // because import.meta.glob caches at build time and doesn't reflect disk changes
    if (typeof process !== 'undefined' && process.versions?.node) {
      console.log('📖 Loading themes from filesystem (server)');
      const fs = await import('fs');
      const path = await import('path');
      const themesDir = path.resolve(process.cwd(), 'src/content/themes');
      
      try {
        const files = fs.readdirSync(themesDir).filter(f => f.endsWith('.json'));
        
        // First, look for an active theme
        for (const file of files) {
          const filePath = path.join(themesDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const theme = JSON.parse(content) as Theme;
          
          if (theme.isActive) {
            console.log('✅ Active theme loaded from disk:', theme.id);
            loadedTheme = theme;
            break;
          }
        }
        
        // If no active theme, find and return default
        if (!loadedTheme) {
          const defaultPath = path.join(themesDir, 'default.json');
          if (fs.existsSync(defaultPath)) {
            const content = fs.readFileSync(defaultPath, 'utf-8');
            const theme = JSON.parse(content) as Theme;
            console.log('✅ Default theme loaded from disk:', theme.id);
            loadedTheme = theme;
          }
        }
      } catch (error) {
        console.error('Error reading themes from filesystem:', error);
      }
    } else {
      // Client-side - server has already set the variables, but we can update them
      console.log('📦 Client-side theme update skipped - using server-rendered theme');
      // On client-side, the theme is already set by server-side rendering
      // We don't need to reload it unless we're implementing live theme switching
      return null;
    }

    if (!loadedTheme) {
      console.warn('No themes available');
    }

    return loadedTheme;
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
}

/**
 * Load and apply the active theme
 */
export async function initializeTheme(): Promise<Theme | null> {
  try {
    console.log('🎨 Initializing theme system...');
    const theme = await loadActiveTheme();
    
    if (theme) {
      console.log(`✅ Applying theme: ${theme.name}`);
      applyThemeToCssVariables(theme);
      console.log('✅ Theme CSS variables applied');
    } else {
      console.warn('⚠️ No theme loaded, using default CSS values');
    }
    
    return theme;
  } catch (error) {
    console.error('❌ Error initializing theme:', error);
    return null;
  }
}
