from pathlib import Path
import re, subprocess, sys
from collections import Counter

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'index.html').read_text(encoding='utf-8')
JS_FILES=[
  ROOT/'js/core.js',ROOT/'js/looper.js',ROOT/'js/practice.js',
  ROOT/'js/chopper.js',ROOT/'js/drums.js',ROOT/'js/events.js'
]
JS='\n'.join(p.read_text(encoding='utf-8') for p in JS_FILES)

checks=[]
def check(name,cond): checks.append((name,bool(cond)))

required_files=[
  'css/base.css',
  'css/src/tokens.css','css/src/base.css','css/src/layout.css','css/src/looper.css',
  'css/src/chopper.css','css/src/drums.css','css/src/practice.css','css/src/responsive.css',
  'css/src/utilities.css','css/src/shared.css','tools/build_css.py','tools/test_all.py','docs/CSS_WORKFLOW.md',
  'tests/css_parser.py','tests/css_health.py','tests/css_redundancy.py','tests/js_health.py','tests/core_unit.js',
  'tests/assets_health.py','tests/audio_assets.py',
  'tests/http_smoke.py',
  'js/bootstrap.js','js/core.js','js/looper.js','js/practice.js','js/chopper.js','js/drums.js','js/events.js',
  'assets/cassette-mechanism-pixel-v84.png','assets/cassette-reel-pixel-v81.png','assets/deck-black-ui-texture.png',
  'assets/beats/stack-piano-horns-85-asharp-minor.wav','assets/beats/violin-piano-92-bflat-minor.wav','assets/beats/stack-violin-piano-89-c-minor.wav',
  'docs/SECURITY.md','docs/nginx-security.conf'
]
for rel in required_files: check(f'file {rel}',(ROOT/rel).exists())

ids=re.findall(r'\bid="([^"]+)"',HTML)
dupes=[x for x,n in Counter(ids).items() if n>1]
check('no duplicate ids',not dupes)

refs=sorted(set(re.findall(r'\$\("([^"]+)"\)',JS)))
missing=[rid for rid in refs if f'id="{rid}"' not in HTML]
check('all $() DOM refs exist',not missing)

required_ids=[
 'cassetteDoorEject','tapeCounter','tapeCounterReset','prevBeat','playBeat','stopBeat','nextBeat','autoLooperToggle','beatFiles','beatFolder',
 'importBeatsBtn','importFolderBtn','beatImportStatus','loadSampleBtn','sampleFile','kickFolderBtn','snareFolderBtn','hatFolderBtn',
 'kickFolderFallback','snareFolderFallback','hatFolderFallback','waveCanvas','loopGrid','addFlipLibrary'
]
for rid in required_ids: check(f'id {rid}',f'id="{rid}"' in HTML)

required_functions=[
 'importBeatFiles','refreshLibrary','connectBeatDirectory','loadTrack','playDeck','stopDeck',
 'chooseDrumFolder','setFallbackDrumFolder','decodeFile','renderSequence','analyzeSampleCondition',
 'formatTapeCounter','refreshTapeCounter','resetTapeCounter','startTapeCounter','stopTapeCounter',
 'isFolderBeat','isBundledBeat','relativeTrackIndex','switchTrack','toggleAutoLooper',
 'runBeatStoreTransaction','mergeLibraryRows','visibleLibraryRows','createCassetteRackColumn','renderLibraryRows'
]
for fn in required_functions:
    check(f'function {fn}', bool(re.search(rf'\b(?:async\s+)?function\s+{fn}\s*\(',JS)))

check('no imported-beat BPM detector','function detectBpm(' not in JS)
check('recorder absent','MediaRecorder' not in JS and 'getUserMedia' not in JS)
check('LAB absent','id="lab"' not in HTML.lower())
check('AUTO threshold 8 loops','AUTO_LOOP_BATCH=8' in JS and 'autoLooperLoopCount>=AUTO_LOOP_BATCH' in JS)
check('AUTO +1 percent','AUTO_SPEED_INCREMENT_PERCENT=1' in JS and 'autoLooperSpeedPercent+AUTO_SPEED_INCREMENT_PERCENT' in JS)
check('production cassette mechanism V84 integrated','cassette-mechanism-pixel-v84.png' in HTML and 'cassette-deck-pixel-v83.png' not in HTML)
check('production warm cassette reel integrated','cassette-reel-pixel-v81.png' in HTML and 'cassette-reel-pixel-v74.png' not in HTML)
check('PUNCH retained','id="punchMode"' in HTML)
check('sample conditioner retained','analyzeSampleCondition' in JS and 'makeSampleConditioner' in JS)
check('memory DB fallback','memoryBeatStore' in JS and 'dbFallbackMode' in JS)

