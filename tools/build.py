#!/usr/bin/env python3
"""EdubbaX site build: shared header/footer, SEO head tags, clean URLs, sitemap and robots.
Run from anywhere:  python3 tools/build.py
Idempotent: it rewrites the blocks between <!-- seo:start/end -->, <!-- hdr:start/end --> and <!-- ftr:start/end -->.
When the site moves to its own domain, change SITE below and run again."""
import json, re, pathlib

SITE = 'https://edubbax.vercel.app'
ROOT = pathlib.Path(__file__).resolve().parent.parent
OG = SITE + '/assets/og-image.png'
UPDATED = '2026-11-15'
PHONE = '+994558217575'

ORG = {
    "@type": "Organization", "@id": SITE + "/#org", "name": "EdubbaX", "url": SITE + "/",
    "logo": SITE + "/assets/icon-512.png", "slogan": "Making Learning Measurable",
    "founder": {"@type": "Person", "name": "Ömər Heydər", "alternateName": "Omar Heydar",
                "jobTitle": "Founder & CEO", "sameAs": ["https://www.linkedin.com/in/omarheydar"]},
    "sameAs": ["https://www.instagram.com/edubbax/", "https://www.instagram.com/edubbax.az/",
               "https://www.instagram.com/edubbax.tr/", "https://youtube.com/@edubbax", "https://linktr.ee/edubbax"],
    "contactPoint": {"@type": "ContactPoint", "contactType": "sales", "telephone": PHONE,
                     "url": SITE + "/waitlist", "availableLanguage": ["az", "tr", "en", "ru"]},
    "areaServed": ["AZ", "TR"]
}

def crumbs(*items):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + u} for i, (n, u) in enumerate(items)]}

