// Reads Amazon's "Size Chart" popover directly from the page's own DOM instead of
// going through Jina AI Reader. Amazon's bot detection blocks Jina's crawler outright
// (see the note in jina-client.js), but this content script is already running inside
// the user's own already-rendered, already-authenticated tab — there's no external
// fetch here for Amazon to block.
//
// The chart markup does not exist in the DOM until the "Size Chart" popover trigger is
// clicked; Amazon then appends the table near the end of the document, not inline next
// to the trigger. This targets Amazon's "sizeChartV2" widget specifically (confirmed via
// a saved product page) — older/different chart widgets, or listings with no size chart
// at all, fall back to the normal "no chart found" panel.

function readAmazonSizeChart() {
  return new Promise((resolve) => {
    const trigger = document.querySelector('#sizeChartV2Data_feature_div .a-popover-trigger');
    if (!trigger) {
      resolve(null);
      return;
    }

    trigger.click();

    const deadline = Date.now() + 5000;
    const poll = setInterval(() => {
      const tables = document.querySelectorAll('.fit-sizechartv2-tables-wrapper table');
      if (tables.length > 0) {
        clearInterval(poll);
        const markdown = Array.from(tables).map(tableToMarkdown).filter(Boolean).join('\n\n');
        closePopover();
        resolve(markdown || null);
        return;
      }
      if (Date.now() > deadline) {
        clearInterval(poll);
        closePopover();
        resolve(null);
      }
    }, 200);
  });
}

function closePopover() {
  document.querySelector('[data-action="a-popover-close"]')?.click();
}

function tableToMarkdown(table) {
  const rows = Array.from(table.querySelectorAll('tr')).map((tr) =>
    Array.from(tr.children).map((cell) => cell.textContent.trim().replace(/\s+/g, ' '))
  );
  if (rows.length < 2) return '';
  const line = (cells) => '| ' + cells.join(' | ') + ' |';
  const separator = rows[0].map(() => '---');
  return [line(rows[0]), line(separator), ...rows.slice(1).map(line)].join('\n');
}
