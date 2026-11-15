/**
 * Collapsible breadcrumbs: which levels of a long trail to show, and which to fold into one "…" or leave out.
 * Plain TypeScript. Nothing is removed from the data: the plan only decides what's drawn, and the structured
 * data keeps the full path.
 */

/** One step of the trail. */
export type Crumb = {
  name: string
  everyday?: string | null
  href?: string | null
  /** What kind of level this is, from the tree (for a taxonomy: the rank, such as `family`). */
  level?: unknown
}

/** Which levels to show. A level shows when any rule matches. With no rule set, every level shows. */
export type CrumbKeep = {
  /** Show levels whose `level` is one of these (strings match without regard to case). */
  levels?: unknown[]
  /** Show the first N levels of the tree (after any index pages). */
  first?: number
  /** Show the last M levels. */
  last?: number
  /** Decide for yourself. `index` counts from the start of the whole trail. */
  test?: (crumb: Crumb, index: number, crumbs: readonly Crumb[]) => boolean
}

export type CrumbOptions = {
  /** `collapse` (default): hidden levels fold into one "…" button. `hide`: they aren't drawn, with no marker. */
  mode?: 'collapse' | 'hide'
  keep?: CrumbKeep
  /** How many crumbs at the start are index pages rather than levels (a "Taxonomy" home page). Default 0. */
  indexPages?: number
  /** The last crumb is the current page. Default false. */
  endsWithCurrent?: boolean
}

export type CrumbPart<C extends Crumb = Crumb> =
  | { kind: 'crumb'; crumb: C; index: number }
  /** Two or more neighboring hidden levels, folded into one "…". */
  | { kind: 'more'; crumbs: { crumb: C; index: number }[] }

const sameLevel = (a: unknown, b: unknown) => (typeof a === 'string' && typeof b === 'string' ? a.toLowerCase() === b.toLowerCase() : Object.is(a, b))

const hasRule = (k?: CrumbKeep) => Boolean(k && (k.levels?.length || k.first !== undefined || k.last !== undefined || k.test))

/** Is this crumb shown? Index pages, the first real level and the current page always are. */
export function crumbShown<C extends Crumb>(crumbs: readonly C[], i: number, o: CrumbOptions = {}): boolean {
  const indexPages = Math.max(0, o.indexPages ?? 0)
  if (i < indexPages || i === indexPages) return true
  if (o.endsWithCurrent && i === crumbs.length - 1) return true
  const k = o.keep
  if (!hasRule(k)) return true
  const c = crumbs[i]!
  const levelPos = i - indexPages
  const levelCount = crumbs.length - indexPages
  if (k!.levels?.some((l) => sameLevel(l, c.level))) return true
  if (k!.first !== undefined && levelPos < k!.first) return true
  if (k!.last !== undefined && levelPos >= levelCount - k!.last) return true
  return Boolean(k!.test?.(c, i, crumbs))
}

/**
 * The trail as drawn: shown crumbs in order, with each run of hidden ones folded into one "…" (collapse)
 * or left out (hide). A run of exactly one hidden level is shown instead of a "…", since the button
 * would save nothing.
 */
export function planCrumbs<C extends Crumb>(crumbs: readonly C[], o: CrumbOptions = {}): CrumbPart<C>[] {
  const parts: CrumbPart<C>[] = []
  let run: { crumb: C; index: number }[] = []
  const flush = () => {
    if (o.mode !== 'hide') {
      if (run.length === 1) parts.push({ kind: 'crumb', ...run[0]! })
      else if (run.length > 1) parts.push({ kind: 'more', crumbs: run })
    }
    run = []
  }
  crumbs.forEach((crumb, index) => {
    if (crumbShown(crumbs, index, o)) {
      flush()
      parts.push({ kind: 'crumb', crumb, index })
    } else run.push({ crumb, index })
  })
  flush()
  return parts
}

/**
 * schema.org BreadcrumbList for the full path, hidden levels included. Relative links are made absolute
 * with `origin` when given. A crumb without a link is listed by name only.
 */
export function breadcrumbJsonLd(crumbs: readonly Crumb[], o: { origin?: string } = {}) {
  const abs = (href: string) => {
    if (!o.origin) return href
    try {
      return new URL(href, o.origin).toString()
    } catch {
      return href
    }
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.everyday || c.name,
      ...(c.href ? { item: abs(c.href) } : {}),
    })),
  }
}

/** JSON for a `<script type="application/ld+json">`, with `<` escaped so a name can't close the tag. */
export const jsonLdText = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c')
