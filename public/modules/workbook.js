  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  async function inflateRaw(bytes) {
    var ds = new DecompressionStream('deflate-raw');
    var stream = new Blob([bytes]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function unzip(arrayBuffer) {
    var b = new Uint8Array(arrayBuffer), eocd = -1;
    for (var i = b.length - 22; i >= Math.max(0, b.length - 66000); i--) {
      if (u32(b, i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('Not a valid .xlsx (zip) file');
    var count = u16(b, eocd + 10), cdOff = u32(b, eocd + 16), files = {}, p = cdOff;
    for (var n = 0; n < count; n++) {
      if (u32(b, p) !== 0x02014b50) break;
      var method = u16(b, p + 10), csize = u32(b, p + 20);
      var nlen = u16(b, p + 28), elen = u16(b, p + 30), clen = u16(b, p + 32), lho = u32(b, p + 42);
      files[new TextDecoder().decode(b.subarray(p + 46, p + 46 + nlen))] = { method: method, csize: csize, lho: lho };
      p += 46 + nlen + elen + clen;
    }
    async function read(name) {
      var f = files[name]; if (!f) return null;
      var q = f.lho, nl = u16(b, q + 26), el = u16(b, q + 28);
      var data = b.subarray(q + 30 + nl + el, q + 30 + nl + el + f.csize);
      return new TextDecoder().decode(f.method === 0 ? data : await inflateRaw(data));
    }
    return { read: read, names: Object.keys(files) };
  }
  function colIndex(ref) {
    var m = /^([A-Z]+)/.exec(ref); if (!m) return 0;
    var c = 0; for (var i = 0; i < m[1].length; i++) c = c * 26 + (m[1].charCodeAt(i) - 64);
    return c - 1;
  }
  export async function readXlsx(arrayBuffer) {
    var z = await unzip(arrayBuffer), parser = new DOMParser();
    var wbXml = parser.parseFromString(await z.read('xl/workbook.xml'), 'application/xml');
    var relsXml = parser.parseFromString(await z.read('xl/_rels/workbook.xml.rels'), 'application/xml');
    var rels = {};
    Array.prototype.forEach.call(relsXml.getElementsByTagName('*'), function (r) {
      if (r.localName === 'Relationship') rels[r.getAttribute('Id')] = r.getAttribute('Target');
    });
    var sheets = {};
    Array.prototype.forEach.call(wbXml.getElementsByTagName('*'), function (s) {
      if (s.localName !== 'sheet') return;
      var rid = s.getAttribute('r:id') || s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      var target = rels[rid]; if (!target) return;
      if (target.indexOf('/') === 0) target = target.slice(1); else if (target.indexOf('xl/') !== 0) target = 'xl/' + target;
      sheets[s.getAttribute('name')] = target;
    });
    var sstRaw = await z.read('xl/sharedStrings.xml'), sst = [];
    if (sstRaw) {
      var sstXml = parser.parseFromString(sstRaw, 'application/xml');
      Array.prototype.forEach.call(sstXml.getElementsByTagName('*'), function (si) {
        if (si.localName !== 'si') return;
        var txt = '';
        Array.prototype.forEach.call(si.getElementsByTagName('*'), function (t) {
          if (t.localName === 't') txt += t.textContent;
        });
        sst.push(txt);
      });
    }
    async function rows(sheetName) {
      var path = sheets[sheetName]; if (!path) return null;
      var xml = parser.parseFromString(await z.read(path), 'application/xml'), out = [];
      Array.prototype.forEach.call(xml.getElementsByTagName('*'), function (row) {
        if (row.localName !== 'row') return;
        var arr = [];
        Array.prototype.forEach.call(row.childNodes, function (c) {
          if (c.localName !== 'c') return;
          var ci = colIndex(c.getAttribute('r') || ''), t = c.getAttribute('t'), v = null;
          if (t === 'inlineStr') v = c.textContent;
          else {
            for (var k = 0; k < c.childNodes.length; k++) {
              if (c.childNodes[k].localName === 'v') { v = c.childNodes[k].textContent; break; }
            }
            if (v != null) {
              if (t === 's') v = sst[parseInt(v, 10)];
              else if (t !== 'str' && t !== 'b') { var num = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); if (!isNaN(num)) v = num; }
            }
          }
          arr[ci] = v;
        });
        out.push(arr);
      });
      return out;
    }
    return { rows: rows, sheetNames: Object.keys(sheets) };
  }


