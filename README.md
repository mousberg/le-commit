<div align="center">
  <img src="frontend/public/logo.svg" alt="Le Commit" width="400" />
</div>

# The team: Le Commit

A clean, modern hackathon project setup with Next.js + Tailwind + shadcn/ui.

## Quick Start

### npm
```bash
cd frontend
npm install
npm run dev
```

### bun
```bash
cd frontend
bun install
bun dev
```

## Environment Setup

### 1. Environment Variables
Copy the environment template and configure your API keys:

```bash
cp env.sample .env.local
```

### 2. Required API Keys
Get your API keys from these services:

- **Groq API**: [https://console.groq.com](https://console.groq.com) - For LLaMA 3 inference
- **Supabase**: [https://app.supabase.io](https://app.supabase.io) - For database and auth
- **GitHub Token**: [https://github.com/settings/tokens](https://github.com/settings/tokens) - For profile analysis
- **LinkedIn API**: [https://developer.linkedin.com](https://developer.linkedin.com) - For profile data

### 3. Minimal Setup
For local development, you only need:

```bash
# .env.local
GROQ_API_KEY=your_groq_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Production Setup
For production deployment, configure all relevant variables in `env.sample`.

---

# The project🕵️‍♂️ LeCommit

**leCommit** is a lightweight AI agent that helps hiring managers detect potentially fraudulent engineering candidates — before the interview even happens.

Built in 48 hours at [Hackathon Name], it uses LLMs, public profile data, and timeline analysis to flag suspicious candidates and generate smart follow-ups.

[![Built with Groq](https://img.shields.io/badge/Groq-API-blue)](https://groq.com)
[![Uses LLaMA 3](https://img.shields.io/badge/Model-LLaMA%203-green)]()
[![Deployed on Vultr](https://img.shields.io/badge/Deployed-Vultr-informational)](https://www.vultr.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ⚡ What It Does

> Stop ghost applicants. Flag fake resumes. Build trust early in hiring.

ShadowCheck acts as a credibility filter during candidate screening. Just drop in a CV and public profile links (LinkedIn, GitHub, etc.), and the agent:

- ✅ Parses and analyzes candidate timelines
- 🔍 Flags red flags (e.g. overlapping jobs, no GitHub activity, cloned identities)
- 📊 Computes a **credibility score** with explainable logic
- 💬 Suggests next steps (follow-up questions, async reference checks)
- 🔁 (Bonus) Detects ghost candidate patterns over time

---

## 📸 UI Preview

[WIP]

---

## 🧠 Tech Stack

| Feature | Stack |
|--------|-------|
| Fast LLM inference | **Groq API** (LLaMA 3) |
| Agent orchestration | **MCP** (Model Context Protocol) |
| Async voice check | **Groq Speech** (optional) |
| Frontend | **React + Tailwind (light mode)** |
| Backend & Auth | **Supabase** |
| Deployment | **Vultr Cloud** |

---



Open [http://localhost:3000](http://localhost:3000) 
