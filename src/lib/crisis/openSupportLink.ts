/** Open tel: or https links. Client-only; no server involvement. */
export async function openSupportLink(href: string): Promise<void> {
  if (href.startsWith('tel:')) {
    window.location.href = href;
    return;
  }
  window.open(href, '_blank', 'noopener,noreferrer');
}
