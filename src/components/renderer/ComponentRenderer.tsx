/**
 * ComponentRenderer.tsx
 * Recursively renders a LayoutNode tree using componentMap.
 * Used in: admin canvas live preview AND Astro [..slug].astro pages.
 */
import type { LayoutNode } from "../../../cms/editor/layoutSchema";
import { componentMap } from "./componentMap";

interface Props {
  node: LayoutNode;
  /** Optional extra wrapper applied in the editor for selection highlighting */
  wrapNode?: (node: LayoutNode, element: React.ReactNode) => React.ReactNode;
}

export function ComponentRenderer({ node, wrapNode }: Props) {
  const Renderer = componentMap[node.componentId];

  if (!Renderer) {
    return (
      <div
        style={{
          padding: 8,
          border: "1px dashed red",
          color: "red",
          fontSize: 12,
        }}
      >
        Unknown component: <strong>{node.componentId}</strong>
      </div>
    );
  }

  /** Recursively renders children in a named slot */
  function renderSlot(slotName: string): React.ReactNode {
    const children = node.slots[slotName] ?? [];
    return children.map((child) => (
      <ComponentRenderer key={child.id} node={child} wrapNode={wrapNode} />
    ));
  }

  const element = <Renderer node={node} renderSlot={renderSlot} />;

  return wrapNode ? <>{wrapNode(node, element)}</> : element;
}

/** Renders a full page layout (array of top-level nodes) */
export function PageRenderer({
  layout,
  wrapNode,
}: {
  layout: LayoutNode[];
  wrapNode?: (node: LayoutNode, element: React.ReactNode) => React.ReactNode;
}) {
  return (
    <>
      {layout.map((node) => (
        <ComponentRenderer key={node.id} node={node} wrapNode={wrapNode} />
      ))}
    </>
  );
}
