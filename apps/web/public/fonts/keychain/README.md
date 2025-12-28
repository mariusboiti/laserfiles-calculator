# Keychain Hub Fonts

This directory contains fonts used by the Keychain Hub for text-to-path conversion.

## Required Fonts

1. **Pacifico-Regular.ttf** - Script font for decorative names
   - Download from: https://fonts.google.com/specimen/Pacifico
   - License: OFL (Open Font License)

2. **Inter-Bold.ttf** - Sans Bold font for clean text
   - Download from: https://fonts.google.com/specimen/Inter
   - License: OFL (Open Font License)

## Installation

1. Download the TTF files from Google Fonts
2. Place them in this directory (`public/fonts/keychain/`)
3. Ensure the filenames match exactly:
   - `Pacifico-Regular.ttf`
   - `Inter-Bold.ttf`

## Usage

The fonts are loaded dynamically by `fontRegistry.ts` using opentype.js.
Text is converted to SVG paths for laser-safe export (no `<text>` elements).

## Fallback

If fonts fail to load, the tool will show a loading indicator.
Ensure the font files are present before using the Keychain Hub.
