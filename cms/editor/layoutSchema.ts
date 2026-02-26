/**
 * layoutSchema.ts
 * Core TypeScript types for the JSON-based layout system.
 * Used by: visual editor, ComponentRenderer, Astro static pages.
 */

/** A single instantiated component on a page canvas */
export interface LayoutNode {
  /** Unique instance id — nanoid() at creation time */
  id: string;
  /** Matches a componentId in the registry, e.g. "button", "card" */
  componentId: string;
  /** Resolved prop values keyed by prop name */
  props: Record<string, unknown>;
  /** Named slots, each holding an ordered array of child LayoutNodes */
  slots: Record<string, LayoutNode[]>;
}

/** A full page stored as JSON in src/content/pages/{slug}.json */
export interface PageContent {
  id: string;
  slug: string;
  title: string;
  description: string;
  /** Open Graph image URL */
  ogImage?: string;
  /** Top-level layout nodes on the page canvas */
  layout: LayoutNode[];
}

/** Minimal shape expected from the component registry metadata */
export interface ComponentMeta {
  id: string;
  name: string;
  category: 'primitive' | 'composite' | 'user-defined';
  props: Record<string, PropMeta>;
  slots: Record<string, SlotMeta>;
  events: Record<string, EventMeta>;
  editor: {
    icon: string;
    previewHeight: number;
    draggable: boolean;
    resizable: boolean;
  };
}

export interface PropMeta {
  type: 'string' | 'boolean' | 'number' | 'spacing' | 'radius' | 'shadow' | 'color';
  default: unknown;
  options?: string[];
}

export interface SlotMeta {
  allowedTypes: string[];
  max: number;
}

export interface EventMeta {
  type: 'action';
  default: unknown;
}

/** An event handler configuration attached to a node */
export interface EventHandler {
  type: 'navigate' | 'none';
  href?: string;
}

/** Creates a new LayoutNode with defaults from component metadata */
export function createNode(meta: ComponentMeta): LayoutNode {
  const props: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(meta.props)) {
    props[key] = def.default;
  }
  const slots: Record<string, LayoutNode[]> = {};
  for (const key of Object.keys(meta.slots)) {
    slots[key] = [];
  }
  return {
    id: crypto.randomUUID(),
    componentId: meta.id,
    props,
    slots,
  };
}
