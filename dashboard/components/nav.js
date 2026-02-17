/* dashboard/components/nav.js — Navigation component */

const pages = [
  { path: '/', label: 'Executive Overview', icon: '📊' },
  { path: '/cashflow', label: '25-Year Cash Flow', icon: '💰' },
  { path: '/capital', label: 'Capital Stack', icon: '🏗️' },
  { path: '/token', label: 'Token Waterfall', icon: '🪙' },
  { path: '/carbon', label: 'Carbon Revenue', icon: '🌱' },
  { path: '/bess', label: 'BESS Revenue', icon: '🔋' },
  { path: '/land', label: 'Land Monetization', icon: '🌾' },
];

function nav(activePath) {
  const items = pages.map(p => {
    const active = p.path === activePath ? ' class="active"' : '';
    return `<a href="${p.path}"${active}><span class="nav-icon">${p.icon}</span> ${p.label}</a>`;
  }).join('\n      ');

  return `<nav>
      ${items}
    </nav>`;
}

module.exports = { nav, pages };
