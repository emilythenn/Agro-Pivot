# 🌾 AgroPivot — Smart Agriculture Advisory Platform

## 📌 Project Overview

AgroPivot is a full-stack smart agriculture platform designed to support Malaysian farmers, seed sellers, and consumers through data-driven decision-making.

The system integrates real-time environmental data, AI-powered advisory tools, and a peer-to-peer marketplace into a unified, role-based dashboard. It enables farmers to optimize crop planning, monitor risks, and improve yield outcomes, while also connecting stakeholders across the agricultural supply chain.

The platform is built with a modern web architecture, combining a responsive frontend with cloud-based backend services and AI capabilities.

---

## ⚙️ Installation / Setup Guide

### Prerequisites

* Node.js ≥ 18 or Bun runtime

### Steps

```bash
# 1. Clone repository
git clone <your-repo-link>
cd agropivot

# 2. Install dependencies
npm install
# or
bun install

# 3. Start development server
npm run dev
```

---

### ⚠️ Important Note on Local Development

This project uses managed cloud services for backend infrastructure and AI processing.

While the frontend can be executed locally, full functionality requires access to deployed cloud services, including:

* Database and authentication services
* Serverless backend functions
* AI processing endpoints

Without these services, features such as AI advisory, scanning, and real-time data integration will not function as expected.

---

## 🧱 System Architecture

AgroPivot follows a modular full-stack architecture:

### Frontend

* Built with React and TypeScript
* Responsive UI with modern component design
* Role-based dashboards and routing

### Backend (Cloud-Based)

The application integrates a Backend-as-a-Service (BaaS) platform to handle:

* Database management (PostgreSQL)
* Authentication and user sessions
* Role-based access control
* Secure API layer

### Serverless Functions

Core backend logic is implemented through serverless functions, including:

* Weather data processing
* Market price aggregation
* AI-powered crop analysis
* Image-based disease detection

### AI Integration

AI capabilities are integrated via managed AI endpoints, enabling:

* Crop advisory recommendations
* Market trend insights
* Image-based crop health analysis
* Conversational assistant support

This architecture allows rapid development while maintaining scalability and reliability.

---

## 🛠️ Technologies Used

### Frontend

* React 18
* TypeScript 5
* Vite 5

### Styling & UI

* Tailwind CSS
* shadcn/ui
* Framer Motion

### State & Data Management

* TanStack React Query
* React Context API

### Backend & Database

* Cloud-based PostgreSQL (via BaaS)
* Row-Level Security (RLS)

### Authentication

* Email/password authentication with verification

### AI / Machine Learning

* Managed AI APIs (LLM-based inference for advisory & analysis)

### Additional Tools

* Recharts (data visualization)
* Sonner (notifications)
* Vitest & Playwright (testing)

---

## 🚀 Features

### 🔐 Authentication & Role Management

* Multi-role system: Farmer, Seed Seller, Consumer
* Secure login, signup, and verification
* Role-based dashboards and permissions

---

### 🧑‍🌾 Farmer Onboarding

* Multi-step onboarding capturing farm details
* Persistent farm profile used across AI features

---

### 📊 Dashboard Overview

* Real-time summaries of farm activity
* Weather insights and alerts
* Market price previews
* Quick action panels

---

### 🌦️ Weather Forecast

* District-level 7-day forecasts
* AI-generated agricultural advice
* Fallback handling during API downtime

---

### 📈 Market Intelligence

* Real-time crop price tracking
* Trend analysis and comparisons
* AI-powered recommendations

---

### 🌱 AI Crop Advisory

* Personalized planting suggestions
* Risk analysis and mitigation strategies
* Context-aware recommendations

---

### 📷 Crop Health Scanner

* Image-based disease detection
* AI-generated analysis and confidence scoring
* Scan history and tracking

---

### 📋 Crop Planner & Simulator

* Seasonal planning tools
* Crop rotation suggestions
* Scenario-based simulation (risk vs reward)

---

### 🌾 Active Crop Management

* Track crop growth stages
* Budget and cost monitoring
* Plot-level management

---

### 📄 Evidence Reports

* Generate structured agricultural reports
* Includes GPS, AI insights, and environmental data
* Integrity verification via hashing

---

### 🔔 Alerts System

* AI-triggered alerts (weather, crop health, market)
* Severity levels and notifications

---

### 🛒 Marketplace

* Product listings with filters and search
* Seller profiles and verification system
* Order lifecycle tracking

---

### ⭐ Rating & Review System

* Verified purchase reviews
* Seller rating aggregation

---

### 🤖 AI Chat Assistant

* Context-aware agricultural chatbot
* Real-time Q&A support

---

### 🌐 Internationalization

* Multi-language support:

  * English
  * Bahasa Malaysia
  * Chinese
  * Tamil

---

### 🎨 UI/UX Design

* Responsive layout (mobile + desktop)
* Clean agricultural-themed design system
* Smooth animations and transitions

---

## 🛣️ Future Roadmap

### 🔐 Security Enhancements

* Advanced access control policies
* API rate limiting
* Security audits

---

### 🛒 Marketplace Expansion

* In-app messaging
* Negotiation system
* Integrated payments (FPX, e-wallets)
* Delivery tracking

---

### 🌱 IoT Integration

* Soil sensors and real-time monitoring
* Automated irrigation alerts
* Smart farming dashboards

---

### 🤝 Community Features

* Farmer discussion forums
* Knowledge sharing hub
* Mentorship matching

---

### 📊 Advanced Analytics

* Yield tracking and predictions
* Financial dashboards
* Performance reports

---

### 📱 Mobile Application

* Progressive Web App (PWA) / React Native app
* Offline capabilities
* Push notifications
* Camera-native scanning

---

## 🚀 Deployment

The application is deployed on a cloud hosting platform with integrated backend and AI services, ensuring seamless scalability and real-time performance.

---

## 📄 License

Proprietary — All rights reserved.

