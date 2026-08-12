# 🎫 AURA Ticket System

Welcome to the **AURA Ticket System** module! This is a professional, highly customizable, and interactive support system built with Node.js and discord.js (v14). It is designed to streamline server support, manage staff workflows, and securely log transcripts.

## ✨ Core Features

*   📋 **Interactive Multi-Category Panels:** Create custom ticket panels with drop-down menus (Select Menus) for different support categories (e.g., General, Billing, Reports).
*   📝 **Pre-Ticket Modals:** Collect essential information from users via pop-up forms *before* the ticket channel is even created, saving staff time.
*   🔒 **Secure & Private Channels:** Automatic permission syncing ensures that only the ticket creator, assigned staff, and server admins can view the channel.
*   ✋ **Staff Claiming Workflow:** Prevent overlapping support by allowing staff members to claim and take exclusive ownership of specific tickets.
*   📜 **Automatic HTML Transcripts:** Instantly generate and save a complete chat history (including embeds and attachments) to a designated log channel and the user's DMs upon closure.
*   💾 **Persistent Database:** Powered by MongoDB to securely store ticket configurations, logs, and server settings.

## 📌 Available Commands

| Command | Description | Permissions |
| :--- | :--- | :--- |
| `/ticket-panel` | Deploy the interactive support panel for members to open tickets. | `Administrator` |
| `/ticket-add` | Add a specific member or role to an active ticket. | `Support Staff` |
| `/ticket-remove` | Remove a member or role from an active ticket. | `Support Staff` |
| `/ticket-claim` | Claim an open ticket to assign yourself as the primary handler. | `Support Staff` |
| `/ticket-close` | Securely close the ticket and generate the automatic HTML transcript. | `Support Staff` |

## 🚀 Setup Instructions

1. **Install Required Packages:**
   Ensure you have the necessary dependencies installed for transcripts and database management:
   ```bash
   npm install discord.js mongoose discord-html-transcripts
   ```

2. **Configure MongoDB:**
   Make sure your MongoDB connection URI is properly set up in your `.env` file to save ticket settings and panel configs:
   ```env
   MONGO_URI=your_mongodb_connection_string
   ```

3. **Deploy the Panel:**
   Use the `/ticket-panel` command in your desired support channel to set up the interactive menu for your members.

## 🛠️ Built With

*   **[discord.js v14](https://discord.js.org/)** - For Buttons, Select Menus, and Modals.
*   **[discord-html-transcripts](https://www.npmjs.com/package/discord-html-transcripts)** - For high-quality chat logging.
*   **[Mongoose](https://mongoosejs.com/)** - For MongoDB database schemas.