# Each external script must parse standalone as a classic script.
for path in JS_FILES+[ROOT/'js/bootstrap.js',ROOT/'sw.js']:
    proc=subprocess.run(['node','--check',str(path)],capture_output=True,text=True)
    check(f'node --check {path.name}',proc.returncode==0)
    if proc.returncode:
        print(proc.stderr)



# V62 regression + security invariants.
check('crate search never triggers disk rescan', '$("librarySearch").oninput=()=>refreshLibrary(false);' in JS)
check('crate sort never triggers disk rescan', '$("libraryOrder").onchange=()=>refreshLibrary(false);' in JS)
check('automatic K mount UI removed', 'connectBeatFolderBtn' not in HTML+JS and '.then(()=>restoreBeatDirectoryHandle())' not in JS)
check('write access reserved for save', 'connectBeatDirectory("readwrite")' in JS and 'requestPermission({mode:"readwrite"})' in JS)
check('local file size guards', all(x in JS for x in ['MAX_BEAT_FILE_BYTES','MAX_SAMPLE_FILE_BYTES','MAX_DRUM_FILE_BYTES']))
check('local random UUID fallback', 'function localId()' in JS)
check('Windows filename hardening', 'CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9]' in JS)
check('interactive-safe Space shortcut', 'tag==="button"' in JS and 'ev.repeat' in JS and '$("looper")?.classList.contains("active")' in JS)
check('service worker same-origin guard', 'url.origin!==self.location.origin' in (ROOT/'sw.js').read_text(encoding='utf-8'))
check('service worker bounded cache', 'STATIC_PATHS.has(url.pathname)' in (ROOT/'sw.js').read_text(encoding='utf-8'))
check('no eval', 'eval(' not in JS)
check('no dynamic Function constructor', 'new Function' not in JS)
check('no document.write', 'document.write' not in JS)
check('no insertAdjacentHTML', 'insertAdjacentHTML' not in JS)
inner_html=[m.group(0) for m in re.finditer(r'\.innerHTML\s*=\s*([^;]+);',JS)]
check('innerHTML only used to clear trusted UI', all(re.search(r'innerHTML\s*=\s*["\']{2}',x) for x in inner_html))
check('no remote application URLs', not re.search(r'https?://', HTML+JS))

# V82 product identity: local Looper + Chopper, with no AI implementation.
PROJECT_TEXT='\n'.join(
  path.read_text(encoding='utf-8',errors='ignore')
  for path in ROOT.rglob('*')
  if path.is_file()
  and path.resolve() != Path(__file__).resolve()
  and path.suffix.lower() in {'.html','.js','.css','.json','.md','.txt','.py'}
)
ai_pattern=re.compile(
  r'(?i)(?<![\w])(ai|ia|suno|udio)(?![\w])|artificial intelligence|intelligence artificielle|'
  r'openai|anthropic|gemini|tensorflow|onnx|machine[ -]learning|deep[ -]learning|neural|inference'
)
check('no AI implementation or product wording', not ai_pattern.search(PROJECT_TEXT))


# V66 CSS architecture / resource invariants.
base_css=(ROOT/'css/base.css').read_text(encoding='utf-8')
check('base CSS is generated', 'GENERATED production stylesheet' in base_css)
check('CSS source ordering markers', all('@sp-order' in (ROOT/'css/src'/name).read_text(encoding='utf-8') for name in ['tokens.css','base.css','layout.css','looper.css','chopper.css','drums.css','practice.css','responsive.css','utilities.css','shared.css']))
check('deck texture path resolves from css directory', '--deck-texture: url("../assets/deck-black-ui-texture.png")' in base_css)
check('service worker cache V91', 'scratch-practice-v91' in (ROOT/'sw.js').read_text(encoding='utf-8'))
check('runtime version V91', 'version:"91"' in (ROOT/'js/bootstrap.js').read_text(encoding='utf-8'))

