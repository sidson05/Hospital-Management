# HMS Web Frontend (React + Vite)

Classic, natural botanical glassmorphism web client for the Hospital Appointment and Queue Management System (HMS).

## Technology Stack
- **Framework:** React 18
- **Build Tool:** Vite
- **Routing:** React Router v6
- **Styling:** Vanilla CSS with design tokens and CSS variables (no Tailwind, no UI kit)
- **Typography:** Cormorant Garamond (headings, doctor names, numerals) & Mulish (body, UI) from Google Fonts
- **API Client:** Fetch API with automatic JWT Bearer token authentication and error handling

## Getting Started

### 1. Ensure Backend is Running
The Spring Boot backend should be running on:
```
http://localhost:8080
```
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI Docs: `http://localhost:8080/v3/api-docs`

### 2. Install Dependencies
```bash
cd frontend
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
The Vite development server runs at `http://localhost:5173` with an automatic dev proxy forwarding all `/api` requests to `http://localhost:8080`.

### 4. Build for Production / Spring Boot
```bash
npm run build
```
The compiled assets will be placed in `frontend/dist`. You can sync them into Spring Boot's `src/main/resources/static/` using the deployment script:
```powershell
.\deploy-to-spring.ps1
```

## Demo Credentials
- **Administrator:** `admin@hospital.com` / `AdminPassword123!`
- **Physician (Doctor):** `sarah.jenkins@hospital.com` / `DoctorPassword123!`
- **Patient:** `patient@hospital.com` / `PatientPassword123!`
