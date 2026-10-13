/**
 * Copy that is new in the Astro build (SEO metadata, product pages, a11y labels…).
 * Ported design copy lives in en.json / ar.json. Keep both locales in sync —
 * `satisfies Record<Locale, UI>` makes a missing Arabic key a type error.
 */
import type { Locale } from './index';

const en = {
  brand: 'Medad-X',
  skip: 'Skip to content',
  menu: 'Menu',
  closeMenu: 'Close menu',
  themeToDark: 'Switch to dark mode',
  themeToLight: 'Switch to light mode',
  langSwitch: 'العربية',
  langSwitchLabel: 'View this page in Arabic',
  langSwitchHomeOnly: 'العربية (الرئيسية)',
  langSwitchHomeOnlyLabel: 'Arabic site home (this page is in English only)',
  breadcrumbHome: 'Home',
  productsNav: 'Products',
  recipesNav: 'Recipes',
  prev: 'Previous',
  next: 'Next',
  pause: 'Pause rotation',
  play: 'Resume rotation',
  slide: 'Show slide {0}',
  englishOnly: 'In English',
  imageCredits: 'Image credits',
  photo: 'Photo',
  illustrative: 'Illustrative photo',
  share: 'Share',
  copyLink: 'Copy link',
  linkCopied: 'Link copied',
  notSentBanner: 'Preview build: forms are simulated and nothing is sent.',
  leadFailed: 'We couldn’t send your request. Please try again, or contact us on WhatsApp.',
  fileErr: {
    type: 'Please upload a PDF, JPG or PNG file.',
    size: 'Attachments must be 4 MB or less in total.',
    count: 'You can attach up to 3 files.',
  },
  formErrors: 'Please fix the highlighted fields.',
  meta: {
    home: {
      title: 'Premium Basmati Rice Supplier in Saudi Arabia | Medad-X',
      description:
        'Medad-X supplies premium Indian and Pakistani basmati rice in bulk to hotels, restaurants, caterers and distributors across Saudi Arabia, the GCC and MENA.',
    },
    about: {
      title: 'About Medad-X — Basmati Rice Trading, Arsan Global Group',
      description:
        'Medad-X is an Arsan Global Group company supplying premium basmati rice to the HORECA and food-trade sectors. Our vision, mission, values and certifications.',
    },
    supply: {
      title: 'Supply Chain & Quality Control | Medad-X Basmati Rice',
      description:
        'From certified mills in India and Pakistan to your kitchen: how Medad-X sources, grades, packs, checks and delivers premium basmati rice. HACCP, ISO 22000, Halal.',
    },
    products: {
      title: 'Basmati Rice Range — Golden Sella, Creamy Sella & Steam | Medad-X',
      description:
        'Compare Farah golden sella, Khayber Gate creamy sella and Dhoqan white steam basmati: grain length, aroma, best uses and 40, 25, 10, 5 and 1 kg packs.',
    },
    contact: {
      title: 'Request a Quote for Bulk Basmati Rice | Medad-X',
      description:
        'Get a quote for wholesale basmati rice in Saudi Arabia and the GCC. Call, WhatsApp or send product, pack size and quantity — our trade team replies quickly.',
    },
    trading: {
      title: 'Open a Wholesale Trading Account | Medad-X',
      description:
        'Apply for a Medad-X B2B trading account: contract pricing, consistent bulk supply and a dedicated account manager for HORECA and distributors.',
    },
    recipes: {
      title: 'Rice Recipes — Biryani, Kabsa, Mandi & Pulao | Medad-X Kitchen',
      description:
        '30 classic rice recipes from the Medad-X Kitchen: Pakistani and Indian biryani and pulao, Saudi kabsa, mandi and more — made for premium aged basmati.',
    },
    history: {
      title: 'The History of Rice — From Wild Grass to Basmati | Medad-X',
      description:
        'An illustrated history of rice: domestication in Asia and Africa, how rice travelled the world, how it is grown and milled, and the basmati trade today.',
    },
    credits: {
      title: 'Image Credits | Medad-X',
      description: 'Photographers and licences for the images used on medadx.com.',
    },
    notFound: {
      title: 'Page not found | Medad-X',
      description: 'The page you’re looking for doesn’t exist.',
    },
  },
  productPage: {
    kicker: 'Basmati range',
    specsTitle: 'Specifications',
    packsTitle: 'Available pack sizes',
    bestFor: 'Best for these dishes',
    bestForSub: 'Recipes from our kitchen that suit this rice.',
    others: 'Other rice in the range',
    viewProduct: 'View product',
    quote: 'Request a quote',
    trading: 'Open trading account',
    certs: 'Certifications',
    lifeAlt: '{0} served',
    compareTitle: 'Compare the range',
    indexIntro:
      'Three basmati rice lines for professional kitchens and distributors — from extra-long golden sella for mandi and kabsa to everyday white steam.',
  },
  recipes: {
    byProduct: 'Cook it with',
    viewRecipe: 'View recipe',
  },
  credits: {
    title: 'Image credits',
    intro:
      'Recipe and history photographs come from Wikimedia Commons and are used under their respective licences. Stock photography is from Unsplash.',
    by: 'by',
    source: 'Source',
    recipesH: 'Recipe photographs',
    historyH: 'History of Rice photographs',
    stockH: 'Stock photography',
  },
  notFound: {
    title: 'Page not found',
    body: 'The page you’re looking for doesn’t exist or has moved.',
    home: 'Back to Medad-X',
    recipes: 'Browse recipes',
  },
};

