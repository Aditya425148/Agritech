# 🌱 AgriTech — Smart Agricultural Analysis Platform

<p align="center">
  <img src="https://img.shields.io/badge/AgriTech-Smart%20Agriculture-2E8B57?style=for-the-badge&logo=leaflet&logoColor=white" />
  <img src="https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Deployment-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

<p align="center">
  <b>Transforming Agricultural Data into Meaningful Insights.</b>
  <br />
  An agricultural analysis dashboard designed to organise, explore and understand agricultural production data.
</p>

---

## 🌾 About AgriTech

**AgriTech** is a MongoDB-backed agricultural analysis dashboard built to make agricultural data more structured, accessible and easier to analyse.

The platform organises agricultural production information across different crops, states, districts and seasons, providing a structured foundation for exploring agricultural datasets.

By combining organised data storage with an analysis dashboard, AgriTech aims to simplify access to agricultural information and support better understanding of production patterns.

## ✨ Key Features

- 🌱 **Agricultural Data Management** — Organised storage of agricultural production records.
- 🌍 **Geographical Organisation** — Agricultural information structured by states and districts.
- 🌾 **Crop-Based Analysis** — Structured crop information for agricultural exploration.
- 📅 **Seasonal Organisation** — Data organised according to agricultural seasons.
- ⚡ **Optimised Database** — Indexed MongoDB collections for efficient data retrieval.
- 🔗 **Efficient Data Structure** — Embedded state and crop names within production documents.
- ☁️ **Cloud Deployment Support** — Configurable deployment through Vercel.
- 🔐 **User Data Preservation** — Agricultural data imports retain registered user records.

## 🛠️ Tech Stack

### Programming Languages & Runtime

<p align="left">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
</p>

### Database & Cloud Infrastructure

<p align="left">
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

### Development & Version Control

<p align="left">
  <img src="https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white" />
  <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" />
  <img src="https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white" />
</p>

> Note: Keep only badges that accurately represent the technologies used in the project.

## 🗄️ Database Architecture

AgriTech uses MongoDB to manage and organise agricultural information into five primary collections.

| Collection | Purpose |
|---|---|
| `production` | Stores agricultural production records |
| `states` | Stores state-related information |
| `crops` | Stores crop-related information |
| `districts` | Stores district-related information |
| `seasons` | Stores seasonal information |

### Database Optimisation

- Indexed collections for efficient data retrieval.
- Production documents contain their associated state and crop names.
- Embedded information reduces the need for joins in dashboard queries.
- Agricultural data can be re-imported without deleting registered users.

## 📂 Project Structure

The application uses a MongoDB-backed architecture with organised agricultural data collections.

```text
Agritech/
│
├── .env.example
├── README.md
├── package.json
│
├── Application Files
│   └── Frontend & Backend
│
├── Database
│   ├── production
│   ├── states
│   ├── crops
│   ├── districts
│   └── seasons
│
└── Migration
    └── MongoDB Import Script
```

*The structure above is a conceptual overview. Update it to match the actual repository folders and filenames.*

## ⚙️ Installation & Setup

Follow these instructions to run AgriTech locally.

### Prerequisites

Make sure you have the following installed:

<p align="left">
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/npm-CB3837?style=flat-square&logo=npm&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Git-F05032?style=flat-square&logo=git&logoColor=white" />
</p>

### Step 1 — Clone the Repository

```bash
git clone https://github.com/Aditya425148/Agritech.git
```

### Step 2 — Navigate to the Project

```bash
cd Agritech
```

### Step 3 — Install Dependencies

```bash
npm install
```

### Step 4 — Configure MongoDB

1. Create a MongoDB Atlas account.
2. Create a cluster and database user.
3. Configure network access for your deployment.
4. Obtain your MongoDB connection URI.

Create your environment file by copying the example:

```bash
cp .env.example .env
```

Add your MongoDB configuration:

```env
MONGODB_URI=your_mongodb_connection_string
```

Optionally, configure your database name:

```env
MONGODB_DB=your_database_name
```

**Important:** Never upload your `.env` file or expose database credentials publicly.

### Step 5 — Migrate Agricultural Data

Run the included MongoDB migration script:

```bash
npm run migrate:mongo
```

This imports the included PostgreSQL dump into MongoDB and creates the indexed collections:

- `production`
- `states`
- `crops`
- `districts`
- `seasons`

Re-running the importer replaces agricultural data while preserving registered users.

## ☁️ Deployment

AgriTech supports deployment through **Vercel**.

### Deployment Instructions

1. Push the project to GitHub.
2. Log in to Vercel.
3. Import the AgriTech repository.
4. Open **Project Settings → Environment Variables**.
5. Add the following variables:

```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=your_database_name
```

6. Save the environment variables.
7. Deploy the application.

Ensure that MongoDB Atlas network access permits connections from your deployment environment.

<p align="left">
  <img src="https://img.shields.io/badge/Cloud-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
  <img src="https://img.shields.io/badge/Database-MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
</p>

## 🔒 Environment Variables

| Variable | Description | Required |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `MONGODB_DB` | MongoDB database name | Optional |

Keep all sensitive configuration values inside your local `.env` file or your deployment platform's environment settings.

## 🤝 Contributors

AgriTech is developed through collaboration, shared ideas and continuous improvements.

<p align="center">
    <img src="https://img.shields.io/badge/Himani%20Malik-Contributor-2E8B57?style=for-the-badge&logo=github&logoColor=white" />
  </a>
  <img src="https://img.shields.io/badge/Aditya%20Raghuvanshi-Contributor-2E8B57?style=for-the-badge&logo=github&logoColor=white" />
  <img src="https://img.shields.io/badge/Yash%20Chaudhary-Contributor-2E8B57?style=for-the-badge&logo=github&logoColor=white" />
</p>

We appreciate everyone who contributes to making AgriTech better!

## 🚀 Future Scope

Potential areas for further development include:

- Advanced agricultural data visualisation.
- Interactive crop production comparisons.
- State-wise and district-wise agricultural insights.
- Seasonal production trend analysis.
- Enhanced dashboard functionality.
- Improved data processing and performance.

## 🌍 Our Vision

Agriculture is driven by information, patterns and decisions.

AgriTech aims to bring agricultural information into a structured digital environment where production data can be explored, understood and used more effectively.

Our goal is to make agricultural data more accessible through technology, innovation and data-driven insights.

---

<p align="center">
  <b>🌱 AgriTech — Growing Insights, Empowering Agriculture.</b>
  <br />
  <i>Built with technology. Inspired by agriculture.</i>
</p>
