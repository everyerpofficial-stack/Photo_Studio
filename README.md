# LEONIS Studio Hub

Build a complete production-ready full-stack web application called "LEONIS" for a photography/content production studio.

IMPORTANT:

Do not create a simple landing page or demo.

Build the actual functional ERP/business management application with authentication, database, CRUD operations, calculations, dashboards, reports, role-based permissions, file uploads, exports, audit logs, and responsive UI.

==================================================

1. PROJECT OVERVIEW

==================================================

Company: LEONIS — Photography / Content Production Studio

Business partners:

- Jayu

- Mehulbhai

- Default profit share: 50/50

- Profit share must be configurable

Purpose:

Replace the existing Excel workflow with a multi-user web application to manage:

- Photography shoots/projects

- Clients

- Quotes

- Payments/income

- Expenses

- Partner investments

- Partner drawings

- Profit sharing

- Client dues

- Reports

- Business dashboard

- Alerts and insights

- Users and permissions

Primary users:

- 2 Partners / Owners

- 1 Accountant

- Coordinators

- Editors

The application must be mobile-first because project/payment/expense entries may happen at shoot locations.

Currency:

Indian Rupee (₹)

Date format:

DD-MM-YYYY

Financial year:

April to March

==================================================

2. TECHNOLOGY

==================================================

Frontend:

- React

- TypeScript

- Vite

- Tailwind CSS

- Shadcn UI

- React Hook Form

- TanStack Table

- React Query

- Recharts

- Lucide Icons

- Framer Motion

Backend:

- Node.js

- Express

- REST APIs

Database:

- PostgreSQL

- Prisma ORM

Authentication:

- JWT authentication

- Secure password hashing

- Role-based access control

- Session management

Storage:

- S3-compatible storage for images, PDFs, bills, receipts and project documents

Exports:

- Excel

- PDF

- CSV

The code must be structured cleanly and be ready for deployment.

==================================================

3. DESIGN SYSTEM

==================================================

Create a premium modern SaaS ERP interface.

Design inspiration:

- Stripe Dashboard

- Linear

- Vercel

- Notion

- Modern financial dashboards

Primary / Brand:

#1F3864

Primary Light:

#D9E1F2

Success:

#C6EFCE

Text:

#006100

Danger:

#FFC7CE

Text:

#9C0006

Warning:

#FFEB9C

Text:

#9C6500

Neutral:

#F2F2F2

Text:

#808080

Typography:

- Inter or Poppins

- 14px body

- 12px table

- 20px KPI value

- 24px page title

Components:

- 12px border radius

- Soft shadows

- Clean cards

- Sticky headers

- Zebra table rows

- Rounded status chips

- Smooth transitions

- Professional empty states

- Skeleton loading

- Toast notifications

- Confirmation dialogs

Do not overuse gradients.

Keep the UI professional and suitable for a real business.

==================================================

4. APPLICATION LAYOUT

==================================================

Desktop:

- Fixed left sidebar

- Top navigation bar

- Main content area

Mobile:

- Collapsible sidebar

- Bottom/slide navigation where appropriate

- All forms must become one-column

- Tables must be horizontally scrollable or converted into cards

Top navbar:

- Global search

- Notifications

- Current financial year

- User profile

- Logout

Sidebar:

Dashboard

Projects

Income / Payments

Expenses

Clients

Partner Report

Reports

Insights & Alerts

Masters

Settings

==================================================

5. AUTHENTICATION

==================================================

Login page:

LEONIS logo

Email

Password

Show / hide password

Forgot password

Login

Security:

- Lock account after 5 failed login attempts

- Session duration: 12 hours

- Force password change when required

- Password hashing

- JWT authentication

- Role automatically detected after login

Roles:

1. Partner / Owner

2. Accountant

3. Coordinator

4. Editor

==================================================

6. DASHBOARD

==================================================

Create a powerful business dashboard.

Global filters:

- Date range

- Client

- Partner

- Project type

