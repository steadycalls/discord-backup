# Docker Deployment Guide

Complete guide for deploying Logic Inbound Systems Manager using Docker and Docker Compose.

## What's Included

The Docker setup includes:

- **Full-stack web application** (Node.js + React)
  - Express backend with tRPC API
  - React frontend (pre-built and served)
  - All webhook endpoints (Read.ai, A2P scraper)
  - AI chat functionality
  - File storage integration

- **PostgreSQL database**
  - All database tables and schemas
  - Automatic migrations on startup
  - Persistent data storage

## Prerequisites

- **Docker**: Version 20.10 or higher ([Install Docker](https://docs.docker.com/get-docker/))
- **Docker Compose**: Version 2.0 or higher (included with Docker Desktop)
- **Manus Account**: For OAuth authentication and API access

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/steadycalls/discord-backup.git
cd discord-backup
```

### 2. Configure Environment Variables

Copy the example environment file and edit it with your settings:

```bash
cp .env.docker.example .env
```

Edit `.env` and configure the following **required** variables:

```env
# Database (change the password!)
POSTGRES_PASSWORD=your_secure_password_here

# Manus OAuth (get these from your Manus dashboard)
VITE_APP_ID=your_manus_app_id
JWT_SECRET=your_jwt_secret_here
OWNER_OPEN_ID=your_owner_open_id
OWNER_NAME=Your Name

# Manus APIs
BUILT_IN_FORGE_API_KEY=your_forge_api_key
VITE_FRONTEND_FORGE_API_KEY=your_frontend_forge_api_key
```

### 3. Start the Application

```bash
docker-compose up -d
```

This will:
- Pull the PostgreSQL image
- Build the application image
- Start both containers
- Run database migrations
- Expose the application on port 3000

### 4. Access the Application

Open your browser and navigate to:

```
http://localhost:3000
```

The application is now running! Log in with your Manus account.

## Configuration

### Environment Variables

All configuration is done through environment variables in the `.env` file.

#### Database Settings

```env
POSTGRES_DB=discord_archive          # Database name
POSTGRES_USER=postgres                # Database user
POSTGRES_PASSWORD=changeme            # Database password (CHANGE THIS!)
POSTGRES_PORT=5432                    # PostgreSQL port
```

#### Application Settings

```env
APP_PORT=3000                         # Application port
VITE_APP_TITLE=Logic Inbound Systems Manager
VITE_APP_LOGO=/logo.svg
```

#### A2P Scraper Authentication

```env
A2P_API_KEY=a2p_6df5c666c1adff802b4aaec5b1d79144c070d06cc952e6aeb06d675acdfd958d
```

This key is used by the PowerShell A2P scraper to authenticate webhook uploads.

## Docker Commands

### Start Services

```bash
# Start in detached mode (background)
docker-compose up -d

# Start with logs visible
docker-compose up
```

### Stop Services

```bash
# Stop containers (keeps data)
docker-compose stop

# Stop and remove containers (keeps data)
docker-compose down

# Stop, remove containers, and delete volumes (DELETES ALL DATA)
docker-compose down -v
```

### View Logs

```bash
# View all logs
docker-compose logs

# View application logs only
docker-compose logs app

# View database logs only
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f app
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart application only
docker-compose restart app
```

### Rebuild Application

After making code changes:

```bash
# Rebuild and restart
docker-compose up -d --build
```

## Database Management

### Access PostgreSQL

Connect to the database using any PostgreSQL client:

```
Host: localhost
Port: 5432
Database: discord_archive
User: postgres
Password: (from your .env file)
```

### Run Migrations Manually

Migrations run automatically on startup, but you can run them manually:

```bash
docker-compose exec app pnpm db:push
```

### Backup Database

```bash
docker-compose exec postgres pg_dump -U postgres discord_archive > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker-compose exec -T postgres psql -U postgres discord_archive
```

## External Services

The following services run **outside** Docker and connect to the Dockerized application:

### Discord Bot (Python)

The Discord bot runs separately on your Discord server. Configure it to connect to your Docker application:

1. Navigate to `scripts/discord-bot/`
2. Edit `.env` file:
   ```env
   API_URL=http://localhost:3000
   ```
3. Run the bot:
   ```bash
   python bot.py
   ```

### PowerShell A2P Scraper (Windows)

The A2P scraper runs on Windows machines. Configure it during installation:

1. Run `Install.ps1`
2. Enter API URL: `http://your-docker-host:3000`
3. Enter API Key: (from your `.env` file)

## Production Deployment

### Using a Reverse Proxy

For production, use a reverse proxy (nginx, Caddy, Traefik) with SSL:

**Example nginx configuration:**

```nginx
server {
    listen 80;
    server_name systems.logicinbound.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Environment-Specific Settings

Create different `.env` files for different environments:

```bash
# Development
cp .env.docker.example .env.dev

# Production
cp .env.docker.example .env.prod
```

Use the appropriate file:

```bash
# Development
docker-compose --env-file .env.dev up -d

# Production
docker-compose --env-file .env.prod up -d
```

### Security Considerations

1. **Change default passwords**: Always use strong, unique passwords
2. **Restrict database access**: Don't expose PostgreSQL port publicly
3. **Use HTTPS**: Always use SSL/TLS in production
4. **Secure API keys**: Keep `.env` file permissions restricted (chmod 600)
5. **Update regularly**: Keep Docker images updated

## Troubleshooting

### Application won't start

**Check logs:**
```bash
docker-compose logs app
```

**Common issues:**
- Missing environment variables
- Database connection failed
- Port already in use

### Database connection errors

**Verify database is running:**
```bash
docker-compose ps postgres
```

**Check database logs:**
```bash
docker-compose logs postgres
```

### Port conflicts

If port 3000 or 5432 is already in use, change it in `.env`:

```env
APP_PORT=8080
POSTGRES_PORT=5433
```

### Reset everything

To start fresh (WARNING: deletes all data):

```bash
docker-compose down -v
docker-compose up -d
```

## Monitoring

### Health Checks

Check if services are healthy:

```bash
docker-compose ps
```

### Resource Usage

Monitor CPU and memory:

```bash
docker stats
```

### Application Metrics

Access the application at `http://localhost:3000` and navigate to:
- **Dashboard**: View system activity
- **Analytics**: Monitor usage trends
- **A2P Status**: Check campaign monitoring

## Updating

### Update Application Code

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build
```

### Update Docker Images

```bash
# Pull latest base images
docker-compose pull

# Restart services
docker-compose up -d
```

## Support

For issues or questions:

1. Check the logs: `docker-compose logs -f`
2. Review this documentation
3. Check the main README.md
4. Open an issue on GitHub

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
