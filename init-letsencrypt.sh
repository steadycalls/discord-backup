#!/bin/bash

# Initialize Let's Encrypt SSL certificates for Nginx
# This script obtains SSL certificates and switches Nginx to HTTPS configuration

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if DOMAIN is set
if [ -z "$DOMAIN" ]; then
    echo "Error: DOMAIN environment variable is not set"
    echo "Please set DOMAIN in your .env file (e.g., DOMAIN=systems.logicinbound.com)"
    exit 1
fi

# Check if email is provided
if [ -z "$1" ]; then
    echo "Usage: ./init-letsencrypt.sh your-email@example.com"
    echo "Example: ./init-letsencrypt.sh admin@logicinbound.com"
    exit 1
fi

EMAIL=$1
STAGING=${2:-0}  # Set to 1 for staging certificates (testing)

echo "==================================="
echo "Let's Encrypt SSL Setup"
echo "==================================="
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "Staging: $STAGING"
echo ""

# Create required directories
mkdir -p nginx/ssl

# Download recommended TLS parameters
if [ ! -e "nginx/ssl/options-ssl-nginx.conf" ]; then
    echo "Downloading recommended TLS parameters..."
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > nginx/ssl/options-ssl-nginx.conf
fi

if [ ! -e "nginx/ssl/ssl-dhparams.pem" ]; then
    echo "Downloading recommended DH parameters..."
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > nginx/ssl/ssl-dhparams.pem
fi

# Start services with HTTP-only configuration
echo ""
echo "Starting services with HTTP configuration..."
docker-compose up -d nginx

# Wait for Nginx to start
echo "Waiting for Nginx to be ready..."
sleep 5

# Request certificate
echo ""
echo "Requesting SSL certificate from Let's Encrypt..."

if [ $STAGING != "0" ]; then
    STAGING_ARG="--staging"
    echo "(Using staging server for testing)"
else
    STAGING_ARG=""
fi

docker-compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    $STAGING_ARG \
    -d $DOMAIN

# Check if certificate was obtained successfully
if [ $? -eq 0 ]; then
    echo ""
    echo "✓ SSL certificate obtained successfully!"
    echo ""
    echo "Switching to HTTPS configuration..."
    
    # Update Nginx to use SSL configuration
    docker-compose exec nginx sh -c "envsubst '\$DOMAIN' < /etc/nginx/templates/app-ssl.conf.template > /etc/nginx/conf.d/default.conf && nginx -s reload"
    
    echo ""
    echo "==================================="
    echo "✓ Setup Complete!"
    echo "==================================="
    echo ""
    echo "Your application is now accessible at:"
    echo "  https://$DOMAIN"
    echo ""
    echo "SSL certificates will auto-renew every 12 hours."
    echo ""
else
    echo ""
    echo "✗ Failed to obtain SSL certificate"
    echo ""
    echo "Common issues:"
    echo "1. DNS not pointing to this server"
    echo "2. Firewall blocking port 80"
    echo "3. Domain not accessible from internet"
    echo ""
    echo "For testing, you can use staging certificates:"
    echo "  ./init-letsencrypt.sh $EMAIL 1"
    echo ""
    exit 1
fi
