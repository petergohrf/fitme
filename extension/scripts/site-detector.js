// Inlined from config/sites.json — keep in sync when sites.json changes.
const SITES_CONFIG = {
  fitmeHost: 'https://petergohrf.github.io/fitme',
  sites: [
    { name: 'loft',       type: 'chart',    hostPattern: 'loft\\.com',       productPattern: '/product/|/p/' },
    { name: 'anntaylor',  type: 'chart',    hostPattern: 'anntaylor\\.com',  productPattern: '/product/|/p/' },
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