type UI = typeof en;

const ar: UI = {
  brand: 'ميداد-إكس',
  skip: 'تخطَّ إلى المحتوى',
  menu: 'القائمة',
  closeMenu: 'إغلاق القائمة',
  themeToDark: 'التبديل إلى الوضع الداكن',
  themeToLight: 'التبديل إلى الوضع الفاتح',
  langSwitch: 'EN',
  langSwitchLabel: 'View this page in English',
  langSwitchHomeOnly: 'EN',
  langSwitchHomeOnlyLabel: 'View this page in English',
  breadcrumbHome: 'الرئيسية',
  productsNav: 'منتجاتنا',
  recipesNav: 'الوصفات',
  prev: 'السابق',
  next: 'التالي',
  pause: 'إيقاف التمرير',
  play: 'استئناف التمرير',
  slide: 'عرض الشريحة {0}',
  englishOnly: 'بالإنجليزية',
  imageCredits: 'حقوق الصور',
  photo: 'تصوير',
  illustrative: 'صورة توضيحية',
  share: 'مشاركة',
  copyLink: 'نسخ الرابط',
  linkCopied: 'تم نسخ الرابط',
  notSentBanner: 'نسخة معاينة: النماذج تجريبية ولا يتم إرسال أي بيانات.',
  leadFailed: 'تعذّر إرسال طلبك. يرجى المحاولة مرة أخرى أو التواصل معنا عبر واتساب.',
  fileErr: {
    type: 'يرجى رفع ملف بصيغة PDF أو JPG أو PNG.',
    size: 'يجب ألا يتجاوز حجم المرفقات 4 ميغابايت إجمالاً.',
    count: 'يمكنك إرفاق 3 ملفات كحد أقصى.',
  },
  formErrors: 'يرجى تصحيح الحقول المحددة.',
  meta: {
    home: {
      title: 'مورد أرز بسمتي فاخر في السعودية | ميداد-إكس',
      description:
        'توفّر ميداد-إكس أرز البسمتي الهندي والباكستاني الفاخر بالجملة للفنادق والمطاعم وشركات التموين والموزعين في السعودية ودول الخليج والشرق الأوسط وشمال أفريقيا.',
    },
    about: {
      title: 'عن ميداد-إكس — تجارة أرز البسمتي، مجموعة أرسان العالمية',
      description:
        'ميداد-إكس إحدى شركات مجموعة أرسان العالمية، متخصصة في توريد أرز البسمتي الفاخر لقطاع الضيافة والتجارة الغذائية. رؤيتنا ورسالتنا وقيمنا وشهاداتنا.',
    },
    supply: {
      title: 'سلسلة الإمداد ومراقبة الجودة | أرز بسمتي ميداد-إكس',
      description:
        'من المطاحن المعتمدة في الهند وباكستان إلى مطبخك: كيف نختار أرز البسمتي ونفرزه ونعبّئه ونفحصه ونوصله. HACCP و ISO 22000 وحلال.',
    },
    products: {
      title: 'تشكيلة أرز البسمتي — سيلا ذهبي وسيلا كريمي وستيم | ميداد-إكس',
      description:
        'قارن بين فرحة سيلا ذهبي وباب الخيبر سيلا كريمي وذوقان ستيم أبيض: طول الحبة والرائحة والاستخدامات وعبوات 40 و25 و10 و5 و1 كجم.',
    },
    contact: {
      title: 'اطلب عرض سعر لأرز البسمتي بالجملة | ميداد-إكس',
      description:
        'احصل على عرض سعر لأرز البسمتي بالجملة في السعودية والخليج. اتصل أو راسلنا عبر واتساب أو أرسل المنتج وحجم العبوة والكمية وسيرد فريقنا بسرعة.',
    },
    trading: {
      title: 'افتح حساب تجارة جملة | ميداد-إكس',
      description: 'قدّم طلب حساب تجاري لدى ميداد-إكس: أسعار تعاقدية وتوريد منتظم بالجملة ومدير حساب مخصص لقطاع الضيافة والموزعين.',
    },
    recipes: {
      title: 'وصفات الأرز — برياني وكبسة ومندي | مطبخ ميداد-إكس',
      description: '30 وصفة أرز كلاسيكية من مطبخ ميداد-إكس، مصممة لأرز البسمتي المعتّق الفاخر.',
    },
    history: {
      title: 'تاريخ الأرز — من العشب البري إلى البسمتي | ميداد-إكس',
      description: 'تاريخ مصوّر للأرز: تدجينه في آسيا وأفريقيا، ورحلته حول العالم، وكيف يُزرع ويُطحن، وتجارة البسمتي اليوم.',
    },
    credits: {
      title: 'حقوق الصور | ميداد-إكس',
      description: 'المصورون والتراخيص الخاصة بالصور المستخدمة في موقع medadx.com.',
    },
    notFound: {
      title: 'الصفحة غير موجودة | ميداد-إكس',
      description: 'الصفحة التي تبحث عنها غير موجودة.',
    },
  },
  productPage: {
    kicker: 'تشكيلة البسمتي',
    specsTitle: 'المواصفات',
    packsTitle: 'أحجام العبوات المتوفرة',
    bestFor: 'الأنسب لهذه الأطباق',
    bestForSub: 'وصفات من مطبخنا تناسب هذا الأرز.',
    others: 'أصناف أخرى من التشكيلة',
    viewProduct: 'عرض المنتج',
    quote: 'اطلب عرض سعر',
    trading: 'افتح حساباً تجارياً',
    certs: 'الشهادات',
    lifeAlt: '{0} مقدَّم',
    compareTitle: 'قارن التشكيلة',
    indexIntro:
      'ثلاثة أصناف من أرز البسمتي للمطابخ المحترفة والموزعين — من السيلا الذهبي طويل الحبة للمندي والكبسة إلى الستيم الأبيض للطبخ اليومي.',
  },
  recipes: {
    byProduct: 'اطبخها باستخدام',
    viewRecipe: 'عرض الوصفة',
  },
  credits: {
    title: 'حقوق الصور',
    intro: 'صور الوصفات وتاريخ الأرز مأخوذة من ويكيميديا كومنز وتُستخدم وفق تراخيصها. الصور الأخرى من Unsplash.',
    by: 'بعدسة',
    source: 'المصدر',
    recipesH: 'صور الوصفات',
    historyH: 'صور تاريخ الأرز',
    stockH: 'صور أخرى',
  },
  notFound: {
    title: 'الصفحة غير موجودة',
    body: 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها.',
    home: 'العودة إلى ميداد-إكس',
    recipes: 'تصفح الوصفات',
  },
};

export const UI_STRINGS = { en, ar } satisfies Record<Locale, UI>;
export const ui = (locale: Locale): UI => UI_STRINGS[locale];
