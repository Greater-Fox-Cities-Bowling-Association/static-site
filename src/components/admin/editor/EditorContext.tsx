/**
 * EditorContext.tsx
 * React context + useReducer that holds the live page being edited.
 * All editor components read and mutate state through this context.
 */
import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import type {
  LayoutNode,
  PageContent,
} from "../../../../cms/editor/layoutSchema";

// ─── State ────────────────────────────────────────────────────────────────

export interface EditorState {
  page: PageContent | null;
  selectedNodeId: string | null;
  isDirty: boolean;
  /** Undo stack — previous page snapshots */
  history: PageContent[];
  /** Redo stack */
  future: PageContent[];
}

const initialState: EditorState = {
  page: null,
  selectedNodeId: null,
  isDirty: false,
  history: [],
  future: [],
};

// ─── Actions ──────────────────────────────────────────────────────────────

export type EditorAction =
  | { type: "LOAD_PAGE"; payload: PageContent }
  | { type: "SELECT_NODE"; payload: string | null }
  | {
      type: "UPDATE_PROPS";
      payload: { nodeId: string; props: Record<string, unknown> };
    }
  | {
      type: "ADD_NODE";
      payload: {
        node: LayoutNode;
        parentId: string | null;
        slotName: string;
        index?: number;
      };
    }
  | { type: "REMOVE_NODE"; payload: { nodeId: string } }
  | {
      type: "BULK_ADD_NODES";
      payload: {
        nodes: LayoutNode[];
        parentId: string | null;
        slotName: string;
      };
    }
  | {
      type: "MOVE_NODE";
      payload: {
        nodeId: string;
        toParentId: string | null;
        toSlot: string;
        toIndex: number;
      };
    }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "MARK_SAVED" };

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Deep-clone to avoid mutation bugs */
function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

/** Find a node anywhere in the tree; returns the node + its parent array */
function findNode(
  layout: LayoutNode[],
  id: string,
): { node: LayoutNode; siblings: LayoutNode[]; index: number } | null {
  for (let i = 0; i < layout.length; i++) {
    if (layout[i].id === id)
      return { node: layout[i], siblings: layout, index: i };
    for (const children of Object.values(layout[i].slots)) {
      const found = findNode(children, id);
      if (found) return found;
    }
  }
  return null;
}

/** Remove a node by id from the tree (mutates the passed layout) */
function removeNodeById(layout: LayoutNode[], id: string): boolean {
  for (let i = 0; i < layout.length; i++) {
    if (layout[i].id === id) {
      layout.splice(i, 1);
      return true;
    }
    for (const children of Object.values(layout[i].slots)) {
      if (removeNodeById(children, id)) return true;
    }
  }
  return false;
}

/** Find the slot array for a given parentId + slotName, or the top-level layout */
function findSlot(
  layout: LayoutNode[],
  parentId: string | null,
  slotName: string,
): LayoutNode[] | null {
  if (parentId === null) return layout;
  const result = findNode(layout, parentId);
  if (!result) return null;
  const slot = result.node.slots[slotName];
  if (!slot) result.node.slots[slotName] = [];
  return result.node.slots[slotName];
}

// ─── Reducer ──────────────────────────────────────────────────────────────

function pushHistory(state: EditorState): Partial<EditorState> {
  if (!state.page) return {};
  return {
    history: [...state.history.slice(-49), clone(state.page)],
    future: [],
  };
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "LOAD_PAGE":
      return { ...initialState, page: clone(action.payload) };

    case "SELECT_NODE":
      return { ...state, selectedNodeId: action.payload };

    case "UPDATE_PROPS": {
      if (!state.page) return state;
      const next = clone(state.page);
      const found = findNode(next.layout, action.payload.nodeId);
      if (!found) return state;
      found.node.props = { ...found.node.props, ...action.payload.props };
      return { ...state, ...pushHistory(state), page: next, isDirty: true };
    }

    case "ADD_NODE": {
      if (!state.page) return state;
      const next = clone(state.page);
      const slot = findSlot(
        next.layout,
        action.payload.parentId,
        action.payload.slotName,
      );
      if (!slot) return state;
      const idx = action.payload.index ?? slot.length;
      slot.splice(idx, 0, clone(action.payload.node));
      return {
        ...state,
        ...pushHistory(state),
        page: next,
        isDirty: true,
        selectedNodeId: action.payload.node.id,
      };
    }

    case "REMOVE_NODE": {
      if (!state.page) return state;
      const next = clone(state.page);
      removeNodeById(next.layout, action.payload.nodeId);
      return {
        ...state,
        ...pushHistory(state),
        page: next,
        isDirty: true,
        selectedNodeId: null,
      };
    }

    case "BULK_ADD_NODES": {
      if (!state.page) return state;
      const next = clone(state.page);
      const slot = findSlot(
        next.layout,
        action.payload.parentId,
        action.payload.slotName,
      );
      if (!slot) return state;
      action.payload.nodes.forEach((n) => slot.push(clone(n)));
      return {
        ...state,
        ...pushHistory(state),
        page: next,
        isDirty: true,
      };
    }

    case "MOVE_NODE": {
      if (!state.page) return state;
      const next = clone(state.page);
      const found = findNode(next.layout, action.payload.nodeId);
      if (!found) return state;
      const nodeCopy = clone(found.node);
      removeNodeById(next.layout, action.payload.nodeId);
      const slot = findSlot(
        next.layout,
        action.payload.toParentId,
        action.payload.toSlot,
      );
      if (!slot) return state;
      slot.splice(action.payload.toIndex, 0, nodeCopy);
      return { ...state, ...pushHistory(state), page: next, isDirty: true };
    }

    case "UNDO": {
      if (!state.history.length || !state.page) return state;
      const prev = state.history[state.history.length - 1];
      return {
        ...state,
        page: prev,
        history: state.history.slice(0, -1),
        future: [clone(state.page), ...state.future.slice(0, 49)],
        isDirty: true,
      };
    }

    case "REDO": {
      if (!state.future.length || !state.page) return state;
      const next = state.future[0];
      return {
        ...state,
        page: next,
        history: [...state.history, clone(state.page)],
        future: state.future.slice(1),
        isDirty: true,
      };
    }

    case "MARK_SAVED":
      return { ...state, isDirty: false };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────

interface EditorContextValue {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  /** Convenience: get the currently selected LayoutNode (or null) */
  selectedNode: LayoutNode | null;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  const selectedNode =
    state.page && state.selectedNodeId
      ? (findNode(state.page.layout, state.selectedNodeId)?.node ?? null)
      : null;

  return (
    <EditorContext.Provider value={{ state, dispatch, selectedNode }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside <EditorProvider>");
  return ctx;
}

/** Convenience hook: returns a stable callback that dispatches UPDATE_PROPS */
export function useUpdateProps(nodeId: string) {
  const { dispatch } = useEditor();
  return useCallback(
    (props: Record<string, unknown>) =>
      dispatch({ type: "UPDATE_PROPS", payload: { nodeId, props } }),
    [dispatch, nodeId],
  );
}
