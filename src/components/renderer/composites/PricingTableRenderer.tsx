import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import CheckIcon from "@mui/icons-material/Check";
import type { LayoutNode } from "../../../../cms/editor/layoutSchema";

interface Plan {
  name: string;
  price: string;
  period?: string;
  features: string[];
  ctaLabel: string;
  ctaHref?: string;
  highlighted?: boolean;
}

export function PricingTableRenderer({
  node,
}: {
  node: LayoutNode;
  renderSlot: (s: string) => React.ReactNode;
}) {
  const { heading, plans } = node.props as { heading?: string; plans?: Plan[] };
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {heading && (
        <Typography variant="h4" align="center" gutterBottom>
          {heading}
        </Typography>
      )}
      <Grid
        container
        spacing={4}
        alignItems="flex-end"
        justifyContent="center"
        sx={{ mt: 2 }}
      >
        {(plans ?? []).map((plan, i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Card
              elevation={plan.highlighted ? 8 : 1}
              sx={{
                border: plan.highlighted ? 2 : 0,
                borderColor: "primary.main",
              }}
            >
              <CardHeader
                title={plan.name}
                subheader={plan.highlighted ? "Most Popular" : undefined}
                titleTypographyProps={{ align: "center" }}
                subheaderTypographyProps={{ align: "center" }}
                sx={{
                  bgcolor: plan.highlighted
                    ? "primary.main"
                    : "background.paper",
                  color: plan.highlighted ? "primary.contrastText" : undefined,
                }}
              />
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "baseline",
                    mb: 2,
                  }}
                >
                  <Typography component="h2" variant="h3" color="text.primary">
                    {plan.price}
                  </Typography>
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    sx={{ ml: 0.5 }}
                  >
                    {plan.period ?? "/mo"}
                  </Typography>
                </Box>
                <List dense>
                  {plan.features.map((f, j) => (
                    <ListItem key={j} disableGutters>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckIcon fontSize="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={f} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
              <CardActions>
                <Button
                  fullWidth
                  variant={plan.highlighted ? "contained" : "outlined"}
                  href={plan.ctaHref ?? "#"}
                >
                  {plan.ctaLabel}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
