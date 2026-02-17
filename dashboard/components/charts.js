/* dashboard/components/charts.js — Chart rendering utilities */

function barChart(canvasId, labels, datasets, options = {}) {
  const dsJson = JSON.stringify(datasets);
  const labelsJson = JSON.stringify(labels);
  const title = options.title || '';
  const yLabel = options.yLabel || '';
  const stacked = options.stacked ? 'true' : 'false';

  return `<canvas id="${canvasId}" height="${options.height || 300}"></canvas>
<script>
(function() {
  const ctx = document.getElementById('${canvasId}').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: { labels: ${labelsJson}, datasets: ${dsJson} },
    options: {
      responsive: true,
      plugins: { title: { display: ${title ? 'true' : 'false'}, text: '${title}', font: { size: 16 } }, legend: { position: 'top' } },
      scales: {
        x: { stacked: ${stacked} },
        y: { stacked: ${stacked}, title: { display: ${yLabel ? 'true' : 'false'}, text: '${yLabel}' }, ticks: { callback: function(v) { return '$' + (v/1e6).toFixed(1) + 'M'; } } }
      }
    }
  });
})();
</script>`;
}

function lineChart(canvasId, labels, datasets, options = {}) {
  const dsJson = JSON.stringify(datasets);
  const labelsJson = JSON.stringify(labels);
  const title = options.title || '';
  const yLabel = options.yLabel || '';

  return `<canvas id="${canvasId}" height="${options.height || 300}"></canvas>
<script>
(function() {
  const ctx = document.getElementById('${canvasId}').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: { labels: ${labelsJson}, datasets: ${dsJson} },
    options: {
      responsive: true,
      plugins: { title: { display: ${title ? 'true' : 'false'}, text: '${title}', font: { size: 16 } }, legend: { position: 'top' } },
      scales: {
        y: { title: { display: ${yLabel ? 'true' : 'false'}, text: '${yLabel}' }, ticks: { callback: function(v) { return '$' + (v/1e6).toFixed(1) + 'M'; } } }
      }
    }
  });
})();
</script>`;
}

function doughnutChart(canvasId, labels, data, colors, options = {}) {
  const title = options.title || '';
  return `<canvas id="${canvasId}" height="${options.height || 250}"></canvas>
<script>
(function() {
  const ctx = document.getElementById('${canvasId}').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ${JSON.stringify(labels)},
      datasets: [{ data: ${JSON.stringify(data)}, backgroundColor: ${JSON.stringify(colors)}, borderWidth: 2 }]
    },
    options: {
      responsive: true,
      plugins: { title: { display: ${title ? 'true' : 'false'}, text: '${title}', font: { size: 16 } }, legend: { position: 'right' } }
    }
  });
})();
</script>`;
}

function table(headers, rows) {
  const ths = headers.map(h => `<th>${h}</th>`).join('');
  const trs = rows.map(row => {
    const tds = row.map(cell => `<td>${cell}</td>`).join('');
    return `<tr>${tds}</tr>`;
  }).join('\n');
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

function kpiCard(label, value, subtitle = '') {
  return `<div class="kpi-card">
    <div class="kpi-value">${value}</div>
    <div class="kpi-label">${label}</div>
    ${subtitle ? `<div class="kpi-sub">${subtitle}</div>` : ''}
  </div>`;
}

function kpiRow(cards) {
  return `<div class="kpi-row">${cards.join('')}</div>`;
}

module.exports = { barChart, lineChart, doughnutChart, table, kpiCard, kpiRow };
