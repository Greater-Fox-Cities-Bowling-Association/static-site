/**
 * ComponentBuilder.tsx
 * Allows users to compose a new component from primitives,
 * name it, and save it as JSON metadata to cms/components/metadata/.
 */
import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import SaveIcon from "@mui/icons-material/Save";
import { EditorProvider, useEditor } from "../editor/EditorContext";
import { ComponentPalette } from "../editor/ComponentPalette";
import { EditorCanvas } from "../editor/EditorCanvas";
import { PropEditor } from "../editor/PropEditor";
import { createNode } from "../../../../cms/editor/layoutSchema";
import { commitFiles } from "../../../../cms/github/github";
import type {
  ComponentMeta,
  PageContent,
} from "../../../../cms/editor/layoutSchema";

const metadataModules = import.meta.glob<{ default: ComponentMeta }>(
  "/cms/components/metadata/*.json",
  { eager: true },
);
const allComponentMeta: ComponentMeta[] = Object.values(metadataModules)
  .map((m) => m.default as ComponentMeta)
  .filter(Boolean);

// Minimal stub page so the canvas works
const EMPTY_PAGE: PageContent = {
  id: "__builder__",
  slug: "__builder__",
  title: "Component Builder",
  description: "",
  layout: [],
};

const REPO = import.meta.env.PUBLIC_GITHUB_REPO as string;
const BRANCH = import.meta.env.PUBLIC_GITHUB_BRANCH as string;

function BuilderInner({ token }: { token: string | null }) {
  const { state, dispatch } = useEditor();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"composite" | "user-defined">(
    "user-defined",
  );
  const [icon, setIcon] = useState("widgets");
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active } = event;
    const source = active.data.current as
      | { source: string; componentId?: string }
      | undefined;
    if (source?.source === "palette" && source.componentId) {
      const meta = allComponentMeta.find((m) => m.id === source.componentId);
      if (!meta) return;
      const node = createNode(meta);
      dispatch({
        type: "ADD_NODE",
        payload: { node, parentId: null, slotName: "children" },
      });
    }
  }

  async function handleSave() {
    if (!state.page || !name.trim() || !token) return;

    const id = name.trim().toLowerCase().replace(/\s+/g, "-");
    const metadata: ComponentMeta = {
      id,
      name: name.trim(),
      category,
      props: {},
      slots: { children: { allowedTypes: ["*"], max: 100 } },
      events: {},
      editor: { icon, previewHeight: 200, draggable: true, resizable: true },
    };

    setSaving(true);
    try {
      await commitFiles(token, REPO, BRANCH, [
        {
          path: `cms/components/metadata/${id}.json`,
          content: JSON.stringify(metadata, null, 2),
          message: `create: add component ${id}`,
        },
      ]);
      setSnack(`Component "${name}" saved! Refresh to use it in the palette.`);
    } catch (err) {
      setSnack(`Error: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Builder toolbar */}
        <Box
          component="div"
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Toolbar variant="dense" sx={{ gap: 2 }}>
            <TextField
              size="small"
              label="Component name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ width: 200 }}
            />
            <TextField
              select
              size="small"
              label="Category"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as "composite" | "user-defined")
              }
              sx={{ width: 160 }}
            >
              <MenuItem value="composite">Composite</MenuItem>
              <MenuItem value="user-defined">User Defined</MenuItem>
            </TextField>
            <TextField
              size="small"
              label="Icon (Material)"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              sx={{ width: 160 }}
            />
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={
                !name.trim() || !state.page?.layout.length || saving || !token
              }
              onClick={handleSave}
            >
              Save Component
            </Button>
          </Toolbar>
        </Box>

        {!token && (
          <Alert severity="warning" sx={{ m: 2 }}>
            No GitHub token — save will fail. Log in first.
          </Alert>
        )}

        <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <ComponentPalette components={allComponentMeta} />
          <EditorCanvas />
          <PropEditor />
        </Box>
      </Box>

      <Snackbar
        open={!!snack}
        autoHideDuration={5000}
        onClose={() => setSnack("")}
        message={snack}
      />
    </DndContext>
  );
}

interface Props {
  token: string | null;
}

export function ComponentBuilder({ token }: Props) {
  return (
    <EditorProvider>
      <EditorLoaderWrapper token={token} />
    </EditorProvider>
  );
}

function EditorLoaderWrapper({ token }: Props) {
  const { dispatch } = useEditor();
  useState(() => {
    dispatch({ type: "LOAD_PAGE", payload: EMPTY_PAGE });
  });
  return <BuilderInner token={token} />;
}
