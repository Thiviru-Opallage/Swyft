# Swyft

Swyft is an appointment booking app. This repository contains the Expo SDK 57 customer app, an Express API, a PostgreSQL database model, and a small owner dashboard. The included salon catalog is illustrative; service data is editable in the database.

## What works

- Email/password registration and sign-in with backend-issued access and refresh tokens
- Service list with duration, description, and price
- Staff, date, and time selection with booked times disabled
- Booking confirmation and appointment history
- Customer cancellation and rescheduling
- Owner day view, completion, and cancellation
- 24-hour and 1-hour Expo push reminders when a device has opted in

## 1. Install the local tools

On Windows, install **Node.js 22 LTS or newer**, **Git**, and **Docker Desktop**. Restart the terminal after installation. Check them in PowerShell:

```powershell
node --version
npm --version
git --version
docker --version
docker compose version
```

Docker is used only for local PostgreSQL. If you prefer a hosted PostgreSQL database, create one and use its connection string instead of step 3.

## 2. Install project packages

From the repository root:

```powershell
npm install
```

The root is an npm workspace. Do not run a separate install inside each app.

## 3. Start PostgreSQL

Start Docker Desktop first. Then, from the repository root:

```powershell
docker compose up -d
docker compose ps
```

The development database runs at `localhost:5432`. Its username, password, and database name are in `docker-compose.yml` and are for local use only.

## 4. Configure the API

Create `apps/api/.env` from `apps/api/.env.example`:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

Open `apps/api/.env` and replace `JWT_SECRET` with a random secret of at least 32 characters. One way to generate one is:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Replace `ADMIN_PASSWORD` with a strong password. `ADMIN_EMAIL` and `ADMIN_PASSWORD` will create the owner account during seeding. Keep `.env` private; it is ignored by Git.

The demo business timezone is `Asia/Colombo`. Change `BUSINESS_TIMEZONE` and `BUSINESS_NAME` in the API environment if needed. The demo currently uses opening hours of **9:00–18:00, Tuesday–Saturday** in `apps/api/src/server.ts`.

Create the database tables and demo data:

```powershell
npm run db:migrate -w @swyft/api
npm run db:seed -w @swyft/api
```

The initial migration is included in Git, so Prisma applies the same schema on every machine.

## 5. Start the API and owner panel

In terminal 1, from the repository root:

```powershell
npm run dev:api
```

Check `http://localhost:4000/health` in a browser. It should show `{ "ok": true }`.

In terminal 2:

```powershell
npm run dev:admin
```

Open the address Vite prints, normally `http://localhost:5173`. Sign in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `apps/api/.env`.

## 6. Start the mobile app

Create `apps/mobile/.env` from the sample:

```powershell
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

For the **Android emulator**, set `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000`. For mobile web on the same computer, use `http://localhost:4000`. An iOS simulator requires a Mac; on Windows, test iOS with a physical device and an Expo development build.

For a **physical phone**, find your computer's Wi-Fi IPv4 address with `ipconfig`, then set the variable to `http://YOUR_IP:4000` (for example, `http://192.168.1.20:4000`). Put the phone and computer on the same Wi-Fi network and allow port 4000 through your firewall if Windows prompts you. The API must be running.

In terminal 3:

```powershell
npm run dev:mobile
```

You can browse services without an account. Create a customer account in the app to book. For a quick UI check on the same computer, run `npm run web -w @swyft/mobile` and open the address Expo prints. On an Android phone or emulator, install the development build from step 7 first, then use Expo's QR code or terminal shortcuts to open Swyft.

## 7. Enable and test push reminders

Remote push notifications require a **development build**, not Expo Go. Sign in to an Expo account and configure an EAS project from `apps/mobile`:

```powershell
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build:configure
```

Run the commands above from `apps/mobile`. `eas init` writes your Expo project ID into `app.json`; push registration uses that ID. To set up Android push, follow these steps from [Expo's FCM guide](https://docs.expo.dev/push-notifications/fcm-credentials/):

1. Create a Firebase project in the Firebase Console. Register an Android app with package name `com.thiviru.swyft`, matching `apps/mobile/app.json`.
2. Download that Android app's `google-services.json` into `apps/mobile`. Add `"googleServicesFile": "./google-services.json"` inside the `android` object in `apps/mobile/app.json`.
3. In Firebase project settings, open **Service accounts** and generate a new private key. Store this private JSON file **outside the repository**.
4. Run `npx eas-cli@latest credentials` in `apps/mobile`. Choose **Android → production → Google Service Account → Manage your Google Service Account Key for Push Notifications (FCM V1) → Upload a new service account key**. Select the private JSON file from step 3.
5. Create the development build:

```powershell
npx eas-cli@latest build --profile development --platform android
```

Install the resulting build on a supported Android phone or emulator. iOS push credentials require a paid Apple Developer account. The app asks for notification permission after a booking, then sends its Expo push token to the API. To test quickly, make a booking over an hour ahead and inspect reminder rows in Prisma Studio, or adjust a reminder's `dueAt` in the development database. The API process must stay running because it sends due reminders every minute.

The reminder worker in this starter runs inside the API process. Before production use, run a single persistent API instance or move reminder processing to a dedicated worker with job claiming and monitoring. Push delivery is best-effort and can be delayed by the device or notification service.

## 8. Check the project

```powershell
npm run typecheck
npm run test
npm run lint -w @swyft/mobile
npm run build -w @swyft/admin
npm run build -w @swyft/api
```

## Git and GitHub

The [Swyft GitHub repository](https://github.com/Thiviru-Opallage/Swyft) has separate commits for setup, API, mobile app, owner panel, and final setup polish. For the next feature, commit a working segment and push it:

```powershell
git add apps/mobile
git commit -m "feat(mobile): describe the finished segment"
git push origin main
```

You can stage `apps/api` or `apps/admin` instead, depending on where the segment lives. GitHub may prompt you to authenticate. Keep `.env` files and private Firebase service-account keys out of Git.

## Project layout

```text
apps/
  api/       Express, Prisma, bookings, reminder sender
  mobile/    Expo app for customers
  admin/     React owner panel
```
