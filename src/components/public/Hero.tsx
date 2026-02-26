import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";

export default function Hero() {
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
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
          Welcome to Our Site
        </Typography>
        <Typography
          variant="h5"
          align="center"
          color="text.secondary"
          paragraph
        >
          This is your new Astro + MUI static site. Edit content in the admin
          panel and publish to deploy.
        </Typography>
        <Stack
          direction="row"
          spacing={2}
          justifyContent="center"
          sx={{ mt: 4 }}
        >
          <Button variant="contained" size="large" href="/admin/">
            Go to Admin
          </Button>
          <Button variant="outlined" size="large" href="#learn-more">
            Learn More
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
