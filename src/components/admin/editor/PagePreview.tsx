/**
 * PagePreview.tsx
 * Preview tab — full-width, chrome-free render of the current page layout.
 * Uses ComponentRenderer without editor wrappers so it looks like the live site.
 */
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useEditor } from "./EditorContext";
import { ComponentRenderer } from "../../renderer/ComponentRenderer";

export function PagePreview() {
  const { state } = useEditor();
  const nodes = state.page?.layout ?? [];
  const slug = state.page?.slug ?? "";

  if (nodes.length === 0) {
    return (
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "text.disabled",
          p: 4,
        }}
      >
        <Typography variant="body1">
          No components on this page yet. Add some in the{" "}
          <strong>Layout</strong> tab.
        </Typography>
      </Box>
    );
  }

  const previewUrl = slug === "home" || slug === "index" ? "/" : `/${slug}`;

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Preview bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 0.75,
          bgcolor: "grey.100",
          borderBottom: 1,
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            flex: 1,
            px: 1.5,
            py: 0.5,
            bgcolor: "background.paper",
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            fontSize: 12,
            color: "text.secondary",
            fontFamily: "monospace",
          }}
        >
          {previewUrl}
        </Box>
        <Button
          size="small"
          endIcon={<OpenInNewIcon fontSize="small" />}
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open live
        </Button>
      </Box>

      {/* Rendered page */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          bgcolor: "background.default",
        }}
      >
        {nodes.map((node) => (
          <ComponentRenderer key={node.id} node={node} />
        ))}
      </Box>
    </Box>
  );
}
