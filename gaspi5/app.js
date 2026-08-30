(function(){
  'use strict';

  // ======================================================================
  // Config: what's currently in scope. Add a territory or node later by
  // (1) dropping its real JSON file into data/territories/ or copying its
  // id into NODE_IDS from data/events.json, then (2) adding its id here.
  // No other code changes needed for territories/nodes with the same
  // shape as what's already wired. Gaza's 3D damage layer additionally
  // needs an entry in NEIGHBORHOODS below.
  // ======================================================================
  var TERRITORY_IDS = ['west-bank', 'gaza-strip'];
  var NODE_IDS = ['n01', 'n05'];

  var CLASS_COLORS = {1:'#c0392b',2:'#e0793a',3:'#d4b83f',4:'#8a9a5b'};

  // The raw CARTO raster XYZ tile endpoints (a/b/c.basemaps.cartocdn.com)
  // now require an API key. CARTO's GL vector style JSON is still open --
  // same basemap the production dossier (thegreatgaspi/index.html) uses.
  // Sending the key on the vector style too is a no-op today but covers
  // this the moment CARTO extends the key requirement to vector, same as
  // production.
  var CARTO_KEY = 'cb1_2k17_1_bede5389267bf3ec1322dc36';
  var map = new maplibregl.Map({
    container:'map', style:'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json?api_key='+CARTO_KEY, center:[35.0,32.2], zoom:5.6, pitch:0, attributionControl:{compact:true},
  });

  var NEIGHBORHOODS = [
    { slug:'az-zaitoun', label:'Az Zaitoun', homeView:{ center:[34.4436,31.4885], zoom:14.2 } },
    { slug:'as-sabra', label:'As Sabra', homeView:{ center:[34.4483,31.5079], zoom:14.8 } },
    { slug:'ash-sheikh-ijleen', label:"Ash Sheikh 'Ijleen", homeView:{ center:[34.4242,31.5049], zoom:14.8 } },
    { slug:'ash-sheikh-radwan', label:'Ash Sheikh Radwan', homeView:{ center:[34.4693,31.5331], zoom:15.0 } },
    { slug:'ad-darraj', label:'Ad Darraj', homeView:{ center:[34.4641,31.5173], zoom:14.8 } },
    { slug:'an-naser', label:'An Naser', homeView:{ center:[34.4581,31.5309], zoom:15.0 } },
    { slug:'ash-shuja-iyeh-ijdeedeh', label:"Ash Shuja'iyeh - Ijdeedeh", homeView:{ center:[34.4823,31.5002], zoom:14.7 } },
    { slug:'at-tuffah', label:'At Tuffah', homeView:{ center:[34.4834,31.5133], zoom:14.7 } },
    { slug:'at-turukman-ijdeedeh', label:'At Turukman - Ijdeedeh', homeView:{ center:[34.4693,31.4935], zoom:14.9 } },
    { slug:'northern-remal', label:'Northern Remal', homeView:{ center:[34.4494,31.5220], zoom:14.9 } },
    { slug:'southern-remal', label:'Southern Remal', homeView:{ center:[34.4377,31.5180], zoom:14.8 } },
    { slug:'al-awadah', label:'Al Awadah', homeView:{ center:[34.4578,31.5413], zoom:15.0 } },
    { slug:'ijdeedeh', label:'Ijdeedeh', homeView:{ center:[34.4974,31.5030], zoom:14.7 } },
    { slug:'old-city', label:'Old City', homeView:{ center:[34.4644,31.5045], zoom:15.1 } },
    { slug:'tal-el-hawa', label:'Tal El Hawa', homeView:{ center:[34.4356,31.5047], zoom:15.0 } },
  ];
  function nbBySlug(slug){ for (var i=0;i<NEIGHBORHOODS.length;i++) if (NEIGHBORHOODS[i].slug===slug) return NEIGHBORHOODS[i]; return null; }

  // Populated by loadCoreData() before the app initializes.
  var TERRITORIES = {};
  var WEST_BANK_V2 = null;
  var NODES = {};

  var state = { territoryKey:null, nodeKey:null, perspIdx:0, chip:null, damage:{ activeSlug:null, dates:[] } };

  function escapeHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  // ======================================================================
  // Core data: real standalone JSON files under data/, fetched once at
  // startup (small -- territories + the West Bank GASPI 2.0 pilot + the
  // node article corpus together are under 200KB). The one genuinely
  // large dataset, Gaza's per-neighborhood building-damage geometry
  // (~54MB across all 15 neighborhoods), is loaded lazily per neighborhood
  // in loadNeighborhoodData() below instead -- no reason to make every
  // visitor download all 15 neighborhoods to look at one.
  // ======================================================================
  function loadCoreData(){
    var territoryFetches = TERRITORY_IDS.map(function(id){
      return fetch('data/territories/'+id+'.json').then(function(r){ return r.json(); }).then(function(t){ TERRITORIES[id] = t; });
    });
    var v2Fetch = fetch('data/v2/west-bank.json').then(function(r){ return r.json(); }).then(function(d){ WEST_BANK_V2 = d; });
    var eventsFetch = fetch('data/events.json').then(function(r){ return r.json(); }).then(function(events){
      events.forEach(function(e){ if (NODE_IDS.indexOf(e.id) !== -1) NODES[e.id] = e; });
    });
    return Promise.all(territoryFetches.concat([v2Fetch, eventsFetch]));
  }

  // ---- perspective label parsing: entries whose note/desc ends with
  // "— per <name>" belong to that named perspective. Entries with no such
  // suffix are shared physical geography, shown regardless of which
  // perspective is active. This mirrors how the real data is actually
  // structured, not an assumption layered on top of it. ----
  function perspOf(entry){
    var text = entry.note || entry.desc || '';
    var m = text.match(/—\s*per\s+(.+)$/);
    return m ? m[1].trim() : null;
  }
  function stripPerspSuffix(text){
    return (text||'').replace(/\s*—\s*per\s+.+$/,'').trim();
  }

  function territoryPerspectives(t){
    // Prefer the explicit perspectives array; fall back to names found on
    // dual-tagged entries (checkpoints, legal) if it's missing.
    if (Array.isArray(t.perspectives) && t.perspectives.length >= 2) return t.perspectives.slice(0,2);
    var found = [];
    (t.checkpoints||[]).forEach(function(c){ var p=perspOf(c); if(p && found.indexOf(p)===-1) found.push(p); });
    (t.legal||[]).forEach(function(c){ if(c.perspective && found.indexOf(c.perspective)===-1) found.push(c.perspective); });
    return found.slice(0,2);
  }

  function categoriesFor(t){
    var cats = [];
    if (t.zones && t.zones.length) cats.push('zones');
    if (t.metrics && t.metrics.water && t.metrics.water.reports && t.metrics.water.reports.length) cats.push('water');
    if (t.peaks && t.peaks.length) cats.push('high-ground');
    if (t.checkpoints && t.checkpoints.length) cats.push('checkpoints');
    if (t.water && t.water.length) cats.push('water-infra');
    if (t.barriers && t.barriers.length) cats.push('barriers');
    if (t.incidents && t.incidents.length) cats.push('environment');
    if (t.legal && t.legal.length) cats.push('legal');
    return cats;
  }
  var CAT_LABEL = {
    'zones':'Zones', 'water':'Water', 'high-ground':'High ground', 'checkpoints':'Checkpoints',
    'water-infra':'Water infra.', 'barriers':'Barriers', 'environment':'Environment', 'legal':'Legal',
  };

  // ---- West Bank's Legal category uses the real GASPI 2.0 migrated data
  // (WEST_BANK_V2) instead of the legacy 1.x `legal` array. The 1.x array
  // tags every entry with whichever side's research document reported it,
  // which mislabels neutral third-party rulings (ICJ, etc.) as if they
  // were that side's own claim. The v2 model already separates the two
  // correctly: `claims` are each side's own asserted position (perspective-
  // owned, toggle-filtered below); `findings` are judicial/institutional
  // rulings attributed to their real issuing body and shown regardless of
  // which side's toggle is active, since a court ruling isn't either
  // party's "perspective." ----
  function renderLegalV2(activePerspName){
    var v2 = WEST_BANK_V2;
    var actorById = {}; v2.actors.forEach(function(a){ actorById[a.id] = a.name; });
    var perspById = {}; v2.perspectives.forEach(function(p){ perspById[p.id] = p.label; });
    var html = '';

    var claims = v2.claims.filter(function(c){
      return c.subject.indexOf('legal:') === 0 && perspById[c.perspective] === activePerspName;
    });
    if (claims.length) {
      html += '<div class="legal-subhead">'+escapeHtml(activePerspName)+'’s own position</div>';
      claims.forEach(function(c){
        html += '<div class="entry"><div class="entry-body">'+escapeHtml(c.text)+'</div></div>';
      });
    }

    var findings = v2.findings.filter(function(f){ return f.subject.indexOf('legal:') === 0; });
    if (findings.length) {
      html += '<div class="legal-subhead">Third-party rulings &amp; findings</div>';
      findings.forEach(function(f){
        var issuer = actorById[f.issuing_body] || 'Unattributed';
        var dateStr = (f.date && f.date !== 'data not available') ? ' ('+escapeHtml(f.date)+')' : '';
        html += '<div class="entry"><div class="entry-name">'+escapeHtml(issuer)+dateStr+'</div><div class="entry-body">'+escapeHtml(f.text)+'</div></div>';
      });
    }

    return html || '<div class="empty-note">Nothing recorded in this category.</div>';
  }

  // ---- render one category's content, filtered to the active perspective
  // where the data actually carries a perspective, shared otherwise ----
  function renderCategory(t, cat, activePerspName, key){
    if (cat === 'legal' && key === 'west-bank' && WEST_BANK_V2) {
      return renderLegalV2(activePerspName);
    }
    var html = '';
    if (cat === 'zones') {
      t.zones.forEach(function(z){
        var pct = (typeof z.pct==='number' && z.pct>0) ? z.pct+'%' : 'data not available';
        html += '<div class="stat-row"><span class="stat-label">'+escapeHtml(z.name)+' — '+escapeHtml(z.governing_authority||'data not available')+'</span><span class="stat-value">'+pct+'</span></div>';
      });
    } else if (cat === 'water') {
      var report = (t.metrics.water.reports||[]).find(function(r){ return r.perspective===activePerspName; }) || (t.metrics.water.reports||[])[0];
      if (report) {
        html += '<div class="stat-row"><span class="stat-label">Reported per-capita, Population A</span><span class="stat-value">'+escapeHtml(report.population_a||'data not available')+' L/day</span></div>';
        html += '<div class="stat-row"><span class="stat-label">Reported per-capita, Population B</span><span class="stat-value">'+escapeHtml(report.population_b||'data not available')+' L/day</span></div>';
        html += '<div class="stat-row"><span class="stat-label">WHO minimum standard</span><span class="stat-value">'+(report.who_reference_standard!=null?report.who_reference_standard+' L/day':'data not available')+'</span></div>';
      } else {
        html = '<div class="empty-note">No water report from this perspective.</div>';
      }
    } else if (cat === 'high-ground' || cat === 'water-infra' || cat === 'barriers') {
      var list = cat==='high-ground' ? t.peaks : (cat==='water-infra' ? t.water : t.barriers);
      list.forEach(function(m){
        html += '<div class="entry"><div class="entry-name">'+escapeHtml(m.name)+'</div>'
          + (m.note ? '<div class="entry-body">'+escapeHtml(stripPerspSuffix(m.note))+'</div>' : '')
          + '</div>';
      });
    } else if (cat === 'checkpoints') {
      var filtered = t.checkpoints.filter(function(c){ var p=perspOf(c); return !p || p===activePerspName; });
      if (!filtered.length) filtered = t.checkpoints;
      filtered.forEach(function(c){
        html += '<div class="entry"><div class="entry-name">'+escapeHtml(c.name)+'</div>'
          + (c.note ? '<div class="entry-body">'+escapeHtml(stripPerspSuffix(c.note))+'</div>' : '')
          + '</div>';
      });
    } else if (cat === 'environment') {
      t.incidents.forEach(function(inc){
        var area = (inc.area==null||inc.area==='') ? 'data not available' : inc.area;
        html += '<div class="entry"><div class="entry-name">'+escapeHtml(inc.type||'Incident')+' <span class="entry-meta">'+escapeHtml(area)+'</span></div>';
        (inc.accounts||[]).forEach(function(acc){
          html += '<div class="entry-body"><b>'+escapeHtml(acc.party)+'</b> — '+escapeHtml(acc.account)+'</div>';
        });
        if (!inc.accounts || !inc.accounts.length) html += '<div class="entry-body">No attributed account recorded.</div>';
        html += '</div>';
      });
    } else if (cat === 'legal') {
      var filteredLegal = t.legal.filter(function(l){ return l.perspective===activePerspName; });
      if (!filteredLegal.length) filteredLegal = t.legal;
      filteredLegal.forEach(function(l){
        html += '<div class="entry"><div class="entry-name">'+escapeHtml(l.name)+'</div><div class="entry-body">'+escapeHtml(l.desc)+'</div></div>';
      });
    }
    return html || '<div class="empty-note">Nothing recorded in this category.</div>';
  }

  function buildPerspSwitch(t){
    var persps = territoryPerspectives(t);
    var el = document.getElementById('perspSwitch');
    if (persps.length < 2) { el.style.display='none'; return persps; }
    el.style.display='flex';
    el.innerHTML = persps.map(function(p,i){
      return '<button class="persp-btn'+(i===state.perspIdx?' active':'')+'" data-side="'+(i===0?'a':'b')+'" data-idx="'+i+'">'+escapeHtml(p)+'</button>';
    }).join('');
    Array.from(el.querySelectorAll('.persp-btn')).forEach(function(btn){
      btn.addEventListener('click', function(){
        state.perspIdx = parseInt(btn.getAttribute('data-idx'),10);
        openTerritory(state.territoryKey, true);
      });
    });
    return persps;
  }

  function openTerritory(key, keepSheetState){
    if (!keepSheetState && state.nodeKey) closeNode();
    var t = TERRITORIES[key];
    state.territoryKey = key;
    document.getElementById('sheetTitle').textContent = t.name;
    document.getElementById('backBtn').classList.add('show');
    document.getElementById('perspSwitch').style.display = '';

    var persps = buildPerspSwitch(t);
    var activePerspName = persps[state.perspIdx];

    var cats = categoriesFor(t);
    if (!keepSheetState || !state.chip || cats.indexOf(state.chip)===-1) state.chip = cats.length ? cats[0] : null;
    var chipRow = document.getElementById('chipRow');
    chipRow.innerHTML = cats.map(function(c){
      return '<button class="chip'+(c===state.chip?' active':'')+'" data-cat="'+c+'">'+CAT_LABEL[c]+'</button>';
    }).join('');
    Array.from(chipRow.querySelectorAll('.chip')).forEach(function(btn){
      btn.addEventListener('click', function(){
        state.chip = btn.getAttribute('data-cat');
        openTerritory(key, true);
        expandSheet();
      });
    });

    var body = document.getElementById('sheetBody');
    body.innerHTML = state.chip ? renderCategory(t, state.chip, activePerspName, key) : '';

    var isGaza = (key === 'gaza-strip');
    document.getElementById('damageIntro').style.display = isGaza ? 'block' : 'none';
    var entryRow = document.getElementById('damageEntryRow');
    entryRow.style.display = isGaza ? 'flex' : 'none';
    if (isGaza) {
      entryRow.innerHTML = NEIGHBORHOODS.map(function(nb){
        return '<button class="damage-chip" data-slug="'+nb.slug+'">'+escapeHtml(nb.label)+'</button>';
      }).join('');
      Array.from(entryRow.querySelectorAll('.damage-chip')).forEach(function(btn){
        btn.addEventListener('click', function(){ enterDamageMode(btn.getAttribute('data-slug')); });
      });
    }

    if (!keepSheetState) {
      var b = t.boundary;
      if (b && b.geometry) {
        var coords = [];
        (function walk(c){ if (typeof c[0]==='number') coords.push(c); else c.forEach(walk); })(b.geometry.coordinates);
        var lons = coords.map(function(c){return c[0];}), lats = coords.map(function(c){return c[1];});
        map.fitBounds([[Math.min.apply(null,lons),Math.min.apply(null,lats)],[Math.max.apply(null,lons),Math.max.apply(null,lats)]], {padding:80, duration:900});
      } else {
        map.flyTo({ center:[t.center.lng,t.center.lat], zoom:9, essential:true });
      }
      drawBoundary(t);
      // Expand on open rather than leaving just the title strip peeking up
      // -- collapsed-by-default read as an empty, broken panel once a
      // territory was actually tapped, since the category chips and
      // content sit below the visible 84px handle until expanded. The
      // idle map (nothing tapped yet) is still the uncluttered arrival
      // state; opening a specific territory is a deliberate action that
      // should show its content immediately.
      document.getElementById('sheet').classList.remove('hidden');
      expandSheet();
    }
  }

  function drawBoundary(t){
    ['territory-fill','territory-line'].forEach(function(id){ if (map.getLayer(id)) map.removeLayer(id); });
    if (map.getSource('territory')) map.removeSource('territory');
    if (!t.boundary || !t.boundary.geometry) return;
    map.addSource('territory', { type:'geojson', data:{ type:'Feature', geometry:t.boundary.geometry, properties:{} } });
    map.addLayer({ id:'territory-fill', type:'fill', source:'territory', paint:{ 'fill-color':'#c9a84c', 'fill-opacity':0.06 } });
    map.addLayer({ id:'territory-line', type:'line', source:'territory', paint:{ 'line-color':'#c9a84c', 'line-width':1.4, 'line-opacity':0.55 } });
  }

  function closeTerritory(){
    state.territoryKey = null; state.chip = null; state.perspIdx = 0;
    document.getElementById('backBtn').classList.remove('show');
    document.getElementById('sheet').classList.add('hidden');
    document.getElementById('sheet').classList.remove('open');
    ['territory-fill','territory-line'].forEach(function(id){ if (map.getLayer(id)) map.removeLayer(id); });
    if (map.getSource('territory')) map.removeSource('territory');
    map.flyTo({ center:[35.0,32.2], zoom:5.6, pitch:0, bearing:0, essential:true });
  }

  // ---- node (narrative article) reading state: same one sheet, a
  // different content mode -- no perspective switch, no chips, just the
  // piece itself. Mutually exclusive with a territory being open.
  // NODES entries are the real Atlas event records (data/events.json) --
  // title/location{lat,lon,name}/content, not a bespoke shape. ----
  function openNode(key){
    if (state.territoryKey) closeTerritory();
    var n = NODES[key];
    state.nodeKey = key;
    document.getElementById('sheetTitle').textContent = n.title;
    document.getElementById('backBtn').classList.add('show');
    document.getElementById('perspSwitch').style.display = 'none';
    document.getElementById('damageIntro').style.display = 'none';
    document.getElementById('damageEntryRow').style.display = 'none';
    document.getElementById('chipRow').innerHTML = '';
    var body = document.getElementById('sheetBody');
    body.innerHTML = '<div class="node-location">'+escapeHtml((n.location && n.location.name) || '')+'</div>'
      + String(n.content||'').split(/\n\n+/).map(function(p){ return '<div class="node-para">'+escapeHtml(p)+'</div>'; }).join('');
    map.flyTo({ center:[n.location.lon, n.location.lat], zoom:11, essential:true });
    expandSheet();
    document.getElementById('sheet').classList.remove('hidden');
  }
  function closeNode(){
    state.nodeKey = null;
    document.getElementById('backBtn').classList.remove('show');
    document.getElementById('sheet').classList.add('hidden');
    document.getElementById('sheet').classList.remove('open');
    document.getElementById('perspSwitch').style.display = '';
    map.flyTo({ center:[35.0,32.2], zoom:5.6, pitch:0, bearing:0, essential:true });
  }
  function closeAny(){ if (state.nodeKey) closeNode(); else if (state.territoryKey) closeTerritory(); }

  function expandSheet(){
    document.getElementById('sheet').classList.add('open');
    document.getElementById('sheetHint').textContent = 'Tap to collapse';
  }
  function collapseSheet(){
    document.getElementById('sheet').classList.remove('open');
    document.getElementById('sheetHint').textContent = 'Tap to expand';
  }

  document.getElementById('sheetHandle').addEventListener('click', function(){
    var s = document.getElementById('sheet');
    if (s.classList.contains('open')) collapseSheet(); else expandSheet();
  });
  document.getElementById('backBtn').addEventListener('click', closeAny);

  // ---- idle-state pins: territories (gold, larger) and narrative nodes
  // (cool, smaller) are visually distinct pin types from the start, not
  // just distinct once opened ----
  // MapLibre positions each Marker's root element itself via its own
  // "maplibregl-marker" CSS class (position:absolute + a transform it
  // recomputes on every map move). Setting an inline `position` on that
  // same root element breaks that -- inline styles beat stylesheet rules
  // regardless of selector -- so it never goes on the element handed to
  // Marker. The .pin-label CSS still needs a `position:relative` ancestor
  // to anchor its own `position:absolute; left:22px`, so that goes on an
  // inner wrapper instead.
  function addPins(){
    Object.keys(TERRITORIES).forEach(function(key){
      var t = TERRITORIES[key];
      var wrap = document.createElement('div');
      var inner = document.createElement('div');
      inner.style.position = 'relative';
      var pin = document.createElement('div'); pin.className = 'pin';
      var label = document.createElement('div'); label.className='pin-label'; label.textContent = t.name;
      inner.appendChild(pin); inner.appendChild(label);
      wrap.appendChild(inner);
      wrap.addEventListener('click', function(){ state.perspIdx = 0; openTerritory(key, false); });
      new maplibregl.Marker({ element: wrap }).setLngLat([t.center.lng, t.center.lat]).addTo(map);
    });
    Object.keys(NODES).forEach(function(key){
      var n = NODES[key];
      var wrap = document.createElement('div');
      var inner = document.createElement('div');
      inner.style.position = 'relative';
      var pin = document.createElement('div'); pin.className = 'pin-node';
      var label = document.createElement('div'); label.className='pin-node-label'; label.textContent = n.title.split(':')[0];
      inner.appendChild(pin); inner.appendChild(label);
      wrap.appendChild(inner);
      wrap.addEventListener('click', function(){ openNode(key); });
      new maplibregl.Marker({ element: wrap }).setLngLat([n.location.lon, n.location.lat]).addTo(map);
    });
  }

  // ======================================================================
  // Gaza damage-over-time — same proven technique as the live site
  // (fill-extrusion height driven by damage class + jitter, pitch on
  // entry), covering all 15 already-joined Gaza City neighborhoods
  // (At Turukman held back -- its uploaded building file has a real
  // ~500-700m coordinate offset from its damage points, same as on the
  // live site, not shipped here either). Entirely separate visual mode,
  // entered deliberately, never on page load.
  //
  // Each neighborhood's real building+damage geometry (data/gaza-damage/
  // {slug}_buildings.geojson + {slug}_unmatched_points.geojson) is fetched
  // lazily on first visit to that neighborhood, not preloaded -- 15
  // neighborhoods' worth is ~54MB and nobody needs more than the one
  // they're looking at.
  // ======================================================================
  var RETAIN_FRACTION = {1:0.08, 2:0.28, 3:0.55, 4:0.85};
  function jitterFor(id){ var x=Math.sin((id||0)*12.9898)*43758.5453; var f=x-Math.floor(x); return 0.82+f*0.36; }
  function classAsOf(sites, date){
    var worst=null;
    sites.forEach(function(s){ var latest=null; s.h.forEach(function(h){ if(h[0]<=date) latest=h; }); if(latest && latest[1]!=null){ if(worst===null||latest[1]<worst) worst=latest[1]; } });
    return worst;
  }
  function annotateBuildings(fc, date){
    fc.features.forEach(function(f){
      var sites = f.properties.damage_sites||[];
      var cls = sites.length ? classAsOf(sites, date) : null;
      f.properties.currentClass = cls;
      var base = f.properties.height_m || 11;
      var frac = (cls!=null && RETAIN_FRACTION[cls]!==undefined) ? RETAIN_FRACTION[cls] : 1.0;
      f.properties.extrudeHeight = Math.max(base*frac*jitterFor(f.properties.bldg_id), cls!=null?1.2:2.5);
    });
    return fc;
  }
  function annotatePoints(fc, date){
    fc.features.forEach(function(f){
      var latest=null; f.properties.h.forEach(function(h){ if(h[0]<=date) latest=h; });
      f.properties.currentClass = latest ? latest[1] : null;
    });
    return fc;
  }
  function fmtDate(iso){ var d=new Date(iso); return d.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}); }

  var damageCache = {};
  function loadNeighborhoodData(slug){
    if (damageCache[slug]) return Promise.resolve(damageCache[slug]);
    return Promise.all([
      fetch('data/gaza-damage/'+slug+'_buildings.geojson').then(function(r){ return r.json(); }),
      fetch('data/gaza-damage/'+slug+'_unmatched_points.geojson').then(function(r){ return r.json(); }),
    ]).then(function(arr){
      var gd = { buildings: arr[0], unmatched: arr[1] };
      damageCache[slug] = gd;
      return gd;
    });
  }
  function activeNeighborhoodData(){ return damageCache[state.damage.activeSlug]; }

  function damageAddLayers(){
    var d = state.damage, gd = activeNeighborhoodData();
    map.addSource('dmg-buildings', { type:'geojson', data: annotateBuildings(structuredClone(gd.buildings), d.dates[d.idx]) });
    map.addLayer({ id:'dmg-buildings-fill', type:'fill-extrusion', source:'dmg-buildings', paint:{
      'fill-extrusion-color':['match',['get','currentClass'],1,CLASS_COLORS[1],2,CLASS_COLORS[2],3,CLASS_COLORS[3],4,CLASS_COLORS[4],'#8a94a8'],
      'fill-extrusion-height':['get','extrudeHeight'], 'fill-extrusion-base':0,
      'fill-extrusion-opacity':['case',['==',['get','currentClass'],null],0.55,0.92],
      'fill-extrusion-vertical-gradient':true,
    }});
    map.addSource('dmg-unmatched', { type:'geojson', data: annotatePoints(structuredClone(gd.unmatched), d.dates[d.idx]) });
    map.addLayer({ id:'dmg-unmatched-points', type:'circle', source:'dmg-unmatched', paint:{
      'circle-radius':3, 'circle-color':['match',['get','currentClass'],1,CLASS_COLORS[1],2,CLASS_COLORS[2],3,CLASS_COLORS[3],4,CLASS_COLORS[4],'#888'],
      'circle-stroke-width':0.5,'circle-stroke-color':'#000',
    }});
  }
  function damageRemoveLayers(){
    ['dmg-buildings-fill','dmg-unmatched-points'].forEach(function(id){ if(map.getLayer(id)) map.removeLayer(id); });
    ['dmg-buildings','dmg-unmatched'].forEach(function(id){ if(map.getSource(id)) map.removeSource(id); });
  }
  function damageUpdate(){
    var d = state.damage, gd = activeNeighborhoodData();
    var date = d.dates[d.idx];
    if (map.getSource('dmg-buildings')) map.getSource('dmg-buildings').setData(annotateBuildings(structuredClone(gd.buildings), date));
    if (map.getSource('dmg-unmatched')) map.getSource('dmg-unmatched').setData(annotatePoints(structuredClone(gd.unmatched), date));
    document.getElementById('damageReadout').textContent = fmtDate(date);
    var counts = {1:0,2:0,3:0,4:0};
    gd.buildings.features.forEach(function(f){
      var sites = f.properties.damage_sites||[];
      var cls = sites.length ? classAsOf(sites, date) : null;
      if (cls && counts[cls]!==undefined) counts[cls]++;
    });
    document.getElementById('damageStats').textContent = counts[1]+' destroyed · '+counts[2]+' severe · '+counts[3]+' moderate · '+counts[4]+' possible (UNOSAT, this date)';
    damageUpdateDial();
    Array.from(document.querySelectorAll('.damage-switch-chip')).forEach(function(el){
      el.classList.toggle('active', el.getAttribute('data-slug')===state.damage.activeSlug);
    });
  }
  var DIAL_R=70, DIAL_CX=90, DIAL_CY=90;
  function damageBuildDial(){
    var svg = document.getElementById('damageDial');
    var n = state.damage.dates.length;
    var html = '<circle class="dring" cx="'+DIAL_CX+'" cy="'+DIAL_CY+'" r="'+DIAL_R+'"/>';
    for (var i=0;i<n;i++){
      var a=(2*Math.PI*i)/n-Math.PI/2;
      var x1=DIAL_CX+(DIAL_R-6)*Math.cos(a), y1=DIAL_CY+(DIAL_R-6)*Math.sin(a);
      var x2=DIAL_CX+(DIAL_R+6)*Math.cos(a), y2=DIAL_CY+(DIAL_R+6)*Math.sin(a);
      html += '<line class="dtick" data-idx="'+i+'" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" style="cursor:pointer"/>';
    }
    html += '<line class="dpointer" id="dmgPointer" x1="'+DIAL_CX+'" y1="'+DIAL_CY+'" x2="'+DIAL_CX+'" y2="'+(DIAL_CY-DIAL_R)+'"/>';
    html += '<circle class="dhub" cx="'+DIAL_CX+'" cy="'+DIAL_CY+'" r="5"/>';
    svg.innerHTML = html;
    svg.querySelectorAll('.dtick').forEach(function(el){ el.addEventListener('click', function(){ state.damage.idx=parseInt(el.dataset.idx,10); damageUpdate(); }); });
    var dragging=false;
    function angleFromEvent(evt){
      var rect = svg.getBoundingClientRect();
      var cx=(evt.touches?evt.touches[0].clientX:evt.clientX)-rect.left, cy=(evt.touches?evt.touches[0].clientY:evt.clientY)-rect.top;
      var x=cx/rect.width*180-DIAL_CX, y=cy/rect.height*180-DIAL_CY;
      var a=Math.atan2(y,x)+Math.PI/2; if(a<0) a+=2*Math.PI; return a;
    }
    function setFromAngle(a){ var idx=Math.round((a/(2*Math.PI))*n)%n; if(idx!==state.damage.idx){ state.damage.idx=idx; damageUpdate(); } }
    svg.addEventListener('mousedown', function(e){ dragging=true; setFromAngle(angleFromEvent(e)); });
    window.addEventListener('mousemove', function(e){ if(dragging) setFromAngle(angleFromEvent(e)); });
    window.addEventListener('mouseup', function(){ dragging=false; });
    svg.addEventListener('touchstart', function(e){ dragging=true; setFromAngle(angleFromEvent(e)); }, {passive:true});
    svg.addEventListener('touchmove', function(e){ if(dragging) setFromAngle(angleFromEvent(e)); }, {passive:true});
    window.addEventListener('touchend', function(){ dragging=false; });
  }
  function damageUpdateDial(){
    document.querySelectorAll('.dtick').forEach(function(el){ el.classList.toggle('active', parseInt(el.dataset.idx,10)===state.damage.idx); });
    var n = state.damage.dates.length;
    var a = (2*Math.PI*state.damage.idx)/n - Math.PI/2;
    var p = document.getElementById('dmgPointer');
    if (p){ p.setAttribute('x2', DIAL_CX+DIAL_R*Math.cos(a)); p.setAttribute('y2', DIAL_CY+DIAL_R*Math.sin(a)); }
  }

  function renderDamageSwitchRow(){
    var row = document.getElementById('damageSwitchRow');
    row.innerHTML = NEIGHBORHOODS.map(function(nb){
      return '<button class="damage-switch-chip'+(nb.slug===state.damage.activeSlug?' active':'')+'" data-slug="'+nb.slug+'">'+escapeHtml(nb.label)+'</button>';
    }).join('');
    Array.from(row.querySelectorAll('.damage-switch-chip')).forEach(function(btn){
      btn.addEventListener('click', function(){ switchNeighborhood(btn.getAttribute('data-slug')); });
    });
  }
  function switchNeighborhood(slug){
    if (slug === state.damage.activeSlug) return;
    damageRemoveLayers();
    loadNeighborhood(slug, true);
  }
  function loadNeighborhood(slug, flyIn){
    var d = state.damage;
    d.requestSlug = slug; // guards against a slower, superseded fetch resolving after a newer switch
    document.getElementById('damageStats').textContent = 'Loading '+((nbBySlug(slug)||{}).label||slug)+'…';
    document.getElementById('damageReadout').textContent = '—';
    loadNeighborhoodData(slug).then(function(gd){
      if (d.requestSlug !== slug) return; // a newer switch superseded this one; drop this stale response
      d.activeSlug = slug;
      var dateSet = {};
      gd.buildings.features.forEach(function(f){ (f.properties.damage_sites||[]).forEach(function(s){ s.h.forEach(function(h){ dateSet[h[0]]=1; }); }); });
      gd.unmatched.features.forEach(function(f){ f.properties.h.forEach(function(h){ dateSet[h[0]]=1; }); });
      d.dates = Object.keys(dateSet).sort();
      d.idx = d.dates.length - 1;
      damageAddLayers();
      damageBuildDial();
      damageUpdate();
      renderDamageSwitchRow();
      var nb = nbBySlug(slug);
      if (flyIn && nb) map.flyTo({ center: nb.homeView.center, zoom: nb.homeView.zoom, pitch:55, bearing:-17, essential:true });
    });
  }
  function enterDamageMode(slug){
    document.getElementById('damageMode').classList.add('active');
    document.getElementById('sheet').classList.add('hidden');
    state.damage.activeSlug = slug;
    renderDamageSwitchRow();
    loadNeighborhood(slug, false);
    var nb = nbBySlug(slug);
    map.flyTo({ center: nb ? nb.homeView.center : [34.4436,31.4885], zoom: nb ? nb.homeView.zoom : 14.2, pitch:55, bearing:-17, essential:true });
  }
  function exitDamageMode(){
    document.getElementById('damageMode').classList.remove('active');
    damageRemoveLayers();
    state.damage.activeSlug = null;
    document.getElementById('sheet').classList.remove('hidden');
    var t = TERRITORIES['gaza-strip'];
    map.flyTo({ center:[t.center.lng,t.center.lat], zoom:9, pitch:0, bearing:0, essential:true });
  }

  document.getElementById('damageClose').addEventListener('click', exitDamageMode);

  // ======================================================================
  // Boot: wait for both the map and the core data before showing pins.
  // ======================================================================
  var mapReady = new Promise(function(resolve){ map.on('load', resolve); });
  Promise.all([mapReady, loadCoreData()]).then(function(){
    addPins();
    var el = document.getElementById('bootLoading');
    el.classList.add('done');
    setTimeout(function(){ el.style.display = 'none'; }, 320);
  }).catch(function(err){
    document.getElementById('bootLoading').textContent = 'Failed to load GASPI data — ' + err.message;
  });

})();
