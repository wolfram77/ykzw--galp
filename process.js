const fs   = require('fs');
const os   = require('os');
const path = require('path');
const readline = require('readline');

const RGRAPH = /^Reading graph from file:\s*.*\/(.*?)\.mtx\.elist/m;
const RORDER = /^Nodes: (.+?), Edges: (.+)/m;
const RMODUL = /^ParallelLeiden: Runtime: (.+?)ms, Modularity: (.+)/m;
const RTTIME = /^Total time: (.+)/m;
const RNCOMS = /^Number of communities: (.+)/m;




// *-FILE
// ------

function readFile(pth) {
  var d = fs.readFileSync(pth, 'utf8');
  return d.replace(/\r?\n/g, '\n');
}

function writeFile(pth, d) {
  d = d.replace(/\r?\n/g, os.EOL);
  fs.writeFileSync(pth, d);
}




// *-CSV
// -----

function writeCsv(pth, rows) {
  var cols = Object.keys(rows[0]);
  var a = cols.join()+'\n';
  for (var r of rows)
    a += [...Object.values(r)].map(v => `"${v}"`).join()+'\n';
  writeFile(pth, a);
}




// *-LOG
// -----

function readLogLine(ln, data, state) {
  state = state || {};
  ln = ln.replace(/^\d+-\d+-\d+ \d+:\d+:\d+\s+/, '');
  if (RGRAPH.test(ln)) {
    var [, graph] = RGRAPH.exec(ln);
    if (!data.has(graph)) data.set(graph, []);
    state.graph = graph;
  }
  else if (RORDER.test(ln)) {
    var [, order, size] = RORDER.exec(ln);
    state.order = order;
    state.size  = size;
  }
  else if (RMODUL.test(ln)) {
    var [,, modularity] = RMODUL.exec(ln);
    state.modularity = parseFloat(modularity);
  }
  else if (RTTIME.test(ln)) {
    var [, total_time] = RTTIME.exec(ln);
    state.total_time = 1000 * parseFloat(total_time);
  }
  else if (RNCOMS.test(ln)) {
    var [, communities] = RNCOMS.exec(ln);
    data.get(state.graph).push(Object.assign({}, state, {
      communities: parseFloat(communities),
    }));
  }
  return state;
}

function readLog(pth) {
  var text  = readFile(pth);
  var lines = text.split('\n');
  var data  = new Map();
  var state = null;
  for (var ln of lines)
    state = readLogLine(ln, data, state);
  return data;
}




// PROCESS-*
// ---------

function processCsv(data) {
  var a = [];
  for (var rows of data.values())
    a.push(...rows);
  return a;
}




// HEADER LINES
// ------------

// Count the number of header lines in a MatrixMarket file.
async function headerLines(pth) {
  var a  = 0;
  var rl = readline.createInterface({input: fs.createReadStream(pth)});
  for await (var line of rl) {
    if (line[0]==='%') ++a;
    else break;
  }
  return a+1;  // +1 for the row/column count line
}




// MAIN
// ----

async function main(cmd, inp, out) {
  var data = cmd==='csv'? readLog(inp) : '';
  if (out && path.extname(out)==='') cmd += '-dir';
  switch (cmd) {
    case 'csv':
      var rows = processCsv(data);
      writeCsv(out, rows);
      break;
    case 'csv-dir':
      for (var [graph, rows] of data)
        writeCsv(path.join(out, graph+'.csv'), rows);
      break;
    case 'header-lines':
      var lines = await headerLines(inp);
      console.log(lines);
      break;
    default:
      console.error(`error: "${cmd}"?`);
      break;
  }
}
main(...process.argv.slice(2));
