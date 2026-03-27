import type { FeedGenerator } from '../feed-generator';
import type { ConfigManager } from '../config';
import type { FeedConfig } from '../types';

export function createUiRoutes(
  generator: FeedGenerator,
  configManager: ConfigManager,
) {
  const apiRoutes = createApiRoutesInternal(generator, configManager);

  return {
    async handleUi(): Promise<Response> {
      const html = getUiHtml();
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    },

    ...apiRoutes,
  };
}

function createApiRoutesInternal(
  generator: FeedGenerator,
  configManager: ConfigManager,
) {
  return {
    async handleGetConfig(): Promise<Response> {
      return Response.json(configManager.getConfig());
    },

    async handleUpdateConfig(request: Request): Promise<Response> {
      const updates = (await request.json()) as Partial<FeedConfig>;
      configManager.updateConfig(updates);
      return Response.json({ success: true });
    },

    async handleUpdateContentOptions(request: Request): Promise<Response> {
      const updates = (await request.json()) as Partial<
        FeedConfig['contentOptions']
      >;
      configManager.updateContentOptions(updates);
      return Response.json({ success: true });
    },

    async handleUpdateFieldBehavior(request: Request): Promise<Response> {
      const updates = (await request.json()) as Partial<
        FeedConfig['fieldBehavior']
      >;
      configManager.updateFieldBehavior(updates);
      return Response.json({ success: true });
    },

    async handleRegenerate(): Promise<Response> {
      generator.regenerate();
      return Response.json({ success: true });
    },

    async handleGetState(): Promise<Response> {
      return Response.json(generator.getState());
    },

    async handleResetConfig(): Promise<Response> {
      configManager.reset();
      return Response.json({ success: true });
    },
  };
}

function getUiHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RSS Feed Generator</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0f0f0f;
      --bg-card: #1a1a1a;
      --border: #2a2a2a;
      --text: #e0e0e0;
      --text-muted: #888;
      --accent: #6366f1;
      --accent-hover: #818cf8;
      --success: #22c55e;
      --warning: #f59e0b;
      --danger: #ef4444;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.5;
    }
    .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
    header { margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; }
    h1 { font-size: 1.75rem; font-weight: 600; }
    .status { display: flex; gap: 1rem; align-items: center; font-size: 0.875rem; color: var(--text-muted); }
    .status-badge { padding: 0.25rem 0.75rem; background: var(--success); color: white; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
    
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; }
    
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1.5rem;
    }
    .card h2 { font-size: 1rem; font-weight: 600; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    
    .endpoints { display: grid; gap: 0.5rem; }
    .endpoint {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      font-size: 0.875rem;
    }
    .endpoint a { color: var(--accent); text-decoration: none; }
    .endpoint a:hover { text-decoration: underline; }
    .endpoint .format { color: var(--text-muted); font-size: 0.75rem; }
    
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.375rem; }
    .form-group input[type="text"],
    .form-group input[type="number"],
    .form-group select {
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 0.375rem;
      color: var(--text);
      font-size: 0.875rem;
    }
    .form-group input:focus, .form-group select:focus {
      outline: none;
      border-color: var(--accent);
    }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-range { display: flex; align-items: center; gap: 0.5rem; }
    .form-range input { flex: 1; }
    .form-range span { min-width: 3rem; text-align: right; font-size: 0.875rem; color: var(--text-muted); }
    
    .checkbox-group { display: flex; align-items: center; gap: 0.5rem; }
    .checkbox-group input { width: 1rem; height: 1rem; accent-color: var(--accent); }
    
    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-primary { background: var(--accent); color: white; }
    .btn-primary:hover { background: var(--accent-hover); }
    .btn-secondary { background: var(--border); color: var(--text); }
    .btn-secondary:hover { background: #3a3a3a; }
    .btn-danger { background: var(--danger); color: white; }
    .btn-danger:hover { background: #dc2626; }
    .btn-group { display: flex; gap: 0.5rem; margin-top: 1rem; }
    
    .tabs { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 1rem; }
    .tab {
      padding: 0.75rem 1rem;
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 0.875rem;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }
    .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
    .tab:hover { color: var(--text); }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    
    .slider-section { margin-bottom: 1rem; }
    .slider-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.375rem; }
    .slider-header label { font-size: 0.875rem; color: var(--text-muted); }
    .slider-value { font-size: 0.875rem; color: var(--text); font-weight: 500; }
    input[type="range"] { width: 100%; accent-color: var(--accent); }
    
    .field-presence { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
    .field-item { display: flex; justify-content: space-between; align-items: center; }
    .field-item label { font-size: 0.875rem; }
    .field-item input[type="range"] { width: 100px; }
    
    .multi-select { display: flex; flex-wrap: wrap; gap: 0.375rem; }
    .multi-select label {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 0.25rem;
      font-size: 0.75rem;
      cursor: pointer;
    }
    .multi-select input { display: none; }
    .multi-select input:checked + span { color: var(--accent); }
    .multi-select:has(input:checked) label:has(input:checked) {
      border-color: var(--accent);
      background: rgba(99, 102, 241, 0.1);
    }
    
    .preview { margin-top: 1.5rem; }
    .preview h3 { font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.75rem; }
    .preview-items { display: grid; gap: 0.5rem; max-height: 300px; overflow-y: auto; }
    .preview-item {
      padding: 0.75rem;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 0.375rem;
      font-size: 0.8125rem;
    }
    .preview-item .title { font-weight: 500; margin-bottom: 0.25rem; }
    .preview-item .meta { color: var(--text-muted); font-size: 0.75rem; }
    
    .toast {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      padding: 0.75rem 1rem;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      font-size: 0.875rem;
      opacity: 0;
      transform: translateY(1rem);
      transition: all 0.2s;
      z-index: 1000;
    }
    .toast.show { opacity: 1; transform: translateY(0); }
    .toast.success { border-color: var(--success); }
    
    @media (max-width: 768px) {
      .container { padding: 1rem; }
      .grid { grid-template-columns: 1fr; }
      header { flex-direction: column; gap: 1rem; align-items: flex-start; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🚀 RSS Feed Generator</h1>
      <div class="status">
        <span id="updateCount">0 updates</span>
        <span class="status-badge" id="statusBadge">Running</span>
      </div>
    </header>
    
    <div class="grid">
      <!-- Endpoints Card -->
      <div class="card">
        <h2>📡 Feed Endpoints</h2>
        <div class="endpoints" id="endpoints"></div>
      </div>
      
      <!-- Quick Actions -->
      <div class="card">
        <h2>⚡ Quick Actions</h2>
        <div class="btn-group">
          <button class="btn btn-primary" onclick="regenerate()">Regenerate Items</button>
          <button class="btn btn-secondary" onclick="resetConfig()">Reset Config</button>
        </div>
        <div class="form-group" style="margin-top: 1rem;">
          <label>Update Interval (seconds)</label>
          <input type="number" id="updateInterval" value="60" min="0" max="3600" onchange="updateInterval()">
        </div>
      </div>
      
      <!-- Feed Settings -->
      <div class="card">
        <h2>📰 Feed Settings</h2>
        <div class="form-group">
          <label>Feed Title</label>
          <input type="text" id="feedTitle" onchange="updateFeedMeta()">
        </div>
        <div class="form-group">
          <label>Description</label>
          <input type="text" id="feedDescription" onchange="updateFeedMeta()">
        </div>
        <div class="form-group">
          <label>Base URL</label>
          <input type="text" id="feedLink" onchange="updateFeedMeta()">
        </div>
        <div class="form-group">
          <label>Item Count</label>
          <input type="number" id="itemCount" value="20" min="1" max="500" onchange="updateItemCount()">
        </div>
      </div>
      
      <!-- Content Options -->
      <div class="card">
        <h2>📝 Content Options</h2>
        
        <div class="slider-section">
          <div class="slider-header">
            <label>Title Length</label>
            <span class="slider-value" id="titleLengthValue">20-70</span>
          </div>
          <div class="form-row">
            <input type="range" id="titleLengthMin" min="10" max="100" value="20" onchange="updateContentOptions()">
            <input type="range" id="titleLengthMax" min="10" max="100" value="70" onchange="updateContentOptions()">
          </div>
        </div>
        
        <div class="slider-section">
          <div class="slider-header">
            <label>Content Length</label>
            <span class="slider-value" id="contentLengthValue">500-3000</span>
          </div>
          <div class="form-row">
            <input type="range" id="contentLengthMin" min="100" max="5000" value="500" onchange="updateContentOptions()">
            <input type="range" id="contentLengthMax" min="100" max="5000" value="3000" onchange="updateContentOptions()">
          </div>
        </div>
        
        <div class="slider-section">
          <div class="slider-header">
            <label>Image Count per Item</label>
            <span class="slider-value" id="imageCountValue">1-3</span>
          </div>
          <div class="form-row">
            <input type="range" id="imageCountMin" min="0" max="10" value="1" onchange="updateContentOptions()">
            <input type="range" id="imageCountMax" min="0" max="10" value="3" onchange="updateContentOptions()">
          </div>
        </div>
        
        <div class="slider-section">
          <div class="slider-header">
            <label>Categories per Item</label>
            <span class="slider-value" id="categoryCountValue">1-5</span>
          </div>
          <div class="form-row">
            <input type="range" id="categoryCountMin" min="0" max="10" value="1" onchange="updateContentOptions()">
            <input type="range" id="categoryCountMax" min="0" max="10" value="5" onchange="updateContentOptions()">
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
          <div class="checkbox-group">
            <input type="checkbox" id="includeImages" checked onchange="updateContentOptions()">
            <label for="includeImages">Include Images</label>
          </div>
          <div class="checkbox-group">
            <input type="checkbox" id="includeVideos" checked onchange="updateContentOptions()">
            <label for="includeVideos">Include Videos</label>
          </div>
          <div class="checkbox-group">
            <input type="checkbox" id="includeCategories" checked onchange="updateContentOptions()">
            <label for="includeCategories">Include Categories</label>
          </div>
          <div class="checkbox-group">
            <input type="checkbox" id="htmlInContent" checked onchange="updateContentOptions()">
            <label for="htmlInContent">HTML in Content</label>
          </div>
          <div class="checkbox-group" style="grid-column: 1 / -1;">
            <input type="checkbox" id="useCurrentDate" onchange="onDateModeChange()">
            <label for="useCurrentDate">Use current date (generation time) for pub/updated</label>
          </div>
          <div class="checkbox-group" id="realisticDatesRow">
            <input type="checkbox" id="useRealisticDates" checked onchange="updateContentOptions()">
            <label for="useRealisticDates">Realistic dates (random in range; updated may follow published)</label>
          </div>
          <div class="form-group" style="margin: 0;" id="dateRangeRow">
            <label>Date Range (days)</label>
            <input type="number" id="dateRangeDays" value="30" min="1" max="365" onchange="updateContentOptions()">
          </div>
        </div>
      </div>
      
      <!-- Field Behavior -->
      <div class="card" style="grid-column: 1 / -1;">
        <h2>🎯 Field Behavior</h2>
        
        <div class="tabs">
          <button class="tab active" onclick="showTab('presence')">Presence</button>
          <button class="tab" onclick="showTab('empty')">Force Empty</button>
          <button class="tab" onclick="showTab('invalid')">Force Invalid</button>
        </div>
        
        <div class="tab-content active" id="presence-tab">
          <div class="field-presence" id="fieldPresence"></div>
        </div>
        
        <div class="tab-content" id="empty-tab">
          <p style="color: var(--text-muted); margin-bottom: 1rem; font-size: 0.875rem;">Select fields to always be empty:</p>
          <div class="multi-select" id="forceEmpty"></div>
        </div>
        
        <div class="tab-content" id="invalid-tab">
          <p style="color: var(--text-muted); margin-bottom: 1rem; font-size: 0.875rem;">Select fields to have invalid values:</p>
          <div class="multi-select" id="forceInvalid"></div>
        </div>
      </div>
      
      <!-- Preview -->
      <div class="card" style="grid-column: 1 / -1;">
        <h2>👁️ Preview</h2>
        <div class="preview">
          <div class="preview-items" id="previewItems"></div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="toast" id="toast">Saved!</div>

  <script>
    const fields = ['title', 'summary', 'content', 'link', 'imageUrl', 'author', 'publishedAt', 'guid', 'lastModifiedAt', 'categories'];
    let config = {};
    
    async function loadConfig() {
      const res = await fetch('/api/config');
      config = await res.json();
      renderConfig();
      loadEndpoints();
      loadPreview();
    }
    
    function renderConfig() {
      document.getElementById('feedTitle').value = config.title;
      document.getElementById('feedDescription').value = config.description;
      document.getElementById('feedLink').value = config.link;
      document.getElementById('itemCount').value = config.itemCount;
      document.getElementById('updateInterval').value = config.updateIntervalMs / 1000;
      
      // Content options
      const co = config.contentOptions;
      document.getElementById('titleLengthMin').value = co.titleLength.min;
      document.getElementById('titleLengthMax').value = co.titleLength.max;
      document.getElementById('contentLengthMin').value = co.contentLength.min;
      document.getElementById('contentLengthMax').value = co.contentLength.max;
      document.getElementById('imageCountMin').value = co.imageCount.min;
      document.getElementById('imageCountMax').value = co.imageCount.max;
      document.getElementById('categoryCountMin').value = co.categoryCount.min;
      document.getElementById('categoryCountMax').value = co.categoryCount.max;
      document.getElementById('includeImages').checked = co.includeImages;
      document.getElementById('includeVideos').checked = co.includeVideos;
      document.getElementById('includeCategories').checked = co.includeCategories;
      document.getElementById('htmlInContent').checked = co.htmlInContent;
      document.getElementById('useCurrentDate').checked = co.useCurrentDate === true;
      document.getElementById('useRealisticDates').checked = co.useRealisticDates;
      document.getElementById('dateRangeDays').value = co.dateRangeDays;
      syncDateModeControls();
      
      updateSliderDisplays();
      
      // Field presence
      const fb = config.fieldBehavior;
      let presenceHtml = '';
      for (const field of fields) {
        const key = field + 'Presence';
        const value = Math.round((fb[key] || 1) * 100);
        presenceHtml += \`
          <div class="field-item">
            <label>\${field}</label>
            <div class="form-range">
              <input type="range" min="0" max="100" value="\${value}" 
                     onchange="updateFieldPresence('\${field}', this.value)">
              <span>\${value}%</span>
            </div>
          </div>\`;
      }
      document.getElementById('fieldPresence').innerHTML = presenceHtml;
      
      // Force empty checkboxes
      let emptyHtml = '';
      for (const field of fields) {
        const checked = fb.forceEmptyFields.includes(field) ? 'checked' : '';
        emptyHtml += \`
          <label>
            <input type="checkbox" \${checked} onchange="toggleForceEmpty('\${field}', this.checked)">
            <span>\${field}</span>
          </label>\`;
      }
      document.getElementById('forceEmpty').innerHTML = emptyHtml;
      
      // Force invalid checkboxes
      let invalidHtml = '';
      for (const field of fields) {
        const checked = fb.forceInvalidValues.includes(field) ? 'checked' : '';
        invalidHtml += \`
          <label>
            <input type="checkbox" \${checked} onchange="toggleForceInvalid('\${field}', this.checked)">
            <span>\${field}</span>
          </label>\`;
      }
      document.getElementById('forceInvalid').innerHTML = invalidHtml;
    }
    
    function updateSliderDisplays() {
      document.getElementById('titleLengthValue').textContent = 
        document.getElementById('titleLengthMin').value + '-' + document.getElementById('titleLengthMax').value;
      document.getElementById('contentLengthValue').textContent = 
        document.getElementById('contentLengthMin').value + '-' + document.getElementById('contentLengthMax').value;
      document.getElementById('imageCountValue').textContent = 
        document.getElementById('imageCountMin').value + '-' + document.getElementById('imageCountMax').value;
      document.getElementById('categoryCountValue').textContent = 
        document.getElementById('categoryCountMin').value + '-' + document.getElementById('categoryCountMax').value;
    }
    
    async function loadEndpoints() {
      const res = await fetch('/api/endpoints');
      const data = await res.json();
      
      const html = data.endpoints
        .filter(e => e.enabled)
        .map(e => \`
          <div class="endpoint">
            <div>
              <a href="\${e.url}" target="_blank">\${e.path}</a>
              <span class="format">\${e.format}</span>
            </div>
            <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" 
                    onclick="copyUrl('\${e.url}')">Copy</button>
          </div>\`).join('');
      
      document.getElementById('endpoints').innerHTML = html;
    }
    
    async function loadPreview() {
      const res = await fetch('/api/items');
      const items = await res.json();
      
      const html = items.slice(0, 10).map(item => \`
        <div class="preview-item">
          <div class="title">\${item.title || '<em>No title</em>'}</div>
          <div class="meta">
            \${item.author || 'Unknown'} • \${new Date(item.publishedAt).toLocaleDateString()} • 
            \${item.categories.length} categories
          </div>
        </div>\`).join('');
      
      document.getElementById('previewItems').innerHTML = html;
    }
    
    async function regenerate() {
      await fetch('/api/regenerate', { method: 'POST' });
      showToast('Items regenerated!');
      loadPreview();
      updateState();
    }
    
    async function resetConfig() {
      if (confirm('Reset all settings to defaults?')) {
        await fetch('/api/config/reset', { method: 'POST' });
        showToast('Config reset!');
        loadConfig();
      }
    }
    
    async function updateFeedMeta() {
      await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: document.getElementById('feedTitle').value,
          description: document.getElementById('feedDescription').value,
          link: document.getElementById('feedLink').value,
        })
      });
      showToast('Saved!');
    }
    
    async function updateItemCount() {
      await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemCount: parseInt(document.getElementById('itemCount').value) })
      });
      regenerate();
    }
    
    async function updateInterval() {
      const seconds = parseInt(document.getElementById('updateInterval').value);
      await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updateIntervalMs: seconds * 1000 })
      });
      showToast('Interval updated!');
    }
    
    function syncDateModeControls() {
      const useCurrent = document.getElementById('useCurrentDate').checked;
      document.getElementById('useRealisticDates').disabled = useCurrent;
      document.getElementById('dateRangeDays').disabled = useCurrent;
      const op = useCurrent ? '0.5' : '1';
      const realisticRow = document.getElementById('realisticDatesRow');
      const rangeRow = document.getElementById('dateRangeRow');
      if (realisticRow) realisticRow.style.opacity = op;
      if (rangeRow) rangeRow.style.opacity = op;
    }

    async function onDateModeChange() {
      syncDateModeControls();
      await updateContentOptions();
    }

    async function updateContentOptions() {
      updateSliderDisplays();
      
      await fetch('/api/config/content-options', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleLength: { 
            min: parseInt(document.getElementById('titleLengthMin').value),
            max: parseInt(document.getElementById('titleLengthMax').value)
          },
          contentLength: {
            min: parseInt(document.getElementById('contentLengthMin').value),
            max: parseInt(document.getElementById('contentLengthMax').value)
          },
          imageCount: {
            min: parseInt(document.getElementById('imageCountMin').value),
            max: parseInt(document.getElementById('imageCountMax').value)
          },
          categoryCount: {
            min: parseInt(document.getElementById('categoryCountMin').value),
            max: parseInt(document.getElementById('categoryCountMax').value)
          },
          includeImages: document.getElementById('includeImages').checked,
          includeVideos: document.getElementById('includeVideos').checked,
          includeCategories: document.getElementById('includeCategories').checked,
          htmlInContent: document.getElementById('htmlInContent').checked,
          useCurrentDate: document.getElementById('useCurrentDate').checked,
          useRealisticDates: document.getElementById('useRealisticDates').checked,
          dateRangeDays: parseInt(document.getElementById('dateRangeDays').value)
        })
      });
      regenerate();
    }
    
    async function updateFieldPresence(field, value) {
      const key = field + 'Presence';
      await fetch('/api/config/field-behavior', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value / 100 })
      });
      regenerate();
    }
    
    async function toggleForceEmpty(field, checked) {
      const current = new Set(config.fieldBehavior.forceEmptyFields);
      if (checked) current.add(field);
      else current.delete(field);
      
      await fetch('/api/config/field-behavior', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceEmptyFields: [...current] })
      });
      regenerate();
    }
    
    async function toggleForceInvalid(field, checked) {
      const current = new Set(config.fieldBehavior.forceInvalidValues);
      if (checked) current.add(field);
      else current.delete(field);
      
      await fetch('/api/config/field-behavior', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceInvalidValues: [...current] })
      });
      regenerate();
    }
    
    async function updateState() {
      const res = await fetch('/api/state');
      const state = await res.json();
      document.getElementById('updateCount').textContent = state.updateCount + ' updates';
    }
    
    function showTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.querySelector(\`[onclick="showTab('\${tab}')"]\`).classList.add('active');
      document.getElementById(tab + '-tab').classList.add('active');
    }
    
    function copyUrl(url) {
      navigator.clipboard.writeText(url);
      showToast('URL copied!');
    }
    
    function showToast(message) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.classList.add('show', 'success');
      setTimeout(() => toast.classList.remove('show', 'success'), 2000);
    }
    
    // Poll for updates
    setInterval(updateState, 5000);
    
    // Initial load
    loadConfig();
  </script>
</body>
</html>`;
}
