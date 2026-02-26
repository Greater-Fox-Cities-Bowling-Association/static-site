import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import CardHeader from "@mui/material/CardHeader";
import type { LayoutNode } from "../../../../cms/editor/layoutSchema";

export function CardRenderer({
  node,
  renderSlot,
}: {
  node: LayoutNode;
  renderSlot: (s: string) => React.ReactNode;
}) {
  const { padding, radius, shadow } = node.props as Record<string, unknown>;
  const headerChildren = renderSlot("header");
  const bodyChildren = renderSlot("body");
  const actionChildren = renderSlot("actions");
  return (
    <Card
      elevation={(shadow as number) ?? 1}
      sx={{
        borderRadius: (radius as string) ?? "md",
        p: (padding as number) ?? 0,
      }}
    >
      {headerChildren && <CardHeader title={<Box>{headerChildren}</Box>} />}
      {bodyChildren && <CardContent>{bodyChildren}</CardContent>}
      {actionChildren && <CardActions>{actionChildren}</CardActions>}
    </Card>
  );
}
