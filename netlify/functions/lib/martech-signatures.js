// Martech signature library — maps known tools to detection rules.
//
// Rule shape:
//   { type: 'scriptHost' | 'urlSubstring' | 'inlineRegex' | 'cookieName' | 'domRegex',
//     value: string | RegExp, confidence: 'high' | 'medium' }
//
// scriptHost   — hostname of a <script src> (exact or suffix match), matched against parsed URLs
// urlSubstring — substring anywhere in any src/href URL found on the page (script/link/iframe/img)
// inlineRegex  — regex tested against inline <script> body text
// cookieName   — exact cookie name from Set-Cookie (first-party only — third-party cookies aren't
//                visible to a server-side fetch, so this rule type will rarely fire; kept for completeness)
// domRegex     — regex tested against the raw HTML (meta tags, form actions, hidden fields, data-* attrs)

/** @typedef {{ type: string, value: string | RegExp, confidence: 'high' | 'medium' }} MatchRule */
/** @typedef {{ id: string, name: string, category: string, vendor: string, rules: MatchRule[] }} Signature */

const host = (value) => ({ type: 'scriptHost', value, confidence: 'high' });
const url = (value, confidence = 'high') => ({ type: 'urlSubstring', value, confidence });
const inline = (value, confidence = 'medium') => ({ type: 'inlineRegex', value, confidence });
const cookie = (value, confidence = 'high') => ({ type: 'cookieName', value, confidence });
const dom = (value, confidence = 'medium') => ({ type: 'domRegex', value, confidence });

