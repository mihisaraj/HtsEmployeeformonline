# HTS Employee Onboarding (Azure + Graph)

Blue/white onboarding portal where HTS employees sign in with Microsoft (Azure AD), complete an onboarding form, and send the data as an Excel attachment through Microsoft Graph.

## Quick start

1. Install dependencies (already included in `package-lock.json`):
   ```bash
   npm install
   ```
2. Copy environment template and fill in Azure/Graph values:
   ```bash
   cp .env.local.example .env.local
   ```
3. Run the app:
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000 and sign in with your Microsoft account. Submit the form to trigger the Graph email with the XLSX attachment.

## Environment variables

Client (used by MSAL in the browser):
- `NEXT_PUBLIC_AZURE_CLIENT_ID` – public app registration client ID.
- `NEXT_PUBLIC_AZURE_TENANT_ID` – Azure AD tenant ID.
- `NEXT_PUBLIC_AZURE_REDIRECT_URI` – redirect URI registered for the app (defaults to `http://localhost:3000`).

Server (used by the API route):
- `GRAPH_RECIPIENT_EMAIL` – destination inbox (e.g., PeopleOps).

## How it works

- **Sign-in**: `@azure/msal-browser` authenticates users against the configured tenant, requesting `User.Read` + `Mail.Send`.
- **Form → Excel**: Submitted data is converted into an XLSX workbook via `xlsx`.
- **Graph send**: The API route (`app/api/onboarding/route.ts`) uses the signed-in user’s delegated `Mail.Send` token to call `me/sendMail` with the Excel attachment.
- **UI**: Framer Motion animations, blue/white theme, and minimal cards.

Ensure the Azure app is configured for delegated `Mail.Send` and that each user has a mailbox license.
