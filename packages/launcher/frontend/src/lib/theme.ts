import type { AppView } from '../api';

const palette = ['#5fbedc', '#f0995f', '#a27fc2', '#eddf55'];

export function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function hashedColor(key: string): string {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

export function appColor(app: AppView): string {
  return app.themeColor || hashedColor(app.appKey);
}

export function shadeColor(hex: string, amount: number): string {
  const value = hex.replace('#', '');
  const red = Math.max(0, Math.round(parseInt(value.slice(0, 2), 16) * (1 - amount)));
  const green = Math.max(0, Math.round(parseInt(value.slice(2, 4), 16) * (1 - amount)));
  const blue = Math.max(0, Math.round(parseInt(value.slice(4, 6), 16) * (1 - amount)));
  return `#${[red, green, blue].map((part) => part.toString(16).padStart(2, '0')).join('')}`;
}

export function releaseUrl(app: AppView): string {
  if (app.releaseUrl) return app.releaseUrl;
  if (!app.repoUrl) return '';
  return `${app.repoUrl.replace(/\.git$/, '').replace(/\/$/, '')}/releases`;
}
