var fs = require('fs');
var path = require('path');
var dbFile = path.join(__dirname, 'data', 'store.json');
var dbDir = path.dirname(dbFile);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

var data = {};
if (fs.existsSync(dbFile)) {
  try { data = JSON.parse(fs.readFileSync(dbFile, 'utf8')); } catch(e) { data = {}; }
}

// Ensure all tables exist
['settings','hotels','tours','journeys','testimonials','gallery','bookings','hero_content','about_content'].forEach(function(t){
  if (!data[t]) data[t] = [];
});

var autoId = 1;
// Find max id across all tables
Object.keys(data).forEach(function(key){
  if (key === '_autoId') return;
  if (Array.isArray(data[key])) {
    data[key].forEach(function(r){ if (r.id && r.id >= autoId) autoId = r.id + 1; });
  }
});
if (data._autoId && data._autoId >= autoId) autoId = data._autoId + 1;

function save() { fs.writeFileSync(dbFile, JSON.stringify(data, null, 2)); }
save();

function getTable(name) { if (!data[name]) data[name] = []; return data[name]; }

function query(sql, params) {
  sql = sql.trim();
  if (/^create\s+table/i.test(sql)) return { changes: 0 };
  
  var upSql = sql.toUpperCase();
  var m, tbl;
  
  // SELECT COUNT(*) as c FROM table [WHERE ...]
  if (upSql.startsWith('SELECT COUNT(*) AS C FROM') || upSql.startsWith('SELECT COUNT(*) AS C FROM')) {
    var parts = sql.split(/\s+WHERE\s+/i);
    var tableName = parts[0].replace(/^SELECT\s+COUNT\(\*\)\s+AS\s+C\s+FROM\s+/i, '').trim();
    tbl = getTable(tableName);
    if (parts.length > 1) {
      tbl = filterWhere(tbl, parts[1], params);
    }
    return [{ c: tbl.length }];
  }
  
  // SELECT * FROM table [WHERE ...] [ORDER BY ...]
  if (upSql.startsWith('SELECT * FROM')) {
    var selectRest = sql.replace(/^SELECT\s+\*\s+FROM\s+/i, '').trim();
    // Extract ORDER BY
    var orderBy = null, orderDir = 'ASC';
    var orderMatch = selectRest.match(/\s+ORDER\s+BY\s+(\w+)(\s+(ASC|DESC))?$/i);
    if (orderMatch) {
      orderBy = orderMatch[1];
      orderDir = orderMatch[3] ? orderMatch[3].toUpperCase() : 'ASC';
      selectRest = selectRest.substring(0, selectRest.length - orderMatch[0].length).trim();
    }
    // Extract LIMIT
    var limit = null;
    var limitMatch = selectRest.match(/\s+LIMIT\s+(\d+)$/i);
    if (limitMatch) {
      limit = parseInt(limitMatch[1]);
      selectRest = selectRest.substring(0, selectRest.length - limitMatch[0].length).trim();
    }
    // Check for WHERE
    tbl = getTable(selectRest);
    var whereMatch = selectRest.match(/^(\w+)\s+WHERE\s+(.+)$/i);
    if (whereMatch) {
      tbl = filterWhere(getTable(whereMatch[1]), whereMatch[2], params);
    } else {
      tbl = [].concat(getTable(selectRest));
    }
    if (orderBy) {
      var dir = orderDir === 'DESC' ? -1 : 1;
      tbl.sort(function(a,b){ return a[orderBy] < b[orderBy] ? -dir : a[orderBy] > b[orderBy] ? dir : 0; });
    }
    if (limit) tbl = tbl.slice(0, limit);
    return tbl;
  }
  
  // INSERT INTO table (cols) VALUES (vals)
  var insertMatch = sql.match(/^INSERT\s+(?:OR\s+REPLACE\s+)?INTO\s+(\w+)\s*\((.+?)\)\s*VALUES\s*\((.+)\)$/i);
  if (insertMatch) {
    tbl = getTable(insertMatch[1]);
    var cols = insertMatch[2].split(',').map(function(c){return c.trim()});
    var vals = parseValues(insertMatch[3]);
    var row = {};
    var pi = 0;
    for (var i = 0; i < cols.length; i++) {
      if (vals[i] === '?') row[cols[i]] = params ? params[pi++] : null;
      else {
        var v = vals[i].trim();
        if ((v[0] === "'" && v[v.length-1] === "'") || (v[0] === '"' && v[v.length-1] === '"')) {
          v = v.slice(1, -1).replace(/''/g, "'");
        }
        row[cols[i]] = v;
      }
    }
    if (insertMatch[1] !== 'settings') { row.id = autoId++; data._autoId = autoId; }
    var isReplace = /OR\s+REPLACE/i.test(sql);
    if (isReplace && row.key) {
      var idx = -1;
      for (var i = 0; i < tbl.length; i++) { if (tbl[i].key === row.key) { idx = i; break; } }
      if (idx >= 0) { tbl[idx] = row; save(); return { changes: 1 }; }
    }
    tbl.push(row);
    save();
    return { changes: 1, lastInsertRowid: row.id };
  }
  
  // UPDATE table SET col=? WHERE col=?
  var updateMatch = sql.match(/^UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(\w+)\s*=\s*\?$/i);
  if (updateMatch) {
    tbl = getTable(updateMatch[1]);
    var sets = updateMatch[2].split(',').map(function(s){return s.trim()});
    var whereCol = updateMatch[3];
    var whereVal = params ? params[params.length-1] : null;
    var setVals = params ? params.slice(0, params.length-1) : [];
    var changed = 0;
    for (var i = 0; i < tbl.length; i++) {
      if (String(tbl[i][whereCol]) === String(whereVal)) {
        for (var j = 0; j < sets.length; j++) {
          var col = sets[j].split('=')[0].trim();
          tbl[i][col] = setVals[j];
        }
        changed++;
      }
    }
    if (changed) save();
    return { changes: changed };
  }
  
  // DELETE FROM table WHERE col=?
  var deleteMatch = sql.match(/^DELETE\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*\?$/i);
  if (deleteMatch) {
    tbl = getTable(deleteMatch[1]);
    var col = deleteMatch[2], val = params ? params[0] : null;
    var before = tbl.length;
    data[deleteMatch[1]] = [];
    for (var i = 0; i < tbl.length; i++) {
      if (String(tbl[i][col]) !== String(val)) {
        data[deleteMatch[1]].push(tbl[i]);
      }
    }
    save();
    return { changes: before - data[deleteMatch[1]].length };
  }
  
  return [];
}

