/**
 * componentMap.ts
 * Maps every componentId from the registry to a React render function.
 * Both the visual editor canvas and the Astro static renderer use this.
 */
import type { ComponentType, CSSProperties } from "react";
import type { LayoutNode } from "../../../cms/editor/layoutSchema";

// MUI primitives
import MuiBox from "@mui/material/Box";
import MuiStack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import MuiTypography from "@mui/material/Typography";
import MuiButton from "@mui/material/Button";
import MuiDivider from "@mui/material/Divider";
import MuiPaper from "@mui/material/Paper";

// Composite renderer components (defined below in composites/)
import { NavbarRenderer } from "./composites/NavbarRenderer";
import { FooterRenderer } from "./composites/FooterRenderer";
import { FeatureListRenderer } from "./composites/FeatureListRenderer";
import { PricingTableRenderer } from "./composites/PricingTableRenderer";
import { HeroRenderer } from "./composites/HeroRenderer";
import { CardRenderer } from "./composites/CardRenderer";

/**
 * Each entry is a function that receives the node's props and a `renderSlot`
 * helper (for composites that render their own slots) and returns a JSX element.
 *
 * Simple primitives just forward their props straight to the MUI component.
 * Composites get a typed wrapper so they can use slot children.
 */
export type ComponentRenderer = ComponentType<{
  node: LayoutNode;
  renderSlot: (slotName: string) => React.ReactNode;
}>;

// ─── Primitive adapters ────────────────────────────────────────────────────

function BoxRenderer({
  node,
  renderSlot,
}: {
  node: LayoutNode;
  renderSlot: (s: string) => React.ReactNode;
}) {
  const {
    padding,
    margin,
    backgroundColor,
    borderRadius,
    display,
    width,
    height,
  } = node.props as Record<string, unknown>;
  return (
    <MuiBox
      sx={{
        p: padding as number | undefined,
        m: margin as number | undefined,
        bgcolor: backgroundColor as string | undefined,
        borderRadius: borderRadius as string | undefined,
        display: display as string | undefined,
        width: width as string | undefined,
        height: height as string | undefined,
      }}
    >
      {renderSlot("children")}
    </MuiBox>
  );
}

function StackRenderer({
  node,
  renderSlot,
}: {
  node: LayoutNode;
  renderSlot: (s: string) => React.ReactNode;
}) {
  const { direction, spacing, alignItems, justifyContent } =
    node.props as Record<string, unknown>;
  return (
    <MuiStack
      direction={
        (direction as "row" | "column" | "row-reverse" | "column-reverse") ??
        "column"
      }
      spacing={(spacing as number) ?? 2}
      alignItems={alignItems as string | undefined}
      justifyContent={justifyContent as string | undefined}
    >
      {renderSlot("children")}
    </MuiStack>
  );
}

function GridRenderer({
  node,
  renderSlot,
}: {
  node: LayoutNode;
  renderSlot: (s: string) => React.ReactNode;
}) {
  const { spacing } = node.props as Record<string, unknown>;
  return (
    <Grid container spacing={(spacing as number) ?? 2}>
      {renderSlot("children")}
    </Grid>
  );
}

function TypographyRenderer({
  node,
}: {
  node: LayoutNode;
  renderSlot: (s: string) => React.ReactNode;
}) {
  const { variant, text, align, color, gutterBottom } = node.props as Record<
    string,
    unknown
  >;
  return (
    <MuiTypography
      variant={
        (variant as
          | "h1"
          | "h2"
          | "h3"
          | "h4"
          | "h5"
          | "h6"
          | "body1"
          | "body2"
          | "caption") ?? "body1"
      }
      align={(align as "left" | "center" | "right" | "justify") ?? "left"}
      color={(color as string) ?? "text.primary"}
      gutterBottom={(gutterBottom as boolean) ?? false}
    >
      {(text as string) ?? "Text content"}
    </MuiTypography>
  );
}