# V67 Looper CSS consolidation invariants.
looper_css=(ROOT/'css/src/looper.css').read_text(encoding='utf-8')
check('semantic cassette deck class', 'class="cassetteDeck"' in HTML and '.cassetteDeck {' in looper_css)
check('semantic cassette stage class', 'class="cassetteDeckStage"' in HTML and '.cassetteDeckStage {' in looper_css)
check('pixel deck photo-reference aspect ratio', bool(re.search(r'aspect-ratio:\s*1536\s*/\s*1024',looper_css)))
check('pixel reel stepped animation', 'steps(12,end)' in looper_css)
check('pixel reel uses warm transparent asset', 'cassette-reel-pixel-v81.png' in HTML and bool(re.search(r'object-fit:\s*contain',looper_css)))
check('physical cassette door assembly', all(x in HTML+looper_css for x in ['cassetteDoorAssembly','cassetteDoorCavity','cassetteDoorGlass','counterEjectKey']))
check('cassette lower edge masked by cabin lip', 'cassetteDoorLip' in HTML and '.cassetteDoorLip {' in looper_css)
check('cassette eject stays a direct file gesture', '$("cassetteDoorEject").onclick=' in JS and 'openFilePicker("beatFiles");' in JS)
check('cassette eject animation pulse', 'function pulseCassetteDoor()' in JS and 'classList.add("ejecting")' in JS)
check('restrained warm Miami palette', all(x in looper_css for x in ['#e2ad5f','#d48643','#d69a55']) and '#6d9897' not in looper_css)
check('glass horizon detail', '.cassetteDoorGlass::before' in looper_css)
check('physical tape speed documented', 'tape speed: 4.75 cm/s' in looper_css and 't = 2πr/v' in looper_css)
check('reel radii produce distinct cycles', '--supply-reel-cycle:2.91s' in looper_css and '--takeup-reel-cycle:1.46s' in looper_css)
check('reel cycles follow AUTO playback rate', all(x in (ROOT/'js/looper.js').read_text(encoding='utf-8') for x in ['SUPPLY_REEL_CYCLE_SECONDS/rate','TAKEUP_REEL_CYCLE_SECONDS/rate','--supply-reel-cycle','--takeup-reel-cycle']))
check('legacy deck compatibility classes removed', not any(x in HTML+looper_css for x in ['uniformDeckPhoto','uniformDeckStage','uniformDeckBeatLabel','uniformDeckHint','frontDeckPhoto','frontDeckStage','frontDeckImage','frontDeckBeatLabel','frontDeckHint']))
check('single Beat Crate row class', 'track cassetteTrack' not in JS and '.cassetteTrack' not in looper_css)
check('Looper pixel palette', all(x in looper_css for x in ['--pixel-amber:#e2ad5f','--pixel-orange:#d48643']))
check('V78 Looper pixel panels and controls', all(x in looper_css for x in ['#looper .panel {','#looper .btn {','#looper .track {','.cassetteDeck {']))
check('V78 Looper pixel step interaction', 'steps(2,end)' in looper_css and 'clip-path:polygon' in looper_css)
check('V79 deck-integrated load dock', all(x in HTML+looper_css for x in ['looperPlayerHardware','looperImportDock','deckLoadKey','beatImportStatus']))
check('V89 restrained full-seam control glow', ':is(.deckSideKey,.deckCounterKey,.deckLoadKey,.deckHotspot) {' in looper_css and '0 0 8px color-mix(in srgb,var(--key-light) 9%,transparent)' in looper_css)
check('V79 three bundled beats', JS.count('source:"bundled"') == 3 and JS.count('./assets/beats/') == 3)
check('V79 bundled beats fetch locally', 'fetch(row.url,{cache:"force-cache"})' in JS)
check('V80 deterministic cassette spine tones', 'function beatSpineTone(' in JS and 'dataset.spineTone' in JS)
check('V86 dynamic cassette rack DOM', all(x in JS for x in ['createBeatSpine','cassetteRackColumn','cassetteRackSlot','columnIndex*RACK_SLOTS_PER_COLUMN+slotIndex']))
check('V86 cassette spine CSS', all(x in looper_css for x in ['.track[data-spine-tone="0"]','.track[data-spine-tone="4"]','.cassetteRackColumn {','.cassetteRackSlot {','aspect-ratio:6.4 / 1']))
check('Looper CSS bounded', len(looper_css.splitlines()) < 1380)

