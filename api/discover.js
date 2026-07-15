var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// functions-src/discover.ts
var discover_exports = {};
__export(discover_exports, {
  default: () => handler,
  maxDuration: () => maxDuration
});
module.exports = __toCommonJS(discover_exports);

// src/engines/live/ats/types.ts
var defaultFetcher = async (url) => {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
};
var ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&nbsp;": " ",
  "&rsquo;": "\u2019",
  "&lsquo;": "\u2018",
  "&mdash;": "\u2014",
  "&ndash;": "\u2013"
};
function htmlToText(html) {
  if (!html) return "";
  let s = html;
  for (let pass = 0; pass < 2; pass++) {
    s = s.replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? e);
  }
  return s.replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();
}
function formatMonthYear(input) {
  if (input === null || input === void 0 || input === "") return "Unknown";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
function looksRemote(location, flag) {
  if (flag === true) return true;
  return /\bremote\b/i.test(location || "");
}

// src/engines/live/ats/ashby.ts
function ashbyUrl(slug) {
  return `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true`;
}
async function fetchAshby(company, slug, fetchJson) {
  const data = await fetchJson(ashbyUrl(slug));
  const jobs = (data.jobs ?? []).filter((j) => j.isListed !== false);
  return jobs.map((j) => {
    const location = j.location ?? "Unknown";
    return {
      externalId: j.id,
      company,
      role: j.title ?? "Unknown",
      location,
      remote: looksRemote(location, j.isRemote),
      url: j.jobUrl ?? "",
      postedDate: formatMonthYear(j.publishedAt),
      salary: j.compensation?.compensationTierSummary || void 0,
      descriptionText: j.descriptionPlain || htmlToText(j.descriptionHtml ?? "")
    };
  });
}

// src/engines/live/ats/greenhouse.ts
function greenhouseUrl(slug) {
  return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`;
}
async function fetchGreenhouse(company, slug, fetchJson) {
  const data = await fetchJson(greenhouseUrl(slug));
  const jobs = data.jobs ?? [];
  return jobs.map((j) => {
    const location = j.location?.name ?? "Unknown";
    return {
      externalId: String(j.id),
      company,
      role: j.title ?? "Unknown",
      location,
      remote: looksRemote(location),
      url: j.absolute_url ?? "",
      postedDate: formatMonthYear(j.updated_at),
      descriptionText: htmlToText(j.content ?? "")
    };
  });
}

// src/engines/live/ats/lever.ts
function leverUrl(slug) {
  return `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
}
function formatSalary(r) {
  if (!r || r.min == null || r.max == null) return void 0;
  const k = (n) => `$${Math.round(n / 1e3)}k`;
  return `${k(r.min)}\u2013${k(r.max)}`;
}
async function fetchLever(company, slug, fetchJson) {
  const data = await fetchJson(leverUrl(slug));
  const postings = Array.isArray(data) ? data : [];
  return postings.map((p) => {
    const location = p.categories?.location ?? "Unknown";
    const listsText = (p.lists ?? []).map((l) => `${l.text ?? ""} ${htmlToText(l.content ?? "")}`).join("\n");
    const description = [
      p.descriptionPlain ?? htmlToText(p.description ?? ""),
      listsText,
      p.additionalPlain ?? ""
    ].filter(Boolean).join("\n");
    return {
      externalId: p.id,
      company,
      role: p.text ?? "Unknown",
      location,
      remote: looksRemote(location, p.workplaceType?.toLowerCase() === "remote"),
      url: p.hostedUrl ?? "",
      postedDate: formatMonthYear(p.createdAt),
      salary: formatSalary(p.salaryRange),
      descriptionText: description
    };
  });
}

// src/engines/live/companies.seed.ts
var SEED_COMPANIES = [
  // ---- Greenhouse ----
  { name: "Stripe", ats: "greenhouse", slug: "stripe", industry: "fintech" },
  { name: "Airbnb", ats: "greenhouse", slug: "airbnb", industry: "travel" },
  { name: "GitLab", ats: "greenhouse", slug: "gitlab", industry: "devtools" },
  { name: "Figma", ats: "greenhouse", slug: "figma", industry: "productivity" },
  { name: "Databricks", ats: "greenhouse", slug: "databricks", industry: "data-ai" },
  { name: "Coinbase", ats: "greenhouse", slug: "coinbase", industry: "crypto" },
  { name: "Robinhood", ats: "greenhouse", slug: "robinhood", industry: "fintech" },
  { name: "Dropbox", ats: "greenhouse", slug: "dropbox", industry: "productivity" },
  { name: "Reddit", ats: "greenhouse", slug: "reddit", industry: "social" },
  { name: "Brex", ats: "greenhouse", slug: "brex", industry: "fintech" },
  { name: "Instacart", ats: "greenhouse", slug: "instacart", industry: "ecommerce" },
  { name: "DoorDash", ats: "greenhouse", slug: "doordash", industry: "ecommerce" },
  { name: "Pinterest", ats: "greenhouse", slug: "pinterest", industry: "social" },
  { name: "Cloudflare", ats: "greenhouse", slug: "cloudflare", industry: "security" },
  { name: "Samsara", ats: "greenhouse", slug: "samsara", industry: "iot" },
  { name: "Benchling", ats: "greenhouse", slug: "benchling", industry: "healthtech" },
  { name: "Gusto", ats: "greenhouse", slug: "gusto", industry: "hr-tech" },
  { name: "Airtable", ats: "greenhouse", slug: "airtable", industry: "productivity" },
  // ---- Lever ----
  { name: "Netflix", ats: "lever", slug: "netflix", industry: "media" },
  { name: "Plaid", ats: "lever", slug: "plaid", industry: "fintech" },
  { name: "Attentive", ats: "lever", slug: "attentive", industry: "martech" },
  { name: "KeepTruckin", ats: "lever", slug: "motive", industry: "logistics" },
  { name: "Sourcegraph", ats: "lever", slug: "sourcegraph", industry: "devtools" },
  { name: "Lattice", ats: "lever", slug: "lattice", industry: "hr-tech" },
  { name: "Ramp", ats: "lever", slug: "ramp", industry: "fintech" },
  { name: "Whatnot", ats: "lever", slug: "whatnot", industry: "ecommerce" },
  { name: "Fivetran", ats: "lever", slug: "fivetran", industry: "data-ai" },
  { name: "Included Health", ats: "lever", slug: "includedhealth", industry: "healthtech" },
  // ---- Ashby ----
  { name: "Linear", ats: "ashby", slug: "linear", industry: "devtools" },
  { name: "Vercel", ats: "ashby", slug: "vercel", industry: "devtools" },
  { name: "Replit", ats: "ashby", slug: "replit", industry: "devtools" },
  { name: "Mercury", ats: "ashby", slug: "mercury", industry: "fintech" },
  { name: "PostHog", ats: "ashby", slug: "posthog", industry: "devtools" },
  { name: "Hex", ats: "ashby", slug: "hex", industry: "data-ai" },
  { name: "Baseten", ats: "ashby", slug: "baseten", industry: "data-ai" },
  { name: "Watershed", ats: "ashby", slug: "watershed", industry: "climate" },
  { name: "Modal", ats: "ashby", slug: "modal", industry: "data-ai" },
  { name: "Clerk", ats: "ashby", slug: "clerk", industry: "devtools" },
  { name: "Resend", ats: "ashby", slug: "resend", industry: "devtools" },
  { name: "Cursor", ats: "ashby", slug: "anysphere", industry: "devtools" }
];

// src/engines/live/companySource.ts
var seedCompanySource = {
  companiesFor: () => SEED_COMPANIES
};

// src/engines/location.ts
var LOCAL_BOOST = 4;
var NEARBY_PENALTY = 8;
var FAR_ONSITE_PENALTY = 14;
var FAR_HYBRID_PENALTY = 24;
var MODE_WORDS = /\b(remote|hybrid|onsite|on-site|in-office|in office)\b/gi;
function isHybrid(location) {
  return /\bhybrid\b/i.test(location);
}
function segments(loc) {
  return loc.toLowerCase().replace(MODE_WORDS, " ").split(/[,•|;/]/).map((s) => s.trim()).filter(Boolean);
}
function locationFit(resume, job) {
  const hybrid = isHybrid(job.location);
  if (job.remote && !hybrid) return { include: true, penalty: 0 };
  const resumeLoc = resume.location.trim().toLowerCase();
  const remotePreferred = resumeLoc === "" || /\bremote\b/.test(resumeLoc);
  const candSegs = remotePreferred ? [] : segments(resume.location);
  const candCity = candSegs[0] ?? "";
  const candRegion = candSegs[1] ?? "";
  const jobSegs = segments(job.location);
  const jobLoc = jobSegs.join(" , ");
  const local = candCity.length >= 3 && jobLoc.includes(candCity);
  const nearby = !local && candRegion.length >= 2 && jobSegs.includes(candRegion);
  const label = hybrid ? "Hybrid" : "Onsite";
  if (local) {
    return {
      include: true,
      penalty: -LOCAL_BOOST,
      note: hybrid ? "Hybrid, in your area \u2014 close to home." : void 0
    };
  }
  if (nearby) {
    return {
      include: true,
      penalty: NEARBY_PENALTY,
      note: `${label} near you (${job.location}) \u2014 a doable commute.`
    };
  }
  if (resume.onsite_ok) {
    return {
      include: true,
      penalty: hybrid ? FAR_HYBRID_PENALTY : FAR_ONSITE_PENALTY,
      note: hybrid ? `Hybrid in ${job.location} \u2014 far from you; you'd need to be onsite there regularly.` : remotePreferred ? "Onsite role \u2014 shown because you\u2019re open to onsite, ranked below remote fits." : `Onsite in ${job.location} \u2014 outside your area, so it\u2019s ranked lower.`
    };
  }
  return { include: false, penalty: 0 };
}

// src/engines/taxonomy.ts
var FAMILY_ADJACENCY = {
  // engineering
  frontend: ["fullstack", "mobile"],
  backend: ["fullstack", "data", "devops"],
  fullstack: ["frontend", "backend", "mobile"],
  mobile: ["frontend", "fullstack"],
  data: ["backend", "ml"],
  ml: ["data"],
  devops: ["backend"],
  // non-engineering
  sales: ["marketing", "customer"],
  marketing: ["sales", "product"],
  product: ["marketing", "design"],
  design: ["product"],
  customer: ["sales"],
  operations: [],
  finance: [],
  people: []
};
function familiesAdjacent(a, b) {
  const fa = a.trim().toLowerCase();
  const fb = b.trim().toLowerCase();
  return (FAMILY_ADJACENCY[fa] ?? []).includes(fb);
}
function familyRelated(a, b) {
  const fa = a.trim().toLowerCase();
  const fb = b.trim().toLowerCase();
  if (fa === "other" || fb === "other") return false;
  return fa === fb || familiesAdjacent(fa, fb);
}
var FAMILY_KEYWORDS = [
  // Engineering (specific first)
  ["frontend", ["front end", "frontend", "front-end", "ui engineer", "web engineer"]],
  ["fullstack", ["full stack", "fullstack", "full-stack"]],
  ["backend", ["back end", "backend", "back-end", "server", "platform engineer", "api engineer"]],
  ["mobile", ["mobile", "ios", "android", "react native"]],
  ["data", ["data engineer", "data scientist", "analytics engineer", "data science"]],
  ["ml", ["machine learning", "ml engineer", "ai engineer", "applied scientist"]],
  ["devops", ["devops", "sre", "site reliability", "infrastructure", "platform reliability"]],
  // Non-engineering — checked before the generic "engineer" fallback below.
  ["product", ["product manager", "product owner", "head of product", "director of product", "vp of product", "group product"]],
  ["marketing", ["marketing", "growth", "demand gen", "brand", "content", "seo", "communications"]],
  ["sales", ["sales", "account executive", "account manager", "business development", "go to market", "go-to-market", "gtm", "revenue", "partnerships"]],
  ["design", ["designer", "ux", "ui/ux", "user experience", "product design", "brand design"]],
  ["customer", ["customer success", "customer support", "account management", "implementation", "onboarding"]],
  ["operations", ["operations", "program manager", "project manager", "chief of staff", "business operations", "strategy"]],
  ["finance", ["finance", "accounting", "controller", "fp&a", "financial analyst", "treasury"]],
  ["people", ["recruiter", "recruiting", "talent", "human resources", "people operations", "people ops"]]
];
var LEVEL_KEYWORDS = [
  ["principal", ["principal", "distinguished"]],
  ["staff", ["staff"]],
  ["lead", ["lead", "tech lead"]],
  ["manager", ["manager", "head of", "director"]],
  ["senior", ["senior", "sr.", "sr "]],
  ["junior", ["junior", "jr.", "jr ", "entry", "associate", "new grad", "graduate"]]
];
function inferFamily(title) {
  const t = title.toLowerCase();
  for (const [family, keys] of FAMILY_KEYWORDS) {
    if (keys.some((k) => t.includes(k))) return family;
  }
  if (/\b(software|swe|developer|engineer|engineering|programmer)\b/.test(t)) return "fullstack";
  return "other";
}
function inferLevel(title) {
  const t = ` ${title.toLowerCase()} `;
  for (const [level, keys] of LEVEL_KEYWORDS) {
    if (keys.some((k) => t.includes(k))) return level;
  }
  return "mid";
}

// src/engines/synonymMap.ts
var SYNONYMS = {
  sql: ["t-sql", "transact-sql"],
  // generic SQL only
  "sql-server": ["mssql", "sql server", "pl/sql"],
  // separate from generic sql & mysql
  mysql: ["my sql"],
  react: ["react.js", "reactjs"],
  "react-native": ["react native", "rn"],
  typescript: ["ts"],
  javascript: ["js", "ecmascript"],
  gcp: ["google cloud", "google cloud platform"],
  aws: ["amazon web services"],
  dynamics365: ["d365", "ms dynamics", "dynamics crm", "dynamics 365"],
  "power bi": ["powerbi", "pbi"],
  k8s: ["kubernetes"],
  "shopify-hydrogen": ["hydrogen", "shopify hydrogen"],
  "design-systems": ["design system", "design systems"],
  graphql: ["graph ql"],
  nextjs: ["next.js", "next js"],
  "node": ["node.js", "nodejs"]
};
var ALIAS_TO_CANONICAL = (() => {
  const map = {};
  for (const [canonical, aliases] of Object.entries(SYNONYMS)) {
    map[canonical] = canonical;
    for (const alias of aliases) map[clean(alias)] = canonical;
  }
  return map;
})();
function clean(raw) {
  return raw.toLowerCase().replace(/\bv?\d+(\.\d+)*\b/g, " ").replace(/[._/]+/g, " ").replace(/[^a-z0-9+#\- ]+/g, " ").replace(/\s+/g, " ").trim();
}
function scanSkills(text) {
  const hay = ` ${clean(text)} `;
  const found = /* @__PURE__ */ new Set();
  for (const [canonical, aliases] of Object.entries(SYNONYMS)) {
    const phrases = [clean(canonical.replace(/-/g, " ")), ...aliases.map(clean)];
    for (const ph of phrases) {
      if (ph && hay.includes(` ${ph} `)) {
        found.add(canonical);
        break;
      }
    }
  }
  return [...found];
}

// src/engines/live/jdKeywordParser.ts
var PREFERRED_MARKERS = [
  "nice to have",
  "nice-to-have",
  "preferred qualifications",
  "preferred:",
  "bonus points",
  "bonus:",
  "a plus",
  "pluses",
  "nice if",
  "good to have"
];
var CLEARANCE_MARKERS = [
  "security clearance",
  "active clearance",
  "ts/sci",
  "top secret",
  "must be a us citizen",
  "u.s. citizenship required",
  "us citizenship required"
];
function preferredSplit(lower) {
  let idx = -1;
  for (const m of PREFERRED_MARKERS) {
    const i = lower.indexOf(m);
    if (i >= 0 && (idx === -1 || i < idx)) idx = i;
  }
  return idx;
}
function maxYears(text) {
  let max = 0;
  const re = /(\d{1,2})\s*\+?\s*(?:years|yrs)\b/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    if (n > max && n <= 20) max = n;
  }
  return max;
}
function parseJDText(title, description) {
  const family = inferFamily(title);
  const level = inferLevel(title);
  const text = description || "";
  const lower = text.toLowerCase();
  const splitAt = preferredSplit(lower);
  const requiredText = splitAt >= 0 ? text.slice(0, splitAt) : text;
  const preferredText = splitAt >= 0 ? text.slice(splitAt) : "";
  const hardCanon = scanSkills(requiredText);
  const preferredCanon = scanSkills(preferredText).filter((s) => !hardCanon.includes(s));
  const overall = maxYears(text);
  const perSkillBar = ["senior", "staff", "lead", "principal"].includes(level) ? 3 : 2;
  const hard_required_skills = hardCanon.map((canonical) => ({
    canonical,
    min_years: perSkillBar
  }));
  const dealbreakers = [];
  if (CLEARANCE_MARKERS.some((m) => lower.includes(m))) {
    dealbreakers.push({ type: "clearance", value: "Security clearance", hard: true });
  }
  return {
    title: { family, level },
    hard_required_skills,
    preferred_skills: preferredCanon,
    min_years_total: overall,
    dealbreakers
  };
}

// src/engines/live/filter.ts
function searchTermsFrom(resume) {
  const families = resume.titles.map((t) => t.family.toLowerCase());
  const location = resume.location.trim();
  const wantsRemote = /remote/i.test(location);
  return { families: families.length ? families : ["other"], location, wantsRemote };
}
var GENERIC_TITLE_WORDS = /* @__PURE__ */ new Set([
  "senior",
  "sr",
  "junior",
  "jr",
  "staff",
  "lead",
  "principal",
  "director",
  "manager",
  "head",
  "chief",
  "vp",
  "president",
  "associate",
  "intern",
  "of",
  "and",
  "the",
  "for",
  "to",
  "a",
  "an",
  "in",
  "at",
  "i",
  "ii",
  "iii",
  "iv",
  // role suffixes — they say the seniority/shape, not the KIND of work, so two
  // roles sharing only "engineer" or "manager" are not therefore related.
  "engineer",
  "engineering",
  "developer",
  "dev",
  "specialist",
  "coordinator",
  "analyst"
]);
function distinctiveWords(title) {
  return new Set(
    title.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !GENERIC_TITLE_WORDS.has(w))
  );
}
function titleOverlap(resume, postingRole) {
  const r\u00E9sum\u00E9Words = /* @__PURE__ */ new Set();
  resume.titles.forEach((t) => distinctiveWords(t.raw).forEach((w) => r\u00E9sum\u00E9Words.add(w)));
  for (const w of distinctiveWords(postingRole)) {
    if (r\u00E9sum\u00E9Words.has(w)) return true;
  }
  return false;
}
function isRelevant(resume, posting) {
  const { families } = searchTermsFrom(resume);
  const postingFamily = parseJDText(posting.role, posting.descriptionText).title.family;
  const familyOk = families.some((f) => familyRelated(f, postingFamily));
  const relevant = familyOk || titleOverlap(resume, posting.role);
  return relevant && locationFit(resume, posting).include;
}

// src/engines/industry.ts
var INDUSTRY_KEYWORDS = [
  ["crypto", ["crypto", "cryptocurrency", "blockchain", "web3", "defi", "digital asset", "nft"]],
  ["fintech", [
    "fintech",
    "financial",
    "finance",
    "banking",
    "neobank",
    "payments",
    "payment",
    "lending",
    "loan",
    "mortgage",
    "insurance",
    "insurtech",
    "trading",
    "brokerage",
    "wealth",
    "credit",
    "accounting",
    "treasury",
    "capital markets"
  ]],
  ["healthtech", [
    "healthtech",
    "healthcare",
    "health care",
    "clinical",
    "biotech",
    "pharma",
    "pharmaceutical",
    "medical",
    "medicine",
    "life sciences",
    "telehealth",
    "digital health",
    "patient",
    "hospital",
    "genomics"
  ]],
  ["edtech", ["edtech", "education", "e-learning", "learning platform", "student", "university", "k-12", "tutoring"]],
  ["climate", ["climate", "sustainability", "clean energy", "renewable", "carbon", "decarbon", "esg", "solar", "cleantech"]],
  ["hr-tech", ["hr tech", "human resources", "hris", "payroll", "people ops", "recruiting", "talent acquisition", "benefits admin", "workforce"]],
  ["martech", ["martech", "marketing", "advertising", "adtech", "ad tech", "growth marketing", "email marketing", "customer engagement", "campaign"]],
  ["logistics", ["logistics", "supply chain", "freight", "trucking", "fleet", "shipping", "transportation", "warehouse", "last mile"]],
  ["security", ["cybersecurity", "cyber security", "infosec", "information security", "network security", "cloud security", "zero trust", "threat", "firewall"]],
  ["iot", ["internet of things", "iot", "hardware", "sensors", "connected device", "embedded", "robotics", "telematics"]],
  ["proptech", ["proptech", "real estate", "property", "housing", "rental", "construction"]],
  ["govtech", ["govtech", "government", "public sector", "civic", "defense", "gov"]],
  ["travel", ["travel", "hospitality", "tourism", "lodging", "airline", "booking", "vacation", "hotels"]],
  ["ecommerce", ["e-commerce", "ecommerce", "retail", "marketplace", "commerce", "shopping", "consumer goods", "dtc", "direct-to-consumer", "grocery", "delivery", "merchant"]],
  ["media", ["media", "entertainment", "streaming", "video", "gaming", "games", "film", "music", "publishing", "content platform"]],
  ["social", ["social media", "social network", "social platform", "consumer social", "community platform", "creator"]],
  ["data-ai", ["machine learning", "artificial intelligence", "data platform", "data warehouse", "data infrastructure", "analytics", "big data", "mlops", "data science", "llm", "ai"]],
  ["devtools", ["developer tools", "developer platform", "devtools", "devops", "ci/cd", "api platform", "developer experience", "open source", "software development", "infrastructure software"]],
  ["productivity", ["productivity", "collaboration", "workplace software", "project management", "note-taking", "document management", "team communication"]]
];
function norm(text) {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}
function canonicalizeIndustry(raw) {
  const s = norm(raw);
  for (const [tag, words] of INDUSTRY_KEYWORDS) {
    for (const w of words) {
      const nw = norm(w).trim();
      if (nw && s.includes(` ${nw} `)) return tag;
    }
  }
  return null;
}
function inferIndustryFromText(text) {
  return canonicalizeIndustry(text);
}

// src/engines/live/liveDiscovery.ts
async function fetchBoard(c, fetchJson) {
  if (c.ats === "greenhouse") return fetchGreenhouse(c.name, c.slug, fetchJson);
  if (c.ats === "lever") return fetchLever(c.name, c.slug, fetchJson);
  return fetchAshby(c.name, c.slug, fetchJson);
}
function toRawPosting(c, p) {
  return {
    id: `${c.ats}:${c.slug}:${p.externalId}`,
    company: p.company,
    role: p.role,
    location: p.location,
    remote: p.remote,
    link: p.url,
    postedDate: p.postedDate,
    salary: p.salary,
    description: p.descriptionText,
    // The company's own domain is the authoritative industry signal; only fall
    // back to sniffing the posting text if a company somehow carries no tag.
    industry: c.industry ?? inferIndustryFromText(`${p.role} ${p.descriptionText}`) ?? void 0,
    // It's currently listed on the company's own ATS → that IS the liveness
    // confirmation. One authoritative source is enough (Engine 4 spec).
    sourceType: "company-ats",
    livenessEvidence: "confirmed-open",
    jd: parseJDText(p.role, p.descriptionText)
  };
}
function createLiveDiscovery(opts = {}) {
  const companySource = opts.companySource ?? seedCompanySource;
  const fetchJson = opts.fetchJson ?? defaultFetcher;
  return {
    async findPostings(resume) {
      const companies = companySource.companiesFor(resume);
      const boards = await Promise.allSettled(
        companies.map((c) => fetchBoard(c, fetchJson))
      );
      const raw = [];
      boards.forEach((result, i) => {
        const c = companies[i];
        if (result.status === "rejected") {
          opts.onSkip?.(c, String(result.reason?.message ?? result.reason));
          return;
        }
        for (const p of result.value) {
          if (isRelevant(resume, p)) raw.push(toRawPosting(c, p));
        }
      });
      return raw;
    }
  };
}

// functions-src/discover.ts
var maxDuration = 60;
async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    const resume = req.body?.resume;
    if (!resume || !Array.isArray(resume.titles) || resume.titles.length === 0) {
      res.status(400).json({ error: "Missing a parsed r\xE9sum\xE9." });
      return;
    }
    const discovery = createLiveDiscovery({
      onSkip: (c, reason) => console.warn(`discover: skipped ${c.slug} \u2014 ${reason}`)
    });
    const postings = await discovery.findPostings(resume);
    console.info(`discover: ${postings.length} raw postings returned (pre-rank)`);
    res.status(200).json({ postings });
  } catch (err) {
    console.error("discover failed:", err);
    const message = err instanceof Error ? err.message : "Job discovery is temporarily unavailable.";
    res.status(500).json({ error: message });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  maxDuration
});
