import type { PageContent, Draft, DraftMetadata } from '../types/cms';

const DRAFT_PREFIX = 'gfcba-draft-';
const DRAFT_VERSION = 1;

/**
 * Get the localStorage key for a draft
 */
function getDraftKey(slug: string): string {
  return `${DRAFT_PREFIX}${slug}`;
}

/**
 * Save a draft to localStorage
 */
export function saveDraft(page: PageContent): boolean {
  try {
    const draft: Draft = {
      metadata: {
        slug: page.slug,
        timestamp: Date.now(),
        version: DRAFT_VERSION,
      },
      content: page,
    };

    localStorage.setItem(getDraftKey(page.slug), JSON.stringify(draft));
    return true;
  } catch (error) {
    console.error('Failed to save draft:', error);
    return false;
  }
}

/**
 * Load a draft from localStorage
 */
export function loadDraft(slug: string): PageContent | null {
  try {
    const stored = localStorage.getItem(getDraftKey(slug));
    if (!stored) {
      return null;
    }

    const draft: Draft = JSON.parse(stored);
    
    // Version check - if format changes, discard old drafts
    if (draft.metadata.version !== DRAFT_VERSION) {
      deleteDraft(slug);
      return null;
    }

    return draft.content;
  } catch (error) {
    console.error('Failed to load draft:', error);
    return null;
  }
}

/**
 * Delete a draft from localStorage
 */
export function deleteDraft(slug: string): void {
  try {
    localStorage.removeItem(getDraftKey(slug));
  } catch (error) {
    console.error('Failed to delete draft:', error);
  }
}

/**
 * Check if a draft exists for a given slug
 */
export function hasDraft(slug: string): boolean {
  try {
    return localStorage.getItem(getDraftKey(slug)) !== null;
  } catch (error) {
    return false;
  }
}

/**
 * List all drafts
 */
export function listDrafts(): DraftMetadata[] {
  const drafts: DraftMetadata[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DRAFT_PREFIX)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const draft: Draft = JSON.parse(stored);
            drafts.push(draft.metadata);
          } catch {
            // Skip invalid drafts
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to list drafts:', error);
  }

  // Sort by timestamp, most recent first
  return drafts.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Clear all drafts (cleanup utility)
 */
export function clearAllDrafts(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DRAFT_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Failed to clear drafts:', error);
  }
}

/**
 * Auto-save draft with debouncing
 */
let autoSaveTimeout: NodeJS.Timeout | null = null;

export function autoSaveDraft(
  page: PageContent,
  delay: number = 3000
): Promise<boolean> {
  return new Promise((resolve) => {
    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    // Set new timeout
    autoSaveTimeout = setTimeout(() => {
      const success = saveDraft(page);
      resolve(success);
    }, delay);
  });
}

/**
 * Cancel pending auto-save
 */
export function cancelAutoSave(): void {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = null;
  }
}
