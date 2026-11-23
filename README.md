# Recipe Collection and Management System using MongoDB

A full-stack recipe platform: users register, add recipes with photos, search and filter the collection, save favourites and see live dashboard statistics. All data is stored in MongoDB.

## 1. Introduction

Recipe Collection lets people build a shared recipe library. Anyone can browse; logged-in users can publish, edit and delete their own recipes, upload images, and keep a personal list of favourites.

## 2. Objectives

- Build a complete CRUD application on the MERN-style stack without front-end frameworks.
- Model users, recipes and favourites with Mongoose schemas, references and indexes.
- Implement secure session authentication and ownership-based authorization.
- Provide MongoDB-powered search, filtering, sorting and pagination.
- Handle image uploads safely.

## 3. Technologies

| Layer | Tools |
|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript (responsive) |
| Backend | Node.js, Express.js |
| Database | MongoDB with Mongoose |
| Auth | express-session (sessions stored in MongoDB via connect-mongo), bcrypt |
| Other | Multer (uploads), express-validator, dotenv, Helmet, Morgan |
| Testing | Jest, Supertest, mongodb-memory-server |

## 4. Features

- Register, log in, log out; passwords hashed with bcrypt; protected pages and APIs.
- Add, view, edit, delete recipes (owner only) with a delete confirmation dialog.
- Image upload (JPG, JPEG, PNG, WEBP, max 5 MB) with replace/remove and old-file cleanup.
- Search by recipe name, ingredient, cuisine or tag; filter by category, difficulty, cuisine and total time; sort newest / oldest / A to Z; pagination; clear-filters button. All filters combine.
- Favourites: add, remove, no duplicates, persisted in MongoDB.
- Dashboard with totals, categories, recent recipes and your latest recipes, all calculated from the database.
- Profile page (name, email, password change).
- Loading indicators, toast notifications, empty states, form validation messages, responsive navigation, custom 404 page.

## 5. Folder structure

```
recipe-collection-management/
├── app.js                 Express app factory (also used by the tests)
├── server.js              Starts DB connection and HTTP server
├── config/                db.js, constants.js
├── models/                User.js, Recipe.js, Favorite.js
├── controllers/           auth, recipe, user, favorite, dashboard logic
├── routes/                authRoutes, recipeRoutes, userRoutes, favoriteRoutes, dashboardRoutes
├── middleware/            authMiddleware.js, errorMiddleware.js, validators.js
├── utils/                 upload.js (Multer), files.js, presenters.js, AppError.js, asyncHandler.js
├── public/
│   ├── css/style.css
│   ├── js/                app.js, auth.js, recipes.js, dashboard.js, favorites.js
│   ├── images/            default and sample recipe illustrations (local SVG)
│   └── pages/             12 HTML pages
├── uploads/               uploaded recipe images (created at runtime)
├── scripts/seed.js        sample data
├── tests/api.test.js      automated tests
├── start.bat / seed.bat   Windows helpers
├── .env.example  .gitignore  package.json  README.md
```

## 6. MongoDB design

Database: `recipe_collection_db`

**users**: `_id`, `name`, `email` (unique, lowercase), `password` (bcrypt hash), `createdAt`, `updatedAt`

**recipes**: `_id`, `recipeName`, `description`, `category` (enum), `ingredients` [`{name, quantity}`], `instructions` [string], `preparationTime`, `cookingTime`, `servings`, `difficulty` (Easy/Medium/Hard), `cuisine`, `image`, `tags` [string], `author` (ref users), `createdAt`, `updatedAt`

**favorites**: `_id`, `user` (ref users), `recipe` (ref recipes), `createdAt`. A unique compound index on `(user, recipe)` prevents duplicates.

**sessions**: created automatically by connect-mongo.

Relationships: a recipe belongs to one user; favourites link a user to a recipe. Deleting a recipe also deletes its favourites and uploaded image.

## 7. Prerequisites

- Windows 10/11
- Node.js 18 or newer (LTS recommended)
- MongoDB: either a local MongoDB Community Server or a free MongoDB Atlas cluster (pick one below)

## 8. Install Node.js

1. Download the LTS installer from https://nodejs.org and run it with default options.
2. Open a **new** PowerShell window and check:

```powershell
node -v
npm -v
```

## 9. MongoDB option A: local install

1. Download MongoDB Community Server (MSI) from https://www.mongodb.com/try/download/community.
2. Run the installer, choose **Complete**, and keep **Install MongoDB as a Service** ticked (this starts it automatically).
3. Check the service is running:

```powershell
Get-Service MongoDB
```

Status should be `Running`. If not: `Start-Service MongoDB` (run PowerShell as Administrator).

The default `.env` value already points to it: `mongodb://127.0.0.1:27017/recipe_collection_db`. The database is created automatically on first use.

## 10. MongoDB option B: MongoDB Atlas (cloud)

1. Create a free account at https://www.mongodb.com/cloud/atlas and create a free **M0** cluster.
2. **Database Access**: add a database user with a password (avoid special characters like `@` or `:` in it, or URL-encode them).
3. **Network Access**: add your current IP address (or `0.0.0.0/0` for a college demo only).
4. **Connect > Drivers**: copy the connection string and add the database name before the `?`:

