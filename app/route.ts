import { htmlResponse } from "@/lib/legacy-pages";

export const dynamic = "force-static";

export function GET() {
  return htmlResponse("index.html");
}
