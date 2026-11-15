# Changelog

## 0.3.0 (2026-11-15)

- **Collapsible breadcrumbs.** Pick which levels show by value (`keep.levels`), position (`first`, `last`) or your own function, and fold the rest into one … button, or leave them out with `mode: 'hide'`. The … opens a popover of links by default, or expands in place, or opens on hover. It is a real button with a count in its name and `aria-expanded`, and Escape returns focus to it. A `narrow` rule gives small screens a shorter trail. `structuredData` writes the full path as schema.org `BreadcrumbList`. Without these settings the trail looks as it did.
- **`levelField`** sends each ancestor's level (for a taxonomy, its rank) with `browse()` and the endpoint, so breadcrumbs can choose by value.
- **`Breadcrumbs`** is exported from `…/client` for use outside the browser, and `planCrumbs` and `breadcrumbJsonLd` from `…/core`.

Tested: 49 tests (20 new), in jsdom and against an in-memory MongoDB. Not yet tried in a real browser or with a screen reader.

## 0.2.1 (2026-11-10)

- **The cache can't be made to grow.** It kept every path anyone asked for, including made-up ones, for 5 minutes each, with no limit. It now never keeps a miss (an unknown path or group) and holds at most 500 entries, dropping the oldest first. `browseCacheSize()` reports how many it holds.
- **README:** says plainly that the browser reads MongoDB directly, so only `filter` and `access` decide what it shows: drafts, private records and other sites' records must be left out by `filter`.

Tested: 27 tests; the new cache test fails without the fix (51 entries kept, all misses).

## 0.2.0 (2026-11-10)

- **Mask images.** `describe` can mark an image as a one-color icon (`imageMask: true`), such as a silhouette. The browser draws it as a mask in `--ndb-color-image` (default: the theme's primary color, then `currentColor`), so it follows the theme and dark mode. A plain `<img>` would show such an icon in black.
- **Alt text for images.** `describe` can give `imageAlt` ("No photo yet (tortoise)"). With it, an image is announced; without it, it stays decorative, as before. Curated sections take `imageAlt` and `imageMask` too.
- **Unstyled** sites get a mask image as a plain `<img>` with its alt text.
- Breadcrumb entries keep their earlier shape (path, name, everyday name, image, link).

Tested: 26 tests (2 new: a mask image's role, alt text, color and mask; and the unstyled fallback).

## 0.1.0 (2026-11-10)

First release: one level at a time with layouts chosen from counts, Show all everywhere, hide-by-default with a switch, live counts from one aggregation, everyday groups over the tree, and styling hooks.
