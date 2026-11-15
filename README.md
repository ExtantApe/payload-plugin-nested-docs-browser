# payload-plugin-nested-docs-browser

Nested Docs Browser for Payload: browse large hierarchies in pages that adapt to how much is inside, with Show all on every shortened view, an A–Z index and saved groups over the tree.

**Status:** early, 0.x.
- **Tested:** 27 tests: the core, the Payload side against a real Payload 3.92 and MongoDB with a made-up reptile slice, and the React views in jsdom.
- **Real data:** tried read-only on a real taxonomy of 23,860 records. A level took 0.25 to 1.2 seconds before caching. In a real browser at 1280 and 375 px, with the lists open, axe found nothing.
- **Not tried yet:** inside a site, or with a screen reader.

## What it does

- **One level at a time, laid out to fit.** A few children get a gallery of large cards. A moderate number get a card grid, biggest first. Many get curated sections, or an index: the largest dozen, an A–Z bar and a compact list. Leaves (for a taxonomy, species) get cards. Thresholds are settings.
- **Nothing is ever hidden.** Every shortened view says how much it shows ("Showing the 12 largest of 276 genera") and has Show all. Show all opens a compact list in place: several columns of names and counts, sorted largest first or A–Z. Records with no leaves are listed in their own fold, never dropped.
- **Hidden by default, behind a switch.** For example fossils (`equals: 'extinct'`), or everything not confirmed (`notEquals: 'living'`). The switch says how many are hidden.
- **Live counts, cheaply.** Every child's leaf count comes from one MongoDB aggregation, so 500 children cost one query, not 500. Results are cached for five minutes, and the cache clears when the collection changes.
- **Everyday groups.** A `nested-groups` collection saves groups people know, each "these branches minus those". For example, "lizards" is Squamata minus snakes minus geckos. Groups are views: they never change the tree, and their counts are live. A curator check lists leaves that fall in no group, or in two.
- **Your words and your look.** Every word in the views can be replaced, for translation, and the views take your own link component.
  - Every element has a stable class (`ndb-card__name`, `ndb-compact__row`, …), and state is in data attributes (`data-layout`, `data-leaf`, `data-hidden`, `data-empty`, `data-share`).
  - Colors, gaps, radii and sizes are `--ndb-*` variables. Each falls back to a generic theme token (`--palette-primary`, `--palette-surface-raised`, …), then to a default, so a site-wide theme restyles the browser with nothing else to do.
  - `classNames` adds your classes to any element, and `unstyled` leaves everything to you.
  - The default stylesheet uses zero specificity, except link color, so your rules win.
  - Tried in three themes (light, dark, and a serif "field guide" with square cards) from the same component, axe clean in each.

It needs the MongoDB adapter, and a collection that stores each document's path, like `animalia/chordata/reptilia` or a Nested Docs breadcrumb URL.

## On its own, and with others

**On its own.** Nested Docs Browser needs the MongoDB adapter and a collection that stores each document's path. Its default look works with no theme at all. It doesn't use any other plugin.

**Works with:**

- **Color Theory** (`@extantape/payload-plugin-color-theory`): each `--ndb-*` variable falls back to a `--palette-*` token, and Color Theory writes those, so the browser follows the site's theme in light and dark. They share token names, not code; any theme that sets the same names works too.
- **Nested Docs** (`@payloadcms/plugin-nested-docs`): its breadcrumb URL can serve as the path field.

**Family.** Nested Docs Browser is in the Navigation family, with Menu. They're meant to sit side by side in a site's navigation, but nothing in either plugin's code connects them yet. The families are a working draft that may change.

## Install

```bash
npm install @extantape/payload-plugin-nested-docs-browser
```

Needs Payload 3.80 or later, React 19 and Node 22 or later.

## Use

```ts
import { nestedDocsBrowser } from '@extantape/payload-plugin-nested-docs-browser'

nestedDocsBrowser({
  collection: 'taxa',
  pathField: 'path',
  leaf: { field: 'rank', equals: 'species' },
  hideByDefault: { field: 'extant', equals: 'extinct', label: 'fossil' },
  describe: (doc) => ({ name: doc.name, everyday: doc.everydayName ?? null }),
  href: (path) => `/taxa/${path}`,
  groups: { imageCollection: 'media', access: { create: isCurator, update: isCurator, delete: isCurator } },
})
```

On a page (a server component):

```tsx
import { browse } from '@extantape/payload-plugin-nested-docs-browser'
import { NestedDocsBrowser } from '@extantape/payload-plugin-nested-docs-browser/client'

const data = await browse(payload, options, 'animalia/chordata/reptilia/squamata')
return <NestedDocsBrowser data={data} noun="families" Link={Link} />
```

