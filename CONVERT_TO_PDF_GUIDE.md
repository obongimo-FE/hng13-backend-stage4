# Converting Markdown to PDF - Complete Guide

## Overview

This guide provides multiple methods to convert your Markdown documentation to PDF while preserving:
- ✅ Mermaid diagrams
- ✅ Tables
- ✅ Code blocks
- ✅ Formatting
- ✅ Images

---

## Method 1: Using md-to-pdf (Recommended for Mermaid)

### Installation

```bash
npm install -g md-to-pdf
```

### Convert Single File

```bash
md-to-pdf SMART_COMB_TECHNICAL_DOCUMENTATION.md
md-to-pdf EXECUTIVE_SUMMARY.md
md-to-pdf SYSTEM_DIAGRAMS.md
```

### Convert All Files

```bash
# Windows PowerShell
Get-ChildItem *.md | ForEach-Object { md-to-pdf $_.Name }

# Linux/Mac
for file in *.md; do md-to-pdf "$file"; done
```

### With Mermaid Support

For Mermaid diagrams, you need to install additional dependencies:

```bash
npm install -g @mermaid-js/mermaid-cli puppeteer
```

Then use:

```bash
md-to-pdf --mermaid SMART_COMB_TECHNICAL_DOCUMENTATION.md
```

**Note**: Mermaid diagrams will be rendered as images in the PDF.

---

## Method 2: Using Pandoc (Most Reliable)

### Installation

**Windows:**
```powershell
choco install pandoc
# Or download from: https://pandoc.org/installing.html
```

**Mac:**
```bash
brew install pandoc
```

**Linux:**
```bash
sudo apt-get install pandoc
```

### Basic Conversion

```bash
pandoc SMART_COMB_TECHNICAL_DOCUMENTATION.md -o TECHNICAL_DOC.pdf
pandoc EXECUTIVE_SUMMARY.md -o EXECUTIVE_SUMMARY.pdf
pandoc SYSTEM_DIAGRAMS.md -o DIAGRAMS.pdf
```

### With Better Formatting

```bash
pandoc SMART_COMB_TECHNICAL_DOCUMENTATION.md \
  -o TECHNICAL_DOC.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=1in \
  -V fontsize=11pt \
  -V documentclass=article
```

### For Mermaid Diagrams

Pandoc doesn't natively support Mermaid. You need to:

1. **Convert Mermaid to images first:**
   ```bash
   # Install mermaid-cli
   npm install -g @mermaid-js/mermaid-cli
   
   # Convert each diagram (manual process)
   # Or use a script to extract and convert all Mermaid blocks
   ```

2. **Then use Pandoc with images:**
   ```bash
   pandoc SMART_COMB_TECHNICAL_DOCUMENTATION.md -o TECHNICAL_DOC.pdf
   ```

---

## Method 3: VS Code Extension (Easiest)

### Install Extension

1. Open VS Code
2. Install "Markdown PDF" extension by yzane
3. Or install "Markdown Preview Enhanced" by shd101wyy

### Using Markdown PDF Extension

1. Open your .md file
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type "Markdown PDF: Export (pdf)"
4. Select the command
5. PDF will be generated

**For Mermaid diagrams:**
- Install "Markdown Preview Mermaid Support" extension
- Diagrams will be rendered as images

### Using Markdown Preview Enhanced

1. Open .md file
2. Right-click → "Markdown Preview Enhanced: Open Preview"
3. In preview, right-click → "Chrome (Puppeteer)" → "PDF"
4. Or use command: `Ctrl+K V` then export

---

## Method 4: Online Converters (Quick but Limited)

### Option A: Dillinger.io

1. Go to https://dillinger.io/
2. Paste your Markdown content
3. Click "Export as" → "PDF"
4. **Note**: Mermaid diagrams may not render

### Option B: Markdown to PDF

1. Go to https://www.markdowntopdf.com/
2. Upload your .md file
3. Click "Convert"
4. Download PDF

---

## Method 5: Browser-Based (Best for Mermaid)

### Step 1: Convert Markdown to HTML with Mermaid

Use a tool that renders Mermaid:

**Option A: Using markdown-it with mermaid plugin**

