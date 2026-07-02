#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把學生會法規 PDF 解析成結構化資料，輸出：
  1) 每份法規一個乾淨 MD
  2) 一份合集 MD（含目錄）
  3) 一份結構化 JSON（seed data，日後直接灌 DB）
用法: python3 parse_laws.py <SESSION_DIR> <OUT_DIR> <SESSION_LABEL>
"""
import sys, os, re, json, subprocess, glob

SESSION_DIR = sys.argv[1]
OUT_DIR      = sys.argv[2]
SESSION_LABEL= sys.argv[3]   # e.g. "第20屆"

CAT_MAP = {"00":"最高章程","01":"行政","02":"立法","03":"司法","04":"選舉"}
CAT_ORDER = ["最高章程","行政","立法","司法","選舉"]

def roc_to_iso(y,m,d):
    try:
        return f"{int(y)+1911:04d}-{int(m):02d}-{int(d):02d}"
    except: return None

def pdftext(path):
    return subprocess.run(["pdftotext","-raw",path,"-"],capture_output=True,text=True).stdout

CH_NUM = "一二三四五六七八九十百"
RE_CHAPTER = re.compile(r'^第[%s]+章\s*(.*)$' % CH_NUM)
RE_SECTION = re.compile(r'^第[%s]+節\s*(.*)$' % CH_NUM)
RE_ARTICLE = re.compile(r'^第\s*(\d+)(?:[-–](\d+))?\s*條\s*(.*)$')
RE_ITEM    = re.compile(r'^(?:(\d+)|([%s]+)、)\s*(.*)$' % CH_NUM)
RE_HISTLINE= re.compile(r'^民國\s*\d+\s*年')

def parse_history(lines):
    """把沿革多行合併，逐筆解析"""
    blob = " ".join(l.strip() for l in lines)
    entries=[]
    # 以「民國」為分隔切筆
    parts = re.split(r'(?=民國\s*\d+\s*年)', blob)
    for p in parts:
        p=p.strip()
        if not p: continue
        m=re.match(r'民國\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日(.*)', p)
        if not m: continue
        y,mo,d,rest = m.groups()
        rest=rest.strip()
        sess=re.search(r'第([%s]+)屆' % CH_NUM, rest)
        act = "修正" if ("修正" in rest) else ("訂定" if "訂定" in rest else ("新增" if "新增" in rest else ""))
        entries.append({
            "date": roc_to_iso(y,mo,d),
            "roc": f"{y}.{mo.zfill(2)}.{d.zfill(2)}",
            "session_term": sess.group(1) if sess else None,
            "action": act,
            "text": cjk_despace(rest),
        })
    return entries

def cjk_despace(s):
    """移除兩個中日韓字元之間被 PDF 換行插入的空白（保留英數間空格）"""
    if not s: return s
    prev=None
    while s!=prev:
        prev=s
        s=re.sub(r'([\u4e00-\u9fff\u3000-\u303f\uff00-\uffef])\s+([\u4e00-\u9fff\u3000-\u303f\uff00-\uffef])', r'\1\2', s)
    return s.strip()

def clean_body(body_lines):
    """把被 PDF 換行切斷的句子重新接回，並辨識款/項"""
    items=[]
    buf=""
    def flush():
        nonlocal buf
        if buf.strip(): items.append(cjk_despace(buf.strip()))
        buf=""
    for ln in body_lines:
        s=ln.strip()
        if not s: continue
        mi=RE_ITEM.match(s)
        if mi:
            flush()
            marker = mi.group(1) or mi.group(2)
            buf = f"{marker}、{mi.group(3)}" if mi.group(2) else f"{marker}. {mi.group(3)}"
        else:
            # 續行：接到目前緩衝
            if buf and not buf[-1] in "。！？：；":
                buf += s
            elif buf:
                buf += s
            else:
                buf = s
    flush()
    return items

def parse_law(path):
    fname=os.path.basename(path)
    m=re.match(r'(\d+)\.(\d+)', fname)  # e.g. 1.10 / 0.0
    cat_code = fname[:2] if fname[:2] in CAT_MAP else None
    catm=re.search(r'【(.+?)】', fname)
    category = catm.group(1) if catm else (CAT_MAP.get(cat_code))
    numm=re.match(r'([\d]+\.[\d]+)', fname)
    number = numm.group(1) if numm else None
    namem=re.search(r'】\s*(.+?)\s*[\(（]', fname)
    name = namem.group(1).strip() if namem else re.sub(r'\.pdf$','',fname)
    datem=re.search(r'[\(（]\s*(\d+)\.(\d+)\.(\d+)\s*(修正|訂定)', fname)
    cur_date = roc_to_iso(*datem.groups()[:3]) if datem else None
    cur_type = datem.group(4) if datem else None

    txt=pdftext(path)
    lines=[l for l in txt.split("\n")]

    # 找出正文起點（第一個 前言 / 第一章 / 第 1 條）
    body_start=None
    for i,l in enumerate(lines):
        s=l.strip()
        if re.match(r'^前\s*言', s) or RE_CHAPTER.match(s) or re.match(r'^第\s*1\s*條', s):
            body_start=i; break
    header = lines[1:body_start] if body_start else []
    # 用整個表頭區（含被 PDF 折行的續行）合併後再切筆，避免尾巴被吃掉
    header_nonempty=[l for l in header if l.strip()]
    history=parse_history(header_nonempty)
    title = lines[0].strip() if lines else name

    # 解析章 / 條
    chapters=[]
    cur_chapter=None
    cur_article=None
    articles=[]
    preamble=[]
    i = body_start if body_start else 0
    seen_article=False
    while i < len(lines):
        s=lines[i].strip()
        if not s:
            i+=1; continue
        mc=RE_CHAPTER.match(s)
        ma=RE_ARTICLE.match(s)
        if re.match(r'^前\s*言', s):
            i+=1
            # 收集前言直到第一章/條
            while i<len(lines):
                s2=lines[i].strip()
                if RE_CHAPTER.match(s2) or RE_ARTICLE.match(s2): break
                if s2: preamble.append(s2)
                i+=1
            continue
        if mc:
            if cur_article: articles.append(cur_article); cur_article=None
            cur_chapter=mc.group(0).split()[0]  # 第X章
            chapters.append({"title": s})
            i+=1; continue
        if ma:
            if cur_article: articles.append(cur_article)
            num = ma.group(1) + (f"-{ma.group(2)}" if ma.group(2) else "")
            rest = ma.group(3).strip()
            # 條名 heuristic：短且不含句號 → 條名；否則當條文
            aname, first_body = "", []
            if rest and (len(rest)<=18 and "。" not in rest and "，" not in rest[:3]):
                aname=rest
            elif rest:
                first_body=[rest]
            cur_article={"number":num,"name":aname,"chapter":cur_chapter,"_body":first_body}
            seen_article=True
            i+=1; continue
        # 一般內文行
        if cur_article is not None:
            cur_article["_body"].append(s)
        elif not seen_article:
            preamble.append(s)
        i+=1
    if cur_article: articles.append(cur_article)

    for a in articles:
        a["items"]=clean_body(a.pop("_body"))

    return {
        "file": fname,
        "category": category,
        "number": number,
        "name": name,
        "title": title,
        "current_date": cur_date,
        "current_type": cur_type,
        "session_label": SESSION_LABEL,
        "preamble": cjk_despace(" ".join(preamble).strip()),
        "amendment_history": history,
        "chapters": chapters,
        "articles": articles,
        "article_count": len(articles),
    }

def law_md(law):
    o=[]
    o.append(f"# {law['name']}")
    o.append("")
    meta=[]
    if law['number']: meta.append(f"**編號**：{law['number']}")
    if law['category']: meta.append(f"**類別**：{law['category']}")
    if law['current_date']: meta.append(f"**現行版本**：{law['current_date']}（{law['current_type']}）")
    meta.append(f"**條文數**：{law['article_count']}")
    o.append("　·　".join(meta))
    o.append("")
    if law['amendment_history']:
        o.append("<details><summary><strong>修正沿革</strong>（點擊展開）</summary>")
        o.append("")
        for h in law['amendment_history']:
            o.append(f"- `{h['roc']}`　{h['text']}")
        o.append("")
        o.append("</details>")
        o.append("")
    if law['preamble']:
        o.append("> **前言**　"+law['preamble'])
        o.append("")
    o.append("---")
    o.append("")
    cur_ch=None
    for a in law['articles']:
        if a['chapter'] and a['chapter']!=cur_ch:
            cur_ch=a['chapter']
            # 找章名
            chtitle=next((c['title'] for c in law['chapters'] if c['title'].startswith(cur_ch)), cur_ch)
            o.append(f"## {chtitle}")
            o.append("")
        head=f"**第 {a['number']} 條**"
        if a['name']: head+=f"　{cjk_despace(a['name'])}"
        o.append(head)
        o.append("")
        if len(a['items'])<=1:
            for it in a['items']:
                o.append(it)
        else:
            for it in a['items']:
                o.append(f"{it}".replace(". ",". ",1) if re.match(r'^\d',it) else f"- {it}")
        o.append("")
    return "\n".join(o)

def main():
    os.makedirs(OUT_DIR,exist_ok=True)
    per_dir=os.path.join(OUT_DIR,"每份法規MD")
    os.makedirs(per_dir,exist_ok=True)
    pdfs=sorted(glob.glob(os.path.join(SESSION_DIR,"*","*.pdf")))
    laws=[]
    for p in pdfs:
        try:
            law=parse_law(p); laws.append(law)
            safe=re.sub(r'[\\/:*?"<>|]','_',law['name'])
            with open(os.path.join(per_dir,f"{law['number']}_{safe}.md"),"w",encoding="utf-8") as fo:
                fo.write(law_md(law))
        except Exception as e:
            print("ERR",p,e)
    # JSON
    with open(os.path.join(OUT_DIR,f"法規結構化-{SESSION_LABEL}.json"),"w",encoding="utf-8") as fo:
        json.dump(laws,fo,ensure_ascii=False,indent=2)
    # 合集
    laws_sorted=sorted(laws,key=lambda x:(CAT_ORDER.index(x['category']) if x['category'] in CAT_ORDER else 9, x['number']))
    combo=[f"# 國立臺東大學學生會　現行自治法規合集（{SESSION_LABEL}）","",
           f"> 本檔由 {len(laws)} 份法規 PDF 自動解析彙整。每份原始 PDF 見同層「每份法規MD」。",""]
    combo.append("## 目錄\n")
    curc=None
    for l in laws_sorted:
        if l['category']!=curc:
            curc=l['category']; combo.append(f"\n**{curc}**\n")
        anchor=f"{l['number']}-{l['name']}"
        combo.append(f"- {l['number']}　[{l['name']}](#{re.sub(r'[^0-9A-Za-z一-龥]','-',anchor)})　_{l['article_count']}條・{l['current_date']}_")
    combo.append("\n---\n")
    curc=None
    for l in laws_sorted:
        if l['category']!=curc:
            curc=l['category']; combo.append(f"\n# 〔{curc}〕\n")
        body=law_md(l)
        # 合集內降一級標題（# → ##）
        body=re.sub(r'^# ', '## ', body)
        combo.append(body); combo.append("\n---\n")
    with open(os.path.join(OUT_DIR,f"現行法規合集-{SESSION_LABEL}.md"),"w",encoding="utf-8") as fo:
        fo.write("\n".join(combo))


    tot_art = sum(l['article_count'] for l in laws)
    print("OK laws=%d articles=%d" % (len(laws), tot_art))
    for c in CAT_ORDER:
        cl = [l for l in laws if l['category'] == c]
        if cl:
            print("  [%s] files=%d articles=%d" % (c, len(cl), sum(x['article_count'] for x in cl)))

if __name__ == "__main__":
    main()