Or over HTTP: `GET /api/nested-docs-browser/<collection>?path=…`, `…/groups`, `…/groups/<id>`, and `…/groups-check?scope=…`. The check is only for people allowed to change groups: the groups' `update` rule must answer exactly `true`, or a query. A query limits the check to the groups it matches (the answer's `groups` says how many), so `none` means "in none of those". An empty or malformed query, one on a field the groups don't have, any other truthy answer, and an error are all refused with 403.

**What it shows, and to whom.** For speed, the browser reads the collection straight from MongoDB, so Payload's access rules, drafts and hidden fields don't apply to it. Only two options decide what it shows:

- `filter` (a MongoDB filter) must leave out anything visitors mustn't see: drafts (`_status: 'published'` if the collection has drafts), private or archived records, another site's records on a multi-site install.
- `access` decides who may call the endpoints. Without it they're public. Only an answer of exactly `true` lets a request through: `1`, `'yes'`, an object or a thrown error gets 403, never a 500.

Names, everyday names and images come from `describe`, so return only what's fine to show. It suits public reference data, such as a taxonomy. The cache holds at most 500 entries and never keeps a miss.

## Breadcrumbs

A deep tree makes a long trail. You can fold the levels people don't need into one **…** button, or leave them out. Nothing leaves the data: the button lists every hidden level as a link, and the structured data keeps the whole path.

Set `levelField` so each ancestor carries its kind of level (for a taxonomy, its rank):

```ts
nestedDocsBrowser({ collection: 'taxa', levelField: 'rank', /* … */ })
```

Then say which levels show:

```tsx
<NestedDocsBrowser
  data={data}
  noun="species"
  crumbs={{
    leading: [{ name: 'Taxonomy', href: '/taxonomy' }],
    keep: { levels: ['class', 'order', 'family', 'genus'] },
    narrow: { levels: ['family', 'genus'] },
    structuredData: { origin: 'https://example.org' },
  }}
/>
```

A red-footed tortoise's page then reads `Taxonomy / Eukaryota / … / Reptilia / Testudines / … / Testudinidae / Chelonoidis`, and on a phone `Taxonomy / Eukaryota / … / Testudinidae / Chelonoidis`.

- **Which levels show.** `keep` takes any of `levels` (by the level's value, case ignored), `first` and `last` (by position), and `test` (your own function). A level shows when any of them matches. Without `keep`, every level shows, as before.
- **Always shown:** the `leading` index pages, the first real level of the tree and the current page.
- **Folding.** Neighboring hidden levels share one **…**. A single hidden level between two shown ones is shown, since a button would save nothing. `mode: 'hide'` leaves hidden levels out with no marker.
- **Opening the …** `open: 'popover'` (default) opens a list of links on click or tap. `'expand'` puts the levels back in place and moves focus to the first one. `'hover'` opens on mouse hover, with tap and keyboard as the fallback.
- **Keyboard and screen readers.** The … is a real button named "Show 2 hidden levels", with `aria-expanded`. Escape or a click outside closes the list and puts focus back on the button.
- **Small screens.** `narrow` is a second rule. The default stylesheet switches to it at 40rem and under. Unstyled, both trails render with `data-crumbs="wide"` and `"narrow"`, and the site shows one.
- **Structured data.** `structuredData` writes a schema.org `BreadcrumbList` with every level, hidden ones and the current page included. Pass `origin` to make links absolute.

`Breadcrumbs` works on its own too, outside the browser, for any page with a trail (pass `crumbs`, `indexPages` and `current`). The plan itself is plain TypeScript in `…/core`: `planCrumbs`, `breadcrumbJsonLd`.

## Styling

**Icons and silhouettes.** For a one-color SVG icon, return `{ image, imageAlt, imageMask: true }` from `describe`. The browser draws it as a mask in `--ndb-color-image`, so it takes the theme's color in light and dark. With `imageAlt` ("No photo yet (tortoise)") it's announced; without it, it's decorative. `unstyled` shows it as a plain picture.

```tsx
// Theme tokens for the whole site (or just --ndb-* for this browser):
<div style={{ '--palette-primary': '#2f6b3a', '--palette-surface-raised': '#f4f1e6', '--palette-radius-lg': '0px' }}>
  <NestedDocsBrowser data={data} noun="families" classNames={{ title: 'my-title', card: 'my-card' }} />
</div>
```

The stylesheet renders with the component. To import it instead, use `@extantape/payload-plugin-nested-docs-browser/client/styles.css` and pass `includeStyles={false}`. For a CSP, pass `nonce`.

## Commands

```bash
npm test          # Vitest: core, Payload side (in-memory MongoDB), views (jsdom)
npm run typecheck
npm run build
```

## License

MIT
