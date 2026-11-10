import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Landing pages use the same content revision as the legacy-page installer.
// A changed URL refreshes browsers that cached the previous immutable script.
const revision = createHash("sha256")
  .update(readFileSync(join(process.cwd(), "assets/js/tawod-analytics.js")))
  .digest("hex")
  .slice(0, 12);

export const analyticsAssetSrc = `/assets/js/tawod-analytics.js?v=${revision}`;
