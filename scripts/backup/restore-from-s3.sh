#!/bin/bash

# S3 Backup Download and Restore Script
# Downloads backups from S3 and restores them to the database

set -e

# Configuration
S3_BUCKET="${S3_BUCKET}"
S3_PREFIX="${S3_PREFIX:-database-backups/}"
AWS_REGION="${AWS_REGION:-us-east-1}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }

# Check S3 configuration
if [ -z "$S3_BUCKET" ]; then
    print_error "S3_BUCKET environment variable is not set"
    exit 1
fi

if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    print_error "AWS credentials not configured"
    exit 1
fi

# List S3 backups
list_s3_backups() {
    echo "=========================================="
    echo "S3 Backups (s3://$S3_BUCKET/$S3_PREFIX)"
    echo "=========================================="
    echo ""
    
    if ! aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX" --region "$AWS_REGION" > /dev/null 2>&1; then
        print_error "Failed to access S3 bucket"
        print_info "Check your AWS credentials and bucket permissions"
        exit 1
    fi
    
    BACKUPS=$(aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX" --region "$AWS_REGION" | grep "\.sql\.gz$" | sort -r)
    
    if [ -z "$BACKUPS" ]; then
        print_warning "No backups found in S3"
        exit 0
    fi
    
    COUNT=1
    while IFS= read -r line; do
        FILENAME=$(echo "$line" | awk '{print $4}')
        SIZE=$(echo "$line" | awk '{print $3}')
        DATE=$(echo "$line" | awk '{print $1, $2}')
        
        # Convert size to human readable
        if [ "$SIZE" -gt 1073741824 ]; then
            SIZE_HR="$(echo "scale=2; $SIZE / 1073741824" | bc)GB"
        elif [ "$SIZE" -gt 1048576 ]; then
            SIZE_HR="$(echo "scale=2; $SIZE / 1048576" | bc)MB"
        else
            SIZE_HR="$(echo "scale=2; $SIZE / 1024" | bc)KB"
        fi
        
        echo "$COUNT. $FILENAME"
        echo "   Size: $SIZE_HR"
        echo "   Date: $DATE"
        echo ""
        COUNT=$((COUNT + 1))
    done <<< "$BACKUPS"
    
    echo "To restore a backup, run:"
    echo "  $0 <backup_filename>"
    echo ""
}

# Main script
if [ -z "$1" ]; then
    list_s3_backups
    exit 0
fi

BACKUP_FILENAME="$1"
S3_PATH="s3://$S3_BUCKET/$S3_PREFIX$BACKUP_FILENAME"
LOCAL_PATH="$BACKUP_DIR/$BACKUP_FILENAME"

echo "=========================================="
echo "S3 Backup Download and Restore"
echo "=========================================="
echo "S3 path: $S3_PATH"
echo "Local path: $LOCAL_PATH"
echo ""

# Check if backup exists in S3
print_info "Checking if backup exists in S3..."
if ! aws s3 ls "$S3_PATH" --region "$AWS_REGION" > /dev/null 2>&1; then
    print_error "Backup not found in S3: $BACKUP_FILENAME"
    echo ""
    list_s3_backups
    exit 1
fi
print_success "Backup found in S3"

# Download backup from S3
print_info "Downloading backup from S3..."
START_TIME=$(date +%s)

if aws s3 cp "$S3_PATH" "$LOCAL_PATH" --region "$AWS_REGION"; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    SIZE=$(du -h "$LOCAL_PATH" | cut -f1)
    
    print_success "Download completed"
    echo "Duration: ${DURATION}s"
    echo "Size: $SIZE"
else
    print_error "Failed to download backup from S3"
    exit 1
fi

# Verify downloaded file
print_info "Verifying downloaded file..."
if ! gzip -t "$LOCAL_PATH" 2>/dev/null; then
    print_error "Downloaded file is corrupted"
    rm -f "$LOCAL_PATH"
    exit 1
fi
print_success "File integrity verified"

echo ""
print_info "Backup downloaded successfully to: $LOCAL_PATH"
echo ""
echo "To restore this backup to the database, run:"
echo "  /scripts/restore-database.sh $BACKUP_FILENAME"
echo ""

exit 0
