// Inlined from config/sites.json — keep in sync when sites.json changes.
const SITES_CONFIG = {
  fitmeHost: 'https://petergohrf.github.io/fitme',
  sites: [
    { name: 'loft',       type: 'chart',    hostPattern: 'loft\\.com',       productPattern: '\\d{4,}\\.html' },
    { name: 'anntaylor',  type: 'chart',    hostPattern: 'anntaylor\\.com',  productPattern: '\\d{5,}\\.html' },
    { name: 'amazon',     type: 'chart',    hostPattern: 'amazon\\.com',     productPattern: '/dp/|/gp/product/' },
    { name: 'poshmark',   type: 'tag-only', hostPattern: 'poshmark\\.com',   productPattern: '/listing/' },
  ]
};

function detectSite(url) {
  for (const site of SITES_CONFIG.sites) {
    if (new RegExp(site.hostPattern).test(url) && new RegExp(site.productPattern).test(url)) {
      return { name: site.name, type: site.type };
    }
  }
  return null;
}

// Allow Node.js unit testing — no-op in browser (no module global)
if (typeof module !== 'undefined') {
  module.exports = { detectSite };
}
