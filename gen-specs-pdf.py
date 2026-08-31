from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, black, white
from reportlab.pdfgen import canvas
import os

OUT_DIR = os.path.expanduser('~/dev/dbs-juggling-site/public')

# Couleurs
DARK = HexColor('#1d1e20')
GRAY = HexColor('#727586')
LIGHT_GRAY = HexColor('#f2f3f6')
PURPLE = HexColor('#673de6')

def footer(c, page):
    W, H = A4
    c.setFillColor(DARK)
    c.rect(0, 0, W, 80, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 9)
    c.drawString(40, 45, "db's — Balles de jonglage premium")
    c.setFont('Helvetica', 7)
    c.setFillColor(HexColor('#999999'))
    c.drawString(40, 30, 'dbsjuggling@gmail.com')
    c.drawRightString(W - 40, 45, f'© 2026 db\'s — Page {page}')

def header_bar(c, title, subtitle):
    W, H = A4
    c.setFillColor(DARK)
    c.rect(0, H - 80, W, 80, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 18)
    c.drawString(40, H - 48, title)
    c.setFont('Helvetica', 8)
    c.setFillColor(HexColor('#999999'))
    c.drawString(40, H - 65, subtitle)
    c.setStrokeColor(PURPLE)
    c.setLineWidth(3)
    c.line(40, H - 85, W - 40, H - 85)

# ═══════════════════════════════════════════════════════════
# PDF 1 — FICHE PRODUIT (1 page)
# ═══════════════════════════════════════════════════════════

OUT1 = os.path.join(OUT_DIR, 'balle-jonglage-fiche.pdf')

c = canvas.Canvas(OUT1, pagesize=A4)
c.setTitle('Balle de jonglage — Fiche produit')
c.setAuthor("db's")
W, H = A4

# Barre haute
c.setFillColor(DARK)
c.rect(0, H - 60, W, 60, fill=1, stroke=0)
c.setFillColor(white)
c.setFont('Helvetica-Bold', 12)
c.drawString(40, H - 38, "db's")
c.setFont('Helvetica', 8)
c.setFillColor(HexColor('#999999'))
c.drawString(40, H - 52, 'Balles de jonglage premium')

# Badge specs
c.setFillColor(PURPLE)
c.roundRect(W - 160, H - 52, 130, 38, 6, fill=1, stroke=0)
c.setFillColor(white)
c.setFont('Helvetica-Bold', 11)
c.drawCentredString(W - 95, H - 35, '70 mm  ·  65 g')
c.setFont('Helvetica', 7)
c.drawCentredString(W - 95, H - 48, 'Diamètre  ·  Poids')

# ─── Texte inspiration Norwik ───
c.setFillColor(DARK)
c.setFont('Helvetica-Bold', 32)
c.drawCentredString(W / 2, H - 130, 'BALLE DE JONGLAGE')
c.setFont('Helvetica', 11)
c.setFillColor(GRAY)
c.drawCentredString(W / 2, H - 150, 'Précision · Consistance · Contrôle')

# Cercle balle
c.setStrokeColor(HexColor('#dddddd'))
c.setFillColor(LIGHT_GRAY)
c.circle(W / 2, H - 280, 75, fill=1, stroke=1)
c.setFillColor(HexColor('#e8e8e8'))
c.circle(W / 2, H - 280, 50, fill=1, stroke=0)
c.setFillColor(HexColor('#f0f0f0'))
c.circle(W / 2, H - 280, 25, fill=1, stroke=0)

# Texte balle
c.setFillColor(DARK)
c.setFont('Helvetica-Bold', 10)
c.drawCentredString(W / 2, H - 290, "db's")

# ─── Grille specs ───
specs1 = [
    ('Diamètre', '70 mm', 'Taille optimale pour un contrôle\néquilibré et une prise confortable.'),
    ('Poids', '65 g', 'Inertie calibrée pour des figures\nfluides et des lancers constants.'),
    ('Remplissage', 'Sable ultra-fin', 'Sable premium pour une répartition\nparfaite du poids, sans décalage.'),
    ('Revêtement', 'Mat Soft-Touch', 'Surface grip mate pour une prise\nfiable même mains moites.'),
    ('Pression', 'Sous pression', 'Pression interne constante pour un\nrebond et une sensation prévisibles.'),
    ('Couleur', 'Blanc', 'Blanc classique pour une visibilité\nmaximale sur scène et faible lumière.'),
]

cols = 3
rows = 2
box_w = 160
box_h = 105
start_x = (W - (cols * box_w + (cols - 1) * 16)) / 2
start_y = H - 450

for i, (label, value, desc) in enumerate(specs1):
    col = i % cols
    row = i // cols
    x = start_x + col * (box_w + 16)
    y = start_y - row * (box_h + 12)

    c.setStrokeColor(HexColor('#dadce0'))
    c.setFillColor(white)
    c.roundRect(x, y, box_w, box_h, 6, fill=1, stroke=1)

    # Ligne accent
    c.setStrokeColor(PURPLE)
    c.setLineWidth(2)
    c.line(x + 12, y + box_h - 4, x + box_w - 12, y + box_h - 4)

    c.setFillColor(GRAY)
    c.setFont('Helvetica', 7)
    c.drawString(x + 12, y + box_h - 22, label.upper())
    c.setFillColor(DARK)
    c.setFont('Helvetica-Bold', 14)
    c.drawString(x + 12, y + box_h - 42, value)
    c.setFillColor(GRAY)
    c.setFont('Helvetica', 8)
    for li, line in enumerate(desc.split('\n')):
        c.drawString(x + 12, y + 16 - li * 13, line)

