<p align="center">
  <img src="assets/LogoXtextWira.png" alt="WiraDev Logo" width="650" />
</p>

# WiraDev - The Next-Generation Career & Talent Intelligence Ecosystem

> **One Main Ecosystem Orchestrating 4 Dedicated Micro-Repositories**  
> Developed for **UIN Information Competition (UINIC) 8.0 - Web Development Competition 2026**

---

## 📌 Executive Summary

**WiraDev** is an integrated AI-driven career acceleration and simulation platform designed to bridge the gap between job seekers and industry expectations. Through deep learning, automated CV and transcript screening, real-time interview simulations, and cross-platform accessibility, WiraDev empowers candidates to evaluate their skills and master modern recruitment pipelines.

This repository (**`WiraDev`**) serves as the **Main Orchestrator Repository** coordinating 4 specialized sub-repositories via **Git Submodules**:

| Service / Sub-repo | Description | Tech Stack | Repository Link |
| :--- | :--- | :--- | :--- |
| **`wiradev-mobile`** | Cross-platform Mobile Client | Flutter, Dart, Riverpod, Material 3 | [GitHub: wiradev-mobile](https://github.com/cipta77/wiradev-mobile) |
| **`wiradev-fe`** | Web Dashboard & Interactive Simulation | Next.js 15, React 19, TypeScript, Tailwind | [GitHub: wiradev-fe](https://github.com/cipta77/wiradev-fe) |
| **`wiradev-be`** | REST API, Business Logic & DB Engine | Node.js, Express, TypeScript, MySQL | [GitHub: wiradev-be](https://github.com/cipta77/wiradev-be) |
| **`wiradev-ai`** | Deep Learning Inference & NLP Model | Python 3.10, Flask, TensorFlow, Keras, Git LFS | [GitHub: wiradev-ai](https://github.com/cipta77/wiradev-ai) |

---

## 🏛️ System Architecture

```mermaid
graph TD
    subgraph Clients["Frontend & Client Applications"]
        WEB["wiradev-fe<br/>(Next.js Web Dashboard)"]
        MOBILE["wiradev-mobile<br/>(Flutter iOS / Android / Desktop)"]
    end

    subgraph BackendGateway["Core Backend Gateway"]
        API["wiradev-be<br/>(Express / TypeScript REST API)"]
        AUTH["Auth & JWT Service"]
        SIM["Simulation Engine"]
        CV_SERVICE["CV / Transcript Analyzer"]
    end

    subgraph Intelligence["AI & Model Layer"]
        AI["wiradev-ai<br/>(Flask / TensorFlow / Keras)"]
        LLM["LLM Mentor & Interviewer<br/>(OpenRouter / Gemini)"]
    end

    subgraph Storage["Data Persistence"]
        DB[(MySQL 8.0 Database)]
        PMA["phpMyAdmin GUI"]
    end

    WEB -->|REST / HTTP| API
    MOBILE -->|REST / HTTP| API
    MOBILE -.->|Fallback Direct| LLM

    API --> AUTH
    API --> SIM
    API --> CV_SERVICE

    SIM --> LLM
    CV_SERVICE --> AI
    API --> DB
    PMA -.-> DB
```

---

## 🚀 Quick Start Guide

### 1. Clone the Complete Ecosystem (Recursive Submodules)

To clone the main repository along with all 4 sub-repositories populated:

```bash
git clone --recurse-submodules https://github.com/cipta77/WiraDev.git
cd WiraDev
```

If you already cloned without `--recurse-submodules`, initialize them with:

```bash
./setup.sh
# or manually:
git submodule update --init --recursive
```

---

### 2. Run Entire Stack with Docker Compose

Ensure [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) are installed, then run:

```bash
docker compose up --build
```

This automatically boots:
- **MySQL Database**: `localhost:3306`
- **phpMyAdmin**: `http://localhost:8080`
- **AI Microservice**: `http://localhost:7860`
- **Backend API**: `http://localhost:5000`
- **Web Frontend**: `http://localhost:3000`

---

## 📂 Sub-Repository Details & Local Development

### 1. `wiradev-mobile` (Mobile Client)
Cross-platform native mobile experience with responsive interview simulation UI, CV analyzer results, and candidate dashboards.
```bash
cd wiradev-mobile
flutter pub get
flutter run
```

### 2. `wiradev-fe` (Web Application)
Modern, accessible Next.js web application with dark-mode support, English interview simulation, and analytics.
```bash
cd wiradev-fe
pnpm install
pnpm run dev
```

### 3. `wiradev-be` (REST API Server)
Scalable TypeScript backend powering data synchronization, authentication, and Swagger API documentation.
```bash
cd wiradev-be
pnpm install
pnpm run dev
```

### 4. `wiradev-ai` (AI Inference Service)
Machine learning service hosting deep learning models for classification, candidate scoring, and transcript intelligence.
```bash
cd wiradev-ai
pip install -r requirements.txt
python app.py
```

---

## 🔗 Direct Repository Links

- **Main Repository**: [https://github.com/cipta77/WiraDev](https://github.com/cipta77/WiraDev)
- **Mobile Sub-repo**: [https://github.com/cipta77/wiradev-mobile](https://github.com/cipta77/wiradev-mobile)
- **Backend Sub-repo**: [https://github.com/cipta77/wiradev-be](https://github.com/cipta77/wiradev-be)
- **Frontend Sub-repo**: [https://github.com/cipta77/wiradev-fe](https://github.com/cipta77/wiradev-fe)
- **AI Sub-repo**: [https://github.com/cipta77/wiradev-ai](https://github.com/cipta77/wiradev-ai)

---

## 📄 License & Attribution

Developed with ❤️ for **UINIC 8.0 2026 Web Development Competition**.  
All rights reserved © 2026 WiraDev Team.