# V81 deck color preserved; V82 folds it into component owners.
tokens_v82=(ROOT/'css/src/tokens.css').read_text(encoding='utf-8')
base_source=(ROOT/'css/src/base.css').read_text(encoding='utf-8')
chopper_js=(ROOT/'js/chopper.js').read_text(encoding='utf-8')
events_js=(ROOT/'js/events.js').read_text(encoding='utf-8')
core_js=(ROOT/'js/core.js').read_text(encoding='utf-8')
looper_js=(ROOT/'js/looper.js').read_text(encoding='utf-8')
check('V82 semantic accent tokens', '--accent: #e2ad5f' in tokens_v82 and '--accent-secondary: #b87349' in tokens_v82 and '--blue:' not in tokens_v82)
check('V82 temporary deck theme removed', not (ROOT/'css/src/deck-theme.css').exists())
check('V82 idle button glow component-owned', 'button:not(:disabled)' in base_source and 'drop-shadow(0 0 2px rgba(226,173,95,.10))' in base_source)
check('V82 warm three-band peak meter component-owned', all(x in base_source for x in ['.headerVu i.on.low','#789d98','.headerVu i.on.mid','#e2ad5f','.headerVu i.on.high','#e18a48']))
check('V81 peak hold engine', 'const meterPeakHold = new Map();' in core_js and 'peakHold' in core_js and 'const active=index<lit;' in core_js)
check('V81 waveform and playhead warmed', all(x in chopper_js for x in ['#12100d','#d7a455','#e2ad5f','rgba(226,173,95,.62)']))
check('V81 old blue waveform colors absent', not any(x in chopper_js for x in ['#082432','#8ddcff','#9bdcff','#78a4ff','#8bb0ff','rgba(78,130,255,.72)']))
check('V81 crate pulse warmed', 'rgba(226,173,95,.14)' in events_js and 'rgba(40,124,255' not in events_js)
check('V81 animated reel contains no legacy blue asset', 'cassette-reel-pixel-v81.png' in (ROOT/'sw.js').read_text(encoding='utf-8'))
check('V82 retired cassette case CSS removed', 'trackCase' not in looper_css)
check('V82 production CSS below 2900 lines', len(base_css.splitlines()) < 2900)
check('V82 dependency-free CSS parser', 'from css_parser import parse_stylesheet' in (ROOT/'tests/css_health.py').read_text(encoding='utf-8'))
check('V84 clarified loading labels', '<strong>IMPORT BEAT</strong><small>FILE</small>' in HTML and '<strong>OPEN LIBRARY</strong><small>FOLDER</small>' in HTML and '<strong>EJECT</strong>' in HTML)
check('V84 load controls preserve real handlers', '$("importBeatsBtn").onclick=' in JS and '$("importFolderBtn").onclick=' in JS and '$("cassetteDoorEject").onclick=' in JS)
check('V84 permanent deck readout', all(f'id="{x}"' in HTML for x in ['deckTransportState','deckSpeedReadout','deckAutoReadout','cassetteBeatName']))
check('V84 dynamic deck readout engine', all(x in JS for x in ['transportState.textContent','speedReadout.textContent','autoReadout.textContent','shortName(currentName.toUpperCase(),32)']))
check('V86 touch-first mobile reflow', 'grid-template-areas:"mechanism mechanism" "counter imports"' in looper_css and 'grid-template-columns:repeat(4,minmax(0,1fr))' in looper_css and 'grid-column:1 / -1' in looper_css)
check('V84 real Looper output meter', 'id="looperVu"' in HTML and 'build("looperVu",16)' in core_js and 'paintMeter("looperVu"' in core_js)

