/* Single source of truth for anything that appears on more than one page.
   Previously the phone number lived in 13 places across 8 files; changing it
   meant a find-and-replace and hoping nothing was missed. */

export const site = {
  name: 'Lathrem Homebuilders',
  legalName: 'Lathrem Homebuilders, LLC',
  phone: '(520) 975-0456',
  phoneHref: 'tel:+15209750456',
  phoneE164: '+1-520-975-0456',
  email: null,

  address: {
    street: '4032 W Moore Rd',
    city: 'Tucson',
    region: 'AZ',
    postalCode: '85742',
    country: 'US',
  },

  license: 'Arizona ROC #324057',
  licenseNumber: '324057',
  licenseType: 'General Dual',

  rating: { value: '5.0', count: 19 },

  houzz:
    'https://www.houzz.com/professionals/home-builders/lathrem-homebuilders-llc-pfvwus-pf~218754289',
};

export const nav = [
  { href: '/portfolio.html', label: 'Portfolio' },
  { href: '/testimonials.html', label: 'Testimonials' },
  { href: '/about.html', label: 'About' },
  { href: '/contact.html', label: 'Contact' },
];

export const areasServed = [
  'Tucson',
  'Catalina Foothills',
  'Oro Valley & Marana',
  'Casas Adobes & Tortolita',
];