- Payment mode

KPI cards:

1. Total Revenue

2. Total Expenses

3. Net Profit

4. Outstanding Dues

5. Projects

6. Payments Received

7. Partner Profit

8. Capital Recovery

Each KPI card should be clickable and open its detailed page.

Charts:

- Revenue vs Expenses

- Monthly Profit

- Revenue trend

- Expense trend

- Project status

- Client payment status

- Expense category distribution

- Partner profit share

Dashboard sections:

Recent Projects

Recent Payments

Recent Expenses

Overdue Clients

Pending Payments

Low Margin Projects

Upcoming Shoots

Expense Spikes

Capital Recovery Status

Quick action buttons:

+ Add Project

+ Add Payment

+ Add Expense

+ Add Client

Export Report

==================================================

7. PROJECTS / SHOOTS

==================================================

Projects List page.

Purpose:

Find and manage every photography shoot.

Search:

- Project

- Client

- Project type

Filters:

- Client

- Partner

- Project type

- Month

- Date range

Table columns:

Date

Client

Project Type

Quantity

Rate

Amount

Edit / Production Expense

Net Profit

Status

Actions

Actions:

- View

- Edit

- Duplicate

- Delete

- Export

Footer:

Show live total of filtered rows.

Deleting a project requires confirmation.

Project form:

Client

Project Type

Shoot Date

Quantity

Rate

Amount

Editing Expense

Production Expense

Notes

Partner

Referred By

Consulting / Hospital / Company Name where applicable

Automatically calculate:

Amount = Quantity × Rate

Net Profit = Amount - Expenses

Allow:

- Save

- Save & New

- Cancel

Attachments:

- Photos

- PDFs

- Documents

Show attachment preview.

Validation:

- Rate automatically loaded from price list based on project type

- Rate remains editable

- Amount is automatically calculated

- Cannot save future date beyond today

- Cannot delete project if linked financial records exist without proper confirmation

==================================================

8. INCOME / PAYMENTS

==================================================

Payments List.

Purpose:

See every rupee received.

Search and filters:

- Client

- Payment mode

- Month

- Payment type

- Date range

Table:

Date

Client

Type

Amount

Mode

Reference Number

Received By

Receipt

Actions

Actions:

- Add

- Edit

- Delete

- Export

- Print Receipt

Footer:

Show total received.

New Payment form:

Client

Date

Amount

Payment Type

Payment Mode

Reference Number

Notes

Receipt Photo / PDF

Payment types:

- Client Payment

- Other Income

Validation:

Amount must be greater than 0.

If amount exceeds client outstanding due:

Show warning.

Cash receipts above ₹50,000:

Require partner approval.

Deleting a payment:

- Requires confirmation

- Must reconcile with client ledger

- Record deletion in audit log

- Partner role required where applicable

Generate professional PDF receipt.

==================================================

9. EXPENSES

==================================================

Expenses List.

Search:

- Partner

- Category

- Client

- Project

- Bill number

Filters:

- Month

- Category

- Expense class

- Partner

- Client

Table:

Date

Partner

Category

Expense Class

Client

Project

Amount

Bill Number

Attachment

Actions

Expense classes:

Operating

Capital

Financing

Actions:

Add

Edit

Delete

Export

Bulk Upload

CSV Upload

Expense Entry:

Date

Partner

Category

Expense Class

Amount

Client

Project

Bill Number

Notes

Bill Attachment

Rules:

Amount must be greater than 0.

Bill attachment mandatory for expenses above ₹10,000.

Category is required.

Capital expenses must be editable by Partners only.

Capital expenses must NOT be included in operating P&L.

==================================================

10. CLIENTS

==================================================

Clients List.

Purpose:

Understand client-wise business health.

Table:

Client

Final Quote

Billed

Received

Due

Total Expense

Net Profit

Margin %

Status

Last Payment

Status chips:

Settled

Partial

Not Paid

No Billing

Rules:

Due = Quote/Billed Amount - Received Amount

