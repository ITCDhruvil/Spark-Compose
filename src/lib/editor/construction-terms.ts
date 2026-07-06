/**
 * Valid construction / built-environment terms.
 * Never auto-correct these (case-insensitive).
 */
export const CONSTRUCTION_TERMS: string[] = [
  // # --- Reinforcement ---
'rebar', 'reinforcement', 'reinforcing', 'reinforced', 'rerod', 'rod', 'rods',
'bar', 'bars', 'barbending', 'bbs', 'mesh', 'meshes', 'weldmesh', 'wiremesh',
'fabric', 'brc', 'stirrup', 'stirrups', 'link', 'links', 'tie', 'ties',
'dowel', 'dowels', 'cage', 'cages', 'lap', 'laps', 'lapped', 'splice', 'splices',
'coupler', 'couplers', 'chair', 'chairs', 'spacer', 'spacers', 'binding',
'bindingwire', 'anchorage', 'development', 'developmentlength', 'hook', 'hooks',
'bend', 'bends', 'crank', 'cranked', 'fitment', 'fitments',

// # --- Formwork / falsework ---
'formwork', 'form', 'forms', 'shuttering', 'shutter', 'falsework', 'centering',
'centring', 'soffit', 'deck', 'decking', 'prop', 'props', 'propping', 'reprop',
'reshore', 'reshoring', 'shore', 'shores', 'shoring', 'strike', 'striking',
'stripping', 'formface', 'ply', 'plyform', 'panel', 'panels', 'wale', 'waler',
'walers', 'strongback', 'formtie', 'formties', 'formoil', 'releaseagent', 'mould',
'mold', 'moulds',

// # --- Placing / pouring ---
'pour', 'pours', 'poured', 'pouring', 'placement', 'placing', 'placed', 'cast',
'casting', 'castinplace', 'castinsitu', 'insitu', 'batch', 'batching', 'batched',
'readymix', 'readymixed', 'rmc', 'transitmix', 'truckmixer', 'pump', 'pumped',
'pumping', 'boompump', 'linepump', 'chute', 'skip', 'tremie', 'vibrate',
'vibration', 'vibrator', 'poker', 'compaction', 'compact', 'consolidate',
'consolidation', 'lift', 'lifts',

// # --- Elements ---
'slab', 'slabs', 'flatslab', 'waffle', 'ribbed', 'footing', 'footings',
'foundation', 'foundations', 'pad', 'pads', 'padfooting', 'stripfooting',
'raft', 'mat', 'matfoundation', 'pile', 'piles', 'piling', 'bored', 'boredpile',
'caisson', 'pier', 'piers', 'pilecap', 'pilecaps', 'gradebeam', 'plinth',
'plinths', 'column', 'columns', 'stub', 'stubcolumn', 'beam', 'beams', 'girder',
'girders', 'joist', 'joists', 'lintel', 'lintels', 'cantilever', 'cantilevers',
'corbel', 'corbels', 'wall', 'walls', 'shearwall', 'shearwalls', 'corewall',
'core', 'retainingwall', 'diaphragm', 'diaphragmwall', 'capping', 'cappingbeam',
'ringbeam', 'tiebeam', 'staircase', 'stair', 'flight', 'landing',

// # --- Concrete types / processes ---
'concrete', 'concreting', 'precast', 'prestress', 'prestressed', 'prestressing',
'pretension', 'pretensioned', 'posttension', 'post-tension', 'posttensioned',
'pt', 'tendon', 'tendons', 'strand', 'strands', 'duct', 'ducts', 'anchor',
'anchors', 'jacking', 'stressing', 'grout', 'grouting', 'grouted', 'shotcrete',
'gunite', 'sprayedconcrete', 'screed', 'screeding', 'screeded', 'blinding',
'leanmix', 'leanconcrete', 'mudmat', 'topping', 'render', 'rendering',
'trowel', 'troweling', 'trowelling', 'floated', 'floating', 'floattrowel',
'powerfloat', 'tamp', 'tamping', 'finish', 'finishes', 'broomfinish',

// # --- Curing / defects / joints ---
'curing', 'cure', 'cured', 'curingcompound', 'ponding', 'bleedwater', 'bleeding',
'laitance', 'honeycomb', 'honeycombing', 'segregation', 'segregated', 'blowhole',
'blowholes', 'crack', 'cracks', 'cracking', 'craze', 'crazing', 'shrinkage',
'creep', 'spall', 'spalling', 'delamination', 'efflorescence', 'carbonation',
'coldjoint', 'constructionjoint', 'expansionjoint', 'controljoint', 'movementjoint',
'isolationjoint', 'contractionjoint', 'sawcut', 'waterstop', 'kicker',

// # --- Cover / mix / QA ---
'cover', 'covermeter', 'coverblock', 'slump', 'slumptest', 'flowtable',
'workability', 'workable', 'admixture', 'admixtures', 'plasticiser', 'plasticizer',
'superplasticiser', 'superplasticizer', 'retarder', 'accelerator', 'airentrainer',
'waterproofer', 'wrc', 'flyash', 'pfa', 'ggbs', 'ggbfs', 'slag', 'microsilica',
'silicafume', 'pozzolan', 'pozzolanic', 'cement', 'opc', 'cementitious',
'binder', 'hydration', 'watercement', 'wcratio', 'aggregate', 'aggregates',
'coarseaggregate', 'fineaggregate', 'sand', 'fines', 'gravel', 'ballast',
'cube', 'cubes', 'cubetest', 'cylinder', 'cylinders', 'coretest', 'characteristic',
'grade', 'strength', 'compressive', 'flexural', 'mpa', 'psi', 'nmm', 'n/mm2',
'gradec', 'm20', 'm25', 'm30', 'm35', 'm40',


// # --- General / structural ---
'steel', 'steelwork', 'structural', 'structuralsteel', 'metalwork', 'ironwork',
'fabrication', 'fabricate', 'fabricated', 'fabricator', 'fabricators', 'shopdrawing',
'shopdrawings', 'erection', 'erect', 'erected', 'erector', 'erectors', 'rigging',
'rigger', 'riggers', 'hoist', 'hoisting', 'crane', 'craneage', 'lift', 'lifting',
'liftplan', 'member', 'members', 'section', 'sections', 'rolledsection', 'hotrolled',
'coldrolled', 'coldformed', 'builtup', 'plategirder', 'trusswork',

// # --- Connections: bolting ---
'bolt', 'bolts', 'bolting', 'bolted', 'nut', 'nuts', 'washer', 'washers',
'holdingdown', 'hdbolt', 'anchorbolt', 'anchorbolts', 'raggbolt', 'baseplate',
'baseplates', 'grade88', 'grade109', 'hsfg', 'friction', 'frictiongrip',
'preload', 'preloaded', 'torque', 'torqued', 'torquing', 'tension', 'tensioning',
'tighten', 'tightening', 'snugtight', 'turnofnut', 'loadindicating', 'tabwasher',
'shear', 'bearing', 'slip', 'slipfactor', 'hole', 'holes', 'clearancehole',
'slottedhole', 'oversize', 'punched', 'drilled', 'reamed', 'reaming',

// # --- Connections: welding ---
'weld', 'welds', 'welded', 'welding', 'welder', 'welders', 'weldment',
'fillet', 'filletweld', 'buttweld', 'buttwelds', 'groove', 'grooveweld',
'fullpen', 'fullpenetration', 'partialpen', 'cjp', 'pjp', 'plugweld', 'slotweld',
'seamweld', 'spotweld', 'tack', 'tacked', 'tackweld', 'root', 'rootgap',
'rootpass', 'capping', 'cappass', 'bead', 'weldbead', 'toe', 'weldtoe', 'throat',
'legleg', 'leglength', 'undercut', 'porosity', 'inclusion', 'lackoffusion',
'lackofpenetration', 'cracking', 'hydrogencracking', 'preheat', 'interpass',
'pwht', 'stressrelief', 'consumable', 'consumables', 'electrode', 'electrodes',
'filler', 'fillerwire', 'flux', 'smaw', 'mma', 'stick', 'mig', 'mag', 'gmaw',
'tig', 'gtaw', 'saw', 'submergedarc', 'fcaw', 'wps', 'pqr', 'welderqualification',
'wpq',

// # --- NDT / inspection ---
'ndt', 'nde', 'inspection', 'inspector', 'visual', 'vt', 'mpi', 'mt',
'magneticparticle', 'dpi', 'pt', 'dyepenetrant', 'ut', 'ultrasonic', 'phasedarray',
'paut', 'tofd', 'rt', 'radiography', 'radiographic', 'xray', 'gammaray',
'holdpoint', 'witnesspoint', 'itp',

// # --- Coatings / corrosion / protection ---
'millscale', 'scale', 'rust', 'rusting', 'corrosion', 'corroded', 'corrosive',
'galvanise', 'galvanised', 'galvanize', 'galvanized', 'galvanising', 'galvanizing',
'hotdip', 'hdg', 'zinc', 'zincrich', 'sherardised', 'metallised', 'metallizing',
'sprayzinc', 'thermalspray', 'blast', 'blasting', 'gritblast', 'shotblast',
'abrasive', 'sa25', 'surfaceprep', 'profile', 'primer', 'primed', 'undercoat',
'topcoat', 'intumescent', 'fireproofing', 'fireprotection', 'epoxy', 'zincphosphate',
'dft', 'coating', 'coatings', 'paint', 'painted', 'painting', 'passivation',
'passivated', 'pickling', 'pickled', 'anodised', 'anodized', 'weathering',
'weatheringsteel', 'corten', 'cortensteel',

// # --- Materials / grades ---
'mildsteel', 'carbonsteel', 'stainless', 'stainlesssteel', 'duplex', 'austenitic',
'ferritic', 'martensitic', 's235', 's275', 's355', 's460', 'a36', 'a992',
'grade43', 'grade50', 'gr50', 'wroughtiron', 'castiron', 'ductileiron', 'aluminium',
'aluminum', 'brass', 'bronze', 'copper', 'alloy', 'alloys', 'yield', 'yieldstrength',
'ultimate', 'uts', 'ductility', 'toughness', 'charpy', 'notchtoughness', 'brinell',
'rockwell', 'hardness', 'millcert', 'millcertificate', 'materialcert', 'traceability',
'heatnumber', 'castnumber',

// # --- Sections / profiles ---
'hss', 'ub', 'uc', 'ukb', 'ukc', 'pfc', 'rsa', 'rsj', 'chs', 'rhs', 'shs',
'chsprofile', 'hollowsection', 'hollow', 'ibeam', 'hbeam', 'wbeam', 'wideflange',
'wshape', 'channel', 'channels', 'angle', 'angles', 'equalangle', 'unequalangle',
'tee', 'tsection', 'flange', 'flanges', 'web', 'webs', 'plate', 'plates',
'flatbar', 'flat', 'roundbar', 'squarebar', 'chequerplate', 'checkerplate',
'treadplate', 'gratings', 'grating', 'purlin', 'purlins', 'rail', 'siderail',
'cladding', 'sheeting', 'decking', 'cellularbeam', 'castellated', 'castellatedbeam',
'crosssection', 'gusset', 'gussetplate', 'stiffener', 'stiffeners', 'cleat',
'cleats', 'endplate', 'finplate', 'capplate', 'splice', 'spliceplate', 'shims',
'packer', 'packers', 'camber', 'cambered',


// # --- Cranes ---
'crane', 'cranes', 'craneage', 'towercrane', 'tower', 'mobilecrane', 'mobile',
'crawler', 'crawlercrane', 'crawlers', 'lorryloader', 'hiab', 'allterrain',
'roughterrain', 'rt', 'truckcrane', 'pedestalcrane', 'overheadcrane', 'gantry',
'gantrycrane', 'goliath', 'derrick', 'jib', 'jibs', 'flyjib', 'luffing',
'luffer', 'luffingjib', 'hammerhead', 'saddlejib', 'boom', 'booms', 'boomlength',
'telescopic', 'telescope', 'lattice', 'latticeboom', 'mast', 'slew', 'slewing',
'slewring', 'hook', 'hookblock', 'headacheball', 'winch', 'winches', 'hoist',
'hoists', 'hoisting', 'wirerope', 'ropes', 'sheave', 'reeving', 'counterweight',
'counterweights', 'ballast', 'rmu', 'radiusload', 'loadchart', 'loadradius',
'radius', 'swl', 'wll', 'ratedcapacity', 'capacity', 'duty', 'lmi', 'loadmoment',
'ratedcapacityindicator', 'rci', 'a60', 'antitwoblock',

// # --- Lifting gear / rigging ---
'rigging', 'rig', 'rigged', 'rigger', 'riggers', 'sling', 'slings', 'slinging',
'slinger', 'chainsling', 'wiresling', 'websling', 'roundsling', 'endless',
'shackle', 'shackles', 'dee', 'bow', 'bowshackle', 'deeshackle', 'eyebolt',
'eyebolts', 'eyenut', 'masterlink', 'link', 'hook', 'hooks', 'safetyhook',
'crosbyclamp', 'plateclamp', 'liftingbeam', 'spreader', 'spreaderbeam', 'liftingframe',
'liftinglug', 'lug', 'lugs', 'padeye', 'padeyes', 'trunnion', 'turnbuckle',
'ratchetstrap', 'leverhoist', 'chainblock', 'comealong', 'tirfor',
'tagline', 'taglines', 'guyline', 'liftingregister', 'lolerinspection', 'loler',
'thoroughexamination', 'coloursoftheday', 'safeworkingload', 'proofload',
'proofloaded', 'liftplan', 'liftingplan', 'appointedperson', 'ap', 'liftsupervisor',
'banksman', 'banksmen', 'signaller', 'signalperson', 'slingersignaller',
'handsignal', 'handsignals', 'exclusionzone',

// # --- Earthmoving / plant ---
'excavator', 'excavators', 'excavation', 'digger', 'diggers', 'threysixty',
'360', 'trackedexcavator', 'wheeledexcavator', 'longreach', 'miniexcavator',
'minidigger', 'backhoe', 'backhoeloader', 'jcb', 'loader', 'loaders', 'wheelloader',
'wheeledloader', 'loadingshovel', 'shovel', 'skidsteer', 'bobcat', 'dozer',
'dozers', 'bulldozer', 'bulldozers', 'blade', 'ripper', 'grader', 'graders',
'motorgrader', 'scraper', 'scrapers', 'trencher', 'dumper', 'dumpers', 'dumptruck',
'adt', 'articulated', 'rigiddump', 'tipper', 'tippers', 'muckaway', 'bucket',
'buckets', 'quickhitch', 'attachment', 'attachments', 'breaker', 'breakers',
'hydraulicbreaker', 'pecker', 'hammer', 'grab', 'grabs', 'auger', 'ripperteeth',

// # --- Compaction / rollers ---
'roller', 'rollers', 'compactor', 'compactors', 'compaction', 'compacting',
'compacted', 'vibratingroller', 'vibratory', 'smoothdrum', 'padfoot', 'sheepsfoot',
'tandemroller', 'pedestrianroller', 'wackerplate', 'wacker', 'platecompactor',
'rammer', 'trenchrammer', 'whackerplate',

// # --- Access / handling ---
'telehandler', 'telehandlers', 'telescopichandler', 'lull', 'forklift',
'forklifts', 'flt', 'roughterrainforklift', 'cherrypicker', 'mewp', 'mewps',
'scissorlift', 'scissor', 'boomlift', 'accessplatform', 'ipaf', 'manlift',
'articulatedboom', 'verticalmast', 'workplatform', 'ewp', 'harness', 'lanyard',
'fallarrest', 'fallrestraint',

// # --- Scaffolding ---
'scaffold', 'scaffolds', 'scaffolding', 'scaffolder', 'scaffolders',
'tube', 'tubes', 'tubeandfitting', 'tubeandcoupler', 'systemscaffold', 'cuplock',
'kwikstage', 'ringlock', 'coupler', 'couplers', 'doublecoupler', 'swivelcoupler',
'putlogcoupler', 'sleevecoupler', 'jointpin', 'ledger', 'ledgers', 'transom',
'transoms', 'putlog', 'putlogs', 'standard', 'standards', 'upright', 'brace',
'braces', 'bracing', 'facadebrace', 'ledgerbrace', 'soleboard', 'soleboards',
'soleplate', 'baseplate', 'baseplates', 'basejack', 'adjustablebase', 'tie',
'ties', 'throughtie', 'boxtie', 'revealtie', 'boardretentionplate', 'guardrail',
'toeboard', 'midrail', 'scaffoldboard', 'batten', 'hopup', 'ginwheel',
'scafftag', 'handovercertificate', 'birdcage', 'independent', 'putlogscaffold',
'towerscaffold', 'mobiletower', 'podium', 'stepladder', 'trestle',


// # --- Excavation / earthmoving ---
'excavation', 'excavations', 'excavate', 'excavated', 'excavating', 'dig',
'digging', 'earthwork', 'earthworks', 'earthmoving', 'muck', 'muckaway',
'muckshift', 'spoil', 'arisings', 'stockpile', 'stockpiles', 'bulkexcavation',
'reducedlevel', 'reducedleveldig', 'trench', 'trenches', 'trenching',
'trialpit', 'trialhole', 'borrowpit', 'overdig', 'overexcavation', 'batter',
'battering', 'benching', 'stepping', 'shoring', 'trenchbox', 'trenchsheet',
'sheetpile', 'sheetpiling', 'sheetpiles', 'kingpost', 'soldierpile', 'lagging',
'strut', 'struts', 'waling', 'walings', 'dewater', 'dewatering', 'wellpoint',
'wellpoints', 'sumppump', 'groundwater',

// # --- Fill / compaction / earthworks control ---
'backfill', 'backfilling', 'backfilled', 'fill', 'filling', 'engineeredfill',
'structuralfill', 'granularfill', 'importedfill', 'selectedfill', 'compaction',
'compact', 'compacted', 'compacting', 'layer', 'layers', 'lift', 'lifts',
'cut', 'cutandfill', 'embankment', 'embankments', 'bund', 'bunds', 'bunding',
'landscaping', 'topsoil', 'subsoil', 'stripping', 'strip', 'proofroll',
'proofrolling', 'insitudensity', 'nucleardensity', 'nucleargauge', 'mdd',
'omc', 'optimummoisture', 'cbr', 'plasticity', 'atterberg', 'moisturecontent',
'clay', 'silt', 'sand', 'gravel', 'cohesive', 'granular', 'madeground',
'contaminated', 'remediation',

// # --- Pavement layers ---
'subgrade', 'subbase', 'sub-base', 'capping', 'cappinglayer', 'formation',
'formationlevel', 'basecourse', 'binder', 'bindercourse',
'roadbase', 'surfacecourse', 'wearingcourse', 'pavement', 'pavementconstruction',
'type1', 'type2', 'mot', 'motstone', 'crushedrock', 'hardcore', 'scalpings',
'ballast',

// # --- Retaining / ground stabilisation ---
'retaining', 'retainingwall', 'crib', 'cribwall', 'gabion', 'gabions',
'gabionbasket', 'renomattress', 'geotextile', 'geotextiles', 'geogrid',
'geogrids', 'geomembrane', 'geocomposite', 'geocell', 'geosynthetic',
'reinforcedearth', 'reinforcedsoil', 'soilnail', 'soilnailing', 'rockbolt',
'anchor', 'groundanchor', 'groundanchors', 'facing', 'toe', 'heel', 'stem',

// # --- Drainage ---
'drainage', 'drain', 'drains', 'drainrun', 'landdrain', 'frenchdrain',
'filterdrain', 'perforated', 'landdrainage', 'pipe', 'pipes', 'pipework',
'pipelaying', 'pipelayer', 'bedding', 'surround', 'pipesurround', 'haunch',
'gully', 'gullies', 'gullypot', 'manhole', 'manholes', 'chamber', 'chambers',
'inspectionchamber', 'catchpit', 'catchpits', 'catchbasin', 'ic', 'ac',
'accesschamber', 'rodding', 'roddingeye', 'invert', 'invertlevel', 'benching',
'channel', 'cover', 'coverandframe', 'culvert', 'culverts', 'headwall',
'headwalls', 'wingwall', 'outfall', 'sewer', 'sewers', 'sewerage', 'foul',
'foulwater', 'foulsewer', 'combined', 'combinedsewer', 'stormwater', 'storm',
'surfacewater', 'swd', 'lateral', 'connection', 'saddle', 'junction',
'cctvsurvey', 'jetting',

// # --- SUDS / water management ---
'attenuation', 'attenuationtank', 'attenuationpond', 'soakaway', 'soakaways',
'infiltration', 'permeable', 'impermeable', 'permeablepaving', 'swale', 'swales',
'detention', 'detentionbasin', 'balancingpond', 'retentionpond', 'suds', 'sud',
'flowcontrol', 'hydrobrake', 'petrolinterceptor', 'interceptor', 'separator',
'oilseparator', 'silttrap', 'greenroof', 'raingarden', 'crate', 'crates',
'geocellularcrate', 'infiltrationbasin',

// # --- Surfacing / pavements ---
'asphalt', 'asphalting', 'bitumen', 'bituminous', 'macadam', 'bitmac', 'tarmac',
'blacktop', 'hotrolledasphalt', 'hra', 'sma', 'stonemasticasphalt', 'ac10',
'ac20', 'ac6', 'coatedmaterial', 'chippings', 'surfacedressing', 'tackcoat',
'bondcoat', 'primecoat', 'regulating', 'planing', 'planings', 'milling',
'paving', 'paver', 'pavers', 'paviour', 'paviours', 'blockpaving', 'setts',
'flag', 'flags', 'flagstone', 'slab', 'slabs', 'edging', 'edgings', 'kerb',
'kerbs', 'kerbing', 'kerbline', 'curb', 'curbs', 'channelblock', 'dropkerb',
'droppedkerb', 'quadrant', 'footway', 'footpath', 'carriageway', 'hardstanding',
'hardstand', 'apron', 'driveway', 'roadmarking', 'linemarking', 'thermoplastic',
'coldlay',


// # --- General ---
'mep', 'mepf', 'mepservices', 'buildingservices', 'services', 'firstfix',
'secondfix', 'containment', 'plantroom', 'plant', 'riser', 'risers', 'riserduct',
'builderswork', 'bwic', 'penetration',
'penetrations', 'coordination', 'clashdetection', 'clash', 'asbuilt', 'asbuilts',

// # --- HVAC: air ---
'hvac', 'heating', 'ventilation', 'aircon', 'airconditioning', 'ductwork',
'duct', 'ducts', 'ducting', 'spiralduct', 'rectangularduct', 'flexibleduct',
'flexi', 'plenum', 'plenumbox', 'grille', 'grilles', 'diffuser', 'diffusers',
'louvre', 'louvres', 'louver', 'damper', 'dampers', 'firedamper', 'firedampers',
'volumecontroldamper', 'vcd', 'attenuator', 'attenuators', 'silencer', 'ahu',
'ahus', 'airhandlingunit', 'fcu', 'fcus', 'fancoil', 'fancoilunit', 'vrf',
'vrv', 'splitunit', 'condenser', 'condensers', 'evaporator', 'ductheater',
'heatrecovery', 'mvhr', 'hrv', 'extractfan', 'supplyfan', 'fan', 'fans',
'axialfan', 'centrifugalfan', 'terminal', 'vavterminal', 'vav', 'cav',
'freshair', 'returnair', 'supplyair', 'extractair', 'makeupair',

// # --- HVAC: heating / cooling / water ---
'chiller', 'chillers', 'chilledwater', 'chw', 'lthw', 'mthw', 'boiler',
'boilers', 'boilerhouse', 'calorifier', 'calorifiers', 'heatexchanger',
'plateheatexchanger', 'phe', 'buffer', 'buffervessel', 'expansionvessel',
'pressurisation', 'pressurisationunit', 'coolingtower', 'coolingtowers',
'condenserwater', 'cwr', 'cwf', 'drycooler', 'heatpump', 'heatpumps', 'ashp',
'gshp', 'radiator', 'radiators', 'ufh', 'underfloorheating', 'trenchheater',
'fcupump', 'circulator', 'pump', 'pumps', 'pumpset', 'twinpump', 'inverter',
'inverterdrive', 'vsd', 'vfd',

// # --- Pipework / plumbing ---
'pipework', 'piping', 'pipe', 'pipes', 'pipeline', 'pipefitter', 'fitting',
'fittings', 'elbow', 'elbows', 'tee', 'tees', 'reducer', 'reducers', 'bend',
'bends', 'coupling', 'union', 'nipple', 'flange', 'flanges', 'gasket', 'gaskets',
'valve', 'valves', 'gatevalve', 'globevalve', 'ballvalve', 'checkvalve',
'nrv', 'butterflyvalve', 'prv', 'pressurereducing', 'commissioningvalve',
'drv', 'doubleregulatingvalve', 'isolationvalve', 'straininer', 'strainer',
'actuator', 'actuated', 'solenoid', 'copperpipe', 'copper', 'mildsteelpipe',
'blacksteel', 'galvanisedpipe', 'stainlesspipe', 'pressfit', 'compression',
'soldered', 'brazed', 'threaded', 'screwed', 'welded', 'pushfit', 'mdpe',
'hdpe', 'upvc', 'pvcu', 'abs', 'ppr', 'pex', 'soilpipe', 'soilstack', 'svp',
'wastepipe', 'trap', 'traps', 'wc', 'sanitaryware', 'sink', 'basin', 'cistern',
'macerator', 'sump', 'sumppump',

// # --- Water systems / quality ---
'potable', 'nonpotable', 'wholesomewater', 'greywater', 'blackwater',
'rainwaterharvesting', 'coldwater', 'cwss', 'cwst', 'hotwater', 'dhw', 'hwss',
'twpsu', 'breaktank', 'coldwaterstoragetank', 'tank', 'tanks',
'legionella', 'chlorination', 'disinfection', 'tmv', 'thermostaticmixingvalve',
'backflow', 'backflowprevention', 'watersoftener', 'boosterset',
'pressurisationset',

// # --- Electrical ---
'electrical', 'lv', 'hv', 'mv', 'trunking', 'conduit', 'conduits', 'cabletray',
'cableladder', 'basket', 'cablebasket', 'tray', 'ladder', 'cable', 'cables',
'cabling', 'swa', 'armoured', 'singles', 'flex', 'busbar', 'busbars',
'busbartrunking', 'bbt', 'switchgear', 'switchboard', 'switchboards', 'panel',
'panels', 'distributionboard', 'db', 'dbs', 'consumerunit', 'mcc', 'mccb',
'mcb', 'rcd', 'rcbo', 'acb', 'isolator', 'isolators', 'contactor', 'relay',
'transformer', 'transformers', 'tx', 'substation', 'genset', 'generator',
'generators', 'ups', 'inverterups', 'atsswitch', 'ats', 'lightingprotection',
'earthing', 'earth', 'earthbonding', 'bonding', 'lightning', 'smallpower',
'containmentroute', 'gland', 'glands', 'termination', 'terminations',

// # --- Lighting / low voltage / controls ---
'lighting', 'luminaire', 'luminaires', 'fitting', 'downlight', 'emergencylighting',
'emergency', 'exitsign', 'led', 'ballast', 'driver', 'dali', 'dimming',
'lightingcontrol', 'pir', 'occupancysensor', 'daylight', 'bms', 'bems',
'buildingmanagementsystem', 'controls', 'fieldcontroller', 'sensor', 'sensors',
'thermostat', 'valveactuator', 'firealarm', 'smokedetector', 'detector',
'sounder', 'callpoint', 'sprinkler', 'sprinklers', 'wetriser', 'dryriser',
'hosereel', 'gassuppression', 'security', 'cctv', 'accesscontrol',
'datacabling', 'structuredcabling', 'cat6', 'cat6a', 'fibre', 'fiber', 'patch',
'patchpanel', 'comms', 'commsroom',

// # --- Insulation / commissioning / handover ---
'insulation', 'insulated', 'lagging', 'lagged', 'thermalinsulation', 'ductinsulation',
'pipeinsulation', 'phenolic', 'rockwool', 'armaflex', 'vapourbarrier', 'trace',
'traceheating', 'cladding', 'identification', 'labelling', 'commissioning',
'commission', 'commissioned', 'precommissioning', 'balancing', 'balanced',
'airbalancing', 'waterbalancing', 'proportionalbalancing', 'flushing', 'flushed',
'chemicalclean', 'chemicaldose', 'dosing', 'pressuretest', 'leaktest', 'sat',
'fat', 'witnesstesting', 'handover', 'oandm', 'om', 'snagging', 'snag',
'testandcommission', 'tc', 'demonstration',


  // Finishes & envelope
  // # --- Cladding / facade ---
'cladding', 'clad', 'facade', 'facades', 'rainscreen', 'rainscreencladding',
'overcladding', 'panel', 'panels', 'panelling', 'acm', 'acp', 'compositepanel',
'sandwichpanel', 'insulatedpanel', 'metalcladding', 'profiledmetal', 'sheeting',
'cassette', 'cassettes', 'terracotta', 'faience', 'brickslip', 'brickslips',
'stonecladding', 'ashlar', 'precastpanel', 'grc', 'sfs', 'steelframingsystem',
'brackets', 'bracketry', 'helpinghand', 'subframe', 'carrierrail', 'firebreak',
'cavitybarrier', 'cavitybarriers', 'breathermembrane', 'ventilatedcavity',

// # --- Curtain wall / glazing ---
'curtainwall', 'curtainwalling', 'cw', 'sticksystem', 'unitised', 'unitized',
'unitisedsystem', 'glazing', 'glazed', 'glazier', 'reglaze', 'doubleglazing',
'tripleglazing', 'igu', 'igus', 'dgu', 'insulatedglassunit', 'sealedunit',
'fenestration', 'window', 'windows', 'curtaining', 'mullion', 'mullions',
'transom', 'transoms', 'spandrel', 'spandrels', 'spandrelpanel', 'vision',
'visionpanel', 'shadowbox', 'silicone', 'structuralglazing', 'ssg', 'toggle',
'setblock', 'setblocks', 'glazinggasket', 'weatherseal', 'pressureplate',
'cappingprofile', 'thermalbreak', 'polyamide', 'lowe', 'lowecoating', 'argon',
'laminated', 'toughened', 'annealed', 'heatsoaked', 'fritted', 'obscure',
'fireglass', 'louvre', 'brisesoleil', 'canopy', 'canopies',

// # --- Waterproofing / weathering ---
'flashing', 'flashings', 'cavitytray', 'weathering', 'weatherproofing', 'coping',
'copings', 'cill', 'cills', 'sill', 'sills', 'membrane', 'membranes',
'waterproofing', 'waterproof', 'tanking', 'tanked', 'liquidmembrane',
'liquidwaterproofing', 'torchon', 'feltroofing', 'builtupfelt', 'singleply',
'epdm', 'tpo', 'pvc', 'greenroof', 'warmroof', 'coldroof', 'invertedroof',
'vapourcontrol', 'vcl', 'dampproof', 'dampproofing', 'dpc', 'dpm',
'radonbarrier', 'gasmembrane', 'sealant', 'sealants', 'mastic', 'mastics',
'pointing', 'repointing', 'movementjoint', 'masticasphalt', 'liquiddpm',

// # --- Render / plaster / drylining ---
'render', 'rendering', 'rendered', 'monocouche', 'throughcolour', 'ewi',
'externalinsulation', 'basecoat', 'meshcoat', 'topcoat', 'harling', 'pebbledash',
'roughcast', 'plaster', 'plastering', 'plasterer', 'plasterers', 'wetplaster',
'floatandset', 'browning', 'bonding', 'hardwall', 'multifinish', 'skim',
'skimcoat', 'skimming', 'drylining', 'drywall', 'plasterboard', 'boarding',
'boarded', 'gypsum', 'gyproc', 'gib', 'wallboard', 'moistureboard', 'fireboard',
'fireline', 'soundbloc', 'tapered', 'squareedge', 'metalstud', 'studwork',
'track', 'stud', 'noggin', 'noggins', 'dabs', 'dotanddab', 'scrim', 'scrimtape',
'jointing', 'jointcompound', 'featheredge', 'beading', 'anglebead', 'stopbead',

// # --- Tiling / flooring / screed ---
'tiling', 'tiled', 'tiler', 'tilers', 'tile', 'tiles', 'walltiling',
'floortiling', 'ceramic', 'porcelain', 'mosaic', 'adhesive', 'tileadhesive',
'grout', 'grouting', 'grouted', 'groutline', 'silicone', 'movementjoint',
'levellingcompound', 'selflevelling', 'ditra', 'tanking', 'screed', 'screeding',
'screeded', 'sandcementscreed', 'liquidscreed', 'anhydritescreed', 'flowingscreed',
'floatingscreed', 'flooring', 'floorlayer', 'floorlaying', 'vinyl', 'lvt',
'safetyflooring', 'carpet', 'carpettile', 'carpettiles', 'resin', 'resinfloor',
'epoxyfloor', 'pufloor', 'polishedconcrete', 'laminate', 'engineeredwood',
'parquet', 'skirting', 'skirtings', 'raisedfloor', 'raisedaccessfloor', 'accessfloor',
'pedestal', 'pedestals', 'underlay', 'dpmscreed',

// # --- Ceilings / partitions ---
'ceiling', 'ceilings', 'suspendedceiling', 'susceiling', 'gridceiling',
'lay-in', 'mftceiling', 'mf', 'plasterboardceiling', 'bulkhead', 'bulkheads',
'ceilingtile', 'ceilingtiles', 'mineralfibre', 'metaltile', 'baffle', 'baffles',
'rafts', 'acoustic', 'acousticceiling', 'perimetertrim', 'hanger', 'hangers',
'partition', 'partitions', 'partitioning', 'demountable', 'glasspartition',
'sspartition', 'fireratedpartition', 'acousticpartition', 'headtrack', 'deflectionhead',

// # --- Joinery / carpentry ---
'joinery', 'joiner', 'joiners', 'carpentry', 'carpenter', 'carpenters',
'firstfixcarpentry', 'secondfixcarpentry', 'architrave', 'architraves',
'door', 'doors', 'doorset', 'doorsets', 'ironmongery', 'frame', 'frames',
'lining', 'linings', 'reveal', 'reveals', 'windowboard',
'cill', 'worktop', 'worktops', 'cabinetry', 'casework', 'shopfitting',
'mdf', 'plywood', 'timber', 'softwood', 'hardwood', 'batten', 'battens',
'firring', 'grounds', 'packers', 'firestopping', 'intumescent', 'fireseal',


// # --- PPE ---
'ppe', 'rpe', 'hardhat', 'hardhats', 'helmet', 'helmets', 'safetyhelmet',
'hi-vis', 'hivis', 'highvis', 'highvisibility', 'vest', 'vests', 'overalls',
'coverall', 'coveralls', 'safetyboots', 'steeltoecap', 'toecap', 'gloves',
'gauntlets', 'goggles', 'safetyglasses', 'eyeprotection', 'faceshield',
'visor', 'earprotection', 'eardefenders', 'earplugs', 'hearingprotection',
'respirator', 'respirators', 'dustmask', 'ffp3', 'facefit', 'facefittest',
'kneepads', 'wetweather', 'harness', 'harnesses', 'lanyard', 'lanyards',
'fallarrest', 'fallrestraint', 'inertiareel', 'anchorpoint', 'anchorage',

// # --- Working at height / edge protection ---
'workingatheight', 'wah', 'edgeprotection', 'guardrail', 'guardrails',
'handrail', 'handrails', 'toeboard', 'toeboards', 'midrail', 'barrier',
'barriers', 'heras', 'herasfencing', 'hoarding', 'netting', 'safetynet',
'safetynets', 'debrisnet', 'debrisnetting', 'brickguard', 'fan', 'catchfan',
'airbag', 'softlanding', 'crashdeck', 'meshguard', 'openhole', 'voidprotection',
'voidcover', 'flooropening', 'leadingedge', 'fragile', 'fragileroof',
'roofedge', 'ladder', 'ladders', 'stepladder', 'podiumstep', 'towerscaffold',

// # --- Exclusion / segregation / permits ---
'exclusion', 'exclusionzone', 'segregation', 'segregate', 'demarcation',
'barrieroff', 'coneoff', 'signage', 'safetysignage', 'warningsign', 'keepout',
'permit', 'permits', 'permittowork', 'ptw', 'hotwork', 'hotworkpermit',
'confinedspace', 'confinedspaceentry', 'digpermit', 'excavationpermit',
'isolation', 'isolationcertificate', 'lockout', 'tagout', 'lockouttagout',
'loto', 'locktagtry', 'energisation', 'deenergised', 'liveworking',

// # --- Risk / documentation ---
'rams', 'riskassessment', 'riskassessments', 'ra', 'methodstatement',
'methodstatements', 'ms', 'safesystemofwork', 'ssow', 'safeworkmethod',
'swms', 'jha', 'jsa', 'taskbriefing', 'pointofworkriskassessment', 'powra',
'dynamicriskassessment', 'hazard', 'hazards', 'hazardous', 'controlmeasure',
'controlmeasures', 'hierarchy', 'mitigation', 'residualrisk', 'coshh',
'coshhassessment', 'msds', 'sds', 'hazardoussubstance', 'dsear', 'manualhandling',
'noise', 'vibration', 'havs', 'handarmvibration', 'silica', 'rcs', 'asbestos',
'acm', 'legionella', 'leaddust',

// # --- Briefings / competence ---
'toolbox', 'toolboxtalk', 'tbt', 'tbts', 'briefing', 'briefings', 'prestart',
'prestartbriefing', 'dailybriefing', 'inductions', 'induction', 'siteinduction',
'competence', 'competent', 'cscs', 'cscscard', 'cpcs', 'cpcscard', 'npors',
'ticket', 'tickets', 'training', 'trained', 'authorised', 'appointed',
'supervision', 'supervisor', 'sssts', 'smsts', 'firstaider', 'firstaid',

// # --- Incidents / reporting ---
'near-miss', 'nearmiss', 'nearmisses', 'incident', 'incidents', 'accident',
'accidents', 'injury', 'injuries', 'ltifr', 'lti', 'losttime', 'riddor',
'riddorreportable', 'dangerousoccurrence', 'firstaidcase', 'medicaltreatment',
'fatality', 'unsafeact', 'unsafecondition', 'observation', 'observations',
'safetyobservation', 'closecall', 'investigation', 'rootcause', 'rca',
'lessonslearned', 'safetyalert', 'stopwork', 'stopthejob', 'intervention',

// # --- Quality / QA-QC ---
'holdpoint', 'holdpoints', 'witnesspoint', 'witnesspoints', 'itp', 'itps',
'inspectiontestplan', 'qa', 'qc', 'qaqc', 'quality', 'qualityplan',
'checksheet', 'checksheets', 'inspectionrecord', 'ncr', 'ncrs',
'nonconformance', 'nonconformancereport', 'nonconformity', 'defect', 'defects',
'snag', 'snagging', 'snaglist', 'punchlist', 'corrective', 'correctiveaction',
'car', 'preventive', 'preventiveaction', 'rootcauseanalysis', 'concession',
'derogation', 'waiver', 'asbuilt', 'handover', 'signoff', 'approval',
'benchmark', 'benchmarkpanel', 'samplepanel', 'mockup',

// # --- HSE management / environment ---
'hse', 'hsse', 'she', 'ehs', 'healthandsafety', 'safetyofficer', 'safetymanager',
'cdm', 'principalcontractor', 'principaldesigner', 'constructionphaseplan',
'cpp', 'f10', 'welfare', 'welfarefacilities', 'firstaidkit', 'musterpoint',
'assemblypoint', 'evacuation', 'firemarshal', 'firewarden', 'emergencyplan',
'audit', 'audits', 'inspection', 'safetyinspection', 'behavioural', 'bbs',
'environmental', 'spillkit', 'spillage', 'pollution', 'dust', 'dustsuppression',
'wastesegregation', 'ecology', 'permit', 'consent',


// # --- Contract / correspondence ---
'rfi', 'rfis', 'requestforinformation', 'rfc', 'requestforchange', 'ti',
'technicalquery', 'tq', 'tqs', 'submittal', 'submittals', 'transmittal',
'earlywarning', 'earlywarningnotice', 'ewn', 'compensationevent', 'ce',
'ces', 'instruction', 'instructions', 'ai', 'architectsinstruction', 'ci',
'contractorsinstruction', 'notice', 'notices', 'correspondence', 'minutes',

// # --- Change / claims / time ---
'variation', 'variations', 'vo', 'vos', 'variationorder', 'changeorder',
'co', 'cos', 'change', 'changes', 'scopechange', 'eot', 'extensionoftime',
'delay', 'delays', 'delayanalysis', 'disruption', 'prolongation',
'accelaration', 'acceleration', 'claim', 'claims', 'contractualclaim',
'lad', 'lads', 'liquidateddamages', 'ldamages', 'globalclaim', 'quantummeruit',
'dispute', 'adjudication', 'arbitration', 'mediation',

// # --- Completion / defects ---
'snag', 'snags', 'snagging', 'snaglist', 'punchlist', 'defect', 'defects',
'defectslist', 'handover', 'handovers', 'partialhandover', 'sectional',
'sectionalcompletion', 'practicalcompletion', 'pc', 'substantialcompletion',
'takingover', 'takeover', 'takeovercertificate', 'completioncertificate',
'dlp', 'defectsliabilityperiod', 'rectification', 'rectificationperiod',
'makinggood', 'retention', 'retentionrelease', 'finalaccount', 'finalcertificate',

// # --- Quantities / cost / estimating ---
'boq', 'billofquantities', 'bom', 'billofmaterials', 'takeoff', 'takeoffs',
'measure', 'measurement', 'remeasure', 'remeasurement', 'quantity', 'quantities',
'qty', 'qs', 'quantitysurveyor', 'quantitysurveyors', 'pqs', 'estimator',
'estimators', 'estimating', 'estimate', 'estimates', 'pricing', 'priced',
'rate', 'rates', 'unitrate', 'ratebuildup', 'analysis', 'preliminaries',
'prelims', 'primecost', 'pcsum', 'provisionalsum', 'provsum', 'contingency',
'daywork', 'dayworks', 'costplan', 'costreport', 'cvr', 'valuation',
'valuations', 'interimvaluation', 'application', 'applications', 'wip',
'certification', 'paymentcertificate', 'certifiedvalue', 'cashflow',
'cbs', 'costbreakdown', 'margin', 'markup', 'overhead', 'overheads',

// # --- Procurement / tender ---
'tender', 'tenders', 'tendering', 'bid', 'bids', 'bidding', 'itt', 'rfp',
'rfq', 'quotation', 'quote', 'quotes', 'submission', 'prequalification',
'pqq', 'procurement', 'procure', 'buyer', 'buying', 'enquiry', 'enquiries',
'orderplacement', 'purchaseorder', 'po', 'pos', 'letterofintent', 'loi',
'award', 'awarded', 'framework', 'lumpsum', 'fixedprice', 'costreimbursable',
'targetcost', 'painshare', 'gainshare', 'ecc', 'nec', 'jct', 'fidic',

// # --- Parties / roles ---
'subcontractor', 'subcontractors', 'subcontract', 'subbie', 'subbies',
'supplier', 'suppliers', 'vendor', 'vendors', 'maincontractor', 'gc',
'generalcontractor', 'pmc', 'contractor', 'contractors', 'client', 'clients',
'employer', 'employers', 'developer', 'principal', 'consultant', 'consultants',
'designer', 'designers', 'architect', 'architects', 'engineer', 'engineers',
'contractadministrator', 'ca', 'ers', 'employersrep', 'clientsrep', 'pm',
'projectmanager', 'projectmanagers', 'sitemanager', 'sitemanagers', 'agent',
'siteagent', 'foreman', 'ganger', 'commercialmanager', 'surveyor',
'stakeholder', 'stakeholders',

// # --- Programme / planning ---
'programme', 'programmes', 'program', 'programming', 'schedule', 'schedules',
'scheduling', 'lookahead', 'lookaheads', 'twoweek', 'threeweek', 'sixweek',
'shorttermprogramme', 'masterprogramme', 'sequence', 'sequencing', 'phasing',
'milestone', 'milestones', 'keydate', 'keydates', 'criticalpath', 'cpm',
'criticalpathmethod', 'float', 'freefloat', 'totalfloat', 'slack', 'gantt',
'ganttchart', 'barchart', 'baseline', 'baselined', 'rebaseline', 'recovery',
'recoveryprogramme', 'progress', 'progressed', 'percentcomplete', 'earnedvalue',
'ev', 'evm', 'spi', 'cpi', 'scurve', 'scurves', 'durations', 'duration',
'logic', 'dependency', 'dependencies', 'predecessor', 'successor', 'constraint',
'constraints', 'resource', 'resources', 'resourced', 'histogram', 'p6',
'primavera', 'asta', 'powerproject', 'msproject',


// # --- Timber / boards ---
'timber', 'timbers', 'lumber', 'wood', 'plywood', 'ply', 'osb', 'osb3',
'mdf', 'mdfboard', 'chipboard', 'particleboard', 'blockboard', 'hardboard',
'fibreboard', 'mfc', 'melamine', 'veneer', 'hardwood', 'softwood', 'oak',
'pine', 'redwood', 'whitewood', 'sawn', 'planed', 'pse', 'par', 'c16', 'c24',
'glulam', 'lvl', 'clt', 'crosslaminated', 'engineeredtimber', 'iisjoist',
'ijoist', 'tji', 'treated', 'tanalised', 'pressuretreated', 'carcassing',
'batten', 'battens', 'lath', 'stud', 'noggin',

// # --- Masonry ---
'masonry', 'brickwork', 'blockwork', 'block', 'blocks', 'brick', 'bricks',
'brickie', 'bricklayer', 'bricklayers', 'facingbrick', 'engineeringbrick',
'commonbrick', 'stock', 'stockbrick', 'aircrete', 'aerated', 'thermalite',
'denseblock', 'mediumdense', 'aggregateblock', 'concreteblock', 'paviour',
'coursing', 'course', 'bond', 'stretcher', 'header', 'stretcherbond',
'flemishbond', 'englishbond', 'perp', 'perpend', 'bed', 'bedjoint', 'perpends',
'quoin', 'reveal', 'soldiercourse', 'stone', 'stonework', 'masonrywall',
'blocklayer', 'mortar', 'mortars', 'sandcement', 'lime', 'limemortar',
'gaugedmortar', 'muck', 'snots', 'pointing', 'repointing', 'flushpointing',
'weatherstruck', 'bucketpointing', 'raking',

// # --- Cavity / ties / DPC ---
'cavity', 'cavities', 'cavitywall', 'walltie', 'wallties', 'ties',
'cavitycloser', 'cavitytray', 'weepvent', 'weephole', 'weepholes', 'dpc',
'dpm', 'lintel', 'cavitybarrier', 'insulation', 'insulated', 'pir', 'pur',
'phenolic', 'mineralwool', 'rockwool', 'glasswool', 'eps', 'xps', 'kingspan',
'celotex', 'partialfill', 'fullfill', 'cavityinsulation', 'battinsulation',
'rigidboard', 'thermal', 'lambda', 'uvalue', 'ancon', 'restraintstrap',

// # --- Reinforcement / mesh ---
'rebar', 'reinforcement', 'reinforcing', 'mesh', 'meshes', 'fabric', 'brc',
'weldmesh', 'wiremesh', 'bricoformesh', 'bedjointreinforcement', 'a142',
'a193', 'a252', 'a393', 'b385', 'b503', 'c283', 'starterbar', 'starterbars',
'coverblock', 'spacer', 'chair', 'chairs', 'tyingwire', 'bindingwire',

// # --- Adhesives / resins / sealants ---
'epoxy', 'epoxies', 'resin', 'resins', 'resinanchor', 'chemicalanchor',
'chemfix', 'polyester', 'polyurethane', 'pu', 'grout', 'nonshrinkgrout',
'adhesive', 'adhesives', 'bonding', 'bondingagent', 'sbr', 'pva', 'sealant',
'sealants', 'silicone', 'siliconesealant', 'mastic', 'mastics', 'acrylic',
'mspolymer', 'polysulphide', 'gunfoam', 'expandingfoam', 'foam', 'backerrod',

// # --- Coatings / paint ---
'primer', 'primers', 'undercoat', 'coating', 'coatings', 'paint', 'paints',
'painting', 'emulsion', 'gloss', 'eggshell', 'satinwood', 'topcoat',
'anticorrosive', 'zincprimer', 'etchprimer', 'stain', 'varnish', 'lacquer',
'waterbased', 'solventbased', 'twopack', 'twopart', 'dft', 'wft',

// # --- Fire protection / passive ---
'intumescent', 'intumescentpaint', 'intumescentcoating', 'fireproofing',
'fireprotection', 'passivefire', 'passivefireprotection', 'pfp', 'firestopping',
'firestop', 'firestops', 'fireseal', 'firecollar', 'firecollars', 'firesleeve',
'firebatt', 'firepillow', 'firepillows', 'fireboard', 'ablative', 'mastic',
'firemastic', 'fireputty', 'wrap', 'firewrap', 'penetrationseal', 'linearseal',
'compartment', 'compartments', 'compartmentation', 'firecompartment',
'firewall', 'firebarrier', 'firedoor', 'firerating', 'fireresistance',
'ei30', 'ei60', 'ei90', 'ei120', 'thirtyminute', 'sixtyminute',


  // Roles & site
  'foreman', 'foremen', 'ganger', 'gang', 'tradesman', 'tradesmen',
  'operative', 'operatives', 'labourer', 'laborer', 'labourers', 'laborers',
  'supervisor', 'supervisors', 'super', 'supers', 'pm', 'pe', 'se',
  'clerkofworks', 'residentengineer', 'banksman', 'slinger',
  'site', 'jobsite', 'yard', 'compound', 'welfare', 'canteen', 'hoarding',
  'hoardings', 'gate', 'gates', 'access', 'egress', 'laydown', 'stockpile',

  // Documents & drawings
  'drawing', 'drawings', 'dwg', 'dxf', 'ifc', 'bim', 'revit', 'navisworks',
  'clash', 'clashes', 'coordination', 'asbuilt', 'as-built', 'shopdrawing',
  'shopdrawings', 'ga', 'rc', 'detail', 'details', 'section', 'sections',
  'elevation', 'elevations', 'plan', 'plans', 'revision', 'revisions',
  'spec', 'specs', 'specification', 'specifications', 'datasheet', 'datasheets',
  'submittal', 'submittals', 'transmittal', 'transmittals', 'register',

  // Misc field terms
  'setout', 'settingout', 'benchmark', 'benchmarks', 'datum', 'level',
  'levels', 'survey', 'surveys', 'surveyor', 'surveyors', 'totalstation',
  'gps', 'gnss', 'laser', 'plumb', 'square', 'tolerance', 'tolerances',
  'deviation', 'deviations', 'alignment', 'rl', 'tdh',
  'moisture', 'humidity', 'temperature', 'weather', 'windspeed',
  'temporaryworks', 'tw', 'propping', 'shoring', 'underpinning',
  'demolition', 'stripout', 'strip-out', 'enabling', 'mobilisation',
  'mobilization', 'demobilisation', 'demobilization',
]

const termSet = new Set(CONSTRUCTION_TERMS.map((t) => t.toLowerCase()))

export function isConstructionTerm(word: string): boolean {
  return termSet.has(word.toLowerCase())
}