# V86 unified physical deck and mechanical counter.
check('V86 mechanism owns transport width', '<div class="deckMechanismColumn">' in HTML and HTML.find('class="deckTransport"') < HTML.find('</div>\n\n                <aside class="looperImportDock"'))
check('V86 counter has four wheels', HTML.count('class="counterWheel"') == 4)
check('V86 counter follows 4.75 cm tape', all(x in JS for x in ['STANDARD_TAPE_SPEED_CM_PER_SECOND=4.75','TAPE_COUNTER_CM_PER_UNIT=4.75','tapeCounterUnits+=delta*unitsPerSecond']))
check('V86 PLAY starts and STOP freezes counter', 'deckSource.start(0);\n  startTapeCounter();' in JS and 'function stopDeck({cancelPendingPlay=true}={}){' in JS and 'stopAutoLooperProgress();\n  stopTapeCounter();' in JS)
check('V86 RESET is independently wired', '$("tapeCounterReset").onclick=' in JS and 'resetTapeCounter();' in events_js)
check('V86 EJECT remains independent', 'id="cassetteDoorEject" class="deckSideKey counterEjectKey"' in HTML and 'id="cassetteDoorAction">LOAD' in HTML)
check('V86 rack keeps three columns and four slots', all(x in JS for x in ['MIN_RACK_COLUMNS=3','RACK_SLOTS_PER_COLUMN=4','Math.max(MIN_RACK_COLUMNS','slotIndex<RACK_SLOTS_PER_COLUMN']))
check('V86 bundled beats pinned and protected', 'const bundledFirst=' in JS and 'folderSource||bundledSource' in JS and 'right.textContent=bundledSource?"IN":"LIB"' in JS)
check('V87 dead Looper CSS removed', not any(x in looper_css for x in ['.beatCratePanel .grid3','.headerDeckCaret.active','#looper .btn.primary','#looper .btn.good','#looper .folderStatus','#looper .library>.help','--pixel-cyan']))
check('V90 Looper cascade consolidated', '#looper .cassetteDeck {' not in looper_css and '.looperMainPanel>.title' not in looper_css and looper_css.count('#looper .layout {') == 2)
check('V87 Looper constants replace magic numbers', all(x in JS for x in ['BEAT_FOLDER_CACHE_PREFIX','AUTO_SPEED_MAX_PERCENT','AUTO_PROGRESS_INTERVAL_MS','TAPE_COUNTER_INTERVAL_MS']))
check('V87 counter skips unchanged DOM work', 'if(counter.dataset.value===display)return;' in JS and 'counter.dataset.value=display;' in JS)
check('V87 track switching centralized', 'function switchTrack(row)' in JS and 'await switchTrack(visibleLibraryRowsState[idx]);' in JS and 'const load=()=>switchTrack(row).catch' in JS)
check('V87 async transport errors contained', 'function runLooperAction(label,action)' in events_js and 'Promise.resolve(action()).catch(report);' in events_js and '$("playBeat").onclick=()=>runLooperAction' in events_js)
check('V87 AUTO event logic component-owned', '$("autoLooperToggle").onclick=toggleAutoLooper;' in events_js and 'autoLooperEnabledState=!autoLooperEnabledState;' in (ROOT/'js/looper.js').read_text(encoding='utf-8'))
check('V87 beat database names are scoped', all(x in JS for x in ['BEAT_DB_NAME','BEAT_DB_VERSION','BEAT_STORE_NAME']) and not any(x in JS for x in ['const DB_NAME=','const DB_VER=','const STORE=','dbFallbackReason']))
check('V87 unloaded deck navigation is deterministic', 'function relativeTrackIndex(' in JS and 'if(currentIndex<0)currentIndex=delta>0?-1:0;' in JS)
check('V88 Looper selector groups consolidated', all(x in looper_css for x in [':is(.cassetteDeckImage,.cassetteDoorPanel)',':is(.deckSideKey,.deckCounterKey,.deckLoadKey,.deckHotspot):hover','#looper :is(input,select)']))
check('V88 IndexedDB transactions centralized', 'function runBeatStoreTransaction(mode,operation)' in JS and JS.count('db.transaction(BEAT_STORE_NAME,mode)') == 1 and all(x in JS for x in ['store=>store.put(row)','store=>store.delete(id)','store=>store.getAll()']))
check('V88 library pipeline separated', all(x in JS for x in ['const mergedRows=mergeLibraryRows(dbRows);','visibleLibraryRowsState=visibleLibraryRows(','renderLibraryRows(visibleLibraryRowsState);']))
check('V88 rack DOM committed atomically', 'box.replaceChildren(...content);' in JS and 'box.textContent="";' not in (ROOT/'js/looper.js').read_text(encoding='utf-8'))
check('V89 lifted warm chassis tiers', all(x in looper_css for x in ['linear-gradient(180deg,#191613,#0d0b09 72%,#080706)','#0d0c0b;','linear-gradient(180deg,#181613,#0d0c0b 72%,#090807)']))
check('V89 readable inactive controls', all(x in looper_css for x in ['linear-gradient(180deg,#302a23,#1e1a16 58%,#12100d)','#e1c9a1!important','#b39267!important']))
check('V89 warm-only Looper illumination', all(x in looper_css for x in ['#d69a55','#8f704c','rgba(239,181,84,.04)']) and not any(x in looper_css for x in ['#6d9897','#789d98','#506d69','rgba(109,152,151']))
check('V90 dead Looper cascade layers removed', not any(x in looper_css for x in ['.beatCratePanel .grid2 {','#looper .looperMainPanel {','.deckSideKey {','#looper .looperMainPanel {border-bottom-color']))
check('V90 cassette rows avoid nested interactive controls', 'const meta=document.createElement("button");' in JS and 'el.setAttribute("role","button")' not in JS and '#looper .track:focus-within' in looper_css)
check('V90 IndexedDB open retries after rejection', all(x in JS for x in ['const attempt=new Promise','req.onblocked=()=>fail(','if(dbPromise===attempt)dbPromise=null']))
check('V90 quota errors retain their specific cause', 'return requestFailure||tx?.error||new Error(message);' in JS and 'transactionError(tx,request' in JS)
check('V90 unique save names and failed-write abort', 'getMilliseconds()).padStart(3,"0")' in JS and 'await writable.abort();' in JS)
check('V90 latest track load wins', 'let trackLoadSequence=0;' in JS and 'if(request!==trackLoadSequence)return false;' in JS)
check('V90 pending PLAY can be cancelled', 'let deckTransportSequence=0;' in JS and 'if(request!==deckTransportSequence || buffer!==deckBuffer)return false;' in JS and 'cancelPendingPlay' in JS)
check('V90 deck navigation follows visible rack', 'let visibleLibraryRowsState=[];' in JS and 'relativeTrackIndex(visibleLibraryRowsState' in JS and 'libraryRows' not in JS)
check('V90 first imported beat is not decoded twice', 'firstImported={row,buffer};' in JS and 'commitLoadedTrack(firstImported.row,firstImported.buffer);' in JS)
check('V90 STORE lamp timer is coalesced', 'if(storeLampTimer)clearTimeout(storeLampTimer);' in JS and 'storeLampTimer=null;' in JS)
check('V91 cassette view is owned by Looper', looper_js.count('function refreshCassetteUI()') == 1 and 'function refreshCassetteUI()' not in chopper_js)

