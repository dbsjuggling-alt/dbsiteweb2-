export type Locale = 'en' | 'fr';

export const locales: Locale[] = ['en', 'fr'];

export const defaultLocale: Locale = 'en';

export function getLangFromUrl(url: URL): Locale {
  const path = url.pathname.replace(/^\/+/, '');
  const first = path.split('/')[0] as Locale;
  if (locales.includes(first)) return first;
  return defaultLocale;
}

export function localizedUrl(url: string, lang: Locale): string {
  if (lang === defaultLocale) return url;
  return `/${lang}${url}`;
}

type TranslationKey =
  // Navigation
  | 'nav.home' | 'nav.products' | 'nav.store' | 'nav.contact'
  // Home Hero
  | 'hero.badge' | 'hero.title1' | 'hero.title2' | 'hero.subtitle' | 'hero.shop' | 'hero.learn'
  // Home Specs
  | 'specs.heading' | 'specs.subtitle'
  | 'specs.diameter.label' | 'specs.diameter.desc'
  | 'specs.pressured.label' | 'specs.pressured.desc'
  | 'specs.white.label' | 'specs.white.desc'
  | 'specs.sand.label' | 'specs.sand.desc'
  // Home Instagram
  | 'insta.heading' | 'insta.subtitle'
  // Products
  | 'products.heading' | 'products.subtitle'
  | 'products.cta' | 'products.ctaBtn'
  | 'specs.construction.label' | 'specs.construction.desc'
  | 'specs.color.label' | 'specs.color.desc'
  | 'specs.filling.label' | 'specs.filling.desc'
  | 'specs.weight.label' | 'specs.weight.desc'
  | 'specs.material.label' | 'specs.material.desc'
  // Store
  | 'store.heading' | 'store.subtitle' | 'store.unitPrice' | 'store.total'
  | 'store.productName' | 'store.productDesc'
  | 'store.purchase' | 'store.loading' | 'store.error'
  | 'store.priceHint'
  | 'store.shipping.text' | 'store.shipping.countries' | 'store.shipping.other'
  // Promo
  | 'store.promo.label' | 'store.promo.placeholder' | 'store.promo.apply'
  | 'store.promo.valid' | 'store.promo.invalid' | 'store.promo.discount'
  | 'store.promo.saved'
  // Contact
  | 'contact.heading' | 'contact.subtitle'
  | 'contact.name' | 'contact.email' | 'contact.message'
  | 'contact.submit' | 'contact.or' | 'contact.emailLabel'
  // Footer
  | 'footer.copyright'
  // Header accessibility
  | 'header.cart';

type Translations = Record<Locale, Record<TranslationKey, string>>;

