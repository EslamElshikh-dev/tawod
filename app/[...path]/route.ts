import {
  getRoutedLegacyHtmlFiles,
  htmlResponse,
} from "@/lib/legacy-pages";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return getRoutedLegacyHtmlFiles().map((file) => ({
    path: file.split("/"),
  }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return htmlResponse(path.join("/"));
}