# V68 Chopper CSS consolidation invariants.
chopper_css=(ROOT/'css/src/chopper.css').read_text(encoding='utf-8')
check('Chopper CSS bounded', len(chopper_css.splitlines()) < 400)
check('Chopper sampler screen present', '.samplerScreen {' in chopper_css)
check('Chopper 4x4 pad contract', 'grid-template-columns:repeat(4,minmax(58px,1fr))' in chopper_css)
check('single Chopper placement wrapper rule', chopper_css.count('.loopGridWrap {') == 1)
check('legacy broad Chopper grid selectors removed', '.chopperMainPanel .grid4 {' not in chopper_css and '.chopTransportPanel .grid4 {' not in chopper_css)


# V69 Drum CSS consolidation invariants.
drums_css=(ROOT/'css/src/drums.css').read_text(encoding='utf-8')
check('Drum CSS component-owned', 'Drum machine component' in drums_css)
check('Drum CSS bounded', len(drums_css.splitlines()) < 560)
check('single drum selector rule', drums_css.count('.drumSelector {') == 1)
check('single drum library grid base rule', drums_css.count('.drumLibraryGrid {') == 2)  # base + responsive
check('drum responsive co-located', 'Component-owned responsive behavior' in drums_css)
check('legacy drum placement rules removed from shared', '.controlPanel > .snareFx' not in (ROOT/'css/src/shared.css').read_text(encoding='utf-8'))

