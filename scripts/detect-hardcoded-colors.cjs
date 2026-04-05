#!/usr/bin/env node
/**
 * Detect Hardcoded Colors
 *
 * Scans the codebase for hardcoded Tailwind color classes
 * that should be replaced with semantic tokens.
 *
 * Usage: node scripts/detect-hardcoded-colors.js
 * Exit 0 = no hardcoded colors found
 * Exit 1 = hardcoded colors detected
 */

const fs = require('fs')
const path = require('path')

// Patterns to detect hardcoded Tailwind color classes
const COLOR_PATTERNS = [
  // Background colors: bg-blue-500, bg-green-100, etc.
  /bg-(blue|green|red|yellow|purple|gray|white|black|pink|indigo|cyan|teal|orange|amber|emerald|sky|violet|fuchsia|rose|slate|zinc|neutral|stone)-\d+/,
  // Text colors: text-blue-500, text-gray-600, etc.
  /text-(blue|green|red|yellow|purple|gray|white|black|pink|indigo|cyan|teal|orange|amber|emerald|sky|violet|fuchsia|rose|slate|zinc|neutral|stone)-\d+/,
  // Border colors: border-blue-500, border-gray-300, etc.
  /border-(blue|green|red|yellow|purple|gray|white|black|pink|indigo|cyan|teal|orange|amber|emerald|sky|violet|fuchsia|rose|slate|zinc|neutral|stone)-\d+/,
  // bg-white, bg-black, text-white, text-black
  /\b(bg|text|border)-(white|black)\b/,
]

// Files/patterns to exclude
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.test\.(ts|tsx)$/,
  /__tests__/,
  /dist/,
  /\.d\.ts$/,
  /themes\/tokens\.ts$/, // Legacy tokens file is expected to have hardcoded colors
  /scripts\/detect-hardcoded-colors\.js$/, // This script
]

function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath))
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const matches = []

  lines.forEach((line, index) => {
    COLOR_PATTERNS.forEach(pattern => {
      if (pattern.test(line)) {
        matches.push({
          line: index + 1,
          text: line.trim().substring(0, 100),
          pattern: pattern.toString()
        })
      }
    })
  })

  return matches
}

function walkDir(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (!shouldExclude(fullPath)) {
        walkDir(fullPath, files)
      }
    } else if (entry.isFile()) {
      if (/\.(ts|tsx)$/.test(entry.name) && !shouldExclude(fullPath)) {
        files.push(fullPath)
      }
    }
  }

  return files
}

function main() {
  const srcDir = path.join(process.cwd(), 'src')

  if (!fs.existsSync(srcDir)) {
    console.error('Error: src/ directory not found')
    process.exit(1)
  }

  console.log('Scanning for hardcoded color classes...\n')

  const files = walkDir(srcDir)
  let totalMatches = 0
  const results = []

  files.forEach(file => {
    const matches = scanFile(file)
    if (matches.length > 0) {
      totalMatches += matches.length
      results.push({ file, matches })
    }
  })

  console.log('=== Hardcoded Color Detection Results ===\n')
  console.log(`Files scanned: ${files.length}`)
  console.log(`Files with hardcoded colors: ${results.length}`)
  console.log(`Total hardcoded color occurrences: ${totalMatches}`)

  if (results.length > 0) {
    console.log('\n--- Details ---\n')

    results.forEach(({ file, matches }) => {
      const relativePath = path.relative(process.cwd(), file)
      console.log(`\n${relativePath} (${matches.length} occurrences):`)
      matches.slice(0, 5).forEach(match => {
        console.log(`  Line ${match.line}: ${match.text}`)
      })
      if (matches.length > 5) {
        console.log(`  ... and ${matches.length - 5} more`)
      }
    })

    console.log('\n\n⚠️  Hardcoded colors detected.')
    console.log('Replace with semantic tokens from @/themes/tokens\n')
    process.exit(1)
  } else {
    console.log('\n\n✅ No hardcoded colors detected!\n')
    process.exit(0)
  }
}

main()