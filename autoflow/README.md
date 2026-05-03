# AutoFlow — Project Management with AI Delegation

A full-stack project management app with **AI-powered task delegation**, team management, notifications, and n8n workflow automation. Uses the **Kaggle AI Automation Risk by Job Role** dataset to seed realistic user skills and workload profiles.

---

## 🗂️ Project Structure

```
autoflow/
├── server/          # Express + TypeScript + Prisma backend (port 8000)
│   ├── src/
│   │   ├── controllers/  # taskController, userController, notificationController…
│   │   └── routes/       # Express routers
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── seedData/     # JSON seed files (20 users from Kaggle dataset)
│   ├── uploads/          # Profile picture uploads stored here
│   └── .env
├── client/          # React + Vite frontend (port 3000)
│   ├── src/
│   │   ├── pages/        # Dashboard, Board, Team, Analytics, Notifications, Settings
│   │   ├── components/   # Sidebar
│   │   └── utils/api.ts
│   └── public/
│       └── sample_users.csv  # Kaggle dataset sample for CSV import
└── README.md
```

---

## ✅ Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | Included with Node |
| PostgreSQL | 14+ | https://postgresql.org/download |
| n8n (optional) | latest | `npx n8n` |

---

## 🚀 Step-by-Step Setup

### Step 1 — Set Up PostgreSQL

1. Open pgAdmin or psql
2. Create a new database:
   ```sql
   CREATE DATABASE autoflow_db;
   ```
3. Note your connection string: `postgresql://USER:PASSWORD@localhost:5432/autoflow_db`

---

### Step 2 — Configure the Server

1. Open `server/.env` and update the DATABASE_URL:
   ```env
   PORT=8000
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/autoflow_db
   N8N_WEBHOOK_URL=http://localhost:5678/webhook/autoflow-notifications
   ```

---

### Step 3 — Install Server Dependencies

Open a terminal in the `server/` folder:

```bash
cd server
npm install
```

---

### Step 4 — Run Prisma Migrations

```bash
cd server
npx prisma migrate dev --name init
```

If you get errors, try:
```bash
npx prisma db push
```

---

### Step 5 — Seed the Database

This seeds the database with **20 users derived from the Kaggle AI Automation Risk dataset**, 10 projects, 30 tasks, and sample notifications.

```bash
cd server
npm run seed
```

Expected output:
```
Cleared data from Team
Seeded team with data from team.json
Seeded project with data from project.json
Seeded user with data from user.json  ← 20 users with real skills
Seeded task with data from task.json  ← 30 tasks across all priorities
Seeded notifications
```

---

### Step 6 — Start the Server

```bash
cd server
npm run dev
```

Server starts at **http://localhost:8000**

Test it: http://localhost:8000  → should show "AutoFlow API Server - Running"

---

### Step 7 — Install Client Dependencies

Open a NEW terminal in the `client/` folder:

```bash
cd client
npm install
```

---

### Step 8 — Start the Client

```bash
cd client
npm run dev
```

Client starts at **http://localhost:3000**

Open your browser at **http://localhost:3000** 🎉

---

## 🤖 AI Task Delegation

### How It Works

The delegation algorithm scores **every team member** against a task:

```
score = skillMatch × 0.5 + availability × (0.3 + priorityWeight × 0.2)
```

**Factors:**
- **Skill Match** — Jaccard overlap between task tags and user skills (from Kaggle dataset)
- **Availability** — Fewer open tasks = higher score
- **Priority Weight** — Urgent=1.0, High=0.75, Medium=0.5, Low=0.25, Backlog=0.1

### To Delegate a Task

1. Go to **Board** page
2. Find any task card
3. Click **"🤖 AI Auto-Delegate"**
4. The algorithm automatically picks the best-fit team member(s)

### Multi-Person Delegation

- When creating/editing a task, set **"AI Delegate to # People"** to 2, 3, etc.
- AI picks the top N members by score

---

## 📥 CSV Import (Kaggle Dataset)

### Using the Kaggle Dataset

1. Go to **Team** page
2. Click **"📥 Import CSV"**
3. Upload the included `client/public/sample_users.csv` OR your own Kaggle CSV
4. The importer maps **job_role → username**, **experience_required_years → availabilityHours**
5. Skills are auto-mapped from job roles

### Supported CSV Columns

| Column | Required | Description |
|--------|----------|-------------|
| username or job_role | Yes | User's name |
| role | No | admin/developer/designer/product/member |
| skills | No | Comma-separated skill tags |
| availabilityHours | No | Hours/week available |
| teamId | No | Team assignment |

---

## 🔔 Notifications & n8n Integration

