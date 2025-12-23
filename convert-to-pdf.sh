#!/bin/bash

# Bash Script to Convert Markdown Files to PDF
# Usage: ./convert-to-pdf.sh

echo "========================================"
echo "Markdown to PDF Converter"
echo "========================================"
echo ""

# Check if md-to-pdf is installed
if ! command -v md-to-pdf &> /dev/null; then
    echo "md-to-pdf not found. Installing..."
    npm install -g md-to-pdf
    echo "✓ md-to-pdf installed"
fi

# Check if mermaid-cli is installed
if ! command -v mmdc &> /dev/null; then
    echo "mermaid-cli not found. Installing..."
    npm install -g @mermaid-js/mermaid-cli
    echo "✓ mermaid-cli installed"
fi

echo ""
echo "Files to convert:"

# List of files to convert
files=(
    "EXECUTIVE_SUMMARY.md"
    "SMART_COMB_TECHNICAL_DOCUMENTATION.md"
    "SYSTEM_DIAGRAMS.md"
    "README.md"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file (not found)"
    fi
done

echo ""
echo "Starting conversion..."
echo ""

success_count=0
fail_count=0

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "Converting: $file"
        
        if md-to-pdf --mermaid "$file"; then
            pdf_file="${file%.md}.pdf"
            echo "  ✓ Success: $pdf_file created"
            ((success_count++))
        else
            echo "  ✗ Failed to convert $file"
            ((fail_count++))
        fi
        
        echo ""
    fi
done

echo "========================================"
echo "Conversion Complete!"
echo "  Success: $success_count"
echo "  Failed: $fail_count"
echo "========================================"

if [ $success_count -gt 0 ]; then
    echo ""
    echo "PDF files created in current directory:"
    ls -1 *.pdf 2>/dev/null | while read pdf; do
        echo "  • $pdf"
    done
fi

