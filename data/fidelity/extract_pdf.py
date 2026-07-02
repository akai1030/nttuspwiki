#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
用 PyMuPDF(fitz) 抽 PDF 純文字並印到 stdout（UTF-8）。

這是**獨立於 poppler/Xpdf** 的第二個抽取引擎（MuPDF 內建 CJK CMap，能解官方 PDF 的
中文 CID 字型）。作用有二：
  1) 在缺 poppler-data 的環境也能抽出中文，讓 data/fidelity/source-check.ts 跑得起來；
  2) 作為「獨立第二證人」，比對結果不依賴 parse_laws.py 用的 pdftotext，破除
     verify.ts §4「重跑同一支 parser 比對自己」的循環基準。

用法: python extract_pdf.py <pdf 路徑>
"""
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

import fitz  # PyMuPDF

if len(sys.argv) < 2:
    sys.stderr.write("usage: python extract_pdf.py <pdf>\n")
    sys.exit(2)

doc = fitz.open(sys.argv[1])
parts = []
for page in doc:
    parts.append(page.get_text("text"))
sys.stdout.write("\n".join(parts))