### In-App Notifications

Notifications are created automatically when:
- A task is assigned to a user
- A task is AI-delegated
- A user is created (welcome notification)
- A task status changes

View them on the **Notifications** page.

### n8n Webhook Automation

AutoFlow fires webhooks to n8n for these events:
- `task_assigned` — triggered on manual assignment
- `task_delegated` — triggered on AI delegation

#### n8n Setup Steps

1. Install n8n:
   ```bash
   npx n8n
   # OR
   npm install -g n8n && n8n start
   ```

2. Open n8n at **http://localhost:5678**

3. Create a new workflow:
   - Add a **Webhook** trigger node
   - Set Method to **POST**
   - Copy the **Webhook URL** (looks like `http://localhost:5678/webhook/xxxxx`)

4. Update `server/.env`:
   ```env
   N8N_WEBHOOK_URL=http://localhost:5678/webhook/YOUR_WEBHOOK_ID
   ```

5. Add downstream nodes in n8n:
   - **Send Email** — notify assignee
   - **Slack** — post to channel
   - **Google Calendar** — create event for deadline
   - **HTTP Request** — call any other API

6. Activate the workflow (toggle at top of n8n editor)

#### Webhook Payload Example

```json
{
  "event": "task_delegated",
  "task": {
    "id": 5,
    "title": "Fix authentication flow",
    "priority": "Urgent",
    "dueDate": "2024-11-15T00:00:00Z"
  },
  "assignees": [
    { "userId": 3, "username": "software_engineer_15", "skills": "python,javascript,react" }
  ]
}
```

---

## 📋 Features Summary

| Feature | Status |
|---------|--------|
| ✅ Add / Edit / Delete Tasks | Working |
| ✅ All priorities on single Board page | Working |
| ✅ Task cards colour-coded by priority | Working |
| ✅ Add / Edit / Delete Users | Working |
| ✅ Profile photo upload from device | Working |
| ✅ Role selector for users | Working |
| ✅ Skill tags with quick-add buttons | Working |
| ✅ Workload calculation from task assignments | Working |
| ✅ AI task delegation (single or multi-person) | Working |
| ✅ CSV import with Kaggle dataset support | Working |
| ✅ Notifications page | Working |
| ✅ n8n webhook triggers | Working |
| ✅ Analytics with charts | Working |
| ✅ Dark theme UI | Working |

---

## 🛠️ API Endpoints

### Tasks
| Method | URL | Description |
|--------|-----|-------------|
| GET | /tasks/all | Get all tasks |
| GET | /tasks?projectId=N | Get tasks by project |
| POST | /tasks | **Create task** |
| PUT | /tasks/:id | Update task |
| DELETE | /tasks/:id | Delete task |
| POST | /tasks/:id/delegate | AI delegate |
| GET | /tasks/workload | Get workload per user |

### Users
| Method | URL | Description |
|--------|-----|-------------|
| GET | /users | Get all users (with workload %) |
| POST | /users | Create user (supports multipart for photo) |
| PUT | /users/:id | Update user (supports multipart for photo) |
| DELETE | /users/:id | Delete user |
| POST | /users/csv-import | Bulk import from CSV |

### Notifications
| Method | URL | Description |
|--------|-----|-------------|
| GET | /notifications/all | Get all notifications |
| GET | /notifications/:userId | Get user notifications |
| PATCH | /notifications/:id/read | Mark one as read |
| PATCH | /notifications/user/:id/read-all | Mark all as read |

---

## ❓ Troubleshooting

**Cannot connect to database**
- Make sure PostgreSQL is running
- Check DATABASE_URL in `server/.env`
- Try: `psql -U postgres -c "CREATE DATABASE autoflow_db;"`

**"Cannot add task" error**
- Check that the server is running at port 8000
- Open browser DevTools → Network tab → look for red requests
- Verify projects exist (seed the database first)

**Profile picture not showing**
- Make sure `server/uploads/` folder exists (created automatically)
- The server serves uploads at `http://localhost:8000/uploads/`

**n8n webhook not firing**
- Ensure n8n is running at port 5678
- Check N8N_WEBHOOK_URL in `server/.env`
- Make sure the n8n workflow is **Activated** (not just saved)

---

## 📊 Kaggle Dataset

The seed data and CSV import are based on:
**"AI Automation Risk by Job Role"** by khushikyad001  
https://www.kaggle.com/datasets/khushikyad001/ai-automation-risk-by-job-role

3000 rows · 25 columns · 20 unique job roles

Used to create realistic user profiles with appropriate skills, availability hours, and workload characteristics for the AI delegation algorithm.