function ButtonRenderer({
  node,
}: {
  node: LayoutNode;
  renderSlot: (s: string) => React.ReactNode;
}) {
  const { label, variant, color, size, href, disabled, fullWidth } =
    node.props as Record<string, unknown>;
  return (
    <MuiButton
      variant={(variant as "contained" | "outlined" | "text") ?? "contained"}
      color={
        (color as
          | "primary"
          | "secondary"
          | "error"
          | "warning"
          | "info"
          | "success") ?? "primary"
      }
      size={(size as "small" | "medium" | "large") ?? "medium"}
      href={(href as string) || undefined}
      disabled={(disabled as boolean) ?? false}
      fullWidth={(fullWidth as boolean) ?? false}
    >
      {(label as string) ?? "Button"}
    </MuiButton>
  );
}

function DividerRenderer({
  node,
}: {
  node: LayoutNode;
  renderSlot: (s: string) => React.ReactNode;
}) {
  const { orientation, variant } = node.props as Record<string, unknown>;
  return (
    <MuiDivider
      orientation={(orientation as "horizontal" | "vertical") ?? "horizontal"}
      variant={(variant as "fullWidth" | "inset" | "middle") ?? "fullWidth"}
    />
  );
}

function PaperRenderer({
  node,
  renderSlot,
}: {
  node: LayoutNode;
  renderSlot: (s: string) => React.ReactNode;
}) {
  const { elevation, variant, padding, borderRadius } = node.props as Record<
    string,
    unknown
  >;
  return (
    <MuiPaper
      elevation={(elevation as number) ?? 1}
      variant={(variant as "elevation" | "outlined") ?? "elevation"}
      sx={{
        p: padding as number | undefined,
        borderRadius: borderRadius as string | undefined,
      }}
    >
      {renderSlot("children")}
    </MuiPaper>
  );
}

function ImageRenderer({
  node,
}: {
  node: LayoutNode;
  renderSlot: (s: string) => React.ReactNode;
}) {
  const { src, alt, width, height, objectFit, borderRadius } =
    node.props as Record<string, unknown>;
  return (
    <MuiBox
      component="img"
      src={(src as string) || "https://placehold.co/600x400"}
      alt={(alt as string) ?? "Image"}
      sx={{
        width: (width as string) ?? "100%",
        height: (height as string) ?? "auto",
        objectFit: (objectFit as CSSProperties["objectFit"]) ?? "cover",
        borderRadius: borderRadius as string | undefined,
        display: "block",
      }}
    />
  );
}

function IconRenderer({
  node,
}: {
  node: LayoutNode;
  renderSlot: (s: string) => React.ReactNode;
}) {
  const { name, fontSize, color } = node.props as Record<string, unknown>;
  // Dynamic icon loading — render as text fallback in static context
  return (
    <MuiBox
      component="span"
      className="material-icons"
      sx={{
        fontSize: fontSize as string | undefined,
        color: color as string | undefined,
        fontFamily: "Material Icons",
      }}
    >
      {(name as string) ?? "star"}
    </MuiBox>
  );
}

function SpacerRenderer({
  node,
}: {
  node: LayoutNode;
  renderSlot: (s: string) => React.ReactNode;
}) {
  const { size, axis } = node.props as Record<string, unknown>;
  const n = (size as number) ?? 4;
  const isH = axis === "horizontal";
  return (
    <MuiBox
      sx={{ width: isH ? n * 8 : undefined, height: isH ? undefined : n * 8 }}
    />
  );
}

// ─── Registry ─────────────────────────────────────────────────────────────

export const componentMap: Record<string, ComponentRenderer> = {
  box: BoxRenderer as ComponentRenderer,
  stack: StackRenderer as ComponentRenderer,
  grid: GridRenderer as ComponentRenderer,
  typography: TypographyRenderer as ComponentRenderer,
  button: ButtonRenderer as ComponentRenderer,
  divider: DividerRenderer as ComponentRenderer,
  paper: PaperRenderer as ComponentRenderer,
  image: ImageRenderer as ComponentRenderer,
  icon: IconRenderer as ComponentRenderer,
  spacer: SpacerRenderer as ComponentRenderer,
  // Composites
  card: CardRenderer as ComponentRenderer,
  hero: HeroRenderer as ComponentRenderer,
  navbar: NavbarRenderer as ComponentRenderer,
  footer: FooterRenderer as ComponentRenderer,
  featureList: FeatureListRenderer as ComponentRenderer,
  pricingTable: PricingTableRenderer as ComponentRenderer,
};
