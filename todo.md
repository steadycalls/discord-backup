# Discord Archive Project TODO

## Database Schema
- [x] Create Discord guilds table
- [x] Create Discord channels table
- [x] Create Discord users table (separate from auth users)
- [x] Create Discord messages table with full-text search indexes
- [x] Create Discord attachments table
- [x] Create webhook registry table for managing webhooks
- [x] Create webhook logs table for tracking webhook deliveries

## Discord Bot Scripts
- [x] Create Python bot script with discord.py
- [x] Implement database connection helper (db.py)
- [x] Implement message sync on new messages
- [x] Implement backfill command for historical messages
- [x] Create requirements.txt for Python dependencies
- [x] Create .env.example for configuration

## Backend API (tRPC Procedures)
- [x] Create procedures to list Discord guilds
- [x] Create procedures to list Discord channels
- [x] Create procedures to query Discord messages with filters
- [x] Create procedures to manage webhooks (CRUD)
- [x] Create procedures to view webhook logs
- [x] Create procedure to test webhook delivery

## PostgreSQL Triggers & Webhook System
- [ ] Create PostgreSQL trigger function for message INSERT events
- [ ] Create PostgreSQL trigger function for message UPDATE events
- [ ] Create PostgreSQL trigger function for message DELETE events
- [ ] Create webhook dispatcher service (Node.js/Python)
- [ ] Implement NOTIFY/LISTEN for real-time event propagation

## Web Interface
- [x] Design landing page with system overview
- [x] Create dashboard layout with navigation
- [x] Build message browser page with search and filters
- [x] Build webhook management page with CRUD form
- [x] Build webhook logs viewer page
- [x] Add webhook test functionality

## Installation & Setup
- [x] Create PostgreSQL installation script
- [x] Create database initialization script
- [x] Create Discord bot setup guide
- [x] Create comprehensive README with step-by-step instructions
- [ ] Create environment configuration templates

## Documentation
- [x] Document API endpoints
- [x] Document webhook payload format
- [x] Document database schema
- [x] Create troubleshooting guide
