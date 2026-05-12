import type { DocumentTemplate } from '../documentTemplates'
import { formatTemplateVersionLabel, getCurrentTemplateVersion } from '../documentTemplates'
import { buildSampleMergeContext } from './employeeMergeContext'
import { renderTemplateHtml } from './templateEngine'

type PreviewVersionPayload = {
  version: number
  label: string
  html: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildPreviewVersions(template: DocumentTemplate): PreviewVersionPayload[] {
  return template.versions
    .slice()
    .sort((left, right) => right.version - left.version)
    .map((version) => ({
      version: version.version,
      label: formatTemplateVersionLabel(version),
      html: renderTemplateHtml(version.htmlWithPlaceholders, buildSampleMergeContext()),
    }))
}

function buildPreviewPageHtml(template: DocumentTemplate, versions: PreviewVersionPayload[]): string {
  const currentVersion = getCurrentTemplateVersion(template)?.version ?? versions[0]?.version ?? 1
  const payload = JSON.stringify({
    templateName: template.name,
    currentVersion,
    versions,
  }).replace(/</g, '\\u003c')

  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Anteprima — ${escapeHtml(template.name)}</title>
    <style>
      :root {
        color-scheme: light;
        --text: #3d3d48;
        --text-h: #12131a;
        --muted: #6b6976;
        --bg: #f4f5f9;
        --surface: #ffffff;
        --border: #d9dde8;
        --accent: #3b5bdb;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif;
        color: var(--text);
        background: var(--bg);
      }

      .preview-shell {
        max-width: 920px;
        margin: 0 auto;
        padding: 1.5rem 1.25rem 2.5rem;
      }

      .preview-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: end;
        justify-content: space-between;
        margin-bottom: 1rem;
        padding: 1rem;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: var(--surface);
      }

      .preview-toolbar h1 {
        margin: 0;
        font-size: 1.15rem;
        color: var(--text-h);
      }

      .preview-toolbar p {
        margin: 0.35rem 0 0;
        color: var(--muted);
        font-size: 0.92rem;
      }

      .preview-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 0.65rem;
        align-items: end;
      }

      label {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-size: 0.82rem;
        color: var(--muted);
      }

      select,
      button {
        font: inherit;
      }

      select {
        min-width: 220px;
        padding: 0.45rem 0.55rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: #fff;
        color: var(--text-h);
      }

      button {
        padding: 0.5rem 0.85rem;
        border: 1px solid color-mix(in srgb, var(--accent) 45%, var(--border));
        border-radius: 8px;
        background: var(--accent);
        color: #fff;
        cursor: pointer;
      }

      .preview-document {
        padding: 1.25rem;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: #fff;
        color: var(--text-h);
        line-height: 1.55;
      }

      .preview-document h1,
      .preview-document h2,
      .preview-document h3,
      .preview-document p,
      .preview-document ul,
      .preview-document ol {
        margin: 0 0 0.75rem;
      }

      .preview-document table {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 0.75rem;
      }

      .preview-document th,
      .preview-document td {
        border: 1px solid var(--border);
        padding: 0.45rem 0.55rem;
        vertical-align: top;
      }

      @media print {
        body {
          background: #fff;
        }

        .preview-toolbar {
          display: none;
        }

        .preview-shell {
          max-width: none;
          padding: 0;
        }

        .preview-document {
          border: 0;
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="preview-shell">
      <header class="preview-toolbar">
        <div>
          <h1 id="preview-title"></h1>
          <p>Anteprima con dati di esempio del dipendente.</p>
        </div>
        <div class="preview-controls">
          <label>
            Versione
            <select id="preview-version"></select>
          </label>
          <button type="button" id="preview-print">Stampa / PDF</button>
        </div>
      </header>
      <article class="preview-document" id="preview-document"></article>
    </div>
    <script type="application/json" id="preview-data">${payload}</script>
    <script>
      const data = JSON.parse(document.getElementById('preview-data').textContent);
      const versionSelect = document.getElementById('preview-version');
      const documentNode = document.getElementById('preview-document');
      const titleNode = document.getElementById('preview-title');

      titleNode.textContent = data.templateName;

      for (const version of data.versions) {
        const option = document.createElement('option');
        option.value = String(version.version);
        option.textContent = version.label;
        versionSelect.appendChild(option);
      }

      versionSelect.value = String(data.currentVersion);

      function renderVersion(versionNumber) {
        const version = data.versions.find((item) => item.version === versionNumber);
        documentNode.innerHTML = version ? version.html : '';
      }

      versionSelect.addEventListener('change', () => {
        renderVersion(Number(versionSelect.value));
      });

      document.getElementById('preview-print').addEventListener('click', () => {
        window.print();
      });

      renderVersion(Number(versionSelect.value));
    </script>
  </body>
</html>`
}

export function openDocumentTemplatePreviewInNewTab(template: DocumentTemplate): boolean {
  const versions = buildPreviewVersions(template)
  if (!versions.length) {
    return false
  }

  const html = buildPreviewPageHtml(template, versions)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const previewWindow = window.open(url, '_blank', 'noopener,noreferrer')

  if (!previewWindow) {
    URL.revokeObjectURL(url)
    return false
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return true
}
