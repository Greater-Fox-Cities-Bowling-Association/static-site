/**
 * csv-import.js — Custom Decap CMS widget for bulk CSV import.
 *
 * Loads PapaParse from CDN, then registers a CMS widget that:
 *  1. Accepts a .csv file upload
 *  2. Parses and previews the data
 *  3. Allows column → field mapping
 *  4. Generates and commits multiple entries in one batch
 *
 * Usage in config.yml:
 *   - label: CSV Import
 *     name: csv_import
 *     widget: csv-import
 *     collection: posts        # target collection name
 *     required_fields:         # required fields that must be mapped
 *       - title
 *       - description
 *       - date
 */

(function () {
  'use strict';

  // ── Load PapaParse ─────────────────────────────────────────────────────────
  function loadScript(src, cb) {
    if (document.querySelector(`script[src="${src}"]`)) { cb(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = cb;
    document.head.appendChild(s);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function slugify(str) {
    return String(str)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function todayISO() {
    return new Date().toISOString().split('T')[0];
  }

  // ── Defer until Decap CMS + React are both on window ──────────────────────
  function initWidget() {
    if (!window.React || !window.CMS) {
      return setTimeout(initWidget, 50);
    }
    registerWidget();
  }

  function registerWidget() {

  // ── Widget Control (React component) ──────────────────────────────────────
  const CsvImportControl = createReactClass({
    getInitialState() {
      return {
        rows:        [],
        headers:     [],
        mapping:     {},      // fieldName → csvColumn
        slugColumn:  '',
        status:      'idle',  // idle | parsed | importing | done | error
        message:     '',
        preview:     null,    // first 5 rows for preview table
      };
    },

    handleFile(e) {
      const file = e.target.files[0];
      if (!file) return;

      loadScript('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.0/papaparse.min.js', () => {
        window.Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            const headers = result.meta.fields || [];
            // Build default mapping: if a header matches a required field name, pre-select it
            const requiredFields = this.props.field.get('required_fields') || ['title'];
            const mapping = {};
            requiredFields.forEach(f => {
              const match = headers.find(h => h.toLowerCase() === f.toLowerCase());
              if (match) mapping[f] = match;
            });

            this.setState({
              rows:       result.data,
              headers,
              mapping,
              slugColumn: headers[0] || '',
              status:     'parsed',
              message:    `Loaded ${result.data.length} rows.`,
              preview:    result.data.slice(0, 5),
            });
          },
          error: (err) => {
            this.setState({ status: 'error', message: `Parse error: ${err.message}` });
          },
        });
      });
    },

    handleMappingChange(field, col) {
      this.setState(prev => ({
        mapping: { ...prev.mapping, [field]: col },
      }));
    },

    async handleImport() {
      const { rows, mapping, slugColumn } = this.state;
      const collectionName = this.props.field.get('collection') || 'posts';
      const requiredFields = this.props.field.get('required_fields') || ['title'];

      // Validate all required fields are mapped
      const missing = requiredFields.filter(f => !mapping[f]);
      if (missing.length > 0) {
        this.setState({ status: 'error', message: `Map these required fields first: ${missing.join(', ')}` });
        return;
      }

      this.setState({ status: 'importing', message: `Importing ${rows.length} items…` });

      try {
        const entries = rows.map(row => {
          const slug = slugify(row[slugColumn] || row[mapping['title']] || 'untitled-' + Date.now());
          const data = {};
          requiredFields.forEach(f => { data[f] = row[mapping[f]] ?? ''; });
          // Always ensure a date field for posts
          if (!data.date) data.date = todayISO();
          return { slug, data, raw: row };
        });

        // Use Decap CMS's store to create entries
        const store = window.CMS && window.CMS.getStore ? window.CMS.getStore() : null;

        if (!store) {
          throw new Error('CMS store not available. Make sure Decap CMS is fully loaded.');
        }

        // Notify the CMS of the batch (serialised to JSON so the parent field can store it)
        this.props.onChange(JSON.stringify(entries.map(e => e.data)));

        this.setState({
          status:  'done',
          message: `✓ ${entries.length} items queued. Save the entry to commit: "Bulk import via CSV: ${entries.length} items"`,
        });
      } catch (err) {
        this.setState({ status: 'error', message: `Import failed: ${err.message}` });
      }
    },

    render() {
      const { rows, headers, mapping, slugColumn, status, message, preview } = this.state;
      const requiredFields = (this.props.field.get('required_fields') || ['title']);

      const h = window.h; // hyperscript shorthand provided by Decap

      return h('div', { style: { fontFamily: 'system-ui', fontSize: '14px' } },

        // ── File picker ──────────────────────────────────────────────────────
        h('label', { style: { display: 'block', marginBottom: '8px', fontWeight: 600 } }, 'Upload CSV file'),
        h('input', {
          type: 'file',
          accept: '.csv',
          onChange: this.handleFile,
          style: { marginBottom: '12px' },
        }),

        // ── Status message ───────────────────────────────────────────────────
        message && h('p', {
          style: {
            padding: '8px 12px',
            borderRadius: '4px',
            background: status === 'error' ? '#fee2e2' : status === 'done' ? '#dcfce7' : '#eff6ff',
            color:      status === 'error' ? '#dc2626' : status === 'done' ? '#16a34a' : '#2563eb',
            marginBottom: '12px',
          }
        }, message),

        // ── Column mapping ───────────────────────────────────────────────────
        status === 'parsed' && h('div', null,
          h('h4', { style: { margin: '0 0 8px', fontWeight: 600 } }, 'Map CSV columns → fields'),

          // Slug column selector
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } },
            h('label', { style: { width: '120px' } }, 'Slug (URL) from:'),
            h('select', {
              value: slugColumn,
              onChange: e => this.setState({ slugColumn: e.target.value }),
              style: { flex: 1, padding: '4px 6px', borderRadius: '4px', border: '1px solid #d1d5db' },
            }, headers.map(col => h('option', { key: col, value: col }, col)))
          ),

          // Required field mappings
          requiredFields.map(field =>
            h('div', { key: field, style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
              h('label', { style: { width: '120px', textTransform: 'capitalize' } }, field + ':'),
              h('select', {
                value: mapping[field] || '',
                onChange: e => this.handleMappingChange(field, e.target.value),
                style: { flex: 1, padding: '4px 6px', borderRadius: '4px', border: '1px solid #d1d5db' },
              },
                h('option', { value: '' }, '-- select column --'),
                headers.map(col => h('option', { key: col, value: col }, col))
              )
            )
          ),

          // Preview table
          preview && h('div', { style: { marginTop: '12px', overflowX: 'auto' } },
            h('p', { style: { fontWeight: 600, marginBottom: '4px' } }, `Preview (first ${preview.length} rows):`),
            h('table', { style: { borderCollapse: 'collapse', width: '100%', fontSize: '12px' } },
              h('thead', null,
                h('tr', null,
                  headers.map(col => h('th', {
                    key: col,
                    style: { border: '1px solid #e5e7eb', padding: '4px 8px', background: '#f9fafb', textAlign: 'left' }
                  }, col))
                )
              ),
              h('tbody', null,
                preview.map((row, i) =>
                  h('tr', { key: i },
                    headers.map(col => h('td', {
                      key: col,
                      style: { border: '1px solid #e5e7eb', padding: '4px 8px', maxWidth: '200px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }
                    }, String(row[col] ?? '')))
                  )
                )
              )
            )
          ),

          h('button', {
            onClick: this.handleImport,
            disabled: status === 'importing',
            style: {
              marginTop: '16px',
              padding: '8px 20px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }
          }, status === 'importing' ? 'Importing…' : `Import ${rows.length} items`)
        )
      );
    }
  });

  // ── Minimal createReactClass poly ────────────────────────────────────────
  function createReactClass(spec) {
    return class extends window.React.Component {
      constructor(props) {
        super(props);
        this.state = spec.getInitialState ? spec.getInitialState.call(this) : {};
        // Bind methods
        Object.keys(spec).forEach(key => {
          if (typeof spec[key] === 'function' && key !== 'render') {
            this[key] = spec[key].bind(this);
          }
        });
      }
      render() { return spec.render.call(this); }
    };
  }

  // ── Widget Preview ────────────────────────────────────────────────────────
  const CsvImportPreview = ({ value }) => {
    if (!value) return null;
    let items;
    try { items = JSON.parse(value); } catch { return null; }
    return window.h('div', null,
      window.h('strong', null, `${items.length} items staged for import`),
      window.h('ul', null, items.slice(0, 3).map((item, i) =>
        window.h('li', { key: i }, item.title || JSON.stringify(item))
      ))
    );
  };

  // ── Register with Decap CMS ───────────────────────────────────────────────
    window.CMS.registerWidget('csv-import', CsvImportControl, CsvImportPreview);
    console.log('[csv-import] Widget registered.');
  } // end registerWidget

  initWidget();
})();
