This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Treasury demo login

The Treasury demo account is created only by an explicit command; application startup and production builds do not provision it. Configure `DEMO_TREASURY_STUDENT_NUMBER`, `DEMO_TREASURY_NAME`, `DEMO_TREASURY_EMAIL`, and `DEMO_TREASURY_PASSWORD` in the project `.env`, following the `DEMO_STUDENT_*` and `DEMO_ADMIN_*` conventions. The demo login uses the fixed development account `TREASURY-DEMO-00001` with password `password`, matching the credentials used when its database password hash was provisioned.

In PowerShell, enable the existing demo login flag and run the explicit provision command against your development or disposable database:

```powershell
$env:ENABLE_DEMO_LOGIN = "true"
npm run provision:demo-treasury
```

The provisioning command loads `.env` using the same dotenv convention as the Student and Admin scripts. It refuses identifier or email conflicts without changing the conflicting account; re-running with an existing Treasury account updates its profile and password without changing its role.

The Treasury Demo Login button is controlled by `ENABLE_DEMO_LOGIN`, like the other demo buttons. It looks up the fixed demo identifier on the server, verifies the demo password against the provisioned database hash, creates the normal signed session, and redirects to the Treasury dashboard. Runtime login does not require the Treasury provisioning variables; those remain necessary only when explicitly provisioning or updating the account. Provisioning remains explicit and must not be pointed at production.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