Create a simple HTML wrapper:

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/markdown-it/dist/markdown-it.min.js"></script>
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        pre { background: #f4f4f4; padding: 15px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; }
    </style>
</head>
<body>
    <!-- Your markdown content here -->
</body>
</html>
```

**Option B: Use GitHub/GitLab**

1. Push your .md files to GitHub
2. View them on GitHub (Mermaid renders automatically)
3. Print to PDF (Ctrl+P → Save as PDF)

---

## Method 6: Automated Script (Recommended)

Create a conversion script that handles everything:

### Windows PowerShell Script

Save as `convert-to-pdf.ps1`:

```powershell
# Install required tools first:
# npm install -g md-to-pdf @mermaid-js/mermaid-cli

$files = @(
    "EXECUTIVE_SUMMARY.md",
    "SMART_COMB_TECHNICAL_DOCUMENTATION.md",
    "SYSTEM_DIAGRAMS.md"
)

foreach ($file in $files) {
    Write-Host "Converting $file..."
    
    # Convert Mermaid diagrams to images first (if needed)
    # Then convert to PDF
    md-to-pdf --mermaid $file
    
    Write-Host "✓ $file converted to PDF"
}

Write-Host "`nAll files converted!"
```

Run with:
```powershell
.\convert-to-pdf.ps1
```

### Linux/Mac Bash Script

Save as `convert-to-pdf.sh`:

```bash
#!/bin/bash

# Install: npm install -g md-to-pdf @mermaid-js/mermaid-cli

files=(
    "EXECUTIVE_SUMMARY.md"
    "SMART_COMB_TECHNICAL_DOCUMENTATION.md"
    "SYSTEM_DIAGRAMS.md"
)

for file in "${files[@]}"; do
    echo "Converting $file..."
    md-to-pdf --mermaid "$file"
    echo "✓ $file converted to PDF"
done

echo "All files converted!"
```

Make executable and run:
```bash
chmod +x convert-to-pdf.sh
./convert-to-pdf.sh
```

---

## Method 7: Using Obsidian (Best Quality)

### Setup

1. Install [Obsidian](https://obsidian.md/)
2. Open your folder in Obsidian
3. Install "Markdown PDF" community plugin

### Convert

1. Open your .md file in Obsidian
2. Right-click → "Export to PDF"
3. High-quality PDF with all formatting preserved

**Advantages:**
- Excellent Mermaid rendering
- Beautiful formatting
- Preserves all styles

---

## Recommended Workflow

### For Best Results:

1. **Use Method 1 (md-to-pdf) for quick conversion**
   ```bash
   npm install -g md-to-pdf @mermaid-js/mermaid-cli
   md-to-pdf --mermaid *.md
   ```

2. **Or use Method 7 (Obsidian) for highest quality**
   - Install Obsidian
   - Open folder
   - Export each file

3. **For manual control, use Method 3 (VS Code)**
   - Install Markdown PDF extension
   - Export from editor

---

## Troubleshooting

### Mermaid Diagrams Not Rendering

**Solution 1**: Use mermaid-cli to convert diagrams first
```bash
npm install -g @mermaid-js/mermaid-cli
mmdc -i diagram.mmd -o diagram.png
```

**Solution 2**: Use browser-based method (Method 5)

**Solution 3**: Use Obsidian (Method 7)

### Tables Not Formatting Correctly

**Solution**: Use Pandoc with LaTeX engine
```bash
pandoc file.md -o file.pdf --pdf-engine=xelatex
```

### Code Blocks Losing Syntax Highlighting

**Solution**: Use md-to-pdf with highlight.js
```bash
md-to-pdf --highlight-style github file.md
```

---

## Quick Reference

| Method | Mermaid Support | Quality | Speed | Ease |
|--------|----------------|---------|-------|------|
| md-to-pdf | ✅ (with flag) | High | Fast | Easy |
| Pandoc | ❌ (manual) | High | Fast | Medium |
| VS Code Extension | ✅ (with plugin) | Medium | Fast | Very Easy |
| Online Converters | ❌ | Low | Fast | Very Easy |
| Browser Print | ✅ | Medium | Medium | Easy |
| Obsidian | ✅ | Very High | Medium | Easy |

---

## One-Command Solution

For the quickest conversion with Mermaid support:

```bash
# Install once
npm install -g md-to-pdf @mermaid-js/mermaid-cli

# Convert all files
md-to-pdf --mermaid *.md
```

This will create PDF files with all diagrams rendered!

---

## Additional Tips

1. **For presentations**: Use the HTML presentation file (PRESENTATION.html) and print to PDF from browser

2. **For diagrams only**: Export Mermaid diagrams individually:
   ```bash
   mmdc -i SYSTEM_DIAGRAMS.md -o diagrams.pdf
   ```

3. **Combine PDFs**: Use PDFtk or online tools to merge multiple PDFs:
   ```bash
   pdftk *.pdf cat output combined.pdf
   ```

4. **Custom styling**: Create a CSS file for better formatting:
   ```bash
   md-to-pdf --css custom.css file.md
   ```

---

**Recommended**: Start with **Method 1 (md-to-pdf)** for the best balance of quality, speed, and Mermaid support!

