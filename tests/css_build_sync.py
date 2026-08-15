from pathlib import Path
import re, subprocess, sys, tempfile, shutil
ROOT=Path(__file__).resolve().parents[1]
base=ROOT/'css'/'base.css'
before=base.read_text(encoding='utf-8')
subprocess.run([sys.executable,str(ROOT/'tools'/'build_css.py')],cwd=ROOT,check=True,capture_output=True,text=True)
after=base.read_text(encoding='utf-8')
assert before==after, 'css/base.css was stale; run python tools/build_css.py'
print('OK: generated CSS is in sync with component sources')