Status automatically calculated.

If Due > 0:

Highlight due amount in red.

Client detail page:

Client Header:

- Client name

- Phone

- Email

- Company

- Address

- Current outstanding amount

Tabs:

Overview

Projects

Payments

Expenses

Documents

Ledger

Show:

Quote

Billed

Received

Due

Expenses

Net Profit

Profit Margin

Actions:

Add Payment

Add Project

Edit Quote

Send Reminder

Download Statement

Export

Running balance ledger must recalculate whenever transactions change.

Reminder composer:

- WhatsApp

- Email

==================================================

11. CLIENT LEDGER

==================================================

Create a complete chronological client ledger.

Columns:

Date

Description

Project

Debit

Credit

Balance

Examples:

Invoice / Project → Debit

Payment → Credit

Calculate running balance automatically.

Show:

Opening Balance

Total Billing

Total Received

Outstanding Due

Allow:

- PDF statement

- Excel export

- Print

- Send reminder

==================================================

12. PARTNER REPORT

==================================================

Create a dedicated Partner Report.

Partner cards:

Jayu

Mehulbhai

Each partner card should display:

Capital Invested

Profit Share %

Drawings

Net Position

Capital Recovery

Profit Earned

Partner table:

Partner

Capital

Operating

Financing

Total Spend

Share %

P&L Block

Profit Share

Drawings

Net Position

Capital Recovery Progress

Profit share validation:

Total partner profit share must equal 100%.

Example:

Jayu = 50%

Mehulbhai = 50%

Allow configurable percentages.

If total is not 100%:

Show warning.

Drawings cannot exceed available partner balance without warning.

==================================================

13. REPORTS

==================================================

Create Reports & Summary.

Periods:

Daily

Weekly

Monthly

Yearly

Custom Date Range

Report table:

Period

Revenue

Received

Operating Expense

Net Profit

Margin %

Create charts showing:

Revenue

Expenses

Net Profit

Profit & Loss rules:

Operating expenses are included in operating P&L.

Capital expenses must be shown separately.

Financing expenses must be shown separately.

Export:

Excel

PDF

CSV

Email report option.

==================================================

14. MASTERS

==================================================

Create Masters module.

Masters:

Clients

Partners

Project Types

Expense Categories

Price List

Payment Modes

Financial Years

Price List:

Project Type

Monthly / Base Rate

Effective From

Effective To

Status

Rules:

Never hard-delete a master used in an existing transaction.

Use Deactivate instead.

Price changes must preserve historical transaction values.

==================================================

15. USERS & SETTINGS

==================================================

Settings page.

Sections:

Company Profile

Users

Roles

Permissions

Financial Year

Partner Profit Share

Backup

Audit Logs

User table:

Name

Email

Role

Status

Last Login

Actions

Actions:

Invite User

Change Role

Deactivate

Reset Password

Minimum one Partner must always remain active.

Every important change must be logged.

==================================================

16. ROLE PERMISSIONS

==================================================

PARTNER / OWNER:

Full access.

Can:

- Add

- Edit

- Delete

- View financial information

- View partner reports

- Manage users

- Manage settings

- Approve high-value cash receipts

- Manage capital expenses

ACCOUNTANT:

Can:

- Add/edit projects

- Add/edit payments

- Add/edit expenses

- View reports

- View client ledger

- Edit quotes where permitted

Cannot:

- Manage partner capital

- Change profit share

- Manage users

COORDINATOR:

Can:

- Add/edit projects

- View clients

- Add payments

- Add expenses for assigned shoots

Cannot:

- Delete projects

- View partner profit

- View sensitive financial analytics

EDITOR:

Can:

- View assigned projects

- Update limited project information

Cannot:

- Access financial information

- Access partner reports

- Access expenses

- Access payment information

Implement permissions at both:

- Frontend UI level

- Backend API level

Never rely only on frontend hiding.

==================================================

17. INSIGHTS & ALERTS

