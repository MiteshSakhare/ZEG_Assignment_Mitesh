# Deployment Guide

This document outlines the step-by-step process for deploying the **Buildable Land Analysis** application to production using **Vercel** for the frontend and **Render** for the backend.

---

## 1. Backend Deployment (Render)

We will deploy the FastAPI backend as a web service on Render using the provided `Dockerfile`.

### Prerequisites
- A [Render](https://render.com) account.
- Your project code pushed to a GitHub repository.

### Steps
1. **Log in to Render** and click the **New +** button, then select **Web Service**.
2. **Connect your GitHub repository** containing this code.
3. **Configure the Service**:
   - **Name**: `buildable-land-api`
   - **Environment**: Select `Docker` (Render will automatically detect the `Dockerfile` inside the `backend` folder if configured, but since it's a monorepo, you must specify the Root Directory).
   - **Root Directory**: `backend`
   - **Branch**: `main`
4. **Environment Variables**:
   - Add `CORS_ORIGINS`: `*` (or your specific Vercel frontend URL once deployed, e.g., `https://buildable-land.vercel.app`).
5. **Deploy**:
   - Click **Create Web Service**.
   - Render will build the Docker container and deploy the FastAPI app.
   - Once deployed, note the **Service URL** (e.g., `https://buildable-land-api.onrender.com`).

---

## 2. Frontend Deployment (Vercel)

We will deploy the Vite + React frontend to Vercel.

### Prerequisites
- A [Vercel](https://vercel.com) account.
- Your project code pushed to a GitHub repository.

### Steps
1. **Log in to Vercel** and click **Add New...** -> **Project**.
2. **Import your GitHub repository**.
3. **Configure the Project**:
   - **Project Name**: `buildable-land`
   - **Framework Preset**: Vercel should auto-detect `Vite`.
   - **Root Directory**: `frontend`
4. **Environment Variables**:
   - Add `VITE_API_URL`. Set its value to the Render Service URL from the previous step (e.g., `https://buildable-land-api.onrender.com`).
5. **Deploy**:
   - Click **Deploy**.
   - Vercel will install dependencies, build the React app, and assign it a live URL.

---

## 3. Post-Deployment Verification

1. **Verify Backend**: Open your Render URL appended with `/docs` (e.g., `https://buildable-land-api.onrender.com/docs`) to ensure the Swagger UI loads successfully.
2. **Verify Frontend**: Open your Vercel URL. The map should load, and clicking on a parcel should trigger an analysis without CORS errors.
3. **Lock Down CORS**: Go back to your Render dashboard and update the `CORS_ORIGINS` environment variable to strictly match your Vercel URL, then redeploy the backend for enhanced security.
