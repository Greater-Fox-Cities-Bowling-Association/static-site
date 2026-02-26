import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import type { LayoutNode } from "../../../../cms/editor/layoutSchema";

interface NavLink {
  label: string;
  href: string;
}

export function NavbarRenderer({
  node,
}: {
  node: LayoutNode;
  renderSlot: (s: string) => React.ReactNode;
}) {
  const { logo, links, sticky, colorScheme } = node.props as {
    logo?: string;
    links?: NavLink[];
    sticky?: boolean;
    colorScheme?: "primary" | "default" | "transparent";
  };
  return (
    <AppBar
      position={sticky ? "sticky" : "static"}
      color={
        colorScheme === "transparent"
          ? "transparent"
          : (colorScheme ?? "primary")
      }
      elevation={1}
    >
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {logo ?? "Site Name"}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {(links ?? []).map((link, i) => (
            <Button key={i} color="inherit" href={link.href}>
              {link.label}
            </Button>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
