import { withAdsRescue } from "@/lib/ad-rescue-html";
import { htmlResponse } from "@/lib/legacy-pages";

export const dynamic = "force-static";

export async function GET() {
  return withAdsRescue(htmlResponse("index.html"));
}
