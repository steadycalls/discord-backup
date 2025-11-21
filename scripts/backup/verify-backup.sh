#!/bin/bash

# Backup Verification Script
# Tests backup integrity and restoration capability

set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
POSTGRES_DB="${POSTGRES_DB:-discord_archive}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }

echo "=========================================="
echo "Backup Verification Report"
echo "=========================================="
echo ""

# Check backup directory
if [ ! -d "$BACKUP_DIR" ]; then
    print_error "Backup directory not found: $BACKUP_DIR"
    exit 1
fi

# Find all backups
BACKUPS=$(find "$BACKUP_DIR" -name "backup_${POSTGRES_DB}_*.sql.gz" -type f | sort -r)

if [ -z "$BACKUPS" ]; then
    print_warning "No backups found"
    exit 0
fi

TOTAL=0
VALID=0
CORRUPTED=0

while IFS= read -r backup; do
    TOTAL=$((TOTAL + 1))
    FILENAME=$(basename "$backup")
    SIZE=$(du -h "$backup" | cut -f1)
    
    echo "Checking: $FILENAME ($SIZE)"
    
    # Test gzip integrity
    if gzip -t "$backup" 2>/dev/null; then
        print_success "  Integrity: OK"
        VALID=$((VALID + 1))
    else
        print_error "  Integrity: CORRUPTED"
        CORRUPTED=$((CORRUPTED + 1))
    fi
    
    echo ""
done <<< "$BACKUPS"

echo "=========================================="
echo "Summary"
echo "=========================================="
echo "Total backups: $TOTAL"
echo "Valid backups: $VALID"
echo "Corrupted backups: $CORRUPTED"
echo ""

if [ $CORRUPTED -gt 0 ]; then
    print_warning "Some backups are corrupted!"
    exit 1
else
    print_success "All backups are valid"
    exit 0
fi
