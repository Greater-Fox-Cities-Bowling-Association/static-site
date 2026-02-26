/**
 * EventEditor.tsx
 * Sub-panel for configuring event handlers on a selected node.
 * Currently supports: none, navigate (href).
 */
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useUpdateProps } from "./EditorContext";
import type {
  ComponentMeta,
  EventHandler,
  LayoutNode,
} from "../../../../cms/editor/layoutSchema";

interface Props {
  node: LayoutNode;
  meta: ComponentMeta;
}

export function EventEditor({ node, meta }: Props) {
  const updateProps = useUpdateProps(node.id);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="overline">Events</Typography>
      {Object.keys(meta.events).map((eventName) => {
        const handler = (node.props[`__event_${eventName}`] ?? {
          type: "none",
        }) as EventHandler;

        return (
          <Box key={eventName} sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textTransform: "capitalize" }}
            >
              {eventName}
            </Typography>

            <TextField
              select
              size="small"
              label="Action"
              value={handler.type ?? "none"}
              onChange={(e) =>
                updateProps({
                  [`__event_${eventName}`]: {
                    type: e.target.value,
                    href: handler.href,
                  },
                })
              }
              fullWidth
              sx={{ mt: 0.5, mb: 1 }}
            >
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="navigate">Navigate to URL</MenuItem>
            </TextField>

            {handler.type === "navigate" && (
              <TextField
                size="small"
                label="URL"
                value={handler.href ?? ""}
                onChange={(e) =>
                  updateProps({
                    [`__event_${eventName}`]: {
                      ...handler,
                      href: e.target.value,
                    },
                  })
                }
                fullWidth
                placeholder="https://example.com or /page"
                inputProps={{ style: { fontSize: 12 } }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}
