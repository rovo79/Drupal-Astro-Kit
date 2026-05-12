#!/usr/bin/env node

import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'

const REQUIRED_HEADERS = [
  'external_key',
  'product_title',
  'product_url',
  'affiliate_url',
  'retailer',
  'brand',
  'image_source_url',
  'image_status',
  'image_asset_path',
  'alt_text',
  'notes',
  'last_checked',
  'image_provenance',
  'image_checksum',
  'manual_override_url',
  'manual_crop_notes',
]

function parseArgs(argv) {
  const options = {
    inventory: '',
    cacheDir: '',
    publicRoot: '',
    limit: '',
    key: '',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index]
    if (entry === '--inventory') {
      options.inventory = argv[++index] ?? ''
      continue
    }
    if (entry.startsWith('--inventory=')) {
      options.inventory = entry.slice('--inventory='.length)
      continue
    }
    if (entry === '--cache-dir') {
      options.cacheDir = argv[++index] ?? ''
      continue
    }
    if (entry.startsWith('--cache-dir=')) {
      options.cacheDir = entry.slice('--cache-dir='.length)
      continue
    }
    if (entry === '--public-root') {
      options.publicRoot = argv[++index] ?? ''
      continue
    }
    if (entry.startsWith('--public-root=')) {
      options.publicRoot = entry.slice('--public-root='.length)
      continue
    }
    if (entry === '--limit') {
      options.limit = argv[++index] ?? ''
      continue
    }
    if (entry.startsWith('--limit=')) {
      options.limit = entry.slice('--limit='.length)
      continue
    }
    if (entry === '--key') {
      options.key = argv[++index] ?? ''
      continue
    }
    if (entry.startsWith('--key=')) {
      options.key = entry.slice('--key='.length)
    }
  }

  return options
}

function ensureDir(dir) {
  return fs.mkdir(dir, { recursive: true })
}

function escapeCsv(value) {
  const text = value == null ? '' : String(value)
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

async function readCsv(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]
    const next = raw[index + 1]

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          cell += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === ',') {
      row.push(cell)
      cell = ''
      continue
    }

    if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }

    if (char !== '\r') {
      cell += char
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  const [headerRow, ...dataRows] = rows
  if (!headerRow) {
    return { headers: [], rows: [] }
  }

  const mappedRows = dataRows
    .filter((values) => values.some((value) => String(value ?? '').trim() !== ''))
    .map((values) => {
      const record = {}
      headerRow.forEach((header, index) => {
        record[header] = values[index] ?? ''
      })
      return record
    })

  return { headers: headerRow, rows: mappedRows }
}

async function writeCsv(filePath, headers, rows) {
  const lines = [headers.map(escapeCsv).join(',')]
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(row[header] ?? '')).join(','))
  }

  await fs.writeFile(filePath, `${lines.join('\n')}\n`, 'utf8')
}

function mergeHeaders(baseHeaders, existingHeaders) {
  const headers = [...baseHeaders]
  for (const header of existingHeaders) {
    if (!headers.includes(header)) {
      headers.push(header)
    }
  }
  return headers
}

function cleanValue(value) {
  return String(value ?? '').trim()
}

function formatTimestamp(date) {
  return date.toISOString().slice(0, 19)
}

function inferRetailerName(url) {
  if (!url) {
    return ''
  }
  const host = cleanValue(new URL(url).hostname).replace(/^www\./, '')
  const map = new Map([
    ['amazon.com', 'Amazon'],
    ['amazon.co.uk', 'Amazon'],
    ['bandai.co.jp', 'Bandai'],
    ['banpresto.jp', 'Banpresto'],
    ['bbts.com', 'BigBadToyStore'],
    ['crunchyroll.com', 'Crunchyroll Store'],
    ['etsy.com', 'Etsy'],
    ['gamestop.com', 'GameStop'],
  ])

  return map.get(host) ?? (host ? host.replace(/[-.]/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase()) : '')
}

function inferProvenance(url) {
  if (!url) {
    return 'editorial_placeholder'
  }
  const host = cleanValue(new URL(url).hostname).replace(/^www\./, '')
  if (!host || host.includes('example.com')) {
    return 'editorial_placeholder'
  }
  if (host.includes('bandai') || host.includes('banpresto')) {
    return 'manufacturer'
  }
  if (host.includes('official')) {
    return 'official_press'
  }
  return 'retailer_listing'
}

function isLikelyImageUrl(url) {
  const lower = url.toLowerCase()
  if (!lower || lower.startsWith('data:')) {
    return false
  }
  return !['logo', 'icon', 'avatar', 'sprite', 'placeholder', 'blank', 'spinner', 'pixel'].some((needle) => lower.includes(needle))
}

