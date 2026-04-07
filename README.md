# 🌾 AgroPivot — Smart Agriculture Advisory Platform

---

## 📌 Project Overview

AgroPivot is a smart agriculture platform designed to empower Malaysian farmers with data-driven insights for better crop planning, risk management, and decision-making.

The system combines real-time environmental data, AI-powered advisory tools, and farm-specific analytics into a unified, role-based dashboard. By integrating weather insights, market intelligence, and crop analysis, AgroPivot helps farmers make informed decisions throughout the planting cycle.

In addition to its core advisory system, the platform includes an extended marketplace feature to support interactions between farmers, seed sellers, and consumers.

🚀 **Live Application:** https://agro-pivot.lovable.app

---

## ⚙️ Installation / Setup Guide

### Prerequisites

* Node.js ≥ 18 or Bun runtime

### Steps

```bash id="o4v2zz"
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

### ⚠️ Local Development Notes

The application follows a cloud-integrated architecture.

While the frontend can be run locally, key functionalities depend on deployed backend services and AI endpoints. Features such as crop advisory, image analysis, and real-time insights require access to the live environment.

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

* PostgreSQL (cloud-hosted)
* Row-Level Security (RLS)

### Authentication

* Email/password authentication with verification

### AI / Machine Learning

* AI-powered inference for advisory, analysis, and chatbot features

### Additional Tools

* Recharts (data visualization)
* Sonner (notifications)
* Vitest & Playwright (testing)

---

## ☁️ Cloud & AI Integration

AgroPivot integrates **Lovable** to support specific infrastructure and AI-related functionalities within the system.

This includes:

* Backend services such as database hosting, authentication, and secure data access
* Serverless functions for weather data processing, market data handling, and AI workflows
* AI capabilities powering crop advisory, image-based analysis, and chatbot interactions
* Deployment and hosting of the live application

These integrations enable seamless connectivity between the frontend, backend logic, and intelligent features.

---

## 🚀 Core Features 

### 🌱 AI Crop Advisory System

* Personalized planting recommendations based on farm profile
* Crop suitability analysis and seasonal insights
* Risk assessment with mitigation strategies

---

### 🌦️ Weather Intelligence

* District-level forecasts across Malaysia
* 7-day predictions (rainfall, humidity, temperature, wind)
* AI-enhanced agricultural recommendations

---

### 📈 Market Decision Support

* Real-time crop price tracking
* Trend analysis and comparisons
* AI-assisted insights for selling decisions

---

### 📷 Crop Health Scanner

* Image-based disease detection
* AI-generated analysis with confidence scoring
* Historical scan tracking

---

### 📋 Crop Planner & Simulator

* Seasonal planting calendar
* Crop rotation suggestions
* Scenario-based simulation (risk vs reward)

---

### 🌾 Active Crop Management

* Track crop growth stages
* Monitor costs and budget allocation
* Plot-level management

---

### 📊 Farmer Dashboard

* Centralized overview of farm activity
* Alerts, insights, and recent actions
* Quick access to key tools

---

## ➕ Supporting Features

### 🛒 Marketplace 

* Product listings with search and filtering
* Seller profiles and verification indicators
* Order tracking system

---

### 🔐 Authentication & Role Management

* Multi-role system (Farmer, Seed Seller, Consumer)
* Secure login and role-based access

---

### 🔔 Alerts System

* Notifications for weather, crop health, and market changes
* Severity-based alert levels

---

### 🤖 AI Chat Assistant

* Context-aware chatbot for agricultural support

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
* Clean agricultural-themed interface
* Smooth animations and transitions

---

## 🛣️ Future Roadmap

### 🌱 Advanced Farmer Intelligence

* Predictive yield modeling
* AI-driven disease forecasting
* Hyper-localized recommendations

---

### 🌐 IoT Integration

* Soil and environmental sensors
* Real-time farm monitoring
* Automated alerts and recommendations

---

### 📊 Data & Analytics

* Historical performance tracking
* Farm profitability insights
* Decision dashboards

---

### 🛒 Marketplace Expansion

* Messaging and negotiation features
* Integrated payments
* Logistics and delivery tracking

---

## 🚀 Deployment

The application is deployed and accessible online via a managed hosting environment:

🔗 https://agro-pivot.lovable.app

---

## 📄 License

Proprietary — All rights reserved.