==================================================

Create an Insights & Alerts center.

Alerts:

Overdue Client

Low Margin Project

Expense Spike

Pending Payment

Capital Recovery

Large Expense

Unusual Revenue Change

Each alert card should show:

Title

Description

Amount

Date

Severity

Related record

Actions:

Mark as Done

Snooze

Open Related Record

Rules and thresholds should be configurable.

Insights should recalculate on every login and after relevant transaction changes.

==================================================

18. NOTIFICATIONS

==================================================

Create notification center.

Notification types:

Payment received

Payment overdue

Expense added

Approval required

Low margin project

Expense spike

Capital recovery

New project

System notification

Unread count shown in navbar.

==================================================

19. AUDIT LOG

==================================================

Track all important changes.

Audit fields:

User

Action

Module

Record ID

Old Value

New Value

Timestamp

IP where available

Actions:

Created

Updated

Deleted

Approved

Deactivated

Login

Logout

Password change

Audit log must be immutable to normal users.

==================================================

20. FILE UPLOADS

==================================================

Support:

Project photos

Project documents

Payment receipts

Expense bills

Client documents

PDF files

Features:

Drag and drop

File preview

Upload progress

Delete

Download

Secure storage

Allowed file types:

JPG

JPEG

PNG

WEBP

PDF

XLSX

CSV

Validate file size and type.

==================================================

21. TABLE COMPONENT

==================================================

Create reusable table component.

Features:

- Search

- Sort

- Filter

- Pagination

- Sticky header

- Zebra rows

- Column visibility

- Export

- Responsive

- 25 rows per page by default

- Right-aligned currency

- Empty state

- Loading skeleton

==================================================

22. FORM COMPONENT

==================================================

Create reusable form system.

Desktop:

2-column form

Mobile:

1-column form

Features:

- React Hook Form

- Validation

- Inline red validation messages

- Required indicators

- Date picker

- Currency input

- Select dropdown

- Searchable select

- File upload

- Image preview

- Sticky Save buttons

Buttons:

Save

Save & New

Cancel

==================================================

23. GLOBAL SEARCH

==================================================

Implement global search.

Search across:

Projects

Clients

Payments

Expenses

Partners

Documents

Show grouped results.

Keyboard shortcut:

Ctrl + K

==================================================

24. CALCULATIONS

==================================================

All calculations must be performed dynamically from database records.

Do NOT hard-code financial totals.

Project:

Amount = Quantity × Rate

Project Net Profit:

Net Profit = Amount - Project Expenses

Client:

Due = Total Billing - Total Received

Client Net Profit:

Net Profit = Total Received/Billing - Client Related Expenses

Margin:

Margin % = Net Profit / Revenue × 100

Partner:

Partner Profit = Total Distributable Profit × Partner Share %

Partner Net Position:

Capital Invested + Profit Share - Drawings

All calculations should update when underlying records change.

==================================================

25. DATABASE

==================================================

Create PostgreSQL schema using Prisma.

Tables/models:

users

roles

permissions

clients

partners

projects

project_types

payments

payment_modes

expenses

expense_categories

price_lists

financial_years

documents

audit_logs

notifications

partner_capital

partner_drawings

quotes

settings

Use proper:

Primary keys

Foreign keys

Indexes

Created timestamps

Updated timestamps

Soft deletion where appropriate

Use database transactions for financial operations.

Prevent inconsistent balances.

==================================================

26. API

==================================================

Create REST APIs.

Authentication:

POST /api/auth/login

POST /api/auth/logout

POST /api/auth/forgot-password

Clients:

GET /api/clients

POST /api/clients

GET /api/clients/:id

PUT /api/clients/:id

DELETE /api/clients/:id

Projects:

GET /api/projects

POST /api/projects

GET /api/projects/:id

PUT /api/projects/:id

DELETE /api/projects/:id

Payments:

GET /api/payments

POST /api/payments

GET /api/payments/:id

PUT /api/payments/:id

