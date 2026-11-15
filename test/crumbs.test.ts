import { describe, expect, it } from 'vitest'

import { breadcrumbJsonLd, jsonLdText, planCrumbs, type Crumb, type CrumbPart } from '../src/core/index.js'

// The trail above a red-footed tortoise's page, with a "Taxonomy" index page in front. Ranks are real; links made up.
const c = (name: string, level: string | null): Crumb => ({ name, level, href: `/t/${name.toLowerCase()}` })
const redfoot = [
  c('Taxonomy', null),
  c('Eukaryota', 'domain'),
  c('Animalia', 'kingdom'),
  c('Chordata', 'phylum'),
  c('Reptilia', 'class'),
  c('Testudines', 'order'),
  c('Cryptodira', 'suborder'),
  c('Testudinoidea', 'superfamily'),
  c('Testudinidae', 'family'),
  c('Chelonoidis', 'genus'),
]
const draw = (parts: CrumbPart[]) => parts.map((p) => (p.kind === 'more' ? '…' : p.crumb.name)).join(' / ')
const site = { indexPages: 1, keep: { levels: ['class', 'order', 'family', 'genus'] } }

describe('collapsible breadcrumbs', () => {
  it('reads the way the site config was agreed: the index page, the first real level, then class, order, family and genus', () => {
    expect(draw(planCrumbs(redfoot, site))).toBe('Taxonomy / Eukaryota / … / Reptilia / Testudines / … / Testudinidae / Chelonoidis')
  })

  it('a shorter rule for phones keeps family and genus', () => {
    expect(draw(planCrumbs(redfoot, { indexPages: 1, keep: { levels: ['family', 'genus'] } }))).toBe('Taxonomy / Eukaryota / … / Testudinidae / Chelonoidis')
  })

  it('never loses a level: every crumb is drawn once or sits in exactly one fold', () => {
    const parts = planCrumbs(redfoot, site)
    const seen = parts.flatMap((p) => (p.kind === 'more' ? p.crumbs.map((x) => x.index) : [p.index]))
    expect(seen).toEqual(redfoot.map((_, i) => i))
  })

  it('a gap of exactly one level shows that level instead of a "…"', () => {
    const parts = planCrumbs(redfoot, { indexPages: 1, keep: { levels: ['phylum', 'order'] } })
    // Animalia sits alone between Eukaryota and Chordata, so it shows; Reptilia sits alone before Testudines, so it shows too.
    expect(draw(parts)).toBe('Taxonomy / Eukaryota / Animalia / Chordata / Reptilia / Testudines / …')
  })

  it('hide mode leaves hidden levels out with no marker', () => {
    expect(draw(planCrumbs(redfoot, { ...site, mode: 'hide' }))).toBe('Taxonomy / Eukaryota / Reptilia / Testudines / Testudinidae / Chelonoidis')
  })

  it('picks levels by position or by a function, and matches level names without regard to case', () => {
    expect(draw(planCrumbs(redfoot, { indexPages: 1, keep: { first: 2, last: 2 } }))).toBe('Taxonomy / Eukaryota / Animalia / … / Testudinidae / Chelonoidis')
    expect(draw(planCrumbs(redfoot, { indexPages: 1, keep: { test: (x) => x.name === 'Reptilia' } }))).toBe('Taxonomy / Eukaryota / … / Reptilia / …')
    expect(draw(planCrumbs(redfoot, { indexPages: 1, keep: { levels: ['CLASS', 'Order', 'family', 'genus'] } }))).toBe(draw(planCrumbs(redfoot, site)))
  })

  it('always shows the current page when the trail ends with it', () => {
    const trail = [...redfoot, c('Chelonoidis carbonarius', 'species')]
    expect(draw(planCrumbs(trail, { indexPages: 1, keep: { levels: ['class'] }, endsWithCurrent: true }))).toBe('Taxonomy / Eukaryota / … / Reptilia / … / Chelonoidis carbonarius')
  })

  it('without a rule, every level shows as before', () => {
    expect(draw(planCrumbs(redfoot, { indexPages: 1 }))).toBe(redfoot.map((x) => x.name).join(' / '))
    expect(draw(planCrumbs(redfoot, { indexPages: 1, keep: {} }))).toBe(redfoot.map((x) => x.name).join(' / '))
  })

  it('without index pages, the first crumb is the first real level and always shows', () => {
    expect(draw(planCrumbs(redfoot.slice(1), { keep: { levels: ['genus'] } }))).toBe('Eukaryota / … / Chelonoidis')
  })
})

describe('structured data keeps the full path', () => {
  it('lists every level in order, hidden ones included, with absolute links when given an origin', () => {
    const ld = breadcrumbJsonLd(redfoot, { origin: 'https://example.org' })
    expect(ld['@type']).toBe('BreadcrumbList')
    expect(ld.itemListElement).toHaveLength(10)
    expect(ld.itemListElement[6]).toEqual({ '@type': 'ListItem', position: 7, name: 'Cryptodira', item: 'https://example.org/t/cryptodira' })
  })

  it('a crumb without a link is listed by name only, and a name cannot close the script tag', () => {
    const ld = breadcrumbJsonLd([{ name: '</script><b>x' }])
    expect(ld.itemListElement[0]).not.toHaveProperty('item')
    expect(jsonLdText(ld)).not.toContain('</script>')
  })
})
