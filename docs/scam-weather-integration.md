# Scam Weather Feature Notes

## What this feature adds

Scam Weather is a public page at:

```text
/scam-weather
```

It shows:

- seasonal scam forecast
- report-data trend signals
- news/advice posts
- admin-only post creation/editing/deletion

## Demo admin account

```text
Username: Liam
Password: 25021923
Role: admin
```

New signups are regular users. Regular users can view Scam Weather but cannot publish posts.

## Important files

```text
routes/authRoutes.js
routes/scamWeatherRoutes.js
services/authService.js
services/scamWeatherService.js
views/auth/login.ejs
views/auth/signup.ejs
views/scam-weather/index.ejs
views/scam-weather/form.ejs
data/users.json
data/scamWeatherPosts.json
```

## Integration notes for the team

Right now, user accounts and Scam Weather posts are stored in JSON files for easy demo/testing.

When the group integrates MySQL, replace the JSON read/write functions in:

```text
services/authService.js
services/scamWeatherService.js
```

with MySQL queries.

The rest of the app can remain mostly unchanged because the routes call service functions instead of directly touching storage.

## Media support

The form supports image/video URLs through:

```text
mediaType: none | image | video
mediaUrl: URL string
```

If the team wants real file uploads later, add multer and change the form to `enctype="multipart/form-data"`.
