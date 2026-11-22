export type CaseCategory = 'All Work' | 'B2B SaaS' | 'Commerce' | 'Architecture';

export interface StudioMetric {
  value: string;
  label: string;
  context: string;
}

export interface CapabilityItem {
  id: string;
  number: string;
  title: string;
  summary: string;
  deliverables: string[];
  outcome: string;
  span: 'wide' | 'standard';
  presetSiteType: SiteType;
}

export interface CaseStudy {
  id: string;
  client: string;
  category: Exclude<CaseCategory, 'All Work'>;
  year: string;
  headlineMetric: string;
  title: string;
  summary: string;
  image: string;
  imageAlt: string;
  challenge: string;
  approach: string;
  results: { label: string; value: string }[];
  stack: string[];
  quote: {
    text: string;
    author: string;
    role: string;
    organization: string;
  };
}

export interface ProcessStep {
  number: string;
  title: string;
  duration: string;
  description: string;
}

export type SiteType = 'marketing' | 'launch' | 'commerce';
export type PageScale = 'focused' | 'standard' | 'platform';

export interface AddonOption {
  id: string;
  label: string;
  description: string;
  price: number;
  weeks: number;
}

export const STUDIO_METRICS: StudioMetric[] = [
  {
    value: '42',
    label: 'Production Sites Shipped',
    context: 'Across SaaS, retail, and architecture since 2022',
  },
  {
    value: '99/100',
    label: 'Median Lighthouse Score',
    context: 'Verified Core Web Vitals on mobile and desktop',
  },
  {
    value: '4.8 wks',
    label: 'Average Launch Cycle',
    context: 'From architecture kickoff to production deploy',
  },
  {
    value: '+118%',
    label: 'Qualified Inbound Lift',
    context: 'Measured 90 days post-launch across client cohorts',
  },
];

export const CAPABILITIES: CapabilityItem[] = [
  {
    id: 'editorial-websites',
    number: '01.',
    title: 'Brand & Editorial Websites',
    summary:
      'Flagship marketing sites structured around clear positioning, disciplined typography, and fast page transitions that guide buyers directly to conversion.',
    deliverables: ['Information Architecture', 'Custom Design System', 'Production React & TypeScript'],
    outcome: 'Built for teams replacing sluggish templates with a distinctive, maintainable web presence.',
    span: 'wide',
    presetSiteType: 'marketing',
  },
  {
    id: 'product-launches',
    number: '02.',
    title: 'Interactive Product Launches',
    summary:
      'Dedicated launch pages with live interactive sandboxes, technical documentation hubs, and zero-jank motion.',
    deliverables: ['Interactive Calculators', 'Waitlist & Demo Flows', 'Edge-Cached Deployment'],
    outcome: 'Turns technical product complexity into self-guided buyer clarity.',
    span: 'standard',
    presetSiteType: 'launch',
  },
  {
    id: 'commerce-storefronts',
    number: '03.',
    title: 'High-Converting Commerce',
    summary:
      'Custom storefronts engineered for tactile product photography, instant variant filtering, and sub-second cart updates.',
    deliverables: ['Headless Storefront UI', 'Accessible Checkout Flow', 'Inventory & CMS Sync'],
    outcome: 'Eliminates checkout friction while elevating product storytelling.',
    span: 'standard',
    presetSiteType: 'commerce',
  },
  {
    id: 'performance-audits',
    number: '04.',
    title: 'Speed, SEO & Accessibility Engineering',
    summary:
      'Every build ships with semantic HTML, WCAG AA contrast verification, structured schema markup, and strict asset budgets.',
    deliverables: ['Core Web Vitals Tuning', 'WCAG AA Compliance', 'Structured Metadata'],
    outcome: 'Higher organic search visibility and zero broken layouts across viewports.',
    span: 'wide',
    presetSiteType: 'marketing',
  },
];

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'kestrel-treasury',
    client: 'Kestrel Treasury',
    category: 'B2B SaaS',
    year: '2026',
    headlineMetric: '+140% Qualified Demo Requests in 90 Days',
    title: 'Reframing enterprise cash-flow software around buyer clarity',
    summary:
      'Replaced a fragmented 40-page legacy site with a streamlined narrative architecture and an interactive treasury yield simulator.',
    image: '/src/assets/images/case_study_saas_1795362218542.jpg',
    imageAlt: 'Laptop on a pale limestone desk showing a minimalist cobalt geometric interface',
    challenge:
      'Finance leaders visiting Kestrel’s previous site spent under 35 seconds before bouncing because core capabilities were buried inside PDF whitepapers and slow third-party scripts.',
    approach:
      'We audited search intent across 12 enterprise buyer interviews, consolidated 40 redundant pages into 9 focused entry points, and engineered an interactive yield comparison widget directly above the fold.',
    results: [
      { label: 'Qualified Demo Requests (90 days)', value: '+140%' },
      { label: 'First Contentful Paint', value: '0.6s' },
      { label: 'Organic Search Impressions', value: '+84%' },
    ],
    stack: ['React', 'TypeScript', 'Tailwind CSS', 'Structured JSON-LD'],
    quote: {
      text: 'Before the redesign, our sales engineers spent the first twenty minutes of every call explaining what our platform actually does. Meridian rebuilt our site so prospects arrive already understanding our architecture, and qualified demos more than doubled in one quarter.',
      author: 'Hannah Lindqvist',
      role: 'VP of Marketing',
      organization: 'Kestrel Treasury',
    },
  },
  {
    id: 'sola-atelier',
    client: 'Sola Objects',
    category: 'Commerce',
    year: '2026',
    headlineMetric: '+38% Checkout Completion Rate',
    title: 'Tactile stoneware and architectural lighting storefront',
    summary:
      'Designed an editorial catalog experience with instant glaze filtering, room-scale dimensions, and a single-drawer cart.',
    image: '/src/assets/images/case_study_commerce_1795362219133.jpg',
    imageAlt: 'Handcrafted matte charcoal stoneware vessels and brushed aluminum lamp on a travertine plinth',
    challenge:
      'High-consideration home objects suffered a 68% cart abandonment rate due to multi-page reloads, unclear shipping estimates, and uncalibrated mobile product galleries.',
    approach:
      'We unified catalog filtering and variant inspection into a single zero-reload interface, introduced transparent freight calculation inside the cart drawer, and standardized 4:3 studio photography ratios.',
    results: [
      { label: 'Checkout Completion Rate', value: '+38%' },
      { label: 'Average Order Value', value: '$412' },
      { label: 'Mobile Page Speed Score', value: '98/100' },
    ],
    stack: ['TypeScript', 'Headless Commerce API', 'Edge Image Optimization'],
    quote: {
      text: 'Our previous theme made $400 lighting fixtures feel generic. Meridian gave our photography room to breathe and removed three unnecessary steps from checkout, lifting completion by 38% within six weeks.',
      author: 'David Okafor',
      role: 'Co-Founder',
      organization: 'Sola Objects',
    },
  },
  {
    id: 'alder-pavilion',
    client: 'Alder & Stone Architects',
    category: 'Architecture',
    year: '2025',
    headlineMetric: '$3.2M New Residential Commissions in 6 Months',
    title: 'Monograph-grade portfolio and private commission portal',
    summary:
      'Built a calm, high-contrast architectural archive paired with a structured feasibility intake flow for residential clients.',
    image: '/src/assets/images/case_study_architecture_1795362219221.jpg',
    imageAlt: 'Board-formed concrete and warm cedar pavilion beside a reflecting pool at golden hour',
    challenge:
      'The studio relied solely on word-of-mouth referrals while their outdated Flash-era gallery failed to represent completed residential commissions on modern retina displays.',
    approach:
      'We crafted an asymmetric project index organized by material system and climate zone, and replaced a generic contact email with a structured site-feasibility brief.',
    results: [
      { label: 'Commission Pipeline (6 months)', value: '$3.2M' },
      { label: 'Qualified Brief Submissions', value: '3.4x' },
      { label: 'Avg Session Duration', value: '4m 18s' },
    ],
    stack: ['React', 'Vite', 'Responsive Srcset Pipeline', 'WCAG AA'],
    quote: {
      text: 'Prospective clients now reference specific material studies from our archive before our first studio meeting. The feasibility brief filters out mismatched inquiries and brought in three full residential commissions this year.',
      author: 'Claire Sato',
      role: 'Principal Architect',
      organization: 'Alder & Stone Architects',
    },
  },
];

