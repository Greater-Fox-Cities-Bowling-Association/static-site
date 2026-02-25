import { defineConfig } from "tinacms";
import { schema } from "./schema";
import { auth0Provider } from "./auth-provider";
import { createCsvImporterPlugin } from "./plugins/csv-importer";

const branch =
  process.env.TINA_GITHUB_BRANCH ||
  process.env.HEAD ||
  "main";

// https://tina.io/docs/self-hosted/overview/
export default defineConfig({
  branch,
  // Token is always retrieved from the Auth0 claim (https://gfcba.com/github_token)
  // and stored in localStorage by public/admin/index.html after login.
  // The authProvider reads it from there via getToken().
  clientId: null as any,

  // Auth0-based authentication provider.
  // The GitHub PAT is always retrieved from the Auth0 claim (https://gfcba.com/github_token)
  // and stored in localStorage by public/admin/index.html after a successful login.
  authProvider: auth0Provider,

  build: {
    outputFolder: "admin",
    publicFolder: "public",
  },

  media: {
    tina: {
      mediaRoot: "uploads",
      publicFolder: "public",
    },
  },

  // Register the CSV importer so editors can bulk-import content via the CMS
  cmsCallback: (cms) => {
    cms.plugins.add(
      createCsvImporterPlugin({
        label: "Import Posts from CSV",
        collection: "posts",
        contentPath: "src/content/posts",
        slugColumn: "title",
        outputFormat: "md",
        fieldMappings: [
          { csvColumn: "title",       tinaField: "title" },
          { csvColumn: "description", tinaField: "description" },
          { csvColumn: "author",      tinaField: "author" },
          { csvColumn: "date",        tinaField: "publishDate" },
          { csvColumn: "tags",        tinaField: "tags" },
        ],
      })
    );
    return cms;
  },

  schema,
});
