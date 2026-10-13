/**
 * schema.org JSON-LD builders. Organization/WebSite are referenced by @id so every
 * page's graph links back to one entity.
 */
import type { Article, BreadcrumbList, FAQPage, Organization, Product, Recipe, WebSite, WithContext } from 'schema-dts';
import { ORG, SITE_DATA, SOCIALS } from '@/data/site';
import type { Locale } from '@/i18n';
import { absUrl, SITE_URL } from './seo';

const ORG_ID = `${SITE_URL}/#org`;
const SITE_ID = `${SITE_URL}/#website`;
const ctx = 'https://schema.org' as const;

export function organization(logoUrl: string): WithContext<Organization> {
  return {
    '@context': ctx,
    '@type': 'Organization',
    '@id': ORG_ID,
    name: ORG.name,
    alternateName: ['Medad X', 'MedadX', 'ميداد-إكس'],
    legalName: ORG.legalName,
    url: SITE_URL,
    logo: absUrl(logoUrl),
    email: ORG.email,
    telephone: ORG.telephone,
    parentOrganization: { '@type': 'Organization', name: ORG.parent },
    address: { '@type': 'PostalAddress', ...ORG.address },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        telephone: ORG.telephone,
        email: ORG.email,
        availableLanguage: ['en', 'ar'],
        areaServed: [...ORG.areaServed],
      },
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        telephone: SITE_DATA.wa.replace(/\s/g, ''),
        url: SITE_DATA.waHref,
        availableLanguage: ['en', 'ar'],
      },
    ],
    sameAs: Object.values(SOCIALS),
  };
}

export function website(locale: Locale): WithContext<WebSite> {
  return {
    '@context': ctx,
    '@type': 'WebSite',
    '@id': SITE_ID,
    name: 'Medad-X',
    url: SITE_URL,
    inLanguage: locale === 'ar' ? 'ar' : 'en',
    publisher: { '@id': ORG_ID },
  };
}

export function breadcrumbs(items: { name: string; path: string }[]): WithContext<BreadcrumbList> {
  return {
    '@context': ctx,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absUrl(it.path),
    })),
  };
}

export function faq(items: { q: string; a: string }[], locale: Locale): WithContext<FAQPage> {
  return {
    '@context': ctx,
    '@type': 'FAQPage',
    inLanguage: locale,
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };
}

export function product(p: {
  id: string;
  name: string;
  brand: string;
  description: string;
  path: string;
  images: string[];
  locale: Locale;
  specs: { name: string; value: string }[];
}): WithContext<Product> {
  return {
    '@context': ctx,
    '@type': 'Product',
    '@id': `${absUrl(p.path)}#product`,
    sku: `MX-${p.id.toUpperCase()}`,
    name: p.name,
    description: p.description,
    url: absUrl(p.path),
    image: p.images.map(absUrl),
    brand: { '@type': 'Brand', name: p.brand },
    manufacturer: { '@id': ORG_ID },
    category: 'Food, Beverages & Tobacco > Food Items > Grains, Rice & Cereal > Rice',
    countryOfOrigin: ['IN', 'PK'].map((c) => ({ '@type': 'Country', name: c })),
    additionalProperty: p.specs.map((s) => ({ '@type': 'PropertyValue', name: s.name, value: s.value })),
    inLanguage: p.locale,
  } as WithContext<Product>;
}

export function recipe(r: {
  title: string;
  description: string;
  path: string;
  images: string[];
  prepISO: string;
  cookISO: string;
  totalISO: string;
  servings: number;
  category: string;
  cuisine: string;
  ingredients: string[];
  method: string[];
  keywords: string[];
}): WithContext<Recipe> {
  const url = absUrl(r.path);
  return {
    '@context': ctx,
    '@type': 'Recipe',
    '@id': `${url}#recipe`,
    name: r.title,
    description: r.description,
    url,
    image: r.images.map(absUrl),
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    datePublished: '2026-10-12',
    prepTime: r.prepISO,
    cookTime: r.cookISO,
    totalTime: r.totalISO,
    recipeYield: [String(r.servings), `${r.servings} servings`],
    recipeCategory: r.category,
    recipeCuisine: r.cuisine,
    keywords: r.keywords.join(', '),
    recipeIngredient: r.ingredients,
    recipeInstructions: r.method.map((text, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text,
      url: `${url}#step-${i + 1}`,
    })),
    inLanguage: 'en',
  };
}

export function article(a: { headline: string; description: string; path: string; image: string; locale: Locale }): WithContext<Article> {
  return {
    '@context': ctx,
    '@type': 'Article',
    headline: a.headline,
    description: a.description,
    url: absUrl(a.path),
    mainEntityOfPage: absUrl(a.path),
    image: [absUrl(a.image)],
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    datePublished: '2026-10-12',
    dateModified: '2026-10-12',
    inLanguage: a.locale,
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/licenses/by-sa/4.0/',
  };
}

export function webPage(type: 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage', name: string, path: string, locale: Locale) {
  return {
    '@context': ctx,
    '@type': type,
    name,
    url: absUrl(path),
    inLanguage: locale,
    isPartOf: { '@id': SITE_ID },
    about: { '@id': ORG_ID },
  };
}

export function localBusiness(locale: Locale) {
  return {
    '@context': ctx,
    '@type': 'WholesaleStore',
    '@id': `${SITE_URL}/#dammam`,
    name: 'Medad-X',
    parentOrganization: { '@id': ORG_ID },
    url: SITE_URL,
    telephone: ORG.telephone,
    email: ORG.email,
    address: { '@type': 'PostalAddress', ...ORG.address },
    areaServed: [...ORG.areaServed],
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        opens: '08:00',
        closes: '17:00',
      },
    ],
    inLanguage: locale,
  };
}