```
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/recipe_collection_db?retryWrites=true&w=majority
```

5. Put it in `.env` as `MONGODB_URI=...`. Never share this file or commit it.

## 11. Install

Extract `Recipe_Collection_Management_System.zip`, then in PowerShell:

```powershell
cd "$HOME\Downloads\Recipe_Collection_Management_System"   # adjust to where you extracted it
npm install
```

## 12. Environment configuration

```powershell
Copy-Item .env.example .env
notepad .env
```

| Variable | Meaning |
|---|---|
| `PORT` | Web server port (default 5000) |
| `MONGODB_URI` | Local or Atlas connection string |
| `SESSION_SECRET` | Long random text used to sign session cookies |
| `NODE_ENV` | `development` or `production` |
| `COOKIE_SECURE` | `true` only when the site is served over HTTPS |

To generate a secret:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

`start.bat` does this automatically if `.env` does not exist.

## 13. Run

Easiest: double-click `start.bat`. It checks Node.js, creates `.env` if missing, installs dependencies if needed and starts the server.

Or in PowerShell:

```powershell
npm start        # production-style run
npm run dev      # auto-restart on file changes (nodemon)
```

Open http://localhost:5000.

## 14. Insert sample data

```powershell
npm run seed
```

(or double-click `seed.bat`). This creates a demo user and 12 recipes (Masala Dosa, Idli Sambar, Paneer Butter Masala, Vegetable Biryani, Veg Fried Rice, Chicken Curry, Penne Arrabbiata, Margherita Pizza, Chocolate Cake, Gulab Jamun, Fruit Salad, Fresh Lemon Juice). Running it again replaces only the demo user's recipes.

Demo login: `demo@recipes.local` / `Demo@1234`

## 15. Register and log in

1. Click **Sign up**, enter name, email, password (8+ characters with a letter and a number) and confirm it.
2. You are logged in automatically and land on the dashboard.
3. Next time use **Log in**. **Log out** is in the top navigation.

## 16. API reference

All responses are JSON: `{ "success": true|false, "message": "...", ... }`. Errors use proper status codes (400 validation, 401 not logged in, 403 not the owner, 404 not found, 409 duplicate).

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | no | `name, email, password, confirmPassword` |
| POST | `/api/auth/login` | no | `email, password` |
| POST | `/api/auth/logout` | no | End session |
| GET | `/api/auth/me` | yes | Current user |
| GET | `/api/recipes` | no | Query: `q, category, difficulty, cuisine, maxTime, sort (newest\|oldest\|name), page, limit, mine=true` |
| GET | `/api/recipes/:id` | no | One recipe |
| POST | `/api/recipes` | yes | multipart/form-data; `image` file optional; `ingredients` and `instructions` as JSON strings |
| PUT | `/api/recipes/:id` | owner | Same fields; `removeImage=true` removes the image |
| DELETE | `/api/recipes/:id` | owner | Also removes favourites and image |
| GET | `/api/users/profile` | yes | Profile and counts |
| PUT | `/api/users/profile` | yes | `name, email`, optional password change |
| GET | `/api/favorites` | yes | My favourites |
| POST | `/api/favorites/:recipeId` | yes | Add (idempotent) |
| DELETE | `/api/favorites/:recipeId` | yes | Remove |
| GET | `/api/dashboard/stats` | yes | Totals, categories, recent recipes |

## 17. Automated tests

```powershell
npm test
```

The tests use an in-memory MongoDB, so your real database is untouched. **The first run downloads a MongoDB binary, which needs internet access.**

## 18. Security notes

bcrypt password hashing; HTTP-only, SameSite session cookies stored in MongoDB; Helmet headers with a strict Content-Security-Policy; express-validator on all inputs; regex search input is escaped; uploads are checked by extension, MIME type and file signature and renamed randomly; ownership is checked on the server for every edit and delete; secrets live in `.env` (never committed). Recipe text is HTML-escaped when displayed.

## 19. Troubleshooting

| Problem | Fix |
|---|---|
| `'node' is not recognized` | Install Node.js, then open a new terminal. |
| `MongoDB connection error` / `ECONNREFUSED 127.0.0.1:27017` | Start the service: `Start-Service MongoDB` (Administrator), or switch to Atlas. |
| Atlas: `bad auth` or `querySrv ENOTFOUND` | Check the password (URL-encode special characters), the IP allow-list, and internet connection. |
| `SESSION_SECRET is not set` | Create `.env` from `.env.example`. |
| `EADDRINUSE: port 5000` | Change `PORT` in `.env`, or stop the other program: `netstat -ano \| findstr :5000`. |
| `npm install` fails on `bcrypt` | Use Node.js LTS (18, 20 or 22), delete `node_modules`, run `npm install` again. |
| Cannot stay logged in | Keep `COOKIE_SECURE=false` when using `http://localhost`. |
| Image upload rejected | Use JPG, PNG or WEBP under 5 MB. |
| Fonts look different offline | The page uses Google Fonts; it falls back to system fonts without internet. |