DELETE /api/payments/:id

Expenses:

GET /api/expenses

POST /api/expenses

GET /api/expenses/:id

PUT /api/expenses/:id

DELETE /api/expenses/:id

Reports:

GET /api/reports/dashboard

GET /api/reports/profit-loss

GET /api/reports/client/:id

GET /api/reports/partner

Insights:

GET /api/insights

Users:

GET /api/users

POST /api/users

PUT /api/users/:id

DELETE /api/users/:id

Add proper authorization middleware to every protected endpoint.

==================================================

27. DASHBOARD FILTER LOGIC

==================================================

Dashboard global filter should update:

KPI cards

Charts

Project totals

Payment totals

Expense totals

Profit

Client dues

Partner calculations

Filters:

Date Range

Client

Partner

Project Type

Default:

Current financial year.

==================================================

28. UX DETAILS

==================================================

Use confirmation dialogs for destructive actions.

Example:

"Are you sure you want to delete this payment?"

Show related financial impact before deletion.

Use toast messages:

"Payment added successfully."

"Project updated successfully."

"Expense deleted successfully."

Use skeleton loading rather than blank screens.

Use proper empty states:

"No projects found."

"No payments found."

"No expenses found."

==================================================

29. MOBILE EXPERIENCE

==================================================

The app must be genuinely usable on mobile.

Mobile project entry should allow:

Quick Add Project

Large input fields

Camera upload

Photo attachment

Quick payment entry

Quick expense entry

Sticky bottom Save button

Use large touch targets.

==================================================

30. DASHBOARD QUICK ENTRY

==================================================

Add floating or prominent Quick Add button.

Options:

New Project

New Payment

New Expense

New Client

These should open modal/drawer forms without requiring multiple navigation steps.

==================================================

31. SEED DATA

==================================================

Create realistic demo data.

Partners:

Jayu

Mehulbhai

Clients:

Create 5 sample clients.

Projects:

Create at least 10 sample projects.

Payments:

Create at least 15 sample payments.

Expenses:

Create at least 15 sample expenses.

Use realistic Indian Rupee amounts.

Create different statuses:

- Settled

- Partial

- Not Paid

- Active

- Completed

==================================================

32. ERROR HANDLING

==================================================

Implement:

API error handling

Form validation

Database error handling

Network error handling

Unauthorized handling

404 page

500 page

Do not expose sensitive backend errors to users.

==================================================

33. PERFORMANCE

==================================================

Use:

Lazy loading

Code splitting

React Query caching

Pagination

Database indexes

Optimized queries

Debounced search

Optimized images

Avoid unnecessary API calls.

==================================================

34. SECURITY

==================================================

Implement:

JWT

Password hashing

Role-based authorization

API validation

Rate limiting

Input sanitization

Secure file uploads

Protected routes

Environment variables

No secrets in frontend

Audit logging

==================================================

35. IMPORTANT BUSINESS RULES

==================================================

1. Default financial year is April-March.

2. Default partner share:

Jayu 50%

Mehulbhai 50%

3. Partner shares must total exactly 100%.

4. Amount must be greater than zero for payments and expenses.

5. Expense bill attachment is mandatory above ₹10,000.

6. Cash payment above ₹50,000 requires partner approval.

7. Capital expenses are excluded from operating P&L.

8. Capital expenses can only be edited by Partners.

9. Due amount is automatically calculated.

10. Client status is automatically calculated.

11. Historical transactions must retain their original rate even when the price list changes.

12. Masters used in transactions cannot be hard-deleted.

13. Important financial changes must create audit logs.

14. Partner profit information must not be visible to Coordinator or Editor.

15. Coordinator cannot delete projects.

16. Editor cannot access financial data.

17. Minimum one Partner must remain active.

==================================================

36. NAVIGATION MAP

==================================================

Dashboard

→ Business Dashboard

Projects

→ Projects List

→ Add/Edit Project

Income / Payments

→ Payments List

→ Payment Entry

