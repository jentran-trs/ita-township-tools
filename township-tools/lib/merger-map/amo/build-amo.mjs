// Builds the paste-into-AMO block for the ITA website merger map.
// Usage (from township-tools/): node lib/merger-map/amo/build-amo.mjs "../../ita-amo-management/Site Pages/ITA_merger_meeting_map.html"
import fs from 'fs';
const src = fs.readFileSync(new URL('../indiana-counties.ts', import.meta.url),'utf8');
const arr = JSON.parse(src.slice(src.indexOf('= [')+2, src.lastIndexOf(']')+1).replace(/,\n\]$/,']').replace(/,\s*\]$/,']'));
const vb = src.match(/INDIANA_VIEWBOX = '([^']+)'/)[1];
const compact = '[\n' + arr.map(c => JSON.stringify([c.name, c.d, c.cx, c.cy])).join(',\n') + '\n  ]';
let t = fs.readFileSync(new URL('./amo-template.html', import.meta.url),'utf8').replace('__COUNTIES__', compact).replace('__VIEWBOX__', vb);
fs.writeFileSync(process.argv[2] || 'ITA_merger_meeting_map.html', t);
console.log(arr.length, (t.length/1024).toFixed(0)+'KB');
