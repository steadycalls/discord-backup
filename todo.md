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

## Discord Meeting Notifications
- [x] Create client_mappings table for email-to-Discord channel mappings
- [x] Create CSV upload endpoint for client database
- [x] Build CSV parser to extract email and Discord channel data
- [x] Create backend procedure to match Read.ai participants with client emails
- [x] Update Read.ai webhook to trigger Discord notifications
- [x] Implement Discord bot function to post meeting summaries to channels
- [x] Build client database management UI with CSV upload
- [x] Add client mappings viewer page
- [ ] Test full flow: Read.ai webhook → match participant → post to Discord

## Enhanced AI Chat Database Access
- [x] Update AI chat to query Discord messages database
- [x] Update AI chat to query Read.ai meetings database
- [x] Update AI chat to query client mappings database
- [x] Enhance chat system prompt with database context
- [x] Add channel name resolution for queries like "bmw-guy"
- [ ] Test chat with multi-database queries

## Meetings Dashboard
- [x] Analyze Read.ai CSV structure
- [x] Create CSV import endpoint for meetings
- [x] Build CSV parser for Read.ai meetings data
- [x] Create backend procedures for meeting filtering (by date, client, channel)
- [x] Build meetings dashboard UI
- [x] Add date range filter
- [x] Add client/channel filter
- [x] Add quick links to Discord channels
- [ ] Import initial meetings from CSV

## Conversation Memory
- [x] Update chat backend to include conversation history in context
- [x] Modify AI system prompt to use conversation history
- [ ] Test multi-turn conversations with context retention

## Discord-to-Client Email Matching
- [x] Create UI to view Discord channels
- [x] Add interface to associate additional emails with channels
- [x] Create backend endpoint to add email mappings
- [ ] Test email matching with multiple emails per channel

## Final Steps
- [x] Push all changes to GitHub repository

## Backfill Script Update
- [x] Update backfill script to fetch 120 days instead of 30 days

## Analytics Dashboard
- [x] Create backend endpoint for meeting frequency by client
- [x] Create backend endpoint for average meeting duration
- [x] Create backend endpoint for most active channels
- [x] Create backend endpoint for participation trends over time
- [x] Build analytics dashboard page
- [x] Add charts for meeting frequency
- [x] Add metrics cards for key statistics
- [x] Add time range selector for analytics

## Meeting Search Autocomplete
- [x] Create backend endpoint for search suggestions
- [x] Implement autocomplete for client names
- [x] Implement autocomplete for participant names
- [x] Implement autocomplete for meeting topics
- [x] Add autocomplete UI component to meetings search
- [ ] Test autocomplete performance with large datasets

## Application Title Update
- [ ] Update VITE_APP_TITLE in Settings UI to "LI Systems Manager"
- [ ] Verify title appears correctly in all pages
- [ ] Push changes to GitHub

## Domain-Based Access Control
- [x] Add email domain whitelist check in authentication callback
- [x] Allow @logicinbound.com domain users to access the application
- [x] Test with different email domains
- [x] Push changes to GitHub

## Bug Fixes
- [x] Fix Select component empty string value error in Meetings page
- [x] Test Meetings page loads correctly
- [x] Push fix to GitHub

## Google Sheet Integration
- [x] Add button on Meetings page to link to Google Sheet
- [x] Add instructions to download and upload new version
- [x] Test button functionality
- [x] Push changes to GitHub

## Title Update
- [x] Replace all hardcoded "Discord Archive Webhook Manager" with APP_TITLE constant
- [x] Test title updates throughout the application
- [x] Push changes to GitHub

## Logo Upload Feature
- [x] Create backend endpoint for logo upload to S3
- [x] Create backend endpoint to get current logo URL
- [ ] Add logo upload UI to Settings page
- [ ] Update APP_LOGO constant to use uploaded logo
- [ ] Test logo upload and display throughout application
- [ ] Push changes to GitHub

## AI Chat Database Fix
- [x] Debug why AI chat isn't querying Discord messages database
- [x] Verify database query logic in sendMessage procedure
- [x] Improve channel keyword detection (e.g., "wins" -> #wins-and-shoutouts)
- [x] Broaden search to return recent messages when no specific search terms
- [ ] Test AI chat with channel-specific queries

## Chat UI Layout Fix
- [x] Fix sidebar to not scroll with chat messages
- [x] Fix message input to stay at bottom of screen when scrolling
- [ ] Test chat scrolling behavior

## Profile Dropdown Menu
- [x] Remove "Manage Webhooks" button from header
- [x] Add profile image (Gravatar) to header
- [x] Create dropdown menu on profile click
- [x] Add "Edit Profile" option to dropdown
- [x] Add "Settings" option to dropdown
- [x] Add "Logout" option to dropdown
- [ ] Test profile dropdown functionality

## Home Screen Activity Stats
- [x] Create backend endpoint to get Discord message count for 24h/7d
- [x] Create backend endpoint to get Read.ai meeting count for 24h/7d
- [x] Create backend endpoint to get AI chat count for 24h/7d
- [x] Add stat cards to Home page showing activity metrics
- [x] Add toggle to switch between 24-hour and 7-day views
- [x] Style stat cards to match the design mockup
- [ ] Test activity stats with real data

## Message Attachments Display
- [x] Update Discord bot to save attachment URLs to database
- [x] Update database schema to store attachments
- [x] Display images inline in Browse Messages page
- [ ] Display images in AI chat responses when relevant
- [ ] Test image display with real Discord messages
