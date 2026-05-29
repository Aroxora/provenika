import { Injectable } from '@angular/core';

interface Glyph { color: string; inner: string; }

// Per-view favicon art — a small SVG that depicts what the user is currently doing.
const BG = '#0a0e14';
const G: Record<string, Glyph> = {
  overview: { color: '#3ddc97', inner: t('⬡') },
  disease: { color: '#3ddc97', inner: `<circle cx="32" cy="32" r="16" fill="none" stroke="#3ddc97" stroke-width="4"/><line x1="32" y1="23" x2="32" y2="41" stroke="#3ddc97" stroke-width="4"/><line x1="23" y1="32" x2="41" y2="32" stroke="#3ddc97" stroke-width="4"/>` },
  dossier: { color: '#3ddc97', inner: `<circle cx="32" cy="32" r="16" fill="none" stroke="#3ddc97" stroke-width="4"/><circle cx="32" cy="32" r="6" fill="#3ddc97"/>` },
  triage: { color: '#4aa8ff', inner: dots() },
  structure: { color: '#4aa8ff', inner: hexMol() },
  'cost-benefit': { color: '#ffb454', inner: bars() },
  models: { color: '#3ddc97', inner: sine() },
  literature: { color: '#4aa8ff', inner: lines() },
  pathways: { color: '#3ddc97', inner: network() },
  trials: { color: '#4aa8ff', inner: cross() },
  report: { color: '#ffb454', inner: doc() },
};

@Injectable({ providedIn: 'root' })
export class FaviconService {
  private link: HTMLLinkElement | null = null;

  setActivity(routeId: string): void {
    const g = G[routeId] ?? G['overview'];
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
      `<rect width="64" height="64" rx="14" fill="${BG}"/>${g.inner}</svg>`;
    this.apply('data:image/svg+xml,' + encodeURIComponent(svg));
  }

  private apply(href: string): void {
    if (!this.link) {
      this.link = document.querySelector("link[rel~='icon']");
      if (!this.link) {
        this.link = document.createElement('link');
        this.link.rel = 'icon';
        document.head.appendChild(this.link);
      }
    }
    this.link.type = 'image/svg+xml';
    this.link.href = href;
  }
}

function t(ch: string, color = '#3ddc97'): string {
  return `<text x="32" y="46" font-size="40" text-anchor="middle" fill="${color}" font-family="sans-serif">${ch}</text>`;
}
function dots(): string {
  return `<circle cx="20" cy="44" r="6" fill="#8b9bb0"/><circle cx="34" cy="30" r="6" fill="#4aa8ff"/><circle cx="46" cy="20" r="6" fill="#3ddc97"/>`;
}
function hexMol(): string {
  return `<polygon points="32,12 50,22 50,42 32,52 14,42 14,22" fill="none" stroke="#4aa8ff" stroke-width="4"/><circle cx="32" cy="32" r="5" fill="#4aa8ff"/>`;
}
function bars(): string {
  return `<rect x="14" y="34" width="9" height="16" fill="#ffb454"/><rect x="27" y="24" width="9" height="26" fill="#ffb454"/><rect x="40" y="16" width="9" height="34" fill="#ffb454"/>`;
}
function sine(): string {
  return `<path d="M10 32 Q21 8 32 32 T54 32" fill="none" stroke="#3ddc97" stroke-width="4"/>`;
}
function lines(): string {
  return `<rect x="14" y="18" width="36" height="4" rx="2" fill="#4aa8ff"/><rect x="14" y="30" width="36" height="4" rx="2" fill="#4aa8ff"/><rect x="14" y="42" width="24" height="4" rx="2" fill="#8b9bb0"/>`;
}
function network(): string {
  return `<line x1="20" y1="44" x2="32" y2="20" stroke="#3ddc97" stroke-width="3"/><line x1="44" y1="44" x2="32" y2="20" stroke="#3ddc97" stroke-width="3"/><circle cx="32" cy="20" r="6" fill="#3ddc97"/><circle cx="20" cy="44" r="5" fill="#4aa8ff"/><circle cx="44" cy="44" r="5" fill="#4aa8ff"/>`;
}
function cross(): string {
  return `<rect x="27" y="14" width="10" height="36" rx="3" fill="#4aa8ff"/><rect x="14" y="27" width="36" height="10" rx="3" fill="#4aa8ff"/>`;
}
function doc(): string {
  return `<rect x="18" y="12" width="28" height="40" rx="4" fill="none" stroke="#ffb454" stroke-width="3"/><line x1="24" y1="24" x2="40" y2="24" stroke="#ffb454" stroke-width="3"/><line x1="24" y1="32" x2="40" y2="32" stroke="#ffb454" stroke-width="3"/><line x1="24" y1="40" x2="34" y2="40" stroke="#ffb454" stroke-width="3"/>`;
}
