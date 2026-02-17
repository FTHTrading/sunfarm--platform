/* dashboard/components/layout.js — HTML layout wrapper */

function layout(title, nav, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — SunFarm PV Platform</title>
  <link rel="stylesheet" href="/style.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
</head>
<body>
  <header>
    <div class="header-inner">
      <h1 class="logo">☀️ SunFarm PV — 50 MW Platform</h1>
      <span class="subtitle">Institutional-Grade Project Dashboard</span>
    </div>
  </header>
  <div class="container">
    <aside class="sidebar">${nav}</aside>
    <main class="content">
      <h2 class="page-title">${title}</h2>
      ${body}
    </main>
  </div>
  <footer>
    <p>SunFarm PV — Confidential — For Qualified Investors Only</p>
  </footer>
</body>
</html>`;
}

module.exports = { layout };
