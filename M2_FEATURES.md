# Member 2 — Rebecca: Scam Cases Core CRUD

This ZIP contains Rebecca's Member 2 work for scamlah.

## Member 2 requirements covered

- Report a Scam page: `GET /cases/new`
- Edit Case page: `GET /cases/:id/edit`
- Create scam case with image upload: `POST /api/cases`
- Update scam case: `PUT /api/cases/:id`
- Delete scam case: `DELETE /api/cases/:id`
- List categories: `GET /api/categories`
- Page form create action: `POST /cases`
- Page form update action: `POST /cases/:id/edit`
- Page form delete action: `POST /cases/:id/delete`
- Database tables: `categories`, `scam_cases`, `case_images`
- Shared EJS form: `views/partials/case-form.ejs`
- Image uploader preview: `public/js/case-form.js`

## Files owned/changed by Member 2

- `db/schema.sql`
- `db/seed.sql`
- `src/models/case.model.js`
- `src/controllers/case.controller.js`
- `src/routes/cases.api.routes.js`
- `src/routes/categories.routes.js`
- `src/routes/cases.pages.routes.js`
- `src/middleware/upload.middleware.js`
- `views/cases/new.ejs`
- `views/cases/edit.ejs`
- `views/partials/case-form.ejs`
- `views/partials/category-badge.ejs`
- `public/js/case-form.js`
- `public/css/styles.css`
- `views/partials/navbar.ejs`
- `src/server.js`
- `package.json`
- `.gitignore`

## How to test

1. Run SQL in `db/schema.sql` in MySQL Workbench.
2. Create `.env` from `.env.example` and fill in DB details.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000/cases/new`.
6. Submit a report with an image.
7. Open Community Watch at `http://localhost:3000/cases`.
8. Open case detail, then test Edit and Delete.

## Rebecca Add-on: Auto-save Drafts + Evidence Preview

- Added auto-save for the Report Scam form so unfinished report details are saved after the user pauses typing.
- Added a visible auto-save status message such as pending, saving, saved, and failed.
- Added evidence image preview with a remove button before final submission.
- This extends Member 2's existing report scam, saved draft, image upload, and case CRUD workflow.


## Rebecca Add-on: Scam Date Validation

- Added validation to prevent future scam dates such as year 2222 from being submitted or saved.
- Added `max` date protection on the Report Scam date input.
- Added frontend validation in `public/js/case-form.js` and backend validation in `src/controllers/case.controller.js` so the rule cannot be bypassed by editing browser HTML.
- The rule applies to creating reports, editing reports, saving drafts, submitting drafts, and auto-saving drafts.