function filterWhere(tbl, whereStr, params) {
  var pi = 0;
  var result = [];
  var conds = whereStr.split(/\s+AND\s+/i).map(function(c){return c.trim()}).filter(function(c){return c});
  for (var r = 0; r < tbl.length; r++) {
    var match = true;
    for (var c = 0; c < conds.length; c++) {
      var eq = conds[c].indexOf('=');
      if (eq < 0) continue;
      var col = conds[c].substring(0, eq).trim();
      var ph = conds[c].substring(eq+1).trim();
      if (ph !== '?') continue;
      var val = params ? params[c] : null;
      if (String(tbl[r][col]) !== String(val)) {
        match = false;
        break;
      }
    }
    if (match) result.push(tbl[r]);
  }
  return result;
}

function parseValues(str) {
  var result = [], current = '', inQ = false, qChar = null;
  for (var i = 0; i < str.length; i++) {
    var c = str[i];
    if (inQ) {
      if (c === qChar) {
        if (i+1 < str.length && str[i+1] === qChar) { current += c; i++; }
        else inQ = false;
      } else { current += c; }
    } else if (c === "'" || c === '"') { inQ = true; qChar = c; current += c; }
    else if (c === ',') { result.push(current); current = ''; }
    else if (c !== '\n' && c !== '\r' && c !== ' ') { current += c; }
    else if (current.length > 0) { current += c; }
  }
  if (current.length > 0) result.push(current);
  return result;
}

function prepare(sql) {
  return {
    all: function(p1,p2,p3,p4,p5,p6,p7,p8,p9,p10) {
      var args = [];
      for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
      return query(sql, args.length > 0 ? args : undefined);
    },
    get: function(p1,p2,p3,p4,p5,p6,p7,p8,p9,p10) {
      var args = [];
      for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
      var r = query(sql, args.length > 0 ? args : undefined);
      return Array.isArray(r) ? (r[0] || null) : null;
    },
    run: function(p1,p2,p3,p4,p5,p6,p7,p8,p9,p10) {
      var args = [];
      for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
      return query(sql, args.length > 0 ? args : undefined);
    }
  };
}

module.exports = { prepare: prepare, exec: function(sql){ query(sql); } };
