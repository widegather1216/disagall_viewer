const fs = require('fs');

// We simulate the DOM using a simple regex-based DOM mock for testing dc_sample.html
const html = fs.readFileSync('dc_sample.html', 'utf-8');

// Find all img tags in write_div
const writeDivIdx = html.indexOf('class="write_div"');
const writeDivEnd = html.indexOf('</div>', writeDivIdx);
const writeDivHtml = html.slice(writeDivIdx, writeDivIdx + 3000);

console.log('--- write_div preview ---');
console.log(writeDivHtml.slice(0, 500));

// Find img tags
const imgMatches = [...writeDivHtml.matchAll(/<img\s+([^>]+)>/g)];
console.log('\nFound img count in write_div:', imgMatches.length);
imgMatches.forEach((m, i) => {
  console.log(`[Img ${i}]`, m[1]);
});
