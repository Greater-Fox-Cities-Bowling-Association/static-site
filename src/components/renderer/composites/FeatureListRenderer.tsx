import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import type { LayoutNode } from "../../../../cms/editor/layoutSchema";

interface Feature {
  icon?: string;
  title: string;
  body: string;
}

export function FeatureListRenderer({
  node,
}: {
  node: LayoutNode;
  renderSlot: (s: string) => React.ReactNode;
}) {
  const { heading, features, columns } = node.props as {
    heading?: string;
    features?: Feature[];
    columns?: number;
  };
  const cols = columns ?? 3;
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {heading && (
        <Typography variant="h4" align="center" gutterBottom>
          {heading}
        </Typography>
      )}
      <Grid container spacing={4} sx={{ mt: 2 }}>
        {(features ?? []).map((f, i) => (
          <Grid item xs={12} sm={6} md={12 / cols} key={i}>
            <Box sx={{ textAlign: "center" }}>
              {f.icon && (
                <Box
                  component="span"
                  className="material-icons"
                  sx={{
                    fontSize: 48,
                    color: "primary.main",
                    fontFamily: "Material Icons",
                  }}
                >
                  {f.icon}
                </Box>
              )}
              <Typography variant="h6" gutterBottom sx={{ mt: 1 }}>
                {f.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {f.body}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
