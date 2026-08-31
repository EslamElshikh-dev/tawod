const ADS_RESCUE_SCRIPT = '<script src="/assets/js/tawod-ads-rescue.js" defer></script>';

export async function withAdsRescue(response: Response) {
  const html = await response.text();
  if (!/<\/head>/i.test(html) || html.includes('/assets/js/tawod-ads-rescue.js')) {
    return new Response(html, response);
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');

  return new Response(
    html.replace(/<\/head>/i, `${ADS_RESCUE_SCRIPT}</head>`),
    {
      status: response.status,
      statusText: response.statusText,
      headers,
    },
  );
}