Expenses

→ Expenses List

→ Expense Entry

Clients

→ Clients List

→ Client Ledger / Detail

Partner Report

→ Partner Position & Capital

Reports

→ Daily

→ Weekly

→ Monthly

→ Yearly

→ Custom Range

Insights & Alerts

→ Alert Centre

Masters

→ Pricelist

→ Clients

→ Project Types

→ Expense Categories

→ Payment Modes

Settings

→ Users

→ Roles

→ Company Settings

→ Financial Year

→ Profit Share

→ Audit Logs

→ Backup

==================================================

37. PAGE ROUTES

==================================================

/login

/dashboard

/projects

/projects/new

/projects/:id

/projects/:id/edit

/payments

/payments/new

/payments/:id

/expenses

/expenses/new

/expenses/:id

/clients

/clients/:id

/clients/:id/ledger

/partners

/partners/report

/reports

/reports/daily

/reports/weekly

/reports/monthly

/reports/yearly

/insights

/masters

/masters/clients

/masters/project-types

/masters/expense-categories

/masters/pricelist

/masters/payment-modes

/settings

/settings/users

/settings/roles

/settings/company

/settings/financial-year

/settings/audit-log

==================================================

38. FINAL UI REQUIREMENT

==================================================

The application must feel like a real premium ERP product, not a basic CRUD template.

Prioritize:

1. Clean UI

2. Fast navigation

3. Excellent dashboard

4. Accurate financial calculations

5. Strong role-based permissions

6. Responsive mobile experience

7. Professional tables

8. Excellent forms

9. Useful analytics

10. Reliable database relationships

Do not use placeholder buttons that do nothing.

Every button should perform the expected action.

Do not create fake static dashboard numbers.

Dashboard values must come from database records.

Do not hard-code financial calculations.

Use reusable components throughout the application.

==================================================

39. DEPLOYMENT

==================================================

Prepare the project for deployment.

Frontend:

Vercel

Backend:

Railway / Render / similar Node.js hosting

Database:

Supabase PostgreSQL / Neon PostgreSQL

Storage:

S3-compatible storage

Create:

.env.example

Include environment variables for:

DATABASE_URL

JWT_SECRET

S3_ENDPOINT

S3_ACCESS_KEY

S3_SECRET_KEY

S3_BUCKET

FRONTEND_URL

Include:

README.md

with:

Installation

Database setup

Prisma migration

Seed data

Local development

Environment variables

Production deployment

==================================================

40. BUILD ORDER

==================================================

Build in this order:

PHASE 1

Authentication

Database

Users

Roles

Permissions

Layout

Sidebar

PHASE 2

Masters

Clients

Project Types

Price List

Expense Categories

Payment Modes

PHASE 3

Projects

Project Entry

Project List

File Upload

PHASE 4

Payments

Payment Entry

Receipt PDF

Client Ledger

PHASE 5

Expenses

Expense Entry

Bill Upload

PHASE 6

Client Dashboard

Client Ledger

Dues

Reminders

PHASE 7

Partner Report

Capital

Drawings

Profit Share

PHASE 8

Main Dashboard

Charts

KPIs

PHASE 9

Reports

Excel

PDF

CSV

PHASE 10

Insights

Alerts

Notifications

Audit Logs

PHASE 11

Mobile optimization

Performance

Security

Testing

==================================================

FINAL INSTRUCTION

==================================================

Generate the complete working LEONIS ERP application.

Do not stop after generating the UI.

Implement the database, backend APIs, authentication, authorization, CRUD operations, calculations, reports, file uploads, exports, audit logs, dashboard analytics, notifications, and all business rules.

Make every page functional.

Use realistic demo data.

Ensure all financial calculations are database-driven.

Ensure all permissions are enforced on the backend.

Make the application responsive and production-ready.

The final application should be visually polished, professional, scalable, secure, and ready to deploy.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/dd6da530-0ea4-4227-80e8-54aca7622b22).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
