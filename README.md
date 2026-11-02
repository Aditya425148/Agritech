# 🌱 AgriTech — Smart Agricultural Analysis Platform

<p align="center">

**Turning Agricultural Data into Meaningful Insights.**

A data-driven agricultural analysis dashboard designed to organise, explore, and understand agricultural production data through a MongoDB-powered backend.

</p>

---

## 🌾 About the Project

**AgriTech** is a MongoDB-backed agricultural analysis platform that brings agricultural production data into one organised and accessible dashboard.

The project focuses on structuring agricultural datasets across states, crops, districts, and seasons, making the information easier to query, analyse, and work with.

By combining organised data storage with an analysis dashboard, AgriTech aims to make agricultural information more accessible and useful.

## ✨ Key Highlights

- 🌍 **Agricultural Data Management:** Organised agricultural production records.
- 🌱 **Crop-Based Data:** Agricultural information structured around different crops.
- 🗺️ **State & District Organisation:** Geographical organisation of agricultural records.
- 📅 **Seasonal Data:** Agricultural information organised by seasons.
- ⚡ **Optimised Database:** Indexed MongoDB collections for efficient queries.
- 🔗 **Embedded Data Structure:** Production documents contain state and crop names, reducing the need for database joins.
- ☁️ **Cloud Deployment:** Supports deployment through Vercel.
- 🔐 **User Data Retention:** Re-running the agricultural data importer preserves registered users.

## 🛠️ Technology & Infrastructure

| Technology | Purpose |
|---|---|
| MongoDB | Database and data storage |
| MongoDB Atlas | Cloud database hosting |
| Node.js / npm | Project scripts and migration |
| Vercel | Application deployment |

## 🗄️ Database Architecture

AgriTech uses MongoDB to store and organise agricultural information into five primary collections:

| Collection | Description |
|---|---|
| `production` | Agricultural production records |
| `states` | State-related information |
| `crops` | Crop-related information |
| `districts` | District-related information |
| `seasons` | Seasonal information |

### Database Optimisation

- Indexed collections for efficient data retrieval.
- Embedded state and crop names within production documents.
- Reduced dependency on relational joins.
- Agricultural data can be re-imported without deleting registered user records.

## ⚙️ Getting Started

Follow these steps to set up AgriTech locally.

### 1. Clone the Repository

```bash
git clone https://github.com/Aditya425148/Agritech.git
```

### 2. Navigate to the Project

```bash
cd Agritech
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure MongoDB

Create a MongoDB Atlas cluster and database user.

Configure your network access permissions and obtain your MongoDB connection URI.

Create your environment file:

```bash
cp .env.example .env
```

Add your MongoDB connection details:

```env
MONGODB_URI=your_mongodb_connection_string
```

### 5. Migrate Agricultural Data

Run the included migration script:

```bash
npm run migrate:mongo
```

This imports the included PostgreSQL dump into MongoDB and creates the indexed collections required by the application.

**Note:** Re-running the importer replaces agricultural data while retaining registered users.

## ☁️ Deployment

AgriTech supports deployment through Vercel.

1. Connect your GitHub repository to Vercel.
2. Open **Project Settings → Environment Variables**.
3. Add `MONGODB_URI`.
4. Optionally configure `MONGODB_DB`.
5. Deploy your application.

Make sure your MongoDB Atlas network access settings allow your deployment to connect.

## 🤝 Contributors

AgriTech is built through collaboration and shared development efforts.

| Contributor | Role |
|---|---|
| [Himani Malik](https://github.com/) | Project Contributor |
| Aditya Raghuvanshi | Project Contributor |
| Yash Chaudhary | Project Contributor |

We appreciate every contribution that helps improve AgriTech!

## 🚀 Our Vision

Agriculture generates valuable information that can help us better understand production patterns, crops, geographical differences, and seasonal trends.

AgriTech aims to make this information more organised, accessible, and useful through structured data management and an agricultural analysis dashboard.

**Building a smarter way to explore agricultural data. 🌱**

---

<p align="center">

**AgriTech | Data • Agriculture • Innovation**

*Growing insights, one dataset at a time.*

</p>
