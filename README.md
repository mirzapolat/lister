# Lister

Lister is a local-first newsletter manager for people who want full control over their list, content, and sending setup.

Instead of storing your audience in a SaaS database, Lister keeps everything in a single SQLite file you own. Subscribers, campaigns, themes, templates, and sender profiles stay on your device. You bring your own SMTP account, send from your own domain, and keep your data portable.

- Website: [lister.mirzapolat.com](https://lister.mirzapolat.com)
- Releases: [github.com/mirzapolat/lister/releases](https://github.com/mirzapolat/lister/releases)

## 1. App Overview

Lister is currently available as a macOS desktop app and as a browser-based experience on the public website.

### Why Lister

Most newsletter tools optimize for recurring subscriptions and platform lock-in. Lister takes the opposite approach.

- Local-first: your data lives on your machine, not on a third-party server.
- Portable: your workspace is a normal SQLite file you can back up, move, or inspect.
- Private: no accounts, no analytics, no cloud sync.
- Flexible: send with Gmail, Outlook, iCloud, Zoho, or any SMTP provider.
- Practical: manage subscribers, lists, templates, themes, and campaigns in one app.
- Secure: optionally encrypt your workspace with a password or passkey.

Lister is a good fit for solo creators, indie businesses, client work, internal newsletters, and anyone who wants a calm, ownership-first alternative to cloud email platforms.

### Features

- Subscriber management with lists, tags, CSV import, and bulk actions
- Markdown campaign editor with live preview
- Reusable templates for repeated newsletter formats
- Built-in and custom email themes
- Multiple sender profiles for different brands or contexts
- Optional AES-256 workspace encryption
- Offline-friendly workflow
- macOS desktop app and browser-based usage

## 2. Install On macOS

Lister ships as a macOS app distributed through GitHub Releases.

### Download and install

1. Open the [Releases page](https://github.com/mirzapolat/lister/releases).
2. Download the latest `.dmg` file for your Mac:
   `arm64` for Apple Silicon
   `x64` for Intel Macs
3. Open the downloaded DMG.
4. Drag `Lister.app` into your `Applications` folder.
5. Open Lister from `Applications`.

### First launch

When the app opens, you will land in the workspace library.

From there you can:

- Create a new workspace
- Import an existing `.sqlite` or `.db` workspace
- Open a recent workspace

Each workspace is your newsletter database. That file holds your lists, subscribers, campaigns, templates, themes, and sender profiles.

### If macOS shows a security warning

If macOS blocks the first launch because the app was downloaded from the internet, use the standard macOS flow:

1. Try opening the app once from `Applications`
2. Open `System Settings` -> `Privacy & Security`
3. Choose `Open Anyway` for Lister if macOS offers it
4. Launch the app again

## 3. Usage Tutorial With The Web App

You can use Lister directly in the browser at [lister.mirzapolat.com](https://lister.mirzapolat.com).

Chromium-based browsers such as Chrome, Edge, Brave, and Arc provide the best experience because they support direct file saving through the File System Access API.

### Start a workspace

1. Open [lister.mirzapolat.com](https://lister.mirzapolat.com).
2. Click `Create new file` to start fresh, or `Open existing file` to load an existing workspace.
3. If you create a new file, choose where to save your `.sqlite` workspace.
4. Complete the onboarding flow.

### Complete onboarding

Lister guides new users through two main setup steps:

1. Add a sender profile
   Configure a sending identity and SMTP account.
   You can use presets for Gmail, Outlook, iCloud, Yahoo, and Zoho, or enter custom SMTP settings manually.

2. Create your first list
   Set up the list you want to send to first, such as `Weekly Newsletter` or `Product Updates`.

After setup, Lister opens the main app.

### Recommended first workflow

#### Add subscribers

Go to `Subscribers` or `Lists` and import or add people to your audience.

Typical options include:

- Import a CSV
- Add subscribers manually
- Assign tags
- Place subscribers into one or more lists

#### Configure sender details

Open `Settings` -> `Sender Profiles` if you want to add more SMTP accounts or update your default sender profile.

This is where you can:

- Test SMTP connectivity
- Change sender name and email
- Switch between providers or custom SMTP

#### Create a campaign

Open `Campaigns` and create a new campaign.

Inside the editor you can:

- Give the campaign a name
- Write the subject line
- Draft the body in Markdown
- Pick a list to send to
- Choose a sender profile
- Select an email theme

Lister auto-saves campaign edits while you work.

#### Reuse templates and themes

- Use `Templates` to save repeated newsletter structures
- Use `Themes` to control the visual HTML layout and branding

This is useful when you publish on a regular cadence and want consistent formatting.

#### Send your newsletter

When everything looks right:

1. Review the preview
2. Confirm the selected list and sender profile
3. Send the campaign through your SMTP account

Because Lister uses your own SMTP settings, messages are sent through your infrastructure rather than a shared platform.

### Saving and reopening your work

#### In Chrome, Edge, Brave, or Arc

Your workspace can be reopened directly and saved back to disk with a much smoother workflow.

#### In non-Chromium browsers

Lister still works, but saving is more manual:

1. Use the app normally
2. Click `Save`
3. Keep the downloaded `.sqlite` file somewhere safe
4. Reopen that file next time from the start screen

If you close the tab without saving in a browser that lacks direct file access, unsaved changes can be lost.

### Optional security

Open `Settings` -> `Security` to encrypt the workspace file.

You can protect the file with:

- A password
- A passkey

If you forget the password or lose the passkey, the encrypted file cannot be recovered, so store access credentials carefully.

## 4. Deployment Quick Start With npm

If you want to run or work on Lister locally, the project uses Vite for the frontend and a lightweight Express SMTP relay for email sending.

### Prerequisites

- Node.js
- npm

### Install dependencies

```bash
npm install
```

### Start the full development environment

```bash
npm run dev
```

This starts:

- Frontend on `http://localhost:5173`
- Backend relay on `http://localhost:3001`

In development, Vite proxies `/api/*` requests to the backend.

### Run the frontend only

```bash
npm run dev:ui
```

### Run the backend only

```bash
npm run dev:server
```

### Build the web app

```bash
npm run build
```

The production frontend output is written to `dist/`.

### Preview the production frontend build

```bash
npm run preview
```

### Package the macOS desktop app

```bash
npm run package:mac
```

This builds the Electron app and outputs macOS release artifacts into `release/`.

### Lint

```bash
npm run lint
```

## Architecture Notes

- Frontend: React 18 + TypeScript + Vite
- Local database: `sql.js` running in the browser
- Persistence: SQLite file saved through the File System Access API when available
- Backend: stateless Express SMTP relay
- Desktop app: Electron build for macOS

No cloud database is required for normal development or usage.

## Project Structure

```text
src/
  components/
  context/
  db/
  hooks/
  themes/
  types/
server/
public/
```

## Philosophy

Lister is built around a simple idea: your newsletter should belong to you.

Your list should not be trapped in somebody else's product. Your sender reputation should not depend on a shared platform. Your archive should not disappear behind a canceled subscription.

If that sounds like the kind of tool you want, Lister is for you.