export const PROCESS_STEPS: ProcessStep[] = [
  {
    number: '01.',
    title: 'Discovery & Architecture',
    duration: 'Week 1',
    description:
      'We audit existing analytics, map buyer questions, and lock the sitemap and conversion paths before writing a line of UI code.',
  },
  {
    number: '02.',
    title: 'Visual System & Copy',
    duration: 'Week 2',
    description:
      'Typography, color hierarchy, and concrete messaging are tested together in live browser prototypes—never static disconnected slides.',
  },
  {
    number: '03.',
    title: 'Production Engineering',
    duration: 'Weeks 3–4',
    description:
      'Clean TypeScript components, keyboard-accessible controls, responsive grid engineering, and strict performance budgeting.',
  },
  {
    number: '04.',
    title: 'Launch & Verification',
    duration: 'Week 5',
    description:
      'Automated Lighthouse checks, OpenGraph metadata verification, analytics event wiring, and smooth team handoff.',
  },
];

export const SITE_TYPE_CONFIG: Record<
  SiteType,
  { label: string; description: string; basePrice: number; baseWeeks: number }
> = {
  marketing: {
    label: 'Marketing Website',
    description: 'Positioning, services, case studies, and lead capture',
    basePrice: 8500,
    baseWeeks: 4,
  },
  launch: {
    label: 'Product Launch Hub',
    description: 'Interactive feature demos, pricing, and waitlist/signup',
    basePrice: 12000,
    baseWeeks: 5,
  },
  commerce: {
    label: 'Commerce Storefront',
    description: 'Filterable catalog, variant drawer, and checkout integration',
    basePrice: 15500,
    baseWeeks: 6,
  },
};

export const PAGE_SCALE_CONFIG: Record<
  PageScale,
  { label: string; pages: string; multiplier: number; extraWeeks: number }
> = {
  focused: {
    label: 'Focused',
    pages: '1–5 pages',
    multiplier: 1,
    extraWeeks: 0,
  },
  standard: {
    label: 'Standard',
    pages: '6–12 pages',
    multiplier: 1.35,
    extraWeeks: 1,
  },
  platform: {
    label: 'Multi-Section',
    pages: '13+ pages',
    multiplier: 1.75,
    extraWeeks: 2,
  },
};

export const ADDON_OPTIONS: AddonOption[] = [
  {
    id: 'cms',
    label: 'Editorial CMS Setup',
    description: 'Structured publishing workflow for case studies and articles',
    price: 2400,
    weeks: 1,
  },
  {
    id: 'interactive-tool',
    label: 'Custom Interactive Estimator',
    description: 'Bespoke ROI calculator, configurator, or live product sandbox',
    price: 3200,
    weeks: 1,
  },
  {
    id: 'seo-analytics',
    label: 'Technical SEO & Event Analytics',
    description: 'Schema.org JSON-LD, sitemap automation, and funnel tracking',
    price: 1600,
    weeks: 0,
  },
];
