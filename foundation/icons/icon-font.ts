// Self-hosts the Material Symbols Outlined font used by `md-icon`.

const fontUrl = new URL('./material-symbols-outlined.woff2', import.meta.url)
  .href;

const styleElementId = 'oscd-publisher-icon-font';

export const publisherIconFontFamily = 'OSCD Publisher Icons';

export function loadPublisherIconFont(): void {
  if (document.getElementById(styleElementId)) return;

  const style = document.createElement('style');
  style.id = styleElementId;
  style.textContent = `
    @font-face {
      font-family: '${publisherIconFontFamily}';
      font-style: normal;
      font-weight: 400;
      font-display: block;
      src: url('${fontUrl}') format('woff2');
    }
  `;
  document.head.appendChild(style);
}

// Scopes `--md-icon-font` to a single element instead of `:root`, so it
// can't clash with other plugins or the host.
export function applyPublisherIconFont(host: HTMLElement): void {
  host.style.setProperty(
    '--md-icon-font',
    `'${publisherIconFontFamily}', 'Material Symbols Outlined'`
  );
}
