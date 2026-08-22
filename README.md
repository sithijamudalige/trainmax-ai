# ⚽ TrainMax AI (Football Chatbot)

TrainMax AI is an intelligent, AI-powered football coaching application designed to help players elevate their game. By combining a conversational AI assistant with structured training plans, players receive personalized, actionable advice and track their progress day-by-day.

## ✨ Features

- **🧠 Smart AI Coach (MAX):** Chat with MAX to discuss tactics, get advice on specific skills (e.g., dribbling, shooting), and log your match performance.
- **📋 Automated Training Plans:** MAX automatically extracts structured, multi-day training plans from your conversations.
- **📈 Day-by-Day Tracking:** A beautiful dashboard allows players to view their customized plans and check off daily drills (Done, In Progress, Missed).
- **📱 Cross-Platform:** Includes both a responsive React Web App and a React Native (Expo) Mobile App.
- **📊 Player Analytics:** Tracks goals, win rates, BMI, and overall skill level progression.

## 🛠️ Tech Stack

- **Backend:** Python, Flask, Supabase (PostgreSQL), ChromaDB (Vector Database for AI Memory)
- **Web Frontend:** React, React Router, Bootstrap & Custom CSS
- **Mobile App:** React Native, Expo, React Navigation
- **AI/LLM:** LangChain / Google Gemini (or OpenAI)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- Supabase Account (for PostgreSQL database & Auth)

### 1. Backend Setup

```bash
cd backend
python -m venv .venv
# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**Environment Variables:**
Create a `.env` file in the `backend` directory:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
# Add your LLM API Keys (OpenAI / Gemini) here
```

**Run the Server:**
```bash
flask run --host=0.0.0.0 --port=5000
```

### 2. Web Frontend Setup

```bash
cd frontend
npm install
npm start
```

### 3. Mobile App (Expo) Setup

Ensure you have your computer's local IP address updated in `TrainMaxMobile/src/services/api.js` so the mobile app can communicate with the Flask backend.

```bash
cd TrainMaxMobile
npm install
npx expo start
```
*Use the Expo Go app on iOS or Android to scan the QR code and test on your physical device.*

## 🤝 Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License
[MIT](https://choosealicense.com/licenses/mit/)
