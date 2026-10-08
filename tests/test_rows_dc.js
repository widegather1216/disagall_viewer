const fs = require('fs');
const html = fs.readFileSync('dc_sample.html', 'utf-8');

// Find all tr.ub-content in table.gall_list
const trMatches = [...html.matchAll(/<tr\s+class="ub-content\s*([^"]*)"[\s\S]*?<\/tr>/g)];
console.log('Total tr.ub-content found:', trMatches.length);

const parsedRows = trMatches.map((m, idx) => {
  const trHtml = m[0];
  const trClass = m[1];

  const numMatch = trHtml.match(/<td\s+class="gall_num"[^>]*>([\s\S]*?)<\/td>/);
  const numText = numMatch ? numMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  const subjectMatch = trHtml.match(/<td\s+class="gall_subject"[^>]*>([\s\S]*?)<\/td>/);
  const subjectText = subjectMatch ? subjectMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  const linkMatch = trHtml.match(/<td\s+class="gall_tit[^"]*"[^>]*>[\s\S]*?<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
  const linkHref = linkMatch ? linkMatch[1] : '';
  const linkTitle = linkMatch ? linkMatch[2].replace(/<[^>]+>/g, '').trim() : '';

  const isCrt = trClass.includes('crt') || trHtml.includes('crt_icon');

  return { idx, numText, subjectText, linkHref, linkTitle, isCrt };
});

const validRows = parsedRows.filter(r => {
  if (!r.linkHref) return false;
  if (r.numText === '-' || !r.numText) return false;
  if (r.subjectText === '공지' || r.subjectText === 'AD' || r.subjectText === '설문') return false;
  return true;
});

console.log('Valid rows count:', validRows.length);
console.log('First 5 valid rows:');
validRows.slice(0, 5).forEach(r => console.log(`  [#${r.numText}] isCrt=${r.isCrt} ${r.subjectText} | ${r.linkTitle.slice(0, 30)}`));

const crtRow = validRows.find(r => r.isCrt);
console.log('\nCurrent (crt) row in validRows:', crtRow ? `#${crtRow.numText} | ${crtRow.linkTitle}` : 'NOT FOUND!');
