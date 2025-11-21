#!/bin/bash

# PostgreSQL Database Restoration Script
# Restores database from compressed backup files

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-discord_archive}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Usage information
usage() {
    echo "Usage: $0 [backup_file]"
    echo ""
    echo "Restore PostgreSQL database from a backup file."
    echo ""
    echo "Options:"
    echo "  backup_file    Path to backup file (optional)"
    echo "                 If not specified, lists available backups"
    echo ""
    echo "Examples:"
    echo "  $0                                    # List available backups"
    echo "  $0 backup_discord_archive_20240101_120000.sql.gz"
    echo "  $0 /backups/backup_discord_archive_20240101_120000.sql.gz"
    echo ""
    exit 1
}

# List available backups
list_backups() {
    echo "=========================================="
    echo "Available Backups"
    echo "=========================================="
    echo ""
    
    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi
    
    BACKUPS=$(find "$BACKUP_DIR" -name "backup_${POSTGRES_DB}_*.sql.gz" -type f | sort -r)
    
    if [ -z "$BACKUPS" ]; then
        print_warning "No backups found in $BACKUP_DIR"
        exit 0
    fi
    
    COUNT=1
    while IFS= read -r backup; do
        FILENAME=$(basename "$backup")
        SIZE=$(du -h "$backup" | cut -f1)
        DATE=$(stat -c %y "$backup" | cut -d'.' -f1)
        echo "$COUNT. $FILENAME"
        echo "   Size: $SIZE"
        echo "   Date: $DATE"
        echo ""
        COUNT=$((COUNT + 1))
    done <<< "$BACKUPS"
    
    echo "To restore a backup, run:"
    echo "  $0 <backup_filename>"
    echo ""
}

# Main script
if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
    usage
fi

if [ -z "$1" ]; then
    list_backups
    exit 0
fi

BACKUP_FILE="$1"

# If only filename provided, prepend backup directory
if [ ! -f "$BACKUP_FILE" ]; then
    BACKUP_FILE="$BACKUP_DIR/$1"
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    print_error "Backup file not found: $BACKUP_FILE"
    echo ""
    list_backups
    exit 1
fi

echo "=========================================="
echo "PostgreSQL Database Restoration"
echo "=========================================="
echo "Database: $POSTGRES_DB"
echo "Host: $POSTGRES_HOST:$POSTGRES_PORT"
echo "Backup file: $(basename "$BACKUP_FILE")"
echo "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
echo ""

print_warning "WARNING: This will REPLACE all data in the database!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    print_info "Restoration cancelled"
    exit 0
fi

echo ""

# Verify backup file integrity
print_info "Verifying backup file integrity..."
if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
    print_error "Backup file is corrupted or invalid"
    exit 1
fi
print_success "Backup file integrity verified"

# Check PostgreSQL connection
print_info "Checking database connection..."
if ! PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "postgres" -c "SELECT 1;" > /dev/null 2>&1; then
    print_error "Failed to connect to PostgreSQL server"
    exit 1
fi
print_success "Database connection successful"

# Terminate existing connections
print_info "Terminating existing database connections..."
PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "postgres" -c "
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$POSTGRES_DB'
  AND pid <> pg_backend_pid();" > /dev/null 2>&1 || true
print_success "Connections terminated"

# Restore database
print_info "Restoring database from backup..."
START_TIME=$(date +%s)

if gunzip -c "$BACKUP_FILE" | PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --quiet \
    --single-transaction \
    2>&1 | grep -v "^$" | grep -v "NOTICE" | grep -v "WARNING" || true; then
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    print_success "Database restored successfully"
    echo "Duration: ${DURATION}s"
else
    print_error "Database restoration failed"
    exit 1
fi

# Verify restoration
print_info "Verifying database restoration..."
TABLE_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

if [ "$TABLE_COUNT" -gt 0 ]; then
    print_success "Restoration verified ($TABLE_COUNT tables found)"
else
    print_warning "No tables found in database after restoration"
fi

echo ""
echo "=========================================="
print_success "Restoration completed successfully"
echo "=========================================="
echo ""

exit 0
