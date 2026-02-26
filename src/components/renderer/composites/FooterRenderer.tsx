import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import type { LayoutNode } from "../../../../cms/editor/layoutSchema";

interface FooterLink {
  label: string;
  href: string;
}
interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

export function FooterRenderer({
  node,
}: {
  node: LayoutNode;
  renderSlot: (s: string) => React.ReactNode;
}) {
  const { columns, copyright } = node.props as {
    columns?: FooterColumn[];
    copyright?: string;
  };
  return (
    <Box
      component="footer"
      sx={{ bgcolor: "background.paper", py: 6, mt: "auto" }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {(columns ?? []).map((col, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                {col.heading}
              </Typography>
              {col.links.map((link, j) => (
                <Link
                  key={j}
                  href={link.href}
                  display="block"
                  variant="body2"
                  color="text.secondary"
                  underline="hover"
                  sx={{ mb: 0.5 }}
                >
                  {link.label}
                </Link>
              ))}
            </Grid>
          ))}
        </Grid>
        <Divider sx={{ mt: 4, mb: 2 }} />
        <Typography variant="body2" color="text.secondary" align="center">
          {copyright ?? `© ${new Date().getFullYear()} All rights reserved.`}
        </Typography>
      </Container>
    </Box>
  );
}
