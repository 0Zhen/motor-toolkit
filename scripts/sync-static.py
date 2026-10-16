#!/usr/bin/env python3
"""Regenerate the static (no-JavaScript) parts of the site from shared/tools.js.

Search engines and AI crawlers often read the raw HTML without running
JavaScript, so the tool list that tools.js / shell.js draw at runtime is
also written into the pages as plain HTML. Run this after adding a tool or
changing a tool's name / description / <title> / meta description:

    python3 scripts/sync-static.py

It rewrites only the blocks between <!-- mt:static NAME --> and
<!-- /mt:static NAME --> markers, plus llms.txt and sitemap.xml.
"""
import html, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://0zhen.github.io/motor-toolkit/'
AUTHOR = {'@type': 'Person', 'name': '0Zhen', 'url': 'https://0zhen.github.io/'}
# FFT Analyser keeps its own hand-written SEO head block
OWN_HEAD = {'fft-analyser'}


def parse_list(src, name):
    body = src[src.index('const ' + name):]
    body = body[:body.index('];')]
    items = []
    for obj in re.findall(r'\{(.*?)\}', body, re.S):
        items.append({k: v.replace("\\'", "'") for k, v in
                      re.findall(r"(\w+):\s*'((?:[^'\\]|\\.)*)'", obj)})
    return items


def page_meta(path):
    s = (ROOT / path / 'index.html').read_text(encoding='utf-8')
    title = re.search(r'<title>(.*?)</title>', s, re.S).group(1).strip()
    desc = re.search(r'<meta name="description"\s+content="(.*?)"', s, re.S).group(1)
    return html.unescape(title), ' '.join(html.unescape(desc).split())


def replace_block(text, name, content, where):
    start, end = '<!-- mt:static %s -->' % name, '<!-- /mt:static %s -->' % name
    block = start + '\n' + content.rstrip('\n') + '\n' + end
    if start in text:
        return re.sub(re.escape(start) + '.*?' + re.escape(end), lambda m: block, text, flags=re.S)
    anchor, before = where
    if anchor not in text:
        sys.exit('anchor %r not found' % anchor)
    return text.replace(anchor, (block + '\n' + anchor) if before else (anchor + '\n' + block), 1)


def ld(obj):
    return '<script type="application/ld+json">\n' + json.dumps(obj, ensure_ascii=False, indent=2) + '\n</script>'


def esc(s):
    return html.escape(s, quote=True)


src = (ROOT / 'shared/tools.js').read_text(encoding='utf-8')
groups, tools = parse_list(src, 'MT_GROUPS'), parse_list(src, 'MT_TOOLS')
for t in tools:
    t['id'] = t['path'].strip('/').split('/')[-1]
    t['title'], t['meta'] = page_meta(t['path'])
    t['url'] = SITE + t['path']

# ── homepage: tool cards (same markup index.html's script renders) + ItemList ──
cards = []
for g in groups:
    gt = [t for t in tools if t['group'] == g['id']]
    if not gt:
        continue
    cards.append('<section class="mt-group">')
    cards.append('  <div class="mt-group-head"><h2>%s</h2><span>%s</span></div>' % (esc(g['name']), esc(g['sub'])))
    cards.append('  <div class="mt-tool-grid">')
    for t in gt:
        cards.append('    <a class="mt-tool-card" href="%sindex.html"><h3>%s</h3><p>%s</p></a>'
                     % (t['path'], esc(t['name']), esc(t['desc'])))
    cards.append('  </div>')
    cards.append('</section>')
item_list = ld({
    '@context': 'https://schema.org', '@type': 'ItemList', 'name': 'Motor Toolkit tools',
    'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': t['name'], 'url': t['url']}
                        for i, t in enumerate(tools)]})
p = ROOT / 'index.html'
s = p.read_text(encoding='utf-8')
s = replace_block(s, 'tool-list', '\n'.join(cards), ('<div id="toolGroups">', False))
s = replace_block(s, 'item-list', item_list, ('</head>', True))
p.write_text(s, encoding='utf-8')

# ── each tool page: SEO head block + plain-HTML links to every tool ──
for t in tools:
    p = ROOT / t['path'] / 'index.html'
    s = p.read_text(encoding='utf-8')
    if t['id'] not in OWN_HEAD:
        head = '\n'.join([
            '<meta property="og:type" content="website">',
            '<meta property="og:site_name" content="Motor Toolkit">',
            '<meta property="og:title" content="%s">' % esc(t['title']),
            '<meta property="og:description" content="%s">' % esc(t['meta']),
            '<meta property="og:url" content="%s">' % t['url'],
            '<meta property="og:image" content="%sfavicon.png">' % SITE,
            '<meta name="twitter:card" content="summary">',
            ld({'@context': 'https://schema.org', '@type': 'WebApplication',
                'name': t['name'], 'alternateName': t['name_zh'], 'url': t['url'],
                'description': t['meta'],
                'applicationCategory': 'EngineeringApplication',
                'operatingSystem': 'Any (runs in a web browser)',
                'browserRequirements': 'Requires JavaScript',
                'inLanguage': ['en', 'zh-Hant'], 'isAccessibleForFree': True,
                'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'},
                'isPartOf': {'@type': 'WebSite', 'name': 'Motor Toolkit', 'url': SITE},
                'author': AUTHOR}),
        ])
        s = replace_block(s, 'seo', head, ('</head>', True))
    links = ['<nav class="mt-sr-only" aria-label="Motor Toolkit tools">',
             '  <h1>%s</h1>' % esc(t['name']),
             '  <p>%s</p>' % esc(t['meta']),
             '  <ul>',
             '    <li><a href="../../index.html">Motor Toolkit — all tools</a></li>']
    for o in tools:
        links.append('    <li><a href="../../%sindex.html">%s</a> — %s</li>' % (o['path'], esc(o['name']), esc(o['desc'])))
    links += ['  </ul>', '</nav>']
    s = replace_block(s, 'nav', '\n'.join(links), ('</body>', True))
    p.write_text(s, encoding='utf-8')

# ── llms.txt (https://llmstxt.org) ──
out = ['# Motor Toolkit', '',
       '> Free, browser-based engineering calculators for electric motor design, testing and production. '
       'No sign-up; every calculation runs locally in the browser and no data is uploaded. '
       'Interface in English and Traditional Chinese.', '',
       'Built by a motor design engineer for the calculations motor engineers redo every week. '
       'Source: https://github.com/0Zhen/motor-toolkit', '']
for g in groups:
    gt = [t for t in tools if t['group'] == g['id']]
    if not gt:
        continue
    out.append('## %s — %s' % (g['name'], g['sub']))
    out.append('')
    for t in gt:
        out.append('- [%s](%s): %s' % (t['name'], t['url'], t['meta']))
    out.append('')
out += ['## Optional', '', '- [Author blog (motor design notes, in Chinese)](https://0zhen.github.io/)', '']
(ROOT / 'llms.txt').write_text('\n'.join(out), encoding='utf-8')

# ── sitemap.xml ──
urls = [(SITE, '1.0')] + [(t['url'], '0.9') for t in tools]
sm = ['<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for u, pr in urls:
    sm += ['  <url>', '    <loc>%s</loc>' % u, '    <changefreq>monthly</changefreq>',
           '    <priority>%s</priority>' % pr, '  </url>']
sm.append('</urlset>')
(ROOT / 'sitemap.xml').write_text('\n'.join(sm) + '\n', encoding='utf-8')

print('synced %d tools' % len(tools))