function normalizeCandidateUrl(candidate, baseUrl) {
  const trimmed = cleanValue(candidate)
  if (!trimmed) {
    return ''
  }

  if (trimmed.startsWith('//')) {
    return `${new URL(baseUrl).protocol}${trimmed}`
  }

  try {
    return new URL(trimmed, baseUrl).toString()
  } catch {
    return trimmed
  }
}

function readAttribute(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i'))
  return match?.[1]?.trim() ?? ''
}

function collectMetaCandidates(html, attributeNames, contentFilters) {
  const candidates = []
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? []
  for (const tag of metaTags) {
    const attributeValue = readAttribute(tag, 'property') || readAttribute(tag, 'name')
    if (!attributeNames.includes(attributeValue.toLowerCase())) {
      continue
    }
    const content = readAttribute(tag, 'content')
    if (content && (!contentFilters.length || contentFilters.some((needle) => content.toLowerCase().includes(needle)))) {
      candidates.push(content)
    }
  }
  return candidates
}

function collectJsonLdCandidates(value) {
  if (!value) {
    return []
  }
  if (typeof value === 'string') {
    return [value.trim()].filter(Boolean)
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectJsonLdCandidates(item))
  }
  if (typeof value !== 'object') {
    return []
  }

  const candidates = []
  for (const key of ['image', 'thumbnailUrl']) {
    if (key in value) {
      candidates.push(...collectJsonLdCandidates(value[key]))
    }
  }
  for (const nested of Object.values(value)) {
    if (nested && typeof nested === 'object') {
      candidates.push(...collectJsonLdCandidates(nested))
    }
  }
  return candidates
}

function collectJsonLdImageCandidates(html) {
  const candidates = []
  const scriptMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? []
  for (const tag of scriptMatches) {
    const content = tag.replace(/^.*?>/s, '').replace(/<\/script>\s*$/i, '')
    try {
      const parsed = JSON.parse(content)
      candidates.push(...collectJsonLdCandidates(parsed))
    } catch {
      continue
    }
  }
  return candidates
}

