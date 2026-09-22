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

  function escapeHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c];});}

  // PLACEHOLDER_REST_OF_FILE_SEE_NEXT_CALL
