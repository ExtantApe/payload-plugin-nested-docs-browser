// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Breadcrumbs, NestedDocsBrowser } from '../src/client/index.js'
import type { Crumb } from '../src/core/index.js'

afterEach(cleanup)

const c = (name: string, level: string | null): Crumb & { href: string } => ({ name, level, href: `/t/${name.toLowerCase()}` })
const trail = [c('Taxonomy', null), c('Eukaryota', 'domain'), c('Animalia', 'kingdom'), c('Chordata', 'phylum'), c('Reptilia', 'class'), c('Testudines', 'order'), c('Cryptodira', 'suborder'), c('Testudinoidea', 'superfamily'), c('Testudinidae', 'family'), c('Chelonoidis', 'genus')]
const keep = { levels: ['class', 'order', 'family', 'genus'] }
const current = { name: 'Chelonoidis carbonarius', everyday: 'Red-footed tortoise', level: 'species' }

describe('Breadcrumbs', () => {
  it('folds hidden levels into a real button that says how many it hides, and lists them as links when opened', () => {
    render(<Breadcrumbs crumbs={trail} indexPages={1} keep={keep} current={current} />)
    const nav = screen.getByRole('navigation', { name: 'Where you are' })
    const buttons = within(nav).getAllByRole('button')
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Show 2 hidden levels', 'Show 2 hidden levels'])
    expect(within(nav).queryByRole('link', { name: 'Animalia' })).toBeNull()
    const first = buttons[0]!
    expect(first.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(first)
    expect(first.getAttribute('aria-expanded')).toBe('true')
    const pop = document.getElementById(first.getAttribute('aria-controls')!)!
    expect(within(pop).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/t/animalia', '/t/chordata'])
    // The current page is drawn last and marked as such.
    expect(within(nav).getByText('Red-footed tortoise').getAttribute('aria-current')).toBe('page')
  })

  it('Escape closes the popover and puts focus back on its button', () => {
    render(<Breadcrumbs crumbs={trail} indexPages={1} keep={keep} />)
    const button = screen.getAllByRole('button', { name: 'Show 2 hidden levels' })[0]!
    fireEvent.click(button)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(button)
  })

  it('a click outside closes the popover', () => {
    render(<Breadcrumbs crumbs={trail} indexPages={1} keep={keep} />)
    const button = screen.getAllByRole('button', { name: 'Show 2 hidden levels' })[0]!
    fireEvent.click(button)
    fireEvent.pointerDown(document.body)
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('expand mode opens the hidden levels in place and moves focus to the first one', () => {
    render(<Breadcrumbs crumbs={trail} indexPages={1} keep={keep} open="expand" />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Show 2 hidden levels' })[0]!)
    const animalia = screen.getByRole('link', { name: 'Animalia' })
    expect(document.activeElement).toBe(animalia)
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('hide mode draws no marker at all', () => {
    render(<Breadcrumbs crumbs={trail} indexPages={1} keep={keep} mode="hide" />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual(['Taxonomy', 'Eukaryota', 'Reptilia', 'Testudines', 'Testudinidae', 'Chelonoidis'])
  })

  it('a narrow rule draws a second, shorter trail for small screens', () => {
    const { container } = render(<Breadcrumbs crumbs={trail} indexPages={1} keep={keep} narrow={{ levels: ['family', 'genus'] }} />)
    const narrow = container.querySelector('[data-crumbs="narrow"]')!
    expect(within(narrow as HTMLElement).getAllByRole('link', { hidden: true }).slice(0, 2).map((a) => a.textContent)).toEqual(['Taxonomy', 'Eukaryota'])
    // The default stylesheet hides the narrow trail on a wide screen, so it is out of the accessibility tree here.
    expect(within(narrow as HTMLElement).queryAllByRole('button')).toHaveLength(0)
    const button = within(narrow as HTMLElement).getByRole('button', { name: 'Show 6 hidden levels', hidden: true })
    expect(button).toBeTruthy()
    expect([...narrow.querySelectorAll(':scope > li > .ndb__crumb-link')].map((a) => a.textContent)).toEqual(['Taxonomy', 'Eukaryota', 'Testudinidae', 'Chelonoidis'])
    expect(container.querySelector('[data-crumbs="wide"]')).toBeTruthy()
  })

  it('structured data lists the full path, hidden levels and the current page included', () => {
    const { container } = render(<Breadcrumbs crumbs={trail} indexPages={1} keep={keep} current={current} structuredData={{ origin: 'https://example.org' }} />)
    const ld = JSON.parse(container.querySelector('script[type="application/ld+json"]')!.textContent!)
    expect(ld.itemListElement.map((x: { name: string }) => x.name)).toEqual([...trail.map((x) => x.name), 'Red-footed tortoise'])
    expect(ld.itemListElement[2].item).toBe('https://example.org/t/animalia')
  })
})

describe('the browser with collapsible breadcrumbs', () => {
  it('puts the index page first and folds the levels the site left out; without settings every ancestor shows as before', () => {
    const data = { node: { name: 'Chelonoidis', path: 'x', level: 'genus' }, ancestors: trail.slice(1, -1), children: [] }
    const { unmount } = render(<NestedDocsBrowser data={data} noun="species" crumbs={{ leading: [trail[0]!], keep }} />)
    const nav = screen.getByRole('navigation', { name: 'Where you are' })
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['Taxonomy', 'Eukaryota', 'Reptilia', 'Testudines', 'Testudinidae'])
    expect(within(nav).getAllByRole('button', { name: 'Show 2 hidden levels' })).toHaveLength(2)
    unmount()
    render(<NestedDocsBrowser data={data} noun="species" />)
    expect(within(screen.getByRole('navigation', { name: 'Where you are' })).getAllByRole('link')).toHaveLength(8)
  })
})
