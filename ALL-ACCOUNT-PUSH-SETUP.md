# Push notifications for all accounts

This update extends the existing administrator push setup. It adds opt-in push settings for every signed-in account, an OOC (Out of character) notice, and a collapsible app installation guide in Account Settings. Notification titles are “Quill & Ink · OOC”; previews contain no names or message text.

## 1. Apply the database update

In Supabase → SQL Editor, paste the contents of:

`supabase/migrations/20261031_all_account_push.sql`

Run the SQL itself, without Markdown code fences. This requires the previous administrator web-push and all-user bell notification migrations. If it reports that those are missing, finish the earlier push setup first. Do not rerun the original table-creation migration over existing tables.

The update preserves existing administrator subscriptions, the delivery queue, and the service-only restrictions on push keys. It may be run again safely. It uses the existing function/table names containing “administrator” for compatibility, although registration is now available to all valid portal accounts.

## 2. Update the push Edge Function

Open the existing **admin-push** Edge Function. Replace its code with:

`supabase/functions/admin-push/index.ts`

Keep **Verify JWT OFF** and deploy. This is the push worker; do not paste it into the **accounts** function.

Keep your current `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `PUSH_WORKER_SECRET` and `WEB_PUSH_SUBJECT`. Keep the existing cron job and Vault secret. No new keys, cron job or email service are needed. If your existing push worker already runs successfully, the only Edge Function change here is the wording of its setup error.

## 3. Upload the website files

Upload these eight files to the same locations in the live repository, replacing the current files:

- `portal.html`
- `account-settings.html`
- `account-management.html`
- `staff-chat.html`
- `assets/js/portal.js`
- `assets/css/portal.css`
- `portal-push-sw.js` — repository root, beside `index.html`
- `portal.webmanifest` — repository root

The existing app icon files remain in use. Commit the update and wait for GitHub Pages to deploy. The account dropdown ordering from the previous update is retained.

## 4. Enable and check

Open Account Settings on each device. Existing administrators should also reopen this page so the browser checks for the updated push worker. New recipients choose **Enable push notifications** and allow the browser permission prompt. There is no automatic permission prompt on page load.

For an end-to-end check, use two different accounts in separate browser profiles/devices. Enable push for the recipient, leave that conversation closed, then send a new message from the other account. Allow about a minute for the existing cron job, plus device delivery time. Messages already marked as read are suppressed. The in-game phone can continue using the portal bell.

### Who receives alerts?

| Recipient | Message alerts |
| --- | --- |
| Business owner | Other people's messages in their business and other businesses they have accepted membership in |
| Employee | Other people's messages in accepted business memberships, plus administrator replies in their own private conversation |
| Staff | Customer messages in businesses currently assigned to them |
| Administrator | Customer business messages and employee requests to administrators |

The sender does not receive their own alert. Unaccepted invitations do not grant alerts. Current access, account recovery status, message existence and read receipts are checked again before delivery. Removing a membership or staff assignment suppresses queued alerts that no longer qualify. This covers the business and employee/admin conversations in the existing notification bell; staff-room chat is unchanged. New subscriptions receive future messages rather than a historical push backlog.

### App installation and OOC notice

The Account Settings card includes iPhone/iPad, Android and desktop instructions. On iPhone/iPad, install through Safari → Share → Add to Home Screen, keep Open as Web App enabled if shown, and open the Home Screen icon before enabling push. Home Screen push requires iOS/iPadOS 16.4 or later. Android and desktop instructions use the browser's install menu; wording varies by version.

Alerts are explicitly labelled OOC and do not give a character in-game knowledge. Notification settings are per device. Signing in on another device still replaces the previous portal session, as before; push subscriptions are independent of that session and can continue after sign-out. On a shared device, disable push before signing out. Explicitly enabling another account in the same browser switches the subscription to that account and clears old-account queued deliveries.

Installation references:
- Apple: https://support.apple.com/en-lb/guide/iphone/iphea86e5236/27/ios/27
- Apple WebKit push requirements: https://webkit.org/blog/13878/
- Android Chrome: https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en
- Desktop Chrome: https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DDesktop&hl=en

## Verification completed locally

Database checks covered all roles, membership and assignment scoping, self-message exclusion, private replies, already-read and deleted messages, recovery locks, active-session requirements, subscription handover, migration reruns, subscription ownership, service-only key access, delivery leases/retries, and expired subscriptions. Simulated browser checks covered all account roles, OOC/install content, explicit permission requests, enable/disable, denied permission, unsupported browsers and the iPhone Home Screen requirement. The push worker's encryption/authentication flow and safe notification navigation were also checked.

These files have not been deployed to your GitHub/Supabase projects, and actual delivery on physical devices has not been verified. Delivery depends on browser/device notification settings and the existing cron worker.
