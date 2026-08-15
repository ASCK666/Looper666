"""Small dependency-free CSS parser for project QA.

It intentionally covers the CSS syntax used by Scratch Practice: qualified
rules, nested conditional at-rules, declarations, strings, functions and
attribute selectors. It is not a browser replacement; it gives the test suite
stable structural checks without optional third-party packages.
"""

from dataclasses import dataclass


CONDITIONAL_AT_RULES={"media","supports","container","layer","scope","starting-style"}


@dataclass(frozen=True)
class Declaration:
    name:str
    value:str
    important:bool
    line:int


@dataclass(frozen=True)
class Rule:
    context:tuple
    selectors:tuple
    declarations:tuple
    line:int


def _mask_comments(text):
    chars=list(text)
    i=0
    while i<len(chars)-1:
        if chars[i]=="/" and chars[i+1]=="*":
            chars[i]=chars[i+1]=" "
            i+=2
            while i<len(chars)-1 and not (chars[i]=="*" and chars[i+1]=="/"):
                if chars[i]!="\n": chars[i]=" "
                i+=1
            if i<len(chars)-1:
                chars[i]=chars[i+1]=" "
                i+=2
        else:
            i+=1
    return "".join(chars)


def _find_top_level(text,start,targets):
    quote=None
    escaped=False
    parens=brackets=0
    for i in range(start,len(text)):
        ch=text[i]
        if escaped:
            escaped=False
            continue
        if ch=="\\":
            escaped=True
            continue
        if quote:
            if ch==quote: quote=None
            continue
        if ch in "\"'": quote=ch; continue
        if ch=="(": parens+=1
        elif ch==")": parens=max(0,parens-1)
        elif ch=="[": brackets+=1
        elif ch=="]": brackets=max(0,brackets-1)
        elif not parens and not brackets and ch in targets:
            return i,ch
    return -1,None


def _matching_brace(text,opening):
    quote=None
    escaped=False
    depth=0
    for i in range(opening,len(text)):
        ch=text[i]
        if escaped:
            escaped=False
            continue
        if ch=="\\": escaped=True; continue
        if quote:
            if ch==quote: quote=None
            continue
        if ch in "\"'": quote=ch; continue
        if ch=="{": depth+=1
        elif ch=="}":
            depth-=1
            if depth==0: return i
    raise AssertionError(f"unclosed CSS block at offset {opening}")


def split_selectors(selector_text):
    out=[]
    start=0
    while start<len(selector_text):
        pos,delim=_find_top_level(selector_text,start,{","})
        if pos<0:
            value=selector_text[start:].strip()
            if value: out.append(value)
            break
        value=selector_text[start:pos].strip()
        if value: out.append(value)
        start=pos+1
    return tuple(out)


def parse_declarations(content,base_line):
    declarations=[]
    start=0
    while start<len(content):
        pos,delim=_find_top_level(content,start,{";"})
        end=len(content) if pos<0 else pos
        raw=content[start:end].strip()
        if raw:
            colon,_=_find_top_level(raw,0,{":"})
            if colon<0:
                raise AssertionError(f"invalid CSS declaration near line {base_line+content.count(chr(10),0,start)}: {raw[:80]}")
            name=raw[:colon].strip().lower()
            value=raw[colon+1:].strip()
            important=False
            if value.lower().endswith("!important"):
                value=value[:-10].rstrip()
                important=True
            declarations.append(Declaration(
                name=name,
                value=value,
                important=important,
                line=base_line+content.count("\n",0,start),
            ))
        if pos<0: break
        start=pos+1
    return tuple(declarations)


def parse_stylesheet(css):
    masked=_mask_comments(css)
    rules=[]
    keyframes=[]

    def walk(text,absolute_start=0,context=()):
        pos=0
        while pos<len(text):
            while pos<len(text) and text[pos].isspace(): pos+=1
            if pos>=len(text): break
            opening,delim=_find_top_level(text,pos,{"{",";"})
            if opening<0: break
            prelude=text[pos:opening].strip()
            if delim==";":
                pos=opening+1
                continue
            closing=_matching_brace(text,opening)
            content=text[opening+1:closing]
            line=1+masked.count("\n",0,absolute_start+pos)
            if prelude.startswith("@"):
                keyword=prelude[1:].split(None,1)[0].lower()
                detail=prelude[len(keyword)+1:].strip()
                if keyword in CONDITIONAL_AT_RULES:
                    walk(content,absolute_start+opening+1,context+((keyword,detail),))
                elif keyword.endswith("keyframes"):
                    name=detail.split(None,1)[0] if detail else ""
                    keyframes.append((name,line))
            else:
                selectors=split_selectors(prelude)
                if not selectors:
                    raise AssertionError(f"empty selector near line {line}")
                declarations=parse_declarations(content,line)
                rules.append(Rule(context,selectors,declarations,line))
            pos=closing+1

    walk(masked)
    return rules,keyframes
