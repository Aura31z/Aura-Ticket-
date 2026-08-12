# 🎫 Advanced Discord Ticket Bot System (`discord.js` v14 & Mongoose)

A full-featured, highly customizable, and professional Ticket Bot system designed for modern Discord servers. Built with **discord.js v14**, **MongoDB (Mongoose)**, **Slash Commands**, **Interactive Dropdown Menus**, **Action Buttons**, **Modals**, and **HTML Transcripts**.

---

## 🎯 Features

- **Interactive Ticket Panels**: Deploy customized ticket panels with multiple categories (e.g. *General Support*, *Billing*, *Bug Reports*, *Staff Applications*). Supports both `SelectMenu` dropdowns and `Buttons`.
- **Multi-Step Modal Forms**: Collect structured details from users (Issue description, Subject, Account/Order IDs) before channel creation.
- **Dynamic Channel Management**: Auto-numbered dynamic channels (e.g., `ticket-0001`, `billing-john`) with strict automated permission syncing (Creator, Support Staff, Admins, Bot).
- **Staff Control Bar**: Interactive button bar attached to every ticket welcome embed:
  - 🔒 **Close Ticket**: Generates HTML transcript, sends direct copy to ticket creator DM, posts log entry with details to the central log channel, and archives/deletes channel.
  - 📌 **Claim / Unclaim**: Prevents staff overlap by assigning a specific staff member.
  - 📜 **Transcript**: Generates on-demand HTML transcript file (`discord-html-transcripts`).
  - ➕ / ➖ **Add / Remove Member**: Interactively add or remove users from the channel.
  - 🔔 **Ping User**: Remind ticket creator to reply.
- **User Blacklisting**: `/blacklist` slash command suite to restrict rule-violating users from opening tickets.
- **Max Ticket Limits**: Configurable per-server limit of maximum active tickets per user.
- **Stale Ticket Detector**: Background worker process monitoring inactive tickets and warning/auto-closing stale conversations.

---

## 📂 Project Structure

```text
├── package.json
├── .env.example
├── .gitignore
├── README.md
├── src/
│   ├── index.js                # Main Bot entrypoint & command/event loader
│   ├── config.js               # Global configuration & color theme definitions
│   ├── database/
│   │   ├── connect.js          # Mongoose database connection initialization
│   │   └── models/
│   │       ├── GuildConfig.js  # TicketConfig schema (panels, roles, log channel, counters)
│   │       ├── Ticket.js       # TicketData schema (active/closed ticket tracking)
│   │       └── Blacklist.js    # Blacklist schema (banned users per guild)
│   ├── events/
│   │   ├── ready.js            # Ready event & slash command registration
│   │   └── interactionCreate.js# Central router for slash commands, buttons, menus & modals
│   ├── commands/
│   │   ├── setup-panel.js      # /setup-panel - Deploy custom panel to text channel
│   │   ├── ticket.js           # /ticket (close, claim, unclaim, add, remove, transcript)
│   │   └── blacklist.js        # /blacklist (add, remove, list)
│   ├── handlers/
│   │   ├── panelHandler.js     # Select menu/button trigger -> Modal form pop-up
│   │   ├── modalHandler.js     # Modal submit -> channel creation & permission sync
│   │   └── ticketControls.js   # Control bar button handlers (Close, Claim, Transcript, etc.)
│   └── utils/
│       ├── embeds.js           # Sleek design embed templates (#2B2D31, #5865F2, #ED4245)
│       ├── transcript.js       # HTML transcript generator helper
│       └── staleChecker.js     # Background worker for stale ticket monitoring
```

---

## 🛠️ Installation & Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Running instance locally (`mongodb://localhost:27017/ticket-bot`) or MongoDB Atlas URI.
- **Discord Bot Token**: Created via [Discord Developer Portal](https://discord.com/developers/applications) with `Guilds`, `GuildMessages`, `GuildMembers`, and `MessageContent` privileged intents enabled.

### 2. Configuration
1. Clone or copy the codebase to your server directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and populate your credentials:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   MONGODB_URI=mongodb://localhost:27017/ticket-bot
   ```

### 3. Running the Bot
- **Development Mode** (auto-reload):
  ```bash
  npm run dev
  ```
- **Production Mode**:
  ```bash
  npm start
  ```

---

## 🎮 Commands & Usage

### 1. Deploying a Ticket Panel (`/setup-panel`)
Administrators can run `/setup-panel` to deploy an interactive panel to a target channel:
- `channel`: Channel where panel will be posted.
- `support_role`: Role granted view/reply access to tickets.
- `log_channel`: (Optional) Channel receiving ticket transcripts and closure logs.
- `title`: (Optional) Custom header for embed.
- `display_mode`: Choose between `SELECT_MENU` (Dropdown) or `BUTTONS`.

### 2. Staff & Ticket Management (`/ticket`)
- `/ticket close [reason]`: Close current ticket, generate HTML transcript, notify user DM and log channel.
- `/ticket claim`: Claim responsibility for ticket.
- `/ticket unclaim`: Release claim status.
- `/ticket add <user>`: Grant user access to channel.
- `/ticket remove <user>`: Revoke user access.
- `/ticket transcript`: Generate and download HTML transcript file.

### 3. User Blacklisting (`/blacklist`)
- `/blacklist add <user> [reason]`: Prevent user from opening tickets.
- `/blacklist remove <user>`: Remove user from blacklist.
- `/blacklist list`: View all blacklisted users in server.

---

## 🎨 UI & Design Palette
- **Primary Blurple**: `#5865F2`
- **Dark Background Embeds**: `#2B2D31`
- **Success Green**: `#57F287`
- **Danger Red**: `#ED4245`
- **Warning Yellow**: `#FEE75C`
