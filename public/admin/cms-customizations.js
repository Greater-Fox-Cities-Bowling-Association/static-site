/**
 * cms-customizations.js
 *
 * Registers four layers of Decap CMS customisation:
 *   1. Preview styles  — site-matching CSS injected into the preview iframe
 *   2. Preview templates — post/page preview rendered with site layout
 *   3. Editor components — callout boxes, YouTube embeds, info cards
 *   4. CMS branding — logo, brand colours in the admin toolbar
 *
 * Loaded by index.astro after the Decap CMS script has initialised.
 */

(function () {
  'use strict';

  // ── Defer until Decap CMS + React are both on window ──────────────────────
  function init() {
    if (!window.React || !window.CMS) return setTimeout(init, 50);

    const React = window.React;
    const h = React.createElement;

    // ── 1. Preview styles ────────────────────────────────────────────────────
    // Injects preview.css into every preview iframe so it matches the live site.
    CMS.registerPreviewStyle('/admin/preview.css');

    // ── 2. Branding ──────────────────────────────────────────────────────────
    injectBrandingCSS();
    injectLogo();

    // ── 3. Editor components ─────────────────────────────────────────────────

    // ── Callout Box ──────────────────────────────────────────────────────
    CMS.registerEditorComponent({
      id: 'callout',
      label: 'Callout Box',
      summary: '{{fields.type}} · {{fields.title}}',
      fields: [
        {
          name: 'type',
          label: 'Type',
          widget: 'select',
          options: [
            { label: 'ℹ️  Info',     value: 'info' },
            { label: '⚠️  Warning', value: 'warning' },
            { label: '✅  Success', value: 'success' },
            { label: '❌  Error',   value: 'error' },
          ],
          default: 'info',
        },
        { name: 'title', label: 'Title', widget: 'string' },
        { name: 'body',  label: 'Body',  widget: 'text' },
      ],
      // MDX-style shortcode syntax stored in Markdown
      pattern: /^:::callout\{type="(\w+)"\}\n###\s(.+)\n([\s\S]*?)\n:::$/,
      fromBlock: (match) => ({ type: match[1], title: match[2], body: match[3].trim() }),
      toBlock: ({ type, title, body }) =>
        `:::callout{type="${type}"}\n### ${title}\n${body}\n:::`,
      toPreview: ({ type, title, body }) => {
        const icons = { info: 'ℹ️', warning: '⚠️', success: '✅', error: '❌' };
        return (
          `<div class="callout callout--${type}">` +
          `<span class="callout__icon">${icons[type] || 'ℹ️'}</span>` +
          `<div><div class="callout__title">${title}</div>` +
          `<div class="callout__body">${body}</div></div></div>`
        );
      },
    });

    // ── YouTube Embed ────────────────────────────────────────────────────
    CMS.registerEditorComponent({
      id: 'youtube',
      label: 'YouTube Embed',
      summary: 'YouTube · {{fields.id}}',
      fields: [
        { name: 'id',    label: 'Video ID',  widget: 'string', hint: 'The part after ?v= in the YouTube URL' },
        { name: 'title', label: 'Caption',   widget: 'string', required: false },
      ],
      pattern: /^:::youtube\{id="([^"]+)"\}\n(.*)\n:::$/,
      fromBlock: (match) => ({ id: match[1], title: match[2] }),
      toBlock: ({ id, title }) => `:::youtube{id="${id}"}\n${title || ''}\n:::`,
      toPreview: ({ id, title }) =>
        `<figure class="youtube-embed">` +
        `<iframe src="https://www.youtube.com/embed/${id}" title="${title || id}" allowfullscreen></iframe>` +
        `</figure>${title ? `<figcaption style="text-align:center;color:#6b7280;font-size:.875rem;margin-top:.5rem">${title}</figcaption>` : ''}`,
    });

    // ── Info Card ────────────────────────────────────────────────────────
    CMS.registerEditorComponent({
      id: 'info-card',
      label: 'Info Card',
      summary: '{{fields.heading}}',
      fields: [
        { name: 'icon',    label: 'Icon (emoji)', widget: 'string', default: '📌', hint: 'Paste any emoji' },
        { name: 'heading', label: 'Heading',      widget: 'string' },
        { name: 'text',    label: 'Text',         widget: 'text' },
        { name: 'link',    label: 'Link URL',     widget: 'string', required: false },
        { name: 'linkLabel', label: 'Link Label', widget: 'string', required: false },
      ],
      pattern: /^:::card\{icon="([^"]+)" heading="([^"]+)"\}\n([\s\S]*?)\n(?:link:\s*(.+)\|(.+)\n)?:::$/,
      fromBlock: (match) => ({
        icon: match[1], heading: match[2], text: match[3].trim(),
        link: match[4] || '', linkLabel: match[5] || '',
      }),
      toBlock: ({ icon, heading, text, link, linkLabel }) =>
        `:::card{icon="${icon}" heading="${heading}"}\n${text}` +
        (link ? `\nlink: ${link}|${linkLabel || 'Read more'}` : '') +
        `\n:::`,
      toPreview: ({ icon, heading, text, link, linkLabel }) =>
        `<div style="border:1px solid #e5e7eb;border-radius:0.5rem;padding:1.25rem;margin:1.5rem 0;display:flex;gap:1rem">` +
        `<span style="font-size:1.75rem;line-height:1">${icon}</span>` +
        `<div><strong style="display:block;margin-bottom:.25rem">${heading}</strong>` +
        `<p style="margin:0;color:#374151;font-size:.95rem">${text}</p>` +
        (link ? `<a href="${link}" style="display:inline-block;margin-top:.5rem;color:#2563eb;font-size:.875rem">${linkLabel || 'Read more'} →</a>` : '') +
        `</div></div>`,
    });

    // ── 4. Preview templates ─────────────────────────────────────────────────

    // Posts preview
    const PostPreview = function (props) {
      var entry = props.entry;
      var widgetFor = props.widgetFor;
      var title       = entry.getIn(['data', 'title'])       || '';
      var description = entry.getIn(['data', 'description']) || '';
      var date        = entry.getIn(['data', 'date']);
      var author      = entry.getIn(['data', 'author'])      || '';
      var tags        = entry.getIn(['data', 'tags'])        || [];

      var dateStr = '';
      try { if (date) dateStr = new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
      catch (_) {}

      return h('article', { className: 'preview-post' },
        h('header', { className: 'preview-header' },
          h('h1', { className: 'preview-title' }, title),
          h('div', { style: { display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' } },
            dateStr && h('time', { className: 'preview-date', style: { margin: 0 } }, dateStr),
            author  && h('span', { style: { fontSize: '0.875rem', color: '#6b7280' } }, 'by ' + author),
          ),
          tags && tags.size > 0 && h('div', { style: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' } },
            tags.map(function (tag) {
              return h('span', {
                key: tag,
                style: { background: '#eff6ff', color: '#2563eb', padding: '0.15rem 0.6rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600 },
              }, tag);
            }).toArray()
          ),
          description && h('p', { className: 'preview-description' }, description),
        ),
        h('div', { className: 'preview-body' }, widgetFor('body'))
      );
    };

    CMS.registerPreviewTemplate('posts', PostPreview);

    // Pages preview
    const PagePreview = function (props) {
      var entry = props.entry;
      var widgetFor = props.widgetFor;
      var title       = entry.getIn(['data', 'title'])       || '';
      var description = entry.getIn(['data', 'description']) || '';

      return h('main', { className: 'preview-page' },
        h('header', { className: 'preview-header' },
          h('h1', { className: 'preview-title' }, title),
          description && h('p', { className: 'preview-description' }, description),
        ),
        h('div', { className: 'preview-body' }, widgetFor('body'))
      );
    };

    CMS.registerPreviewTemplate('pages', PagePreview);

    console.log('[cms-customizations] All customisations registered.');
  }

  // ── Branding helpers ──────────────────────────────────────────────────────

  /**
   * Injects a <style> tag into the main CMS page (NOT the preview iframe)
   * that overrides Decap's toolbar and sidebar brand colours.
   */
  function injectBrandingCSS() {
    var style = document.createElement('style');
    style.id = 'cms-brand-overrides';
    style.textContent = `
      /* ── Decap CMS brand colour overrides ─────────────────────────────────
         Decap uses styled-components so class names are hashed.
         We target structural / data-testid selectors instead.            */

      /* Toolbar background */
      [class*="AppHeader"],
      [class*="Navbar"],
      [data-testid="header"],
      #nc-root nav[class] {
        background: #1e293b !important;
      }

      /* Active nav items & accent buttons */
      [class*="NavLink"][class*="active"],
      [class*="active"][class*="NavItem"],
      button[class*="primary"],
      a[class*="active"] {
        color: #2563eb !important;
        border-color: #2563eb !important;
      }

      /* Sidebar */
      [class*="CollectionNav"],
      [class*="Sidebar"],
      [class*="SidebarNav"] {
        background: #f8fafc !important;
        border-right: 1px solid #e2e8f0 !important;
      }

      /* Entry list cards hover */
      [class*="EntryCard"]:hover,
      [class*="ListCard"]:hover {
        border-color: #2563eb !important;
        box-shadow: 0 0 0 3px rgba(37,99,235,.15) !important;
      }

      /* Primary CTA buttons */
      button[class*="Button"][class*="primary"],
      button[type="submit"][class*="Button"] {
        background: #2563eb !important;
        border-color: #2563eb !important;
      }
      button[class*="Button"][class*="primary"]:hover,
      button[type="submit"][class*="Button"]:hover {
        background: #1d4ed8 !important;
      }

      /* Focused inputs */
      input:focus, textarea:focus, select:focus {
        outline: 2px solid #2563eb !important;
        outline-offset: 2px !important;
      }

      /* Brand logo area */
      #cms-brand-logo {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        font-weight: 700;
        font-size: 1rem;
        color: #fff;
        letter-spacing: -0.02em;
        position: fixed;
        top: 0;
        left: 0;
        z-index: 9999;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s;
      }
      #cms-brand-logo.visible { opacity: 1; }
      #cms-brand-logo .brand-dot {
        width: 10px; height: 10px;
        background: #2563eb;
        border-radius: 50%;
        display: inline-block;
        box-shadow: 0 0 0 3px rgba(37,99,235,.3);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Uses a MutationObserver to detect when Decap renders its toolbar,
   * then injects a branded logo/title element.
   */
  function injectLogo() {
    var siteName = 'My Static Site'; // fallback

    // Try to read from settings if we can (best-effort)
    try {
      var cached = window.__siteSettings;
      if (cached && cached.siteTitle) siteName = cached.siteTitle;
    } catch (_) {}

    var logo = document.createElement('div');
    logo.id = 'cms-brand-logo';
    logo.innerHTML =
      '<span class="brand-dot"></span>' +
      '<span>' + siteName + ' &mdash; CMS</span>';
    document.body.appendChild(logo);

    // Show the logo once the CMS nav has rendered
    var observer = new MutationObserver(function () {
      // Decap renders a nav/header — once we see notable DOM depth, show logo
      var nav = document.querySelector('[class*="AppHeader"], [class*="Navbar"], [data-testid="header"]');
      if (nav) {
        logo.classList.add('visible');
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  init();
})();
