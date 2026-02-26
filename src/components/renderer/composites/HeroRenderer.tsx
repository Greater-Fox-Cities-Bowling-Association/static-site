import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import type { LayoutNode } from "../../../../cms/editor/layoutSchema";

export function HeroRenderer({
  node,
}: {
  node: LayoutNode;
  renderSlot: (s: string) => React.ReactNode;
}) {
  const {
    heading,
    subheading,
    primaryCtaLabel,
    primaryCtaHref,
    secondaryCtaLabel,
    secondaryCtaHref,
    backgroundColor,
  } = node.props as Record<string, unknown>;
  return (
    <Box
      sx={{
        bgcolor: (backgroundColor as string) ?? "background.paper",
        pt: 12,
        pb: 8,
      }}
    >
      <Container maxWidth="md">
        <Typography
          component="h1"
          variant="h2"
          align="center"
          color="text.primary"
          gutterBottom
        >
          {(heading as string) ?? "Your Headline Here"}
        </Typography>
        <Typography
          variant="h5"
          align="center"
          color="text.secondary"
          paragraph
        >
          {(subheading as string) ?? "A short supporting sentence goes here."}
        </Typography>
        <Stack
          direction="row"
          spacing={2}
          justifyContent="center"
          sx={{ mt: 4 }}
        >
          {primaryCtaLabel && (
            <Button
              variant="contained"
              size="large"
              href={(primaryCtaHref as string) ?? "#"}
            >
              {primaryCtaLabel as string}
            </Button>
          )}
          {secondaryCtaLabel && (
            <Button
              variant="outlined"
              size="large"
              href={(secondaryCtaHref as string) ?? "#"}
            >
              {secondaryCtaLabel as string}
            </Button>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
