# Deploy A/L Insight Bot on Pterodactyl

A ready-to-import Pterodactyl **egg** is included: [`egg-al-insight-bot.json`](./egg-al-insight-bot.json).

It runs the bot with Node.js (yolks image), installs dependencies automatically, sets the required
`PHONE_NUMBER` startup variable, and treats the bot's status page as the "server is running" signal.
The status page binds to the panel's allocated port (`SERVER_PORT`), so you can open
`http://<server-ip>:<port>` to see the live pairing code and connection state.

> ⚠️ **Important:** WhatsApp blocks device linking (pairing code) from many datacenter/cloud IPs.
> If the console shows `WhatsApp rejected the connection (401)`, that IP is blocked — run the bot on
> a home server/network or an IP WhatsApp accepts. This is a WhatsApp-side block, not a bot bug.

## One-time: import the egg

1. Open your Pterodactyl **Admin Panel** → **Nests**.
2. Click **Import Egg** and upload `egg-al-insight-bot.json`.
3. A new nest (or egg under the existing nest) named **A/L Insight Bot** appears.

## Create the server

1. **Create New Server** → select the **A/L Insight Bot** egg.
2. Under **Deployment**, allocate a port (or leave the default). The bot uses it automatically.
3. Under **Startup**:
   - **Docker Image**: `Node.js 20` (or `Node.js 22`).
   - **WhatsApp phone number (pairing)**: enter your number in international format without `+`,
     e.g. `94764642432` — this is **required**.
   - Optionally set `GEMINI_API_KEY` (for image/vision questions) and adjust the AI provider.
4. Create the server.

## Upload the bot files

Pterodactyl servers start empty — upload the repository into the server's file root:

1. Open the server → **File Manager**.
2. Upload a **zip of the repository** (or clone it on your machine and zip it) and extract it.
   Minimal required files:
   - `package.json`, `package-lock.json`, `index.js`
   - `config/`, `handlers/`, `services/`, `utils/`, `data/`
3. Click **Reinstall** on the server. The install script runs `npm install` automatically.

## Start & link WhatsApp

1. Press **Start**. The console should show `Status page listening on http://0.0.0.0:<port>`
   (Pterodactyl marks the server as running on that line).
2. A moment later the console prints:
   ```
   [OK] PAIRING CODE: ABCDEFGH
   ```
3. On your phone (must be online): **WhatsApp → Settings → Linked Devices → Link a Device →
   "Link with phone number instead"** → enter the 8-character code.
4. When linked you'll see `A/L Insight Bot connected to WhatsApp`, and the bot will start answering.

You can also open `http://<server-ip>:<port>` any time to see the pairing code / connection status.

## Updating the bot

1. Upload the new files (replace the old ones).
2. Press **Reinstall** (re-runs `npm install`).
3. **Restart** the server. The WhatsApp session is preserved in `sessions/`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Console: `PHONE_NUMBER is required` | Set the **WhatsApp phone number (pairing)** startup variable and restart. |
| Console: `WhatsApp rejected the connection (401)` | The server's IP is blocked by WhatsApp for device linking. Run it on a home network or an IP WhatsApp accepts. |
| No `PAIRING CODE` line appears | Wait ~15s; the code prints only after WhatsApp accepts the linking handshake. If the 401 error appears, see above. |
| WhatsApp says "too many attempts" | Wait 15–60 minutes, delete the `sessions/` folder, and restart for a fresh code. |
| Want to link a different number | Stop the server, delete `sessions/`, set the new `PHONE_NUMBER`, start again. |
| AI doesn't answer | Chat works without any key via the `scraper` provider. For image questions, set `GEMINI_API_KEY`. |
