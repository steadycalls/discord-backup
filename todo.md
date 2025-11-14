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

## Bug Fixes
- [x] Fix Select component empty value error in Messages page channel filter
- [x] Fix Select component empty value error in Webhooks page create form

## UI Improvements
- [x] Sort channels alphabetically (A-Z) in Messages page dropdown
- [x] Set "Restoration Inbound" as default selected guild in Messages page
- [x] Debug: Fix default guild not being set to "Restoration Inbound"
- [x] Debug: Fix channel sorting not working alphabetically

## Backfill Features
- [x] Document how to backfill messages from last 30 days
- [x] Create helper script for bulk backfilling all channels

## Auto-Archive Feature
- [x] Create script to move inactive channels (30+ days) to Archive category
- [x] Document how to run the auto-archive script
- [x] Add notification feature to send messages when channels are archived

## AI Chat Interface
- [x] Create chat conversations table in database
- [x] Create chat messages table in database
- [x] Create backend procedures for chat operations (create, list, get, delete)
- [x] Create backend procedure for AI message streaming
- [x] Build chat page with sidebar layout (history on left, conversation on right)
- [x] Implement new chat creation
- [x] Implement chat history display
- [x] Implement message streaming UI
- [x] Add search functionality for archived Discord messages via AI

## Settings Page
- [x] Create user settings table in database
- [x] Create backend procedures for settings CRUD
- [x] Build settings page UI
- [x] Add OpenAI API key input field
- [x] Implement secure API key storage and retrieval

## Read.ai Webhook Integration
- [x] Create meetings table in database
- [x] Create inbound webhook endpoint for Read.ai
- [x] Parse Read.ai webhook payload (link, summary, title, participants)
- [x] Store meeting data in database
- [ ] Add UI to view received meetings
