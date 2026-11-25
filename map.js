/* Tile-grid cartogram map for the AI Governance Trackers.
 * One component, used by the EU tracker and the ASEAN tracker.
 * Each country is one clearly labelled tile positioned roughly geographically.
 * This is a cartogram of tiles, NOT geographic borders: every country is
 * visible and labelled, including tiny ones (Malta, Luxembourg, Cyprus,
 * Singapore, Brunei). Counts are computed from the tracker's own data
 * (incidents / responses / instruments) at render time, never hard-coded,
 * so the map stays correct when the data updates.
 *
 * Usage:
 *   TileMap.render(container, {
 *     region: 'eu' | 'asean',
 *     data: DATA,              // tracker data blob {incidents, responses, instruments}
 *     metric: 'total',         // initial metric
 *     selected: null,          // currently selected country code, or null
 *     onSelect: function(code) // called with the code clicked, or null to clear
 *   });
 */
(function (global) {
  'use strict';

  var LAYOUTS = {
    eu: {
      label: 'European Union',
      regional: { code: 'EU', name: 'European Union (EU-wide)' },
      places: [
        { code: 'SE', name: 'Sweden', row: 0, col: 5 },
        { code: 'FI', name: 'Finland', row: 0, col: 7 },
        { code: 'EE', name: 'Estonia', row: 0, col: 8 },
        { code: 'DK', name: 'Denmark', row: 1, col: 3 },
        { code: 'LT', name: 'Lithuania', row: 1, col: 7 },
        { code: 'LV', name: 'Latvia', row: 1, col: 8 },
        { code: 'IE', name: 'Ireland', row: 2, col: 0 },
        { code: 'NL', name: 'Netherlands', row: 2, col: 2 },
        { code: 'DE', name: 'Germany', row: 2, col: 4 },
        { code: 'PL', name: 'Poland', row: 2, col: 6 },
        { code: 'BE', name: 'Belgium', row: 3, col: 2 },
        { code: 'LU', name: 'Luxembourg', row: 3, col: 3 },
        { code: 'CZ', name: 'Czechia', row: 3, col: 4 },
        { code: 'AT', name: 'Austria', row: 3, col: 5 },
        { code: 'SK', name: 'Slovakia', row: 3, col: 6 },
        { code: 'FR', name: 'France', row: 4, col: 1 },
        { code: 'SI', name: 'Slovenia', row: 4, col: 5 },
        { code: 'HU', name: 'Hungary', row: 4, col: 6 },
        { code: 'HR', name: 'Croatia', row: 4, col: 7 },
        { code: 'RO', name: 'Romania', row: 4, col: 8 },
        { code: 'ES', name: 'Spain', row: 5, col: 1 },
        { code: 'IT', name: 'Italy', row: 5, col: 3 },
        { code: 'BG', name: 'Bulgaria', row: 5, col: 8 },
        { code: 'PT', name: 'Portugal', row: 6, col: 0 },
        { code: 'MT', name: 'Malta', row: 6, col: 3 },
        { code: 'GR', name: 'Greece', row: 6, col: 7 },
        { code: 'CY', name: 'Cyprus', row: 6, col: 8 }
      ],
      cols: 9,
      /* Narrower layout for phones: 5 columns instead of 9, so each tile is
       * wide enough for its country name to fit on one line. Same countries,
       * roughly the same geography (north at the top, west on the left). */
      mobile: {
        cols: 5,
        places: [
          { code: 'SE', name: 'Sweden', row: 0, col: 2 },
          { code: 'FI', name: 'Finland', row: 0, col: 3 },
          { code: 'EE', name: 'Estonia', row: 0, col: 4 },
          { code: 'DK', name: 'Denmark', row: 1, col: 1 },
          { code: 'LT', name: 'Lithuania', row: 1, col: 3 },
          { code: 'LV', name: 'Latvia', row: 1, col: 4 },
          { code: 'IE', name: 'Ireland', row: 2, col: 0 },
          { code: 'NL', name: 'Netherlands', row: 2, col: 1 },
          { code: 'DE', name: 'Germany', row: 2, col: 2 },
          { code: 'PL', name: 'Poland', row: 2, col: 3 },
          { code: 'BE', name: 'Belgium', row: 3, col: 1 },
          { code: 'CZ', name: 'Czechia', row: 3, col: 2 },
          { code: 'AT', name: 'Austria', row: 3, col: 3 },
          { code: 'SK', name: 'Slovakia', row: 3, col: 4 },
          { code: 'FR', name: 'France', row: 4, col: 0 },
          { code: 'LU', name: 'Luxembourg', row: 4, col: 1 },
          { code: 'SI', name: 'Slovenia', row: 4, col: 2 },
          { code: 'HU', name: 'Hungary', row: 4, col: 3 },
          { code: 'HR', name: 'Croatia', row: 4, col: 4 },
          { code: 'ES', name: 'Spain', row: 5, col: 0 },
          { code: 'IT', name: 'Italy', row: 5, col: 1 },
          { code: 'RO', name: 'Romania', row: 5, col: 3 },
          { code: 'BG', name: 'Bulgaria', row: 5, col: 4 },
          { code: 'PT', name: 'Portugal', row: 6, col: 0 },
          { code: 'MT', name: 'Malta', row: 6, col: 1 },
          { code: 'GR', name: 'Greece', row: 6, col: 3 },
          { code: 'CY', name: 'Cyprus', row: 6, col: 4 }
        ]
      }
    },
    asean: {
      label: 'ASEAN',
      regional: { code: 'ASEAN', name: 'ASEAN (regional)' },
      places: [
        { code: 'PH', name: 'Philippines', row: 0, col: 4 },
        { code: 'MM', name: 'Myanmar', row: 1, col: 0 },
        { code: 'TH', name: 'Thailand', row: 1, col: 1 },
        { code: 'LA', name: 'Laos', row: 1, col: 2 },
        { code: 'VN', name: 'Vietnam', row: 1, col: 3 },
        { code: 'KH', name: 'Cambodia', row: 2, col: 2 },
        { code: 'MY', name: 'Malaysia', row: 3, col: 1 },
        { code: 'BN', name: 'Brunei', row: 3, col: 4 },
        { code: 'SG', name: 'Singapore', row: 4, col: 1 },
        { code: 'ID', name: 'Indonesia', row: 4, col: 2 },
        { code: 'TL', name: 'Timor-Leste', row: 4, col: 4 }
      ],
      cols: 5
    }
  };

  var METRICS = [
    { key: 'total', label: 'Total' },
    { key: 'incidents', label: 'Incidents' },
    { key: 'responses', label: 'Responses' },
    { key: 'instruments', label: 'Instruments' }
  ];

  /* Counts per place, computed from the tracker's own rows. Responses are
   * attributed to the country of the incident they answer; a response with
   * no incident link is attributed to its own id prefix (e.g. NL-R-01). */
  function computeCounts(data) {
    var counts = {};
    function ensure(code) {
      if (!counts[code]) counts[code] = { incidents: 0, responses: 0, instruments: 0, total: 0 };
      return counts[code];
    }
    var incById = {};
    (data.incidents || []).forEach(function (i) {
      incById[i.id] = i;
      ensure(i.country).incidents += 1;
    });
    (data.instruments || []).forEach(function (p) {
      ensure(p.jurisdiction).instruments += 1;
    });
    (data.responses || []).forEach(function (r) {
      var code = null;
      if (r.incident_id && incById[r.incident_id]) code = incById[r.incident_id].country;
      else if (r.id) code = r.id.split('-')[0];
      if (code) ensure(code).responses += 1;
    });
    Object.keys(counts).forEach(function (code) {
      var c = counts[code];
      c.total = c.incidents + c.responses + c.instruments;
    });
    return counts;
  }

  /* Colour bins are quartiles of the largest value for the chosen metric,
   * so the same scale works for a region whose busiest place has 34 rows
   * and one whose busiest has 11. Bins: 0, then (0, t1], (t1, t2], (t2, t3],
   * (t3, max] with t1/t2/t3 the quarter marks, rounded up to whole rows. */
  function thresholds(max) {
    return [Math.ceil(max / 4), Math.ceil(max / 2), Math.ceil((3 * max) / 4)];
  }

  function binIndex(value, max) {
    if (value <= 0 || max <= 0) return 0;
    var t = thresholds(max);
    if (value <= t[0]) return 1;
    if (value <= t[1]) return 2;
    if (value <= t[2]) return 3;
    return 4;
  }

  function binRange(i, max) {
    if (i === 0) return [0, 0];
    var t = thresholds(max);
    var lo = [1, t[0] + 1, t[1] + 1, t[2] + 1][i - 1];
    var hi = [t[0], t[1], t[2], max][i - 1];
    return lo <= hi ? [lo, hi] : null;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* True when the viewport is a phone width and a region has a narrower
   * mobile layout. Exposed so the viewer can re-render when the user
   * crosses the breakpoint (e.g. rotating the phone). */
  function isMobileLayout() {
    return typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(max-width: 640px)').matches;
  }

  function render(container, opts) {
    var base = LAYOUTS[opts.region];
    if (!base) throw new Error('TileMap: unknown region ' + opts.region);
    var layout = (base.mobile && isMobileLayout())
      ? { label: base.label, regional: base.regional, places: base.mobile.places, cols: base.mobile.cols }
      : base;
    var data = opts.data || {};
    var counts = computeCounts(data);
    var metric = opts.metric || 'total';
    var selected = opts.selected || null;
    var onSelect = opts.onSelect || function () {};

    var allCodes = [layout.regional.code].concat(layout.places.map(function (p) { return p.code; }));
    var max = 0;
    allCodes.forEach(function (code) {
      var c = counts[code] || { incidents: 0, responses: 0, instruments: 0, total: 0 };
      if (c[metric] > max) max = c[metric];
    });
    var totals = { incidents: 0, responses: 0, instruments: 0, total: 0 };
    allCodes.forEach(function (code) {
      var c = counts[code];
      if (!c) return;
      totals.incidents += c.incidents;
      totals.responses += c.responses;
      totals.instruments += c.instruments;
      totals.total += c.total;
    });

    function tileHTML(place, isRegional) {
      var code = place.code;
      var c = counts[code] || { incidents: 0, responses: 0, instruments: 0, total: 0 };
      var bin = binIndex(c[metric], max);
      /* The accessible name starts with the visible text (code, name, number), so voice-control users can say what they see. */
      var label = code + ' ' + place.name + ' ' + c[metric] + ': ' + c.incidents + ' incident' + (c.incidents === 1 ? '' : 's') +
        ', ' + c.responses + ' response' + (c.responses === 1 ? '' : 's') +
        ', ' + c.instruments + ' instrument' + (c.instruments === 1 ? '' : 's') +
        ', ' + c.total + ' total';
      /* Tooltip alignment: edge tiles align the tooltip to their edge so it
       * never hangs off the side of the screen on a phone. Top-row and
       * regional tiles show it below instead of above, so it never hangs
       * off the top of the viewport when the map is at the top of the
       * screen. */
      var tipCls = isRegional ? ' tip-left tip-below'
        : (place.col <= 1 ? ' tip-left'
          : (place.col >= layout.cols - 2 ? ' tip-right' : '')) +
          (place.row === 0 ? ' tip-below' : '');
      var cls = 'tile bin-' + bin + (isRegional ? ' regional' : '') + tipCls +
        (selected === code ? ' selected' : '');
      var pos = isRegional ? '' : ' style="grid-row:' + (place.row + 1) + ';grid-column:' + (place.col + 1) + '"';
      return '<button type="button" class="' + cls + '"' + pos +
        ' data-code="' + esc(code) + '" aria-pressed="' + (selected === code) + '"' +
        ' aria-label="' + esc(label) + '">' +
        '<span class="tile-code">' + esc(code) + '</span> ' +
        '<span class="tile-name">' + esc(place.name) + '</span> ' +
        '<span class="tile-value">' + c[metric] + '</span>' +
        '<span class="tile-tip" aria-hidden="true">' + esc(place.name) + '<br>' +
        c.incidents + ' incidents · ' + c.responses + ' responses<br>' +
        c.instruments + ' instruments · ' + c.total + ' total</span>' +
        '</button>';
    }

    var html = '';
    html += '<div class="map-head"><div class="map-total"><strong>' + esc(layout.label) +
      ' total: ' + totals.incidents + ' incidents · ' + totals.responses +
      ' responses · ' + totals.instruments + ' instruments · ' + totals.total +
      ' records</strong></div>';
    html += '<div class="map-metrics" role="group" aria-label="Colour the map by">';
    METRICS.forEach(function (m) {
      html += '<button type="button" class="metric' + (metric === m.key ? ' active' : '') +
        '" data-metric="' + m.key + '" aria-pressed="' + (metric === m.key) + '">' + m.label + '</button>';
    });
    html += '</div></div>';
    html += '<div class="map-regional">' + tileHTML(layout.regional, true) + '</div>';
    html += '<div class="map-grid" style="grid-template-columns:repeat(' + layout.cols + ',minmax(0,1fr))">';
    layout.places.forEach(function (p) { html += tileHTML(p, false); });
    html += '</div>';
    html += '<div class="map-legend"><span class="legend-title">Rows per place (' +
      esc(metric) + '):</span>';
    for (var b = 0; b <= 4; b++) {
      var range = binRange(b, max);
      if (!range) continue; /* empty bin (e.g. every non-zero place has 1) */
      var lab = range[0] === range[1] ? String(range[0]) : range[0] + ' – ' + range[1];
      html += '<span class="legend-item"><span class="swatch bin-' + b + '"></span>' +
        esc(lab) + '</span>';
    }
    html += '</div>';
    html += '<p class="map-note">Tile cartogram — each country is one tile, positioned roughly ' +
      'geographically. Tiles are not geographic borders. Click a tile to filter the ' +
      'tracker below to that place; click it again to clear. Hover or tap a tile to ' +
      'see its numbers.</p>';

    container.innerHTML = html;

    container.querySelectorAll('.tile').forEach(function (el) {
      el.addEventListener('click', function () {
        var code = el.getAttribute('data-code');
        onSelect(selected === code ? null : code);
      });
    });
    container.querySelectorAll('.metric').forEach(function (el) {
      el.addEventListener('click', function () {
        var m = el.getAttribute('data-metric');
        if (opts.onMetric) opts.onMetric(m);
        render(container, {
          region: opts.region, data: data, metric: m,
          selected: selected, onSelect: onSelect, onMetric: opts.onMetric
        });
      });
    });
  }

  global.TileMap = { render: render, computeCounts: computeCounts, isMobileLayout: isMobileLayout };
})(typeof window !== 'undefined' ? window : this);