# V70 global CSS rationalization invariants.
layout_css=(ROOT/'css/src/layout.css').read_text(encoding='utf-8')
shared_css=(ROOT/'css/src/shared.css').read_text(encoding='utf-8')
responsive_css=(ROOT/'css/src/responsive.css').read_text(encoding='utf-8')
tokens_css=(ROOT/'css/src/tokens.css').read_text(encoding='utf-8')
all_source_css='\n'.join(x.read_text(encoding='utf-8') for x in (ROOT/'css/src').glob('*.css'))
check('single production stylesheet', HTML.count('rel="stylesheet"') == 1 and './css/base.css' in HTML)
check('override layer retired', not (ROOT/'css/overrides.css').exists() and 'overrides.css' not in HTML and 'overrides.css' not in (ROOT/'sw.js').read_text(encoding='utf-8'))
check('Layout CSS bounded', len(layout_css.splitlines()) < 360)
check('Shared CSS bounded', len(shared_css.splitlines()) < 120)
check('Responsive CSS bounded', len(responsive_css.splitlines()) < 140)
check('Tokens intentionally small', len(tokens_css.splitlines()) < 30 and '--border:' not in tokens_css)
check('CSS migration fragments bounded', all_source_css.count('@sp-order') < 190)
check('obsolete workstation selector removed', '.workstation' not in layout_css)
check('header reflow covers intermediate widths', '@media (max-width:1160px)' in responsive_css)
check('Practice CSS frozen', __import__('hashlib').sha256((ROOT/'css/src/practice.css').read_bytes()).hexdigest() == '56d6086c66ca54145105bd5fa567a0c7034a8ec9a218e28a1bb38fb10374ffc3')
check('Practice JS frozen', __import__('hashlib').sha256((ROOT/'js/practice.js').read_bytes()).hexdigest() == '1b84252f87e3959b599f34bdc76e1facb70d92745eeba9ac95baa1060c3f5ff5')

# V63 audio / regression invariants.
check('stereo conditioner analyzes channels independently', 'for(let ch=0;ch<channels;ch++){' in (ROOT/'js/chopper.js').read_text(encoding='utf-8') and 'x/=channels' not in (ROOT/'js/chopper.js').read_text(encoding='utf-8'))
check('master dB uses logarithmic gain', '20*Math.log10(gain)' in (ROOT/'js/chopper.js').read_text(encoding='utf-8'))
check('loop finalizer exists', 'function finalizeLoopBuffer(' in (ROOT/'js/drums.js').read_text(encoding='utf-8'))
check('full render finalizes loop edge', 'return finalizeLoopBuffer(await offline.startRendering());' in (ROOT/'js/drums.js').read_text(encoding='utf-8'))
check('reverb noise deterministic', 'function deterministicNoise(' in (ROOT/'js/drums.js').read_text(encoding='utf-8') and 'reverbSeed(type,rate)' in (ROOT/'js/drums.js').read_text(encoding='utf-8'))
check('pitch release rerenders playing full loop', '$("samplePitch").onchange=async()=>{' in JS and 'rerenderPreviewMode("full")' in JS)
check('event preview rerender path is centralized', events_js.count('renderedFlip=await renderSequence(events);') == 2 and 'function rerenderPreviewMode(' in events_js)
check('retired folder-setting persistence removed', not any(x in JS for x in ['SETTINGS_STORE','BEAT_DIR_KEY','dbPutSetting','dbGetSetting','restoreBeatDirectoryHandle']))
check('current beat deletion unloads deck', 'deckBuffer=null;' in (ROOT/'js/looper.js').read_text(encoding='utf-8') and 'currentTrack=null;' in (ROOT/'js/looper.js').read_text(encoding='utf-8'))
check('SAVE validates before filesystem prompt', JS.find('const events=validateCurrentBeatForSave();') < JS.find('access=await prepareBeatFolderFromSaveGesture();'))
check('practice close stops timer', '$("practiceOverlayClose").onclick=()=>{' in JS and 'stopPractice();' in JS)
check('track changes preserve stopped transport', 'const resumePlayback=preservePlayback && !!deckSource;' in (ROOT/'js/looper.js').read_text(encoding='utf-8') and 'if(resumePlayback)await playDeck();' in (ROOT/'js/looper.js').read_text(encoding='utf-8'))

failed=[name for name,ok in checks if not ok]
for name,ok in checks: print(f'{"OK" if ok else "FAIL"}  {name}')
if missing: print('Missing DOM refs:',missing)
if dupes: print('Duplicate ids:',dupes)
if failed:
    print(f'\n{len(failed)} validation(s) failed.')
    sys.exit(1)
print(f'\nAll {len(checks)} validations passed.')
