/**
 * PageContent.tsx
 * Client-side wrapper that provides MUI ThemeProvider and renders a page layout.
 * Used as `<PageContent client:only="react" />` in Astro pages.
 */
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { PageRenderer } from "./ComponentRenderer";
import type { LayoutNode } from "../../../cms/editor/layoutSchema";
import themeTokens from "../../theme.json";

// Build an MUI theme from the stored theme.json tokens
const muiTheme = createTheme({
  palette: {
    primary: {
      main: themeTokens.palette.primary.main,
      light: themeTokens.palette.primary.light,
      dark: themeTokens.palette.primary.dark,
      contrastText: themeTokens.palette.primary.contrastText,
    },
    secondary: {
      main: themeTokens.palette.secondary.main,
      light: themeTokens.palette.secondary.light,
      dark: themeTokens.palette.secondary.dark,
      contrastText: themeTokens.palette.secondary.contrastText,
    },
    background: {
      default: themeTokens.palette.background.default,
      paper: themeTokens.palette.background.paper,
    },
    text: {
      primary: themeTokens.palette.text.primary,
      secondary: themeTokens.palette.text.secondary,
      disabled: themeTokens.palette.text.disabled,
    },
  },
  typography: {
    fontFamily: themeTokens.typography.fontFamily,
  },
  spacing: themeTokens.spacing,
  shape: {
    borderRadius: themeTokens.shape.borderRadius.md,
  },
});

interface Props {
  layout: LayoutNode[];
}

export default function PageContent({ layout }: Props) {
  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <PageRenderer layout={layout} />
    </ThemeProvider>
  );
}