function collectRetailerCandidates(html, host) {
  const patterns = [
    ['amazon.com', [/data-old-hires=["']([^"']+)["']/i, /"large":"([^"]+)"/i, /"hiRes":"([^"]+)"/i]],
    ['bbts.com', [/data-zoom-image=["']([^"']+)["']/i, /property=["']og:image["'][^>]*content=["']([^"']+)["']/i]],
    ['gamestop.com', [/data-src=["']([^"']+)["']/i, /property=["']og:image["'][^>]*content=["']([^"']+)["']/i]],
  ]

  const candidates = []
  for (const [needle, regexes] of patterns) {
    if (!host.includes(needle)) {
      continue
    }
    for (const regex of regexes) {
      const match = html.match(regex)
      if (match?.[1]) {
        candidates.push(match[1])
      }
    }
  }
  return candidates
}

function extensionFromUrlOrType(url, contentType) {
  const pathName = new URL(url).pathname
  const ext = path.extname(pathName).slice(1).toLowerCase()
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg'].includes(ext)) {
    return ext === 'jpeg' ? 'jpg' : ext
  }

  const type = contentType.split(';')[0].trim().toLowerCase()
  const map = new Map([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
    ['image/gif', 'gif'],
    ['image/avif', 'avif'],
    ['image/svg+xml', 'svg'],
  ])
  return map.get(type) ?? 'jpg'
}

function checksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

async function downloadImage(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    const error = new Error(`Image request failed: ${response.status} ${response.statusText}`)
    error.status = response.status
    throw error
  }

  const contentType = response.headers.get('content-type') ?? ''
  const buffer = Buffer.from(await response.arrayBuffer())
  return { buffer, contentType, responseUrl: response.url || url }
}

async function optimizeImage(buffer, destinationDir) {
  const resize = async (size) => {
    return sharp(buffer)
      .rotate()
      .flatten({ background: '#ffffff' })
      .resize({
        width: size,
        height: size,
        fit: 'contain',
        background: '#ffffff',
        withoutEnlargement: true,
      })
      .jpeg({ quality: size >= 1000 ? 92 : 90, mozjpeg: true })
      .toBuffer()
  }

  const primary = await resize(1200)
  const thumb = await resize(320)

  await ensureDir(destinationDir)
  await fs.writeFile(path.join(destinationDir, 'primary.jpg'), primary)
  await fs.writeFile(path.join(destinationDir, 'thumb.jpg'), thumb)
}

async function existingPublicPrimaryAsset(publicRoot, externalKey, imageAssetPath) {
  const candidates = []
  if (imageAssetPath) {
    candidates.push(path.join(publicRoot, imageAssetPath.replace(/^\/+/, '')))
  }
  candidates.push(
    path.join(publicRoot, 'catalog', 'products', externalKey, 'primary.jpg'),
    path.join(publicRoot, 'catalog', 'products', externalKey, 'primary.png'),
  )

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate)
      if (stat.isFile()) {
        return candidate
      }
    } catch {
      continue
    }
  }

  return ''
}

async function processRow(row, context) {
  const now = formatTimestamp(new Date())
  const externalKey = cleanValue(row.external_key)
  const productTitle = cleanValue(row.product_title)
  const sourcePageUrl = cleanValue(row.product_url || row.affiliate_url)
  const affiliateUrl = cleanValue(row.affiliate_url)
  const manualOverrideUrl = cleanValue(row.manual_override_url)
  const altText = cleanValue(row.alt_text) || productTitle
  const existingNotes = cleanValue(row.notes)
  const existingChecksum = cleanValue(row.image_checksum)

  const notes = existingNotes ? [existingNotes] : []
  let retailer = cleanValue(row.retailer)
  let provenance = cleanValue(row.image_provenance)
  let discoveredImageUrl = manualOverrideUrl
  let status = cleanValue(row.image_status) || 'missing'
  let imageSourceUrl = cleanValue(row.image_source_url)
  let imageAssetPath = cleanValue(row.image_asset_path)

  if (!externalKey) {
    row.image_status = 'needs_review'
    row.notes = [...notes, 'Missing external_key.'].join(' ')
    row.last_checked = now
    return row
  }

  const existingPublicAsset = await existingPublicPrimaryAsset(context.publicRoot, externalKey, imageAssetPath)
  if (existingPublicAsset) {
    row.image_status = 'optimized_local'
    row.image_asset_path = `/catalog/products/${externalKey}/${path.basename(existingPublicAsset)}`
    row.alt_text = altText
    row.notes = notes.join(' ')
    row.last_checked = cleanValue(row.last_checked) || now
    row.retailer = retailer || inferRetailerName(sourcePageUrl || affiliateUrl || manualOverrideUrl || '')
    row.image_provenance = provenance || inferProvenance(sourcePageUrl || affiliateUrl || manualOverrideUrl || '')
    return row
  }

  if (!retailer) {
    retailer = inferRetailerName(sourcePageUrl || affiliateUrl || manualOverrideUrl || '')
  }
  if (!provenance) {
    provenance = inferProvenance(sourcePageUrl || affiliateUrl || manualOverrideUrl || '')
  }

  if (!discoveredImageUrl && sourcePageUrl) {
    try {
      const response = await fetch(sourcePageUrl, {
        headers: {
          accept: 'text/html,application/xhtml+xml',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
        },
        redirect: 'follow',
      })

      if (!response.ok) {
        status = [401, 403, 429, 451].includes(response.status) ? 'blocked' : 'needs_review'
        notes.push(`Source page returned ${response.status} for ${sourcePageUrl}.`)
        row.image_status = status
        row.image_source_url = imageSourceUrl
        row.image_asset_path = ''
        row.alt_text = altText
        row.notes = notes.join(' ')
        row.last_checked = now
        row.retailer = retailer || inferRetailerName(sourcePageUrl || affiliateUrl || manualOverrideUrl || '')
        row.image_provenance = provenance
        return row
      }

      const html = await response.text()
      const pageHost = new URL(response.url).hostname.replace(/^www\./, '')
      const candidates = [
        ...collectMetaCandidates(html, ['og:image', 'og:image:url'], []),
        ...collectMetaCandidates(html, ['twitter:image', 'twitter:image:src'], []),
        ...collectJsonLdImageCandidates(html),
        ...collectRetailerCandidates(html, pageHost),
      ]

      const candidate = candidates.map((entry) => normalizeCandidateUrl(entry, response.url)).find((entry) => isLikelyImageUrl(entry))
      if (candidate) {
        discoveredImageUrl = candidate
        imageSourceUrl = candidate
        status = 'sourced_remote'
        notes.push(`Discovered ${candidate} from ${sourcePageUrl}.`)
      } else {
        status = 'needs_review'
        notes.push(`No trustworthy image discovered from ${sourcePageUrl}.`)
      }
    } catch (error) {
      status = 'needs_review'
      notes.push(`Unable to inspect ${sourcePageUrl}: ${error instanceof Error ? error.message : String(error)}.`)
    }
  }

  if (!discoveredImageUrl) {
    if (!sourcePageUrl) {
      status = 'missing'
      notes.push('No source page URL available.')
    }

    row.image_status = status
    row.image_source_url = imageSourceUrl
    row.image_asset_path = ''
    row.alt_text = altText
    row.notes = notes.join(' ')
    row.last_checked = now
    row.retailer = retailer || inferRetailerName(sourcePageUrl || affiliateUrl || manualOverrideUrl || '')
    row.image_provenance = provenance
    return row
  }

  try {
    const { buffer, contentType, responseUrl } = await downloadImage(discoveredImageUrl)
    const rawDir = path.join(context.cacheDir, 'raw', externalKey)
    const optimizedDir = path.join(context.cacheDir, 'optimized', externalKey)
    const publicDir = path.join(context.publicRoot, 'catalog', 'products', externalKey)
    await ensureDir(rawDir)
    await ensureDir(optimizedDir)
    await ensureDir(publicDir)

    const rawExt = extensionFromUrlOrType(responseUrl, contentType)
    const rawPath = path.join(rawDir, `source.${rawExt}`)
    await fs.writeFile(rawPath, buffer)
    status = 'downloaded_raw'
    notes.push(`Downloaded raw image from ${responseUrl}.`)

    const metadata = await sharp(buffer).metadata()
    const width = metadata.width ?? 0
    const height = metadata.height ?? 0
    if (width < 600 || height < 600) {
      row.image_status = 'needs_review'
      row.image_source_url = responseUrl
      row.image_asset_path = ''
      row.alt_text = altText
      row.notes = [...notes, `Image is too small at ${width}x${height}; manual review required.`].join(' ')
      row.last_checked = now
      row.retailer = retailer || inferRetailerName(sourcePageUrl || affiliateUrl || manualOverrideUrl || '')
      row.image_provenance = provenance
      row.image_checksum = checksum(buffer)
      return row
    }

    await optimizeImage(buffer, optimizedDir)
    await fs.copyFile(path.join(optimizedDir, 'primary.jpg'), path.join(publicDir, 'primary.jpg'))
    await fs.copyFile(path.join(optimizedDir, 'thumb.jpg'), path.join(publicDir, 'thumb.jpg'))

    row.image_status = 'optimized_local'
    row.image_source_url = responseUrl
    row.image_asset_path = `/catalog/products/${externalKey}/primary.jpg`
    row.alt_text = altText
    row.notes = notes.join(' ')
    row.last_checked = now
    row.retailer = retailer || inferRetailerName(sourcePageUrl || affiliateUrl || manualOverrideUrl || '')
    row.image_provenance = provenance
    row.image_checksum = checksum(buffer)

    if (existingChecksum && existingChecksum !== row.image_checksum) {
      row.notes = [row.notes, 'Local asset checksum changed.'].filter(Boolean).join(' ')
    }

    return row
  } catch (error) {
    status = [401, 403, 429, 451].includes(Number(error?.status)) ? 'blocked' : 'needs_review'
    row.image_status = status
    row.image_source_url = discoveredImageUrl
    row.image_asset_path = ''
    row.alt_text = altText
    row.notes = [...notes, `Unable to download or normalize ${discoveredImageUrl}: ${error instanceof Error ? error.message : String(error)}.`].join(' ')
    row.last_checked = now
    row.retailer = retailer || inferRetailerName(sourcePageUrl || affiliateUrl || manualOverrideUrl || '')
    row.image_provenance = provenance
    return row
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const scriptDir = path.dirname(fileURLToPath(import.meta.url))
  const webStackRoot = path.resolve(scriptDir, '..', '..')
  const inventoryPath = options.inventory || path.join(webStackRoot, 'setup/content/catalog/product-image-inventory.csv')
  const cacheDir = options.cacheDir || path.join(webStackRoot, '.cache/product-images')
  const publicRoot = options.publicRoot || path.join(webStackRoot, 'astro-frontend/public')

  const inventory = await readCsv(inventoryPath)
  const headers = mergeHeaders(REQUIRED_HEADERS, inventory.headers)
  const filteredRows = inventory.rows.filter((row) => !options.key || cleanValue(row.external_key) === options.key)
  const limit = Number.parseInt(options.limit, 10)
  const selectedRows = Number.isFinite(limit) && limit > 0 ? filteredRows.slice(0, limit) : filteredRows

  const processedRows = []
  for (const row of inventory.rows) {
    const externalKey = cleanValue(row.external_key)
    if (options.key && externalKey !== options.key) {
      processedRows.push(row)
      continue
    }

    if (selectedRows.includes(row)) {
      processedRows.push(await processRow({ ...row }, { cacheDir, publicRoot }))
    } else {
      processedRows.push(row)
    }
  }

  await writeCsv(inventoryPath, headers, processedRows)

  const summary = processedRows.reduce(
    (accumulator, row) => {
      const status = cleanValue(row.image_status) || 'missing'
      if (status === 'optimized_local') accumulator.optimized += 1
      else if (status === 'blocked') accumulator.blocked += 1
      else if (status === 'needs_review') accumulator.review += 1
      else if (status === 'missing') accumulator.missing += 1
      return accumulator
    },
    { optimized: 0, blocked: 0, review: 0, missing: 0 },
  )

  console.log(`Processed ${selectedRows.length} row(s). Optimized: ${summary.optimized}, review: ${summary.review}, blocked: ${summary.blocked}, missing: ${summary.missing}.`)
}

await main()
