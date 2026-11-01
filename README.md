# Organize Me! — organizeme.org

Website for **Organize Me!**, professional organizing in Georgia's Golden Isles (St. Simons Island, Sea Island, Jekyll Island, Brunswick).

A plain static site (HTML/CSS/JS, no build step) served by a small **Cloudflare Worker**, which also handles the Connect form and emails each submission to Jenn.

```
public/                  ← everything visitors see
  index.html             home (hero, space solutions, about, process, FAQs)
  connect.html           contact page + form            → /connect
  terms-of-service.html  terms                          → /terms-of-service
  *-organizing.html      one page per space: closet, bedroom, bathroom,
                         kitchen, pantry, kids-room     → /closet-organizing etc.
  404.html               not-found page
  assets/css/style.css   all styles (colors and fonts at the top)
  assets/js/main.js      menu, popups, form submit
  assets/fonts/          Montserrat, self-hosted
  images/                optimized photos and logos
  robots.txt, sitemap.xml, _headers
src/index.js             Worker: www → bare-domain redirect, POST /api/contact
wrangler.jsonc           Cloudflare config
```

## Editing

- **Text:** edit the HTML file for that page. The header and footer are repeated in each page, so a change to the menu, phone number or footer needs to be made in every `.html` file in `public/`.
- **Service pages:** each space has its own page (`/closet-organizing`, `/pantry-organizing`, …), linked from the home page cards, the footer and each other. If you add a page, also add it to `sitemap.xml` and the footer.
- **Images:** add to `public/images/` (WebP, about 800px wide for cards). Keep file names lowercase with dashes.
- **Colors and fonts:** CSS variables at the top of `public/assets/css/style.css`.
- **Who receives form emails:** `CONTACT_TO` in `wrangler.jsonc` (comma-separated; each address gets its own copy).

Every push to `main` deploys automatically once the repo is connected to Cloudflare (below).

## Run locally

```bash
npm install
npm run dev      # http://localhost:8787 (form emails are simulated locally and saved under .wrangler/tmp/email)
```

## One-time Cloudflare setup

1. **Add the domain to Cloudflare.** Cloudflare dashboard → Add a domain → `organizeme.org` (Free plan). Cloudflare imports the existing DNS records. **Check that the MX/TXT records for email came across** before going further. Then, at Dynadot, change the nameservers to the two Cloudflare gives you.
2. **Create the Worker from GitHub.** Workers & Pages → Create → Import a repository → `StarboardAgency/organizeme-site`. Build command: none; deploy command: `npx wrangler deploy`. You'll get a `*.workers.dev` preview URL.
3. **Contact form email.** Compute → Email Service → Email Sending → Onboard Domain → `organizeme.org`. This adds sending records (SPF/DKIM/DMARC and a `cf-bounce` subdomain) and does **not** change where Jenn's email is delivered. Sending to an outside address like `jenn@organizeme.org` requires the **Workers Paid** plan ($5/month).
4. **Go live.** Worker → Settings → Domains & Routes → add custom domains `organizeme.org` and `www.organizeme.org`. The Worker redirects `www` to the bare domain.
5. **Google.** In Search Console, submit `https://organizeme.org/sitemap.xml` and request indexing of the home page.

## Notes

- Spam protection on the form: hidden honeypot field plus a minimum fill time. Cloudflare Turnstile can be added later if spam gets through.
- The Bathrooms popup has **new copy** (the old Weblium site accidentally repeated the Closets text). Review it with Jenn.
- Space-card icons are custom line icons drawn for this site.
