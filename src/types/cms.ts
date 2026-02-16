// CMS Type Definitions for Page Management System

// =============================================================================
// Base Types
// =============================================================================

export type PageStatus = 'draft' | 'published';

export type SectionType = 'hero' | 'text' | 'cardGrid' | 'cta';

// =============================================================================
// Section Type Definitions
// =============================================================================

export interface BaseSection {
  id: string;
  type: SectionType;
  order: number;
}

export interface HeroSection extends BaseSection {
  type: 'hero';
  title: string;
  subtitle?: string;
  backgroundImage?: string;
  ctaText?: string;
  ctaLink?: string;
}

export interface TextSection extends BaseSection {
  type: 'text';
  heading?: string;
  content: string;
}

export interface Card {
  title: string;
  description: string;
  imageUrl?: string;
  link?: string;
}

export interface CardGridSection extends BaseSection {
  type: 'cardGrid';
  heading?: string;
  cards: Card[];
  columns: 2 | 3 | 4;
}

export interface CtaSection extends BaseSection {
  type: 'cta';
  heading: string;
  buttonText: string;
  buttonLink: string;
  style: 'primary' | 'secondary';
}

export type Section = HeroSection | TextSection | CardGridSection | CtaSection;

// =============================================================================
// Page Content
// =============================================================================

export interface PageContent {
  slug: string;
  title: string;
  metaDescription?: string;
  status: PageStatus;
  isLandingPage?: boolean;
  sections: Section[];
  createdAt?: string;
  updatedAt?: string;
}

// =============================================================================
// GitHub API Types
// =============================================================================

export interface GitHubFileMetadata {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: 'file';
}

export interface GitHubDirectoryResponse {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
}

export interface GitHubFileContentResponse {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: 'file';
  content: string; // Base64 encoded
  encoding: 'base64';
}

// =============================================================================
// Editor State Management
// =============================================================================

export interface EditorState {
  mode: 'edit' | 'create';
  originalSlug?: string; // For tracking slug changes
  hasUnsavedChanges: boolean;
  errors: Record<string, string>;
}

export interface PageEditorState {
  page: PageContent;
  editor: EditorState;
}

// =============================================================================
// Draft Management
// =============================================================================

export interface DraftMetadata {
  slug: string;
  timestamp: number;
  version: number;
}

export interface Draft {
  metadata: DraftMetadata;
  content: PageContent;
}

// =============================================================================
// UI Component Props
// =============================================================================

export interface SectionEditorProps {
  section: Section;
  onChange: (section: Section) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export interface PageListItemProps {
  page: PageContent;
  hasDraft: boolean;
  onEdit: (slug: string) => void;
  onDelete: (slug: string) => void;
}

// =============================================================================
// Validation
// =============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// =============================================================================
// Helper Types for Forms
// =============================================================================

export type PartialSection<T extends Section> = Partial<Omit<T, 'id' | 'type' | 'order'>> & {
  type: T['type'];
};
