import Auth0Provider from "./Auth0Provider";
import ImportAdmin from "./ImportAdmin";

export default function AdminApp() {
  return (
    <Auth0Provider>
      <ImportAdmin />
    </Auth0Provider>
  );
}
