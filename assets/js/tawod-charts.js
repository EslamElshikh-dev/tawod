/* Responsive, dependency-free charts. Missing rows remain gaps; zero stays zero. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TawodCharts = api;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  var WIDTH = 1000, HEIGHT = 220;
  function escape(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function marker(series) {
    var colors = {'#bf7237':'copper','#187d5d':'green','#276eaa':'blue','#788d9c':'slate'};
    return '<i class="chart-key key-' + (colors[series.color] || 'slate') + '" aria-hidden="true"></i>';
  }
  function value(input) { return input == null || input === '' || !Number.isFinite(Number(input)) ? null : Math.max(0, Number(input)); }
  function day(input) {
    if (!input) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    var date = new Date(input); if (isNaN(date.getTime())) return null;
    var parts = new Intl.DateTimeFormat('en',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    var get = function (key) { return parts.find(function (p) { return p.type === key; }).value; };
    return get('year') + '-' + get('month') + '-' + get('day');
  }
  function shortDate(input) { return new Intl.DateTimeFormat('ar-SA',{calendar:'gregory',day:'numeric',month:'short',timeZone:'Asia/Riyadh'}).format(new Date(input+'T12:00:00Z')); }
  function normalize(rows, start, end) {
    var map = new Map();
    (rows || []).forEach(function (row) { if (day(row.date)) map.set(day(row.date),row); });
    var keys = Array.from(map.keys()).sort(); start = day(start) || keys[0]; end = day(end) || keys[keys.length-1];
    if (!start || !end || start>end) return [];
    var result = [], time = Date.parse(start+'T12:00:00Z'), last = Date.parse(end+'T12:00:00Z');
    for (;time<=last && result.length<100;time+=86400000) {
      var date = new Date(time).toISOString().slice(0,10), row = map.get(date);
      result.push(row ? Object.assign({},row,{date:date,reported:true}) : {date:date,reported:false});
    }
    return result;
  }
  function ceiling(maximum) {
    if (!maximum) return 1;
    var power = Math.pow(10,Math.floor(Math.log10(maximum))), scaled = maximum/power;
    return (scaled<=1 ? 1 : scaled<=2 ? 2 : scaled<=5 ? 5 : 10)*power;
  }
  function segments(rows, series, maximum) {
    var output = [], segment = [];
    rows.forEach(function (row,index) {
      var v = row.reported ? value(series.get ? series.get(row) : row[series.key]) : null;
      if (v == null) { if (segment.length) output.push(segment); segment=[]; return; }
      segment.push({x:rows.length===1 ? WIDTH/2 : index*WIDTH/(rows.length-1),y:HEIGHT-v/maximum*HEIGHT,value:v,index:index});
    });
    if (segment.length) output.push(segment); return output;
  }
  function path(points) { return points.map(function (p,i) { return (i ? 'L' : 'M')+p.x.toFixed(2)+' '+p.y.toFixed(2); }).join(' '); }
  function render(container, config) {
    var rows = normalize(config.rows,config.start,config.end), modes = config.modes;
    var active = container.dataset.chartMode || modes[0].id;
    var mode = modes.find(function (m) { return m.id===active; }) || modes[0];
    container.dataset.chartMode = mode.id; container.classList.add('cc-chart');
    if (!rows.length) { container.innerHTML='<div class="chart-empty">لا توجد بيانات متاحة للرسم.</div>'; return; }
    var maximum = ceiling(Math.max.apply(null,rows.flatMap(function (row) { return mode.series.map(function (series) { return row.reported ? value(series.get ? series.get(row) : row[series.key]) || 0 : 0; }); }).concat([0])));
    var number = function (v) { return v == null ? '—' : new Intl.NumberFormat('ar-SA',{maximumFractionDigits:mode.unit==='SAR' ? 2 : mode.unit==='%' ? 1 : mode.decimals == null ? 0 : mode.decimals}).format(v)+(mode.unit==='SAR' ? ' ر.س' : mode.unit==='%' ? '٪' : ''); };
    var id = container.id.replace(/[^a-z0-9]/gi,''), svg = '';
    for (var tick=0;tick<=4;tick++) svg+='<line class="chart-grid-line" x1="0" x2="1000" y1="'+tick*HEIGHT/4+'" y2="'+tick*HEIGHT/4+'"/>';
    var gaps = rows.map(function (row,index) { var step=WIDTH/Math.max(1,rows.length-1), left=Math.max(0,(index-.5)*step), right=Math.min(WIDTH,(index+.5)*step); return row.reported ? '' : '<rect class="chart-gap" x="'+left+'" y="0" width="'+(right-left)+'" height="220"/>'; }).join('');
    svg+=gaps;
    mode.series.forEach(function (series,seriesIndex) {
      var groups = segments(rows,series,maximum);
      svg+='<defs><linearGradient id="'+id+'-fill-'+seriesIndex+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+series.color+'" stop-opacity=".18"/><stop offset="1" stop-color="'+series.color+'" stop-opacity=".015"/></linearGradient></defs>';
      groups.forEach(function (points) {
        if(points.length===1) svg+='<ellipse cx="'+points[0].x+'" cy="'+points[0].y+'" rx="7" ry="3" fill="'+series.color+'"/>';
        if (seriesIndex===0 && points.length>1) svg+='<path d="'+path(points)+' L'+points[points.length-1].x+' 220 L'+points[0].x+' 220 Z" fill="url(#'+id+'-fill-'+seriesIndex+')"/>';
        svg+='<path d="'+path(points)+'" fill="none" stroke="'+series.color+'" stroke-width="2.5" vector-effect="non-scaling-stroke"'+(series.dashed ? ' stroke-dasharray="5 5"' : '')+'/>';
      });
    });
    var labelIndices = Array.from(new Set([0,Math.round((rows.length-1)/4),Math.round((rows.length-1)/2),Math.round((rows.length-1)*3/4),rows.length-1]));
    var missing = rows.filter(function (row) { return !row.reported; }).length;
    container.innerHTML='<div class="chart-toolbar"><div class="chart-modes" aria-label="مؤشرات الرسم">'+modes.map(function (m) { return '<button type="button" data-chart-mode="'+escape(m.id)+'" aria-pressed="'+(m.id===mode.id)+'">'+escape(m.label)+'</button>'; }).join('')+'</div><span class="chart-unit">'+escape(mode.unit==='SAR' ? 'ريال سعودي' : mode.unit==='%' ? 'نسبة مئوية' : 'عدد')+'</span></div>'+
      '<div class="chart-legend">'+mode.series.map(function (s) { return '<span>'+marker(s)+escape(s.label)+'</span>'; }).join('')+'</div>'+
      '<div class="chart-canvas"><div class="chart-y-axis" aria-hidden="true">'+[4,3,2,1,0].map(function (i) { return '<span>'+escape(new Intl.NumberFormat('ar-SA',{maximumFractionDigits:maximum<10 ? 2 : 1}).format(maximum*i/4))+'</span>'; }).join('')+'</div>'+
      '<div class="chart-plot" role="slider" tabindex="0" aria-label="'+escape(config.title)+'؛ استخدم السهمين لقراءة الأيام" aria-valuemin="0" aria-valuemax="'+(rows.length-1)+'"><svg viewBox="0 0 1000 220" preserveAspectRatio="none" role="presentation" aria-hidden="true">'+svg+'<line class="chart-cursor" y1="0" y2="220"/><g class="chart-selected-points"></g></svg></div></div>'+
      '<div class="chart-x-axis" aria-hidden="true">'+labelIndices.map(function (i,j) { return '<span class="'+(j%2 ? 'chart-extra-date' : '')+'">'+escape(shortDate(rows[i].date))+'</span>'; }).join('')+'</div>'+
      '<div class="chart-reader" aria-live="polite" aria-atomic="true"></div><p class="chart-context">'+escape(config.note || '')+(missing ? ' · '+new Intl.NumberFormat('ar-SA').format(missing)+' أيام دون سجل، تظهر كفجوات.' : '')+'</p>'+
      '<details class="chart-data"><summary>عرض بيانات الرسم كجدول</summary><div class="table-wrap"><table><thead><tr><th>التاريخ</th>'+mode.series.map(function (s) { return '<th>'+escape(s.label)+'</th>'; }).join('')+'</tr></thead><tbody>'+rows.map(function (row) { return '<tr><td>'+escape(shortDate(row.date))+(row.date===config.today ? ' · جارٍ' : '')+'</td>'+mode.series.map(function (s) { return '<td>'+escape(number(row.reported ? value(s.get ? s.get(row) : row[s.key]) : null))+'</td>'; }).join('')+'</tr>'; }).join('')+'</tbody></table></div></details>';
    var plot=container.querySelector('.chart-plot'), reader=container.querySelector('.chart-reader'), selected=rows.map(function (r,i) { return r.reported ? i : -1; }).filter(function (i) { return i>=0; }).pop() || 0;
    function select(index) {
      selected=Math.max(0,Math.min(rows.length-1,index)); var row=rows[selected], x=rows.length===1 ? WIDTH/2 : selected*WIDTH/(rows.length-1);
      var summary=shortDate(row.date)+(row.date===config.today ? ' · اليوم الجاري' : '')+(row.reported ? '' : ' · لا يوجد سجل يومي');
      reader.innerHTML='<time datetime="'+row.date+'">'+escape(summary)+'</time><div>'+mode.series.map(function (s) { var v=row.reported ? value(s.get ? s.get(row) : row[s.key]) : null; return '<span>'+marker(s)+escape(s.label)+' <b>'+escape(number(v))+'</b></span>'; }).join('')+'</div>';
      plot.setAttribute('aria-valuenow',String(selected)); plot.setAttribute('aria-valuetext',summary+'؛ '+reader.textContent);
      var cursor=plot.querySelector('.chart-cursor'); cursor.setAttribute('x1',String(x));cursor.setAttribute('x2',String(x));
      plot.querySelector('.chart-selected-points').innerHTML=mode.series.map(function (s) { var v=row.reported ? value(s.get ? s.get(row) : row[s.key]) : null;return v==null ? '' : '<ellipse cx="'+x+'" cy="'+(HEIGHT-v/maximum*HEIGHT)+'" rx="10" ry="4" fill="'+s.color+'" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke"/>'; }).join('');
    }
    plot.onpointerdown=function (e) { var box=plot.getBoundingClientRect();select(Math.round((e.clientX-box.left)/box.width*(rows.length-1))); };
    plot.onpointermove=function (e) { if (e.pointerType==='mouse' || e.buttons) plot.onpointerdown(e); };
    plot.onkeydown=function (e) { if (['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) { e.preventDefault();select(e.key==='Home' ? 0 : e.key==='End' ? rows.length-1 : selected+(e.key==='ArrowRight' ? 1 : -1)); } };
    container.querySelectorAll('[data-chart-mode]').forEach(function (button) { button.onclick=function () { container.dataset.chartMode=button.dataset.chartMode;render(container,config);container.querySelector('[data-chart-mode="'+button.dataset.chartMode+'"]').focus(); }; });
    select(selected);
  }
  return {render:render,normalize:normalize,ceiling:ceiling,segments:segments,day:day};
});