export const t: Translations = {
  en: {
    // Nav
    'nav.home': 'Home',
    'nav.products': 'Products',
    'nav.store': 'Store',
    'nav.contact': 'Contact',
    // Hero
    'hero.badge': 'The premium ball',
    'hero.title1': 'Improve your',
    'hero.title2': 'Juggling Skills',
    'hero.subtitle': 'Premium juggling balls designed for enthusiasts and performers. Precision-crafted for consistent trajectories and lasting grip.',
    'hero.shop': 'Shop',
    'hero.learn': 'Learn More',
    // Specs
    'specs.heading': 'Precision Crafted',
    'specs.subtitle': 'Every detail matters in performance juggling.',
    'specs.diameter.label': '70mm',
    'specs.diameter.desc': 'Optimal diameter for balanced control and comfortable grip.',
    'specs.pressured.label': 'Pressured',
    'specs.pressured.desc': 'Consistent internal pressure for predictable bounce and feel.',
    'specs.white.label': 'White',
    'specs.white.desc': 'Classic white color for maximum visibility on stage and in low light.',
    'specs.sand.label': 'Ultra Fine Sand',
    'specs.sand.desc': 'Premium sand filling for perfect weight distribution and zero shift.',
    // Instagram
    'insta.heading': 'Follow Us',
    'insta.subtitle': 'Stay connected on social media for new drops and tutorials.',
    // Products
    'products.heading': 'Juggling Balls',
    'products.subtitle': 'Premium juggling balls designed for you.',
    'products.cta': 'Ready to elevate your practice?',
    'products.ctaBtn': 'Shop Now',
    'specs.construction.label': 'Construction',
    'specs.construction.desc': 'Consistent internal pressure for predictable bounce and feel.',
    'specs.color.label': 'Color',
    'specs.color.desc': 'Classic white for maximum visibility on stage and in low light.',
    'specs.filling.label': 'Filling',
    'specs.filling.desc': 'Premium sand filling for perfect weight distribution and zero shift.',
    'specs.weight.label': 'Weight',
    'specs.weight.desc': 'Calibrated inertia for smooth patterns and consistent throws.',
    'specs.material.label': 'Material',
    'specs.material.desc': 'Matte grip surface for reliable catch even with sweaty hands.',
    // Store
    'store.heading': 'Store',
    'store.subtitle': 'Premium juggling balls — pick your quantity.',
    'store.unitPrice': 'Unit price',
    'store.total': 'Total:',
    'store.productName': 'Juggling Ball',
    'store.productDesc': '70mm — White — Ultra Fine Sand filling',
    'store.purchase': 'Purchase',
    'store.loading': 'Loading...',
    'store.error': 'Error — Try Again',
    'store.priceHint': '€5 per ball — fixed price regardless of quantity.',
    'store.shipping.text': '€0.50 shipping flat rate per order. Fast delivery with tracking number.',
    'store.shipping.countries': 'Shipping to: France, Belgium, Switzerland, Luxembourg, Germany, Italy, Spain.',
    'store.shipping.other': 'Other destination?',
    // Promo
    'store.promo.label': 'Promo code',
    'store.promo.placeholder': 'Enter code',
    'store.promo.apply': 'Apply',
    'store.promo.valid': '✅ Code applied!',
    'store.promo.invalid': '❌ Invalid code',
    'store.promo.discount': 'Discount:',
    'store.promo.saved': 'You save',
    // Contact
    'contact.heading': 'Contact Us',
    'contact.subtitle': 'For informations regarding our juggling balls.',
    'contact.name': 'Your Name',
    'contact.email': 'Your Email *',
    'contact.message': 'Your Message *',
    'contact.submit': 'Submit Your Inquiry',
    'contact.or': 'Or reach us directly:',
    'contact.emailLabel': 'dbsjuggling@gmail.com',
    // Footer
    'footer.copyright': '© {year} db\'s. Premium juggling balls designed for you.',
    // Header
    'header.cart': 'Go to cart',
  },

  fr: {
    // Nav
    'nav.home': 'Accueil',
    'nav.products': 'Produits',
    'nav.store': 'Boutique',
    'nav.contact': 'Contact',
    // Hero
    'hero.badge': 'La balle premium',
    'hero.title1': 'Élevez votre',
    'hero.title2': 'Jonglage',
    'hero.subtitle': 'Balles de jonglage haut de gamme conçues pour les passionnés et les artistes. Fabriquées avec précision pour des trajectoires constantes et une adhérence durable.',
    'hero.shop': 'Boutique',
    'hero.learn': 'En savoir plus',
    // Specs
    'specs.heading': 'Fabrication de Précision',
    'specs.subtitle': 'Chaque détail compte dans la jonglerie de haut niveau.',
    'specs.diameter.label': '70mm',
    'specs.diameter.desc': 'Diamètre optimal pour un contrôle équilibré et une prise confortable.',
    'specs.pressured.label': 'Sous Pression',
    'specs.pressured.desc': 'Pression interne constante pour un rebond et une sensation prévisibles.',
    'specs.white.label': 'Blanc',
    'specs.white.desc': 'Couleur blanche classique pour une visibilité maximale sur scène et en faible lumière.',
    'specs.sand.label': 'Sable Ultra-Fin',
    'specs.sand.desc': 'Remplissage en sable premium pour une répartition parfaite du poids et aucun décalage.',
    // Instagram
    'insta.heading': 'Suivez-nous',
    'insta.subtitle': 'Restez connecté sur les réseaux pour les nouveautés et tutoriels.',
    // Products
    'products.heading': 'Balles de Jonglage',
    'products.subtitle': 'Balles de jonglage premium conçues pour vous.',
    'products.cta': 'Prêt à perfectionner votre pratique ?',
    'products.ctaBtn': 'Acheter maintenant',
    'specs.construction.label': 'Construction',
    'specs.construction.desc': 'Pression interne constante pour un rebond et une sensation prévisibles.',
    'specs.color.label': 'Couleur',
    'specs.color.desc': 'Blanc classique pour une visibilité maximale sur scène et en faible lumière.',
    'specs.filling.label': 'Remplissage',
    'specs.filling.desc': 'Remplissage en sable premium pour une répartition parfaite du poids.',
    'specs.weight.label': 'Poids',
    'specs.weight.desc': 'Inertie calibrée pour des figures fluides et des lancers constants.',
    'specs.material.label': 'Matériau',
    'specs.material.desc': 'Surface grip mate pour une prise fiable même avec les mains moites.',
    // Store
    'store.heading': 'Boutique',
    'store.subtitle': 'Balles de jonglage premium — choisissez votre quantité.',
    'store.unitPrice': 'Prix unitaire',
    'store.total': 'Total :',
    'store.productName': 'Balle de Jonglage',
    'store.productDesc': '70mm — Blanc — Remplissage sable ultra-fin',
    'store.purchase': 'Acheter',
    'store.loading': 'Chargement...',
    'store.error': 'Erreur — Réessayer',
    'store.priceHint': '5€ par balle — prix fixe quelle que soit la quantité.',
    'store.shipping.text': 'Frais de port fixes de 0,50€ par commande. Livraison rapide avec numéro de suivi.',
    'store.shipping.countries': 'Livraison vers : France, Belgique, Suisse, Luxembourg, Allemagne, Italie, Espagne.',
    'store.shipping.other': 'Autre destination ?',
    // Promo
    'store.promo.label': 'Code promo',
    'store.promo.placeholder': 'Saisir le code',
    'store.promo.apply': 'Appliquer',
    'store.promo.valid': '✅ Code appliqué !',
    'store.promo.invalid': '❌ Code invalide',
    'store.promo.discount': 'Réduction :',
    'store.promo.saved': 'Vous économisez',
    // Contact
    'contact.heading': 'Contactez-nous',
    'contact.subtitle': 'Pour toute information concernant nos balles de jonglage.',
    'contact.name': 'Votre Nom',
    'contact.email': 'Votre Email *',
    'contact.message': 'Votre Message *',
    'contact.submit': 'Envoyer votre demande',
    'contact.or': 'Ou contactez-nous directement :',
    'contact.emailLabel': 'dbsjuggling@gmail.com',
    // Footer
    'footer.copyright': '© {year} db\'s. Balles de jonglage premium conçues pour vous.',
    // Header
    'header.cart': 'Aller au panier',
  },
};

export function translate(lang: Locale, key: TranslationKey): string {
  return t[lang][key];
}