/** @type {Signature[]} */
export const SIGNATURES = [
  // ---- Tag management ----
  { id: 'gtm', name: 'Google Tag Manager', category: 'Tag Management', vendor: 'Google', rules: [
    host('googletagmanager.com'), inline(/GTM-[A-Z0-9]+/), dom(/GTM-[A-Z0-9]+/) ] },
  { id: 'tealium', name: 'Tealium', category: 'Tag Management', vendor: 'Tealium', rules: [
    host('tags.tiqcdn.com'), url('tealium'), inline(/utag\.js|utag_data/) ] },
  { id: 'segment', name: 'Segment', category: 'Tag Management', vendor: 'Twilio', rules: [
    host('cdn.segment.com'), inline(/analytics\.load\(["']/), inline(/window\.analytics\s*=/) ] },

  // ---- Analytics ----
  { id: 'ga4', name: 'Google Analytics 4', category: 'Analytics', vendor: 'Google', rules: [
    host('www.googletagmanager.com'), url('gtag/js?id=G-'), inline(/gtag\(['"]config['"],\s*['"]G-/), cookie('_ga') ] },
  { id: 'universal-analytics', name: 'Universal Analytics (legacy)', category: 'Analytics', vendor: 'Google', rules: [
    host('www.google-analytics.com'), url('analytics.js'), inline(/ga\(['"]create['"],\s*['"]UA-/), cookie('_gat') ] },
  { id: 'adobe-analytics', name: 'Adobe Analytics', category: 'Analytics', vendor: 'Adobe', rules: [
    url('/AppMeasurement.js'), inline(/s_account\s*=|AppMeasurement/), dom(/omniture|sitecatalyst/i, 'medium') ] },
  { id: 'amplitude', name: 'Amplitude', category: 'Analytics', vendor: 'Amplitude', rules: [
    host('cdn.amplitude.com'), inline(/amplitude\.getInstance\(\)|amplitude\.init\(/) ] },
  { id: 'mixpanel', name: 'Mixpanel', category: 'Analytics', vendor: 'Mixpanel', rules: [
    host('cdn.mxpnl.com'), inline(/mixpanel\.init\(/) ] },
  { id: 'heap', name: 'Heap', category: 'Analytics', vendor: 'Heap', rules: [
    host('cdn.heapanalytics.com'), inline(/heap\.load\(/) ] },
  { id: 'plausible', name: 'Plausible', category: 'Analytics', vendor: 'Plausible', rules: [
    url('plausible.io/js/script'), dom(/data-domain=.+plausible/i) ] },
  { id: 'fathom', name: 'Fathom Analytics', category: 'Analytics', vendor: 'Fathom', rules: [
    host('cdn.usefathom.com'), dom(/data-site=.+fathom/i) ] },

  // ---- Marketing automation ----
  { id: 'marketo', name: 'Marketo', category: 'Marketing Automation', vendor: 'Adobe', rules: [
    url('munchkin.js'), inline(/Munchkin\.init\(/), cookie('_mkto_trk') ] },
  { id: 'hubspot', name: 'HubSpot', category: 'Marketing Automation', vendor: 'HubSpot', rules: [
    host('js.hs-scripts.com'), host('js.hs-analytics.net'), host('js.hubspot.com'), cookie('hubspotutk') ] },
  { id: 'pardot', name: 'Pardot / Account Engagement', category: 'Marketing Automation', vendor: 'Salesforce', rules: [
    url('pardot.com'), url('pi.pardot.com'), inline(/piAId\s*=|piCId\s*=/) ] },
  { id: 'eloqua', name: 'Eloqua', category: 'Marketing Automation', vendor: 'Oracle', rules: [
    url('eloqua.com'), inline(/elqCustomerGUID|_elqQ\.push/) ] },
  { id: 'customerio', name: 'Customer.io', category: 'Marketing Automation', vendor: 'Customer.io', rules: [
    host('cdp.customer.io'), inline(/_cio\.identify\(/) ] },
  { id: 'klaviyo', name: 'Klaviyo', category: 'Marketing Automation', vendor: 'Klaviyo', rules: [
    host('static.klaviyo.com'), inline(/klaviyo\.push\(|learnq\.push\(/) ] },
  { id: 'braze', name: 'Braze', category: 'Marketing Automation', vendor: 'Braze', rules: [
    host('js.appboycdn.com'), host('sdk.iad-06.braze.com'), inline(/appboy\.initialize\(|braze\.initialize\(/) ] },

  // ---- CRM / forms ----
  { id: 'sf-web-to-lead', name: 'Salesforce Web-to-Lead', category: 'CRM / Forms', vendor: 'Salesforce', rules: [
    dom(/action=["'][^"']*salesforce\.com\/servlet\/servlet\.WebToLead/i, 'high') ] },
  { id: 'hubspot-forms', name: 'HubSpot Forms', category: 'CRM / Forms', vendor: 'HubSpot', rules: [
    inline(/hbspt\.forms\.create\(/), url('js.hsforms.net') ] },
  { id: 'marketo-forms', name: 'Marketo Forms', category: 'CRM / Forms', vendor: 'Adobe', rules: [
    inline(/MktoForms2\.loadForm\(/) ] },
  { id: 'formstack', name: 'Formstack', category: 'CRM / Forms', vendor: 'Formstack', rules: [
    url('formstack.com'), dom(/action=["'][^"']*formstack\.com/i) ] },
  { id: 'typeform', name: 'Typeform', category: 'CRM / Forms', vendor: 'Typeform', rules: [
    host('embed.typeform.com'), dom(/data-tf-widget|typeform\.com\/to\//i) ] },

  // ---- ABM / intent ----
  { id: '6sense', name: '6sense', category: 'ABM / Intent', vendor: '6sense', rules: [
    url('j.6sc.co'), inline(/_6senseInit|sixsense/) ] },
  { id: 'demandbase', name: 'Demandbase', category: 'ABM / Intent', vendor: 'Demandbase', rules: [
    url('demandbase.com'), inline(/demandbase/i, 'medium') ] },
  { id: 'bombora', name: 'Bombora', category: 'ABM / Intent', vendor: 'Bombora', rules: [
    url('bombora.com'), url('cdn.bombora.com') ] },
  { id: 'rollworks', name: 'RollWorks', category: 'ABM / Intent', vendor: 'RollWorks', rules: [
    url('rollworks.com'), inline(/rollworks/i, 'medium') ] },
  { id: 'clearbit', name: 'Clearbit', category: 'ABM / Intent', vendor: 'HubSpot (Clearbit)', rules: [
    host('x.clearbitjs.com'), inline(/clearbit\.js/) ] },

  // ---- Experimentation / personalization ----
  { id: 'optimizely', name: 'Optimizely', category: 'Experimentation', vendor: 'Optimizely', rules: [
    host('cdn.optimizely.com'), inline(/optimizely\.push\(/) ] },
  { id: 'vwo', name: 'VWO', category: 'Experimentation', vendor: 'Wingify', rules: [
    host('dev.visualwebsiteoptimizer.com'), inline(/_vwo_code|VWO\.push\(/) ] },
  { id: 'google-optimize', name: 'Google Optimize (remnant)', category: 'Experimentation', vendor: 'Google', rules: [
    url('optimize.js'), inline(/GoogleOptimize|OPT-[A-Z0-9]+/) ] },
  { id: 'kameleoon', name: 'Kameleoon', category: 'Experimentation', vendor: 'Kameleoon', rules: [
    host('static.kameleoon.com'), inline(/Kameleoon\.API/) ] },

  // ---- Session / UX ----
  { id: 'hotjar', name: 'Hotjar', category: 'Session / UX', vendor: 'Hotjar', rules: [
    host('static.hotjar.com'), inline(/hjid\s*:|hotjar/i) ] },
  { id: 'fullstory', name: 'FullStory', category: 'Session / UX', vendor: 'FullStory', rules: [
    host('edge.fullstory.com'), inline(/window\['_fs_debug'\]|FS\.identify\(/) ] },
  { id: 'clarity', name: 'Microsoft Clarity', category: 'Session / UX', vendor: 'Microsoft', rules: [
    host('www.clarity.ms'), inline(/clarity\(["']set["']/) ] },
  { id: 'quantum-metric', name: 'Quantum Metric', category: 'Session / UX', vendor: 'Quantum Metric', rules: [
    url('quantummetric.com'), inline(/QuantumMetricAPI/) ] },

  // ---- Ad pixels ----
  { id: 'meta-pixel', name: 'Meta Pixel', category: 'Ad Pixels', vendor: 'Meta', rules: [
    host('connect.facebook.net'), inline(/fbq\(['"]init['"]/), url('facebook.com/tr?') ] },
  { id: 'linkedin-insight', name: 'LinkedIn Insight Tag', category: 'Ad Pixels', vendor: 'LinkedIn', rules: [
    host('snap.licdn.com'), inline(/_linkedin_partner_id/) ] },
  { id: 'google-ads', name: 'Google Ads Conversion Tag', category: 'Ad Pixels', vendor: 'Google', rules: [
    url('googleadservices.com'), inline(/gtag\(['"]config['"],\s*['"]AW-/) ] },
  { id: 'tiktok-pixel', name: 'TikTok Pixel', category: 'Ad Pixels', vendor: 'TikTok', rules: [
    host('analytics.tiktok.com'), inline(/ttq\.load\(/) ] },
  { id: 'reddit-pixel', name: 'Reddit Pixel', category: 'Ad Pixels', vendor: 'Reddit', rules: [
    host('www.redditstatic.com'), inline(/rdt\(['"]init['"]/) ] },
  { id: 'x-pixel', name: 'X (Twitter) Pixel', category: 'Ad Pixels', vendor: 'X', rules: [
    host('static.ads-twitter.com'), inline(/twq\(['"]init['"]/) ] },

  // ---- Chat / scheduling ----
  { id: 'drift', name: 'Drift', category: 'Chat / Scheduling', vendor: 'Drift', rules: [
    host('js.driftt.com'), inline(/drift\.load\(/) ] },
  { id: 'intercom', name: 'Intercom', category: 'Chat / Scheduling', vendor: 'Intercom', rules: [
    host('widget.intercom.io'), inline(/Intercom\(['"]boot['"]/) ] },
  { id: 'qualified', name: 'Qualified', category: 'Chat / Scheduling', vendor: 'Qualified', rules: [
    url('qualified.com'), inline(/Qualified\(/) ] },
  { id: 'chili-piper', name: 'Chili Piper', category: 'Chat / Scheduling', vendor: 'Chili Piper', rules: [
    host('js.chilipiper.com'), inline(/ChiliPiper\.submit\(/) ] },
  { id: 'calendly', name: 'Calendly', category: 'Chat / Scheduling', vendor: 'Calendly', rules: [
    host('assets.calendly.com'), dom(/calendly\.com\/[a-z0-9-]+/i, 'medium') ] },

  // ---- Consent ----
  { id: 'onetrust', name: 'OneTrust', category: 'Consent', vendor: 'OneTrust', rules: [
    host('cdn.cookielaw.org'), dom(/data-domain-script.*onetrust/i) ] },
  { id: 'cookiebot', name: 'Cookiebot', category: 'Consent', vendor: 'Cybot', rules: [
    host('consent.cookiebot.com'), dom(/data-cbid=/) ] },
  { id: 'osano', name: 'Osano', category: 'Consent', vendor: 'Osano', rules: [
    host('cmp.osano.com') ] },
  { id: 'trustarc', name: 'TrustArc', category: 'Consent', vendor: 'TrustArc', rules: [
    host('consent.trustarc.com'), url('trustarc.com') ] },

  // ---- CMS / platform ----
  { id: 'contentful', name: 'Contentful', category: 'CMS / Platform', vendor: 'Contentful', rules: [
    url('cdn.contentful.com'), url('images.ctfassets.net') ] },
  { id: 'webflow', name: 'Webflow', category: 'CMS / Platform', vendor: 'Webflow', rules: [
    dom(/data-wf-site=|data-wf-page=/), url('assets-global.website-files.com') ] },
  { id: 'wordpress', name: 'WordPress', category: 'CMS / Platform', vendor: 'Automattic', rules: [
    dom(/wp-content|wp-includes/i), dom(/name=["']generator["']\s+content=["']WordPress/i, 'high') ] },
  { id: 'sitecore', name: 'Sitecore', category: 'CMS / Platform', vendor: 'Sitecore', rules: [
    dom(/sitecore_/i), dom(/\/-\/media\//) ] },
  { id: 'storyblok', name: 'Storyblok', category: 'CMS / Platform', vendor: 'Storyblok', rules: [
    url('a.storyblok.com'), inline(/storyblok/i, 'medium') ] },
  { id: 'sanity', name: 'Sanity', category: 'CMS / Platform', vendor: 'Sanity', rules: [
    url('cdn.sanity.io') ] },
  { id: 'hubspot-cms', name: 'HubSpot CMS', category: 'CMS / Platform', vendor: 'HubSpot', rules: [
    dom(/name=["']generator["']\s+content=["']HubSpot/i, 'high') ] },
  { id: 'shopify', name: 'Shopify', category: 'CMS / Platform', vendor: 'Shopify', rules: [
    url('cdn.shopify.com'), inline(/Shopify\.shop\s*=/), dom(/name=["']shopify-checkout-api-token["']/i) ] },
];