footer(c, 1)

c.save()
print(f'PDF 1 créé : {OUT1} ({os.path.getsize(OUT1)} bytes)')


# ═══════════════════════════════════════════════════════════
# PDF 2 — FICHE TECHNIQUE (1 page)
# ═══════════════════════════════════════════════════════════

OUT2 = os.path.join(OUT_DIR, 'balle-jonglage-technique.pdf')

c = canvas.Canvas(OUT2, pagesize=A4)
c.setTitle('Balle de jonglage — Fiche technique')
c.setAuthor("db's")

header_bar(c, 'Fiche Technique', 'Ingénierie de précision pour des performances constantes')

# ─── Tableau ───
table = [
    ('Spécification', 'Valeur', 'Notes'),
    ('Diamètre', '70 mm (2,76")', 'Format professionnel standard'),
    ('Poids', '65 g (2,29 oz)', 'Calibré par balle ±0,5 g'),
    ('Remplissage', 'Sable de silice ultra-fin', 'Aucun décalage, aucun bruit'),
    ('Revêtement', 'Polyuréthane mat', 'Soft-touch, résistant à la transpiration'),
    ('Pression interne', 'Sous pression', 'Profil de rebond constant'),
    ('Couleur', 'Blanc', 'Finition mate haute visibilité'),
    ('Résistance', 'Haute résistance aux chocs', '> 10 000 lancers testés'),
    ('Utilisation', 'Intérieur / Extérieur', 'Toutes surfaces'),
    ('Conditionnement', 'Boîte sleeve', 'Carton éco-responsable'),
]

cw = [140, 140, 230]
x0 = 42
y0 = H - 122
rh = 28

for ri, (a, b, c_text) in enumerate(table):
    y = y0 - ri * rh

    if ri == 0:
        c.setFillColor(PURPLE)
        c.roundRect(x0 - 6, y - 6, sum(cw) + 12, rh, 4, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont('Helvetica-Bold', 9)
    elif ri % 2 == 0:
        c.setFillColor(LIGHT_GRAY)
        c.rect(x0 - 6, y - 6, sum(cw) + 12, rh, fill=1, stroke=0)
        c.setFillColor(DARK)
        c.setFont('Helvetica', 9)
    else:
        c.setFillColor(white)
        c.rect(x0 - 6, y - 6, sum(cw) + 12, rh, fill=1, stroke=0)
        c.setFillColor(DARK)
        c.setFont('Helvetica', 9)

    if ri == 0:
        c.setFont('Helvetica-Bold', 9)
    else:
        c.setFont('Helvetica', 9)

    c.drawString(x0, y + 3, a)
    c.drawString(x0 + cw[0], y + 3, b)
    c.setFont('Helvetica', 8)
    c.setFillColor(GRAY)
    c.drawString(x0 + cw[0] + cw[1], y + 3, c_text)

# ─── Performance ───
y_p = 310
c.setFillColor(DARK)
c.setFont('Helvetica-Bold', 14)
c.drawString(50, y_p, 'Profil de performance')

c.setStrokeColor(HexColor('#dadce0'))
c.setLineWidth(1)
c.line(50, y_p - 8, W - 50, y_p - 8)

items = [
    'Trajectoire constante : déviation ±2 % sur des lancers de 5 m',
    'Réception silencieuse : le remplissage en sable absorbe les chocs',
    'Adhérence tout-temps : la finition mate fonctionne sec, humide ou mouillé',
    'Prêt pour la scène : le blanc est visible sous tous les éclairages',
    'Zéro déformation : le cœur sous pression conserve sa forme après des milliers de lancers',
]

c.setFont('Helvetica', 9)
c.setFillColor(GRAY)
for idx, item in enumerate(items):
    yi = y_p - 40 - idx * 22
    c.setFillColor(PURPLE)
    c.circle(62, yi + 2, 3, fill=1, stroke=0)
    c.setFillColor(GRAY)
    c.drawString(76, yi - 1, item)

# ─── Description produit ───
y_desc = 140
c.setFillColor(DARK)
c.setFont('Helvetica-Bold', 14)
c.drawString(50, y_desc, 'Description')

c.setStrokeColor(HexColor('#dadce0'))
c.setLineWidth(1)
c.line(50, y_desc - 8, W - 50, y_desc - 8)

c.setFont('Helvetica', 9)
c.setFillColor(GRAY)
c.drawString(50, y_desc - 30, 'Balle de jonglage professionnelle de 70 mm de diamètre et 65 g.')
c.drawString(50, y_desc - 46, 'Remplissage en sable ultra-fin pour une répartition parfaite du poids.')
c.drawString(50, y_desc - 62, 'Revêtement mat Soft-Touch antidérapant. Fabriquée pour durer.')
c.drawString(50, y_desc - 78, 'Idéale pour l\'entraînement quotidien, les cascades et la scène.')

footer(c, 1)

c.save()
print(f'PDF 2 créé : {OUT2} ({os.path.getsize(OUT2)} bytes)')