PAGES = {
    'index.html': dict(path='/', langs=['az', 'tr', 'en', 'ru'], og_type='website',
        title='EdubbaX — dərs içi anlamanı ölçən platforma | Müəllim və kurslar üçün',
        desc='EdubbaX dərsin içində kimin başa düşdüyünü göstərir: AI ilə test, şəxsi ID ilə qoşulma, avtomatik nəticə, valideyn hesabatı və ödəniş uçotu. Pilot üçün müraciət edin.',
        ld=[{"@type": "WebSite", "@id": SITE + "/#site", "name": "EdubbaX", "url": SITE + "/", "inLanguage": ["az", "tr", "en", "ru"], "publisher": {"@id": SITE + "/#org"}},
            {"@type": "SoftwareApplication", "name": "EdubbaX", "applicationCategory": "EducationalApplication", "operatingSystem": "Web",
             "url": SITE + "/", "inLanguage": ["az", "tr", "en", "ru", "ar", "zh"], "publisher": {"@id": SITE + "/#org"},
             "description": "In-lesson assessment for teachers and tutoring centres: AI-drafted quizzes, personal-ID joining, automatic results, parent reports and payment tracking.",
             "featureList": ["In-lesson quizzes", "AI questions from teaching material", "Automatic results and reports", "Parent report links", "Payment tracking", "Centre panel"]}]),
    'courses.html': dict(path='/courses', page='courses', langs=['az', 'tr', 'en'], og_type='website',
        title='Tədris mərkəzləri üçün EdubbaX | Dərs içi qiymətləndirmə və hesabat',
        desc='Kursunuzda kimin geri qaldığını imtahandan əvvəl bilin. Dərs içi yoxlama, AI ilə test, valideyn hesabatı və ödəniş uçotu bir paneldə. 1 aylıq pilot üçün müraciət edin.',
        ld=[crumbs(('EdubbaX', '/'), ('Kurslar üçün', '/courses')),
            {"@type": "Service", "name": "EdubbaX for tutoring centres", "serviceType": "In-lesson assessment and reporting software",
             "provider": {"@id": SITE + "/#org"}, "areaServed": ["AZ", "TR"], "url": SITE + "/courses"}], faq=True),
    'sample-report.html': dict(path='/sample-report', page='sample', langs=['az', 'tr', 'en'], og_type='article',
        title='Nümunə hesabat: valideyn, müəllim və kurs rəhbəri | EdubbaX',
        desc='EdubbaX hesabatlarının nümunəsi: şagirdin həftəlik nəticələri, mövzular üzrə boşluqlar, qrupun irəliləyişi, müəllimlər və ödəniş borcları. Adlar və rəqəmlər nümunədir.',
        ld=[crumbs(('EdubbaX', '/'), ('Kurslar üçün', '/courses'), ('Nümunə hesabat', '/sample-report'))]),
    'privacy.html': dict(path='/privacy', page='privacy', langs=['az', 'tr', 'en'], og_type='article',
        title='Məxfilik siyasəti | EdubbaX',
        desc='EdubbaX hansı məlumatları toplayır, harada saxlayır (Aİ, Frankfurt), necə qoruyur və sizin hansı hüquqlarınız var. Azərbaycan qanunu və KVKK-ya uyğun.',
        ld=[crumbs(('EdubbaX', '/'), ('Məxfilik siyasəti', '/privacy'))]),
    'terms.html': dict(path='/terms', page='terms', langs=['az', 'tr', 'en'], og_type='article',
        title='İstifadə şərtləri | EdubbaX',
        desc='EdubbaX istifadə şərtləri: pilot mərhələsi, hesablar, məlumatların sahibliyi, ödəniş qaydası, müqavilənin dayandırılması və məsuliyyət.',
        ld=[crumbs(('EdubbaX', '/'), ('İstifadə şərtləri', '/terms'))]),
    'waitlist.html': dict(path='/waitlist', langs=['az', 'tr', 'en'], og_type='website',
        title='Pilot üçün müraciət | EdubbaX',
        desc='EdubbaX pilotuna qoşulun: müəllim, valideyn və ya tədris mərkəzi kimi müraciət edin, 24 saat ərzində sizinlə əlaqə saxlayaq.',
        ld=[crumbs(('EdubbaX', '/'), ('Pilot müraciəti', '/waitlist'))]),
    'investors.html': dict(path='/investors', langs=['en', 'az', 'tr'], og_type='profile',
        title='EdubbaX for investors — founder Omar Heydar | Pre-seed',
        desc='EdubbaX for investors: founder and CEO Omar Heydar, live validation numbers from teachers and parents, and direct contacts.',
        ld=[crumbs(('EdubbaX', '/'), ('Investors', '/investors'))]),
    '404.html': dict(path='/404', page='404', langs=[], og_type='website', noindex=True,
        title='Səhifə tapılmadı | EdubbaX', desc='Axtardığınız səhifə tapılmadı.', ld=[]),
}

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Onest:wght@400;500;600;700;800&display=swap" media="print" onload="this.media=\'all\'">\n')

def lang_url(path, l, default):
    return SITE + path + ('' if l == default else '?lang=' + l)

def esc(x):
    return x.replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;')

def seo_block(c, s):
    default = c['langs'][0] if c['langs'] else 'az'
    url = SITE + c['path']
    t, d = c['title'], c['desc']
    out = ['<!-- seo:start -->', f'<title>{esc(t)}</title>', f'<meta name="description" content="{esc(d)}">']
    if c.get('noindex'):
        out.append('<meta name="robots" content="noindex">')
    else:
        out.append('<meta name="robots" content="index,follow,max-image-preview:large">')
        out.append(f'<link rel="canonical" href="{url}">')
        for l in c['langs']:
            out.append(f'<link rel="alternate" hreflang="{l}" href="{lang_url(c["path"], l, default)}">')
        out.append(f'<link rel="alternate" hreflang="x-default" href="{url}">')
    loc = {'az': 'az_AZ', 'tr': 'tr_TR', 'en': 'en_US', 'ru': 'ru_RU'}
    out += ['<meta name="theme-color" content="#0D0C0A">', '<meta name="author" content="EdubbaX">',
            '<link rel="icon" href="/favicon.ico" sizes="32x32">', '<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">',
            '<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">', '<link rel="manifest" href="/site.webmanifest">',
            f'<meta property="og:type" content="{c["og_type"]}">', '<meta property="og:site_name" content="EdubbaX">',
            f'<meta property="og:title" content="{esc(t)}">', f'<meta property="og:description" content="{esc(d)}">',
            f'<meta property="og:url" content="{url}">', f'<meta property="og:image" content="{OG}">',
            '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">',
            '<meta property="og:image:alt" content="EdubbaX — Making Learning Measurable">',
            f'<meta property="og:locale" content="{loc.get(default, "az_AZ")}">']
    for l in c['langs'][1:]:
        out.append(f'<meta property="og:locale:alternate" content="{loc[l]}">')
    out += ['<meta name="twitter:card" content="summary_large_image">', f'<meta name="twitter:title" content="{esc(t)}">',
            f'<meta name="twitter:description" content="{esc(d)}">', f'<meta name="twitter:image" content="{OG}">']
    if not c.get('noindex'):
        graph = [ORG] + c['ld']
        if c.get('faq'):
            graph.append(faq_ld(s))
        if c['path'] != '/':
            graph.append({"@type": "WebPage", "@id": url, "url": url, "name": t, "description": d, "inLanguage": default,
                          "isPartOf": {"@type": "WebSite", "@id": SITE + "/#site", "name": "EdubbaX", "url": SITE + "/"}, "dateModified": UPDATED})
        out.append('<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False) + '</script>')
    out.append('<!-- seo:end -->')
    return '\n'.join(out) + '\n'

def faq_ld(s):
    az = s[s.index('\naz:{'):s.index('\ntr:{')]
    get = lambda k: re.search(r"[,{\n]" + k + r":'((?:[^'\\]|\\.)*)'", az).group(1).replace("\\'", "'")
    qs = []
    for i in range(1, 20):
        if not re.search(r"[,{\n]q%d:'" % i, az): break
        qs.append({"@type": "Question", "name": get('q%d' % i), "acceptedAnswer": {"@type": "Answer", "text": get('a%d' % i)}})
    return {"@type": "FAQPage", "mainEntity": qs}

ICON_MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
LANGS = '<div class="lang" role="group" aria-label="Language / Dil"><button type="button" data-l="az" lang="az">AZ</button><button type="button" data-l="tr" lang="tr">TR</button><button type="button" data-l="en" lang="en">EN</button></div>'
LINKS = [('courses', '/courses', 'nCourses'), ('sample', '/sample-report', 'nSample'), ('demo', '/', 'nDemo'), ('investors', '/investors', 'nInv')]

def header():
    links = ''.join(f'<a class="nav-a" data-page-link="{k}" data-l="{u}" href="{u}" data-t="{t}"></a>' for k, u, t in LINKS)
    return ('<!-- hdr:start -->\n<a class="skip" href="#main" data-t="skip"></a>\n'
            '<header class="hdr"><div class="hdr-in">\n'
            '  <a class="logo" data-l="/" href="/" aria-label="EdubbaX">edubba<b>X</b></a>\n'
            f'  <nav class="nav" data-ta="navLabel">{links}</nav>\n  {LANGS}\n'
            '  <a class="btn gold hide-m" data-l="/waitlist" href="/waitlist" data-t="ctaShort"></a>\n'
            f'  <button class="burger" type="button" aria-expanded="false" aria-controls="mnav" data-ta="menu">{ICON_MENU}</button>\n'
            '</div></header>\n'
            f'<div class="mnav" id="mnav">{links}{LANGS}<a class="btn gold" data-l="/waitlist" href="/waitlist" data-t="ctaPilot"></a></div>\n<!-- hdr:end -->\n')

def footer():
    L = [('/courses', 'nCourses'), ('/sample-report', 'nSample'), ('/', 'nDemo'), ('/waitlist', 'nWait'), ('/investors', 'nInv'), ('/privacy', 'nPrivacy'), ('/terms', 'nTerms')]
    links = ''.join(f'<a data-l="{u}" href="{u}" data-t="{t}"></a>' for u, t in L)
    return ('<!-- ftr:start -->\n<div class="wrap ftw"><footer class="foot">\n'
            '  <div><a class="logo" data-l="/" href="/" aria-label="EdubbaX">edubba<b>X</b></a><p class="ftag">Making Learning Measurable · © 2026 EdubbaX</p>'
            f'<p class="ftag"><a href="tel:{PHONE}">+994 55 821 75 75</a> · <a href="https://linktr.ee/edubbax" target="_blank" rel="noopener">linktr.ee/edubbax</a></p></div>\n'
            f'  <nav data-ta="footLabel">{links}</nav>\n</footer></div>\n<!-- ftr:end -->\n')

CLEAN = ['courses', 'sample-report', 'privacy', 'terms', 'waitlist', 'investors']

def clean_links(s):
    for n in CLEAN:
        s = re.sub(r'(?<![\w/.-])(?:\./)?' + re.escape(n) + r'\.html', '/' + n, s)
    s = re.sub(r'href="(?:\./)?index\.html"', 'href="/"', s)
    s = s.replace('href="./"', 'href="/"').replace('data-l="./"', 'data-l="/"')
    return s

def process(f, c):
    p = ROOT / f
    s = p.read_text()
    hi = s.index('</head>')
    head, rest = s[:hi], s[hi:]
    head = re.sub(r'<!-- seo:start -->.*?<!-- seo:end -->\n', '', head, flags=re.S)
    head = re.sub(r'<title>.*?</title>\n', '', head, count=1)
    head = re.sub(r'<meta (name="description"|property="og:[a-z:_]+") content="[^"]*">\n', '', head)
    head = head.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
    s = head + rest
    vp = re.search(r'<meta name="viewport"[^>]*>\n', s)
    s = s[:vp.end()] + seo_block(c, s) + s[vp.end():]
    if 'page' in c:
        if 'family=Cormorant+Garamond:wght@600;700&' not in s:
            s = s.replace('<link rel="stylesheet" href="assets/site.css">', FONTS + '<link rel="stylesheet" href="/assets/site.css">')
        s = s.replace('href="assets/site.css"', 'href="/assets/site.css"').replace('src="assets/i18n.js"', 'src="/assets/i18n.js"')
        s = re.sub(r'<body[^>]*>', f'<body data-page="{c["page"]}"' + (' class="has-mcta"' if f == 'courses.html' else '') + '>', s, count=1)
        if '<!-- hdr:start -->' in s:
            s = re.sub(r'<!-- hdr:start -->.*?<!-- hdr:end -->\n', lambda m: header(), s, flags=re.S)
            s = re.sub(r'<!-- ftr:start -->.*?<!-- ftr:end -->\n', lambda m: footer(), s, flags=re.S)
        else:
            s = re.sub(r'<div class="wrap">\n  <header class="top">.*?</header>\n', lambda m: header() + '<main id="main" class="wrap">\n', s, count=1, flags=re.S)
            s = re.sub(r'\n  <footer class="foot">.*?</footer>\n</div>\n', lambda m: '\n</main>\n' + footer(), s, count=1, flags=re.S)
        for k in ['nCourses', 'nPricing', 'nSample', 'nDemo', 'nPrivacy', 'nTerms', 'nInv', 'ctaPilot']:
            s = re.sub(r"(?<=[,{\n])" + k + r":'(?:[^'\\]|\\.)*',?", '', s)
    s = clean_links(s)
    p.write_text(s)
    print('ok', f)

if __name__ == '__main__':
    for f, c in PAGES.items():
        if (ROOT / f).exists():
            process(f, c)
    urls = []
    for f, c in PAGES.items():
        if c.get('noindex'): continue
        default = c['langs'][0]
        alts = ''.join(f'<xhtml:link rel="alternate" hreflang="{l}" href="{lang_url(c["path"], l, default)}"/>' for l in c['langs'])
        alts += f'<xhtml:link rel="alternate" hreflang="x-default" href="{SITE + c["path"]}"/>'
        pri = {'/': '1.0', '/courses': '0.9', '/sample-report': '0.8', '/waitlist': '0.8', '/investors': '0.6'}.get(c['path'], '0.3')
        urls.append(f'  <url><loc>{SITE + c["path"]}</loc><lastmod>{UPDATED}</lastmod><priority>{pri}</priority>{alts}</url>')
    (ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + '\n'.join(urls) + '\n</urlset>\n')
    (ROOT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nDisallow: /404\n\nSitemap: {SITE}/sitemap.xml\n')
    print('sitemap + robots')
