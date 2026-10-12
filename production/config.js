/* Production config — the only file that should need editing at deploy time. */
window.MEDADX_CONFIG = {
  siteUrl: "https://medadx.com",
  // POST endpoint for all three lead forms (trading account, quote, quick quote).
  // Leave empty to keep the simulated submit (dev/staging only — leads are NOT delivered).
  leadEndpoint: "",
  // Optional extra headers for the endpoint (e.g. a public form key). Never put secrets here.
  leadHeaders: {}
};
