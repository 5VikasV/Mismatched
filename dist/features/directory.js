import { icon } from '../icons.js';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function safeUrl(url) {
  try {
    const parsed = new URL(url);
    if (['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password) {
      return parsed.href;
    }
    return '';
  } catch {
    return '';
  }
}

function formatDate(isoStr) {
  if (!isoStr) return 'Not recorded';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return String(isoStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function hasValidCoordinates(f) {
  return (
    typeof f.latitude === 'number' &&
    Number.isFinite(f.latitude) &&
    typeof f.longitude === 'number' &&
    Number.isFinite(f.longitude) &&
    f.latitude >= 6 &&
    f.latitude <= 38 &&
    f.longitude >= 67 &&
    f.longitude <= 99
  );
}

/**
 * Mounts the facility directory feature into the given root container.
 *
 * @param {HTMLElement} root - Host DOM container.
 * @param {object} context - Integration context per shared agreement.
 * @returns {Promise<() => void>} Cleanup function.
 */
export async function mountFeature(root, context) {
  root.setAttribute('data-feature', 'directory');

  let state = {
    search: context.initialSearch || '',
    stateFilter: '',
    districtFilter: '',
    industryFilter: '',
    view: 'list', // 'list' | 'map'
    selectedId: null,
    importing: false,
    focusedBeforeDetail: null,
  };

  let isMounted = true;

  function getFacilities() {
    const data = context.getData() || {};
    return data.facilities || [];
  }

  function getSources() {
    const data = context.getData() || {};
    return data.sources || [];
  }

  function getFilteredFacilities() {
    const all = getFacilities();
    const query = state.search.trim().toLowerCase();

    return all.filter(f => {
      if (state.stateFilter && f.state !== state.stateFilter) return false;
      if (state.districtFilter && f.district !== state.districtFilter) return false;
      if (state.industryFilter && f.industry !== state.industryFilter) return false;

      if (query) {
        const textToSearch = [
          f.name || '',
          f.address || '',
          f.district || '',
          f.state || '',
          f.industry || '',
          ...(f.materials || []),
        ]
          .join(' ')
          .toLowerCase();

        const terms = query.split(/\s+/).filter(Boolean);
        const matchesAllTerms = terms.every(t => textToSearch.includes(t));
        if (!matchesAllTerms) return false;
      }

      return true;
    });
  }

  function render() {
    if (!isMounted) return;

    const all = getFacilities();
    const sources = getSources();
    const filtered = getFilteredFacilities();

    // Unique sorted states from all facilities
    const availableStates = [...new Set(all.map(f => f.state).filter(Boolean))].sort();

    // Unique sorted districts (dependent on selected state if set)
    const districtSourceList = state.stateFilter
      ? all.filter(f => f.state === state.stateFilter)
      : all;
    const availableDistricts = [...new Set(districtSourceList.map(f => f.district).filter(Boolean))].sort();

    // Unique sorted industries from all facilities
    const availableIndustries = [...new Set(all.map(f => f.industry).filter(Boolean))].sort();

    // Current selected facility (if any)
    let selectedFacility = null;
    if (state.selectedId) {
      selectedFacility = all.find(f => f.id === state.selectedId) || null;
    }

    // Has active filters
    const hasActiveFilters = Boolean(
      state.search.trim() || state.stateFilter || state.districtFilter || state.industryFilter
    );

    // Empty bundle case
    if (all.length === 0) {
      root.innerHTML = `
        <div class="directory-view" data-feature="directory">
          <div class="page-heading">
            <div>
              <div class="eyebrow">FACILITY DIRECTORY</div>
              <h1 class="page-title">The facility index.</h1>
              <p class="page-subtitle">Start with sourced public records. Every listing keeps its attribution.</p>
            </div>
            <div class="heading-actions">
              <button class="btn btn-primary" data-action="import" ${state.importing ? 'disabled' : ''}>
                ${icon('download')}
                <span>${state.importing ? 'Importing records…' : 'Import public records'}</span>
              </button>
            </div>
          </div>
          <div class="panel empty-panel">
            <div class="empty-state">
              ${icon('box')}
              <h3>Your directory starts with evidence.</h3>
              <p>Import reviewed public records. Coverage depends on the source material available.</p>
              <button class="btn btn-primary" data-action="import" ${state.importing ? 'disabled' : ''}>
                ${icon('download')}
                <span>${state.importing ? 'Importing records…' : 'Import public records'}</span>
              </button>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const coordinatesCount = all.filter(hasValidCoordinates).length;
    const missingCoordinatesCount = all.length - coordinatesCount;

    // Build State Coverage Breakdown
    const stateCounts = {};
    for (const f of all) {
      const st = f.state || 'Unspecified';
      stateCounts[st] = (stateCounts[st] || 0) + 1;
    }
    const stateEntries = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);

    root.innerHTML = `
      <div class="directory-view" data-feature="directory">
        <header class="page-heading">
          <div>
            <div class="eyebrow">FACILITY DIRECTORY</div>
            <h1 class="page-title">The facility index.</h1>
            <p class="page-subtitle">Find an industrial facility. Inspect its source. Understand what is still unknown.</p>
          </div>
          <div class="heading-actions">
            <button class="btn btn-secondary" data-action="import" ${state.importing ? 'disabled' : ''}>
              ${icon('download')}
              <span>${state.importing ? 'Updating…' : 'Re-import public records'}</span>
            </button>
          </div>
        </header>

        <!-- Filters & Toolbar -->
        <section class="panel directory-toolbar" aria-label="Directory search and filter toolbar">
          <div class="search-row">
            <label class="search-field" for="directory-search">
              ${icon('search')}
              <input
                id="directory-search"
                type="search"
                placeholder="Search by facility name, material, address, or location…"
                value="${esc(state.search)}"
                aria-label="Search facility directory"
              />
            </label>
            ${
              hasActiveFilters
                ? `<button class="btn btn-secondary clear-filters-btn" data-action="clear-filters">
                     ${icon('close')}
                     <span>Clear filters</span>
                   </button>`
                : ''
            }
          </div>

          <div class="filter-grid">
            <label class="field" for="directory-state">
              <span class="field-label">State</span>
              <select id="directory-state" class="select" aria-label="Filter by state">
                <option value="">All states (${all.length})</option>
                ${availableStates
                  .map(
                    s =>
                      `<option value="${esc(s)}" ${state.stateFilter === s ? 'selected' : ''}>${esc(s)} (${
                        all.filter(f => f.state === s).length
                      })</option>`
                  )
                  .join('')}
              </select>
            </label>

            <label class="field" for="directory-district">
              <span class="field-label">District</span>
              <select id="directory-district" class="select" aria-label="Filter by district">
                <option value="">All districts ${state.stateFilter ? `in ${esc(state.stateFilter)}` : ''}</option>
                ${availableDistricts
                  .map(
                    d =>
                      `<option value="${esc(d)}" ${state.districtFilter === d ? 'selected' : ''}>${esc(d)}</option>`
                  )
                  .join('')}
              </select>
            </label>

            <label class="field" for="directory-industry">
              <span class="field-label">Stated Industry</span>
              <select id="directory-industry" class="select" aria-label="Filter by industry">
                <option value="">All industries</option>
                ${availableIndustries
                  .map(
                    ind =>
                      `<option value="${esc(ind)}" ${state.industryFilter === ind ? 'selected' : ''}>${esc(ind)}</option>`
                  )
                  .join('')}
              </select>
            </label>
          </div>
        </section>

        <!-- Subbar: Results count & View toggle -->
        <div class="directory-subbar">
          <div class="results-count" role="status" aria-live="polite">
            <strong>${filtered.length}</strong> ${filtered.length === 1 ? 'facility record' : 'facility records'}
            ${hasActiveFilters ? `<span class="filtered-note">(filtered from ${all.length})</span>` : ''}
          </div>

          <div class="view-switch" role="group" aria-label="Directory view mode">
            <button
              class="${state.view === 'list' ? 'active' : ''}"
              data-action="view"
              data-view="list"
              aria-pressed="${state.view === 'list'}"
            >
              ${icon('list')}
              <span>List</span>
            </button>
            <button
              class="${state.view === 'map' ? 'active' : ''}"
              data-action="view"
              data-view="map"
              aria-pressed="${state.view === 'map'}"
            >
              ${icon('globe')}
              <span>Map & Coverage</span>
            </button>
          </div>
        </div>

        ${
          state.view === 'list'
            ? renderListView(filtered, selectedFacility, sources, hasActiveFilters)
            : renderMapView(all, filtered, coordinatesCount, missingCoordinatesCount, stateEntries, selectedFacility, sources)
        }

        <div class="notice directory-disclaimer">
          ${icon('info')}
          <p>
            <strong>Research notice:</strong> Listed facilities are historical public registry records. A public entry does not establish current authorization, operating status, scrap stock, or willingness to trade.
          </p>
        </div>
      </div>
    `;
  }

  function renderListView(filtered, selectedFacility, sources, hasActiveFilters) {
    if (filtered.length === 0) {
      return `
        <div class="panel empty-panel">
          <div class="empty-state">
            ${icon('box')}
            <h3>No records match these filters.</h3>
            <p>Try clearing filters or adjusting your search terms to see available public records.</p>
            <button class="btn btn-secondary" data-action="clear-filters">
              ${icon('reset')}
              <span>Clear all filters</span>
            </button>
          </div>
        </div>
      `;
    }

    const hasSelection = Boolean(selectedFacility);

    return `
      <div class="directory-master-detail ${hasSelection ? 'has-selection' : ''}">
        <!-- Master List Panel -->
        <section class="panel directory-list-panel" aria-label="Facility results list">
          <div class="facility-list" role="list">
            ${filtered
              .map(f => {
                const isSelected = selectedFacility && selectedFacility.id === f.id;
                const src = sources.find(s => s.id === f.sourceId);
                return `
                  <article
                    class="facility-row ${isSelected ? 'selected' : ''}"
                    role="listitem"
                    data-id="${esc(f.id)}"
                  >
                    <span class="facility-icon" aria-hidden="true">${icon('building')}</span>
                    <div class="facility-info">
                      <button
                        class="facility-name"
                        data-action="select-facility"
                        data-id="${esc(f.id)}"
                        aria-pressed="${isSelected}"
                        aria-label="${esc(f.name)}, ${esc(f.district || f.state || '')}"
                      >
                        ${esc(f.name)}
                      </button>
                      <span class="facility-location">
                        ${esc([f.district, f.state].filter(Boolean).join(', ') || 'Location not recorded')}
                      </span>
                      <div class="facility-tags">
                        <span class="badge neutral">${esc(f.industry || 'Industry unspecified')}</span>
                        ${(f.materials || []).map(m => `<span class="badge green">${esc(m)}</span>`).join('')}
                      </div>
                    </div>
                    <div class="facility-meta">
                      <span class="source-pub">${esc(src?.publisher || 'Public source')}</span>
                      <button
                        class="btn btn-sm btn-secondary select-action-btn"
                        data-action="select-facility"
                        data-id="${esc(f.id)}"
                        aria-label="View details for ${esc(f.name)}"
                      >
                        ${isSelected ? 'Selected' : 'Details →'}
                      </button>
                    </div>
                  </article>
                `;
              })
              .join('')}
          </div>
        </section>

        <!-- Detail Panel -->
        <section class="panel directory-detail-panel" aria-label="Facility detail view">
          ${
            selectedFacility
              ? renderFacilityDetail(selectedFacility, sources.find(s => s.id === selectedFacility.sourceId))
              : `
                <div class="detail-placeholder">
                  <div class="placeholder-content">
                    <span class="placeholder-icon">${icon('building')}</span>
                    <h3>Select a facility to inspect</h3>
                    <p>Review the full official address, stated industry, materials, and source provenance for any record in the list.</p>
                  </div>
                </div>
              `
          }
        </section>
      </div>
    `;
  }

  function renderFacilityDetail(facility, source) {
    const coordsAvailable = hasValidCoordinates(facility);
    const pubDate = facility.sourcePublishedAt || source?.publicationDate;
    const reviewedDate = facility.checkedAt || source?.retrievedAt;
    const sourceLinkUrl = safeUrl(facility.sourceUrl || source?.url);

    return `
      <div class="facility-detail-card" tabindex="-1">
        <div class="detail-header">
          <div class="detail-header-nav">
            <button
              class="btn btn-sm btn-secondary mobile-back-btn"
              data-action="back-to-list"
              aria-label="Return to facilities list"
            >
              ← Back to list
            </button>
            <button
              class="icon-btn close-detail-btn"
              data-action="deselect-facility"
              aria-label="Close detail view"
              title="Close detail panel"
            >
              ${icon('close')}
            </button>
          </div>
          <div class="detail-title-group">
            <span class="eyebrow">${esc(facility.state || 'FACILITY DETAIL')}</span>
            <h2 class="detail-title">${esc(facility.name)}</h2>
          </div>
          <div class="facility-tags">
            <span class="badge neutral">${esc(facility.industry || 'Industry unspecified')}</span>
            ${(facility.materials || []).map(m => `<span class="badge green">${esc(m)}</span>`).join('')}
          </div>
        </div>

        <div class="detail-body">
          <dl class="detail-grid">
            <div class="detail-item full-width">
              <dt>Address</dt>
              <dd>${esc(facility.address || 'Address not recorded in source register')}</dd>
            </div>

            <div class="detail-item">
              <dt>State & District</dt>
              <dd>${esc([facility.district, facility.state].filter(Boolean).join(' / ') || 'Not recorded')}</dd>
            </div>

            <div class="detail-item">
              <dt>Geographic Coordinates</dt>
              <dd>
                ${
                  coordsAvailable
                    ? `<code>${facility.latitude.toFixed(6)}, ${facility.longitude.toFixed(6)}</code>`
                    : `<span class="muted">Not supplied by the source</span>`
                }
                <small class="detail-hint">
                  ${
                    coordsAvailable
                      ? 'Source-provided coordinates.'
                      : 'Coordinates were not included in the public register. Coordinates are never inferred or geocoded.'
                  }
                </small>
              </dd>
            </div>

            <div class="detail-item">
              <dt>Source Document Publication</dt>
              <dd>
                ${esc(formatDate(pubDate))}
                <small class="detail-hint">Date published or released by the government department.</small>
              </dd>
            </div>

            <div class="detail-item">
              <dt>Source Review Date</dt>
              <dd>
                <strong>${esc(formatDate(reviewedDate))}</strong>
                <small class="detail-hint alert-hint">
                  Records when this entry was reviewed from the public register. It does <em>not</em> represent a direct site inspection or verification of current operation.
                </small>
              </dd>
            </div>

            <div class="detail-item">
              <dt>Source Document Reference</dt>
              <dd>
                ${
                  facility.sourcePage || facility.sourceRow
                    ? `Page ${esc(facility.sourcePage || '—')}, Row ${esc(facility.sourceRow || '—')}`
                    : 'See full publisher document'
                }
              </dd>
            </div>
          </dl>

          <!-- Source Provenance Box -->
          <div class="source-provenance-box">
            <div class="provenance-header">
              <span class="source-icon">${icon('file')}</span>
              <div>
                <strong>${esc(source?.publisher || 'Official Public Source')}</strong>
                <p>${esc(source?.title || 'Public Register')}</p>
              </div>
            </div>

            ${
              source?.notes
                ? `<p class="provenance-notes"><strong>Source notes:</strong> ${esc(source.notes)}</p>`
                : ''
            }

            ${
              source?.terms
                ? `<p class="provenance-terms"><strong>Reuse terms:</strong> ${esc(source.terms)}</p>`
                : ''
            }

            <div class="provenance-actions">
              ${
                sourceLinkUrl
                  ? `<a
                       class="btn btn-primary btn-sm source-external-link"
                       href="${esc(sourceLinkUrl)}"
                       target="_blank"
                       rel="noopener noreferrer"
                     >
                       ${icon('globe')}
                       <span>Read original source document</span>
                     </a>`
                  : `<span class="muted">Original source link not available</span>`
              }
              ${
                safeUrl(source?.termsUrl)
                  ? `<a
                       class="text-link"
                       href="${esc(safeUrl(source.termsUrl))}"
                       target="_blank"
                       rel="noopener noreferrer"
                     >
                       Publisher website policies ↗
                     </a>`
                  : ''
              }
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderMapView(all, filtered, coordinatesCount, missingCoordinatesCount, stateEntries, selectedFacility, sources) {
    const mappedFacilities = filtered.filter(hasValidCoordinates);

    return `
      <div class="directory-map-container">
        <!-- India Map Panel -->
        <section class="panel map-view-panel" aria-label="India facilities geographic overview">
          <div class="panel-header">
            <div>
              <span class="eyebrow">GEOGRAPHIC OVERVIEW</span>
              <h2>Mapped Facility Locations</h2>
              <p>Plotting only records with verified, publisher-supplied coordinates.</p>
            </div>
            <div class="badge ${coordinatesCount > 0 ? 'green' : 'neutral'}">
              ${coordinatesCount} geolocated of ${all.length} total
            </div>
          </div>

          <div class="india-map" role="region" aria-label="India map plotting verified coordinates">
            <svg viewBox="0 0 440 410" role="img" aria-label="India overview showing source-supplied facility coordinates">
              <defs>
                <pattern id="dir-geogrid" width="28" height="28" patternUnits="userSpaceOnUse">
                  <path d="M28 0H0V28" fill="none" stroke="#d9e0d7" stroke-width=".7"/>
                </pattern>
              </defs>
              <rect width="440" height="410" fill="#f0f4ed"/>
              <rect width="440" height="410" fill="url(#dir-geogrid)"/>
              <path
                d="m130 38 31-8 16 19 19 4 9 22 26 4 13 20-15 21 18 23 45 3 19-18 28 3 21-12 27 6-7 18-25 11-11 22-20-7-27 9-22-7-17 21-16 15-8 28-19 22-13 37-22 42-16 40-15-7-8-28-13-25-8-34-16-14-10-30-17-11-12-34-17-14-24 1-13-20 12-20 22 2 14-19 4-21 19-9 5-21-10-16 8-20Z"
                fill="#dce7d2"
                stroke="#a8bba0"
                stroke-width="1.5"
              />
              <path
                d="m132 123 37 26 24-6 37 27M138 182l36 28 44-4M173 211l-9 45 28 21M203 79l-30 24-5 46M248 156l-41 26 11 24M184 277l-5 41"
                fill="none"
                stroke="#c0d0b8"
                stroke-width="1"
              />
              <text x="25" y="32" font-size="11" font-family="monospace" fill="#778471">INDIA · GEOGRAPHIC PROJECTION</text>
              <text x="330" y="376" font-size="11" font-family="monospace" fill="#778471">N ↑</text>

              ${mappedFacilities
                .map(f => {
                  const cx = ((f.longitude - 67) / 32) * 380 + 30;
                  const cy = ((38 - f.latitude) / 32) * 350 + 28;
                  const isSel = selectedFacility && selectedFacility.id === f.id;
                  return `
                    <circle
                      cx="${cx.toFixed(1)}"
                      cy="${cy.toFixed(1)}"
                      r="${isSel ? '8' : '5'}"
                      fill="${isSel ? '#d6ef67' : '#335e40'}"
                      stroke="${isSel ? '#1e2723' : '#ffffff'}"
                      stroke-width="${isSel ? '2.5' : '1.5'}"
                      data-action="select-facility"
                      data-id="${esc(f.id)}"
                      style="cursor: pointer;"
                    >
                      <title>${esc(f.name)} (${esc(f.district || f.state)})</title>
                    </circle>
                  `;
                })
                .join('')}
            </svg>

            <div class="map-caption">
              ${
                mappedFacilities.length > 0
                  ? `<strong>${mappedFacilities.length}</strong> source-supplied coordinate${
                      mappedFacilities.length === 1 ? '' : 's'
                    } plotted.`
                  : `<strong>No reliable facility coordinates</strong> in the reviewed source records.`
              }
              <span>${missingCoordinatesCount} of ${all.length} records lack coordinates and remain searchable by physical address.</span>
            </div>
          </div>
        </section>

        <!-- State Coverage Breakdown Panel (Visually Distinct) -->
        <section class="panel state-coverage-panel" aria-label="State-level coverage metrics">
          <div class="panel-header">
            <div>
              <span class="eyebrow">DATASET SCOPE</span>
              <h2>State Coverage Distribution</h2>
              <p>Actual counts from reviewed public registers.</p>
            </div>
            <span class="badge neutral">${stateEntries.length} states covered</span>
          </div>

          <div class="panel-body">
            <div class="coverage-metric-cards">
              ${stateEntries
                .map(([stateName, count]) => {
                  const pct = ((count / all.length) * 100).toFixed(1);
                  return `
                    <div class="coverage-card" data-action="filter-state" data-state="${esc(stateName)}">
                      <div class="coverage-card-header">
                        <strong>${esc(stateName)}</strong>
                        <span class="coverage-badge">${count} records (${pct}%)</span>
                      </div>
                      <div class="coverage-bar-track" aria-hidden="true">
                        <div class="coverage-bar-fill" style="width: ${pct}%;"></div>
                      </div>
                      <div class="coverage-card-meta">
                        <small>Click to filter by ${esc(stateName)}</small>
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>

            <div class="coverage-gap-notice">
              <span class="gap-icon">${icon('shield')}</span>
              <div>
                <strong>National Coverage Gaps (Honest Disclosure):</strong>
                <p>
                  This initial dataset is restricted to reviewed e-waste facility registries in Maharashtra, Rajasthan, and Haryana.
                  The remaining 25 states and all Union Territories currently have 0 records in this bundle.
                  ScrapLoop does not simulate or extrapolate data for uncovered jurisdictions.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  // --- Event Handling ---
  async function handleClick(e) {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.dataset.action;

    if (action === 'import') {
      if (state.importing) return;
      state.importing = true;
      render();
      try {
        const res = await context.api('/api/import-public', {
          method: 'POST',
          body: JSON.stringify({}),
        });
        await context.refreshData();
        const total = res?.totalFacilities ?? res?.importedFacilities ?? getFacilities().length;
        context.toast(`Public records imported. ${total} facilities in your directory.`);
      } catch (err) {
        context.toast(err.message || 'Import failed.', true);
      } finally {
        state.importing = false;
        render();
      }
      return;
    }

    if (action === 'view') {
      const newView = actionEl.dataset.view;
      if (newView && ['list', 'map'].includes(newView)) {
        state.view = newView;
        render();
      }
      return;
    }

    if (action === 'clear-filters') {
      state.search = '';
      state.stateFilter = '';
      state.districtFilter = '';
      state.industryFilter = '';
      render();
      const searchInput = root.querySelector('#directory-search');
      if (searchInput) searchInput.focus();
      return;
    }

    if (action === 'select-facility') {
      const id = actionEl.dataset.id;
      if (id) {
        state.focusedBeforeDetail = actionEl;
        state.selectedId = id;
        render();
        // Focus detail container on desktop/mobile
        const detailCard = root.querySelector('.facility-detail-card');
        if (detailCard) detailCard.focus();
      }
      return;
    }

    if (action === 'deselect-facility' || action === 'back-to-list') {
      state.selectedId = null;
      render();
      if (state.focusedBeforeDetail && state.focusedBeforeDetail.isConnected) {
        state.focusedBeforeDetail.focus();
      } else {
        const firstFacility = root.querySelector('.facility-name');
        if (firstFacility) firstFacility.focus();
      }
      return;
    }

    if (action === 'filter-state') {
      const st = actionEl.dataset.state;
      if (st) {
        state.stateFilter = st;
        state.districtFilter = '';
        state.view = 'list';
        render();
      }
      return;
    }
  }

  function handleInput(e) {
    if (e.target.id === 'directory-search') {
      state.search = e.target.value;
      const cursor = e.target.selectionStart;
      render();
      const input = root.querySelector('#directory-search');
      if (input) {
        input.focus();
        try {
          input.setSelectionRange(cursor, cursor);
        } catch {
          // ignore selection errors on unsupported devices
        }
      }
    }
  }

  function handleChange(e) {
    if (e.target.id === 'directory-state') {
      state.stateFilter = e.target.value;
      state.districtFilter = ''; // Reset district when state changes
      render();
      const el = root.querySelector('#directory-state');
      if (el) el.focus();
    } else if (e.target.id === 'directory-district') {
      state.districtFilter = e.target.value;
      render();
      const el = root.querySelector('#directory-district');
      if (el) el.focus();
    } else if (e.target.id === 'directory-industry') {
      state.industryFilter = e.target.value;
      render();
      const el = root.querySelector('#directory-industry');
      if (el) el.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape' && state.selectedId) {
      state.selectedId = null;
      render();
      if (state.focusedBeforeDetail && state.focusedBeforeDetail.isConnected) {
        state.focusedBeforeDetail.focus();
      }
    }
  }

  root.addEventListener('click', handleClick);
  root.addEventListener('input', handleInput);
  root.addEventListener('change', handleChange);
  root.addEventListener('keydown', handleKeyDown);

  // Initial render
  render();

  // Return cleanup function per contract
  return () => {
    isMounted = false;
    root.removeEventListener('click', handleClick);
    root.removeEventListener('input', handleInput);
    root.removeEventListener('change', handleChange);
    root.removeEventListener('keydown', handleKeyDown);
    root.innerHTML = '';
  };
}
