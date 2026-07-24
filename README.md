# Flashcard AI - Intelligent Study Assistant

A full-stack, distributed web application that leverages natural language processing to dynamically generate flashcards and study modules from raw text. The platform features secure user authentication, an AI-powered microservice architecture, and a custom implementation of the SuperMemo-2 (SM-2) spaced repetition algorithm for optimized memory retention.

## How to Use

1. **Authentication:** Sign up for a new account (be sure to check your email for the SendGrid verification link) or click "Continue as Guest" to bypass registration and explore the dashboard immediately.
2. **Generate a Deck:** Navigate to your dashboard and enter a study topic along with your raw notes/textbook text, a topic by itself, or your raw notes/texbook text by itself. The AI microservice will automatically extract key concepts and generate a comprehensive flashcard deck.
3. **Study & Review:** Click "Study Due Cards" on any deck. As you reveal the answers, rate your memory of each card (_Forgot, Hard, Good, Easy_). The custom SM-2 spaced repetition algorithm will calculate exactly when you need to see that card again to prevent forgetting.
4. **Manage Content:** Use the Deck Overview page to browse cards via the 3D carousel, edit front/back text, or permanently delete specific cards and decks using the custom modal interfaces.

## Key Features

- **AI-Powered Generation:** A dedicated Python microservice interfaces with Google's Gemini API to parse complex text and automatically generate high-quality flashcards.
- **Spaced Repetition Algorithm (SM-2):** Dynamically calculates optimal review intervals using custom ease factors and exponential quality scoring to maximize learning efficiency.
- **Production-Grade Authentication:**
  - Secure JWT-based session management.
  - Cryptographic password hashing using `bcryptjs`.
  - Automated email verification for new account registrations (via SendGrid).
  - Secure "Forgot/Reset Password" flow utilizing expiring hex tokens.
  - Frictionless "Guest Login" for immediate platform exploration.
- **Secure API Gateway:** Node.js/Express backend handles all database transactions and client routing, protected by strict IP-based rate limiting to prevent API abuse.
- **Modern UI/UX:** Built with Next.js and Tailwind CSS, featuring real-time inline validation, responsive grid/carousel deck views, and animated toast notifications (`sonner`).

## Tech Stack

### Frontend

- **Framework:** Next.js / React
- **Styling:** Tailwind CSS
- **State Management:** React Hooks
- **Notifications:** Sonner

### API Gateway (Backend)

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL (Neon Serverless)
- **ORM:** Prisma
- **Security:** JWT, bcryptjs, express-rate-limit
- **Email Services:** SendGrid API

### AI Microservice

- **Language:** Python
- **API Framework:** FastAPI / Flask
- **LLM Provider:** Google Gemini API

## System Architecture

1.  **Client Layer:** The Next.js frontend securely stores JWTs and issues HTTP requests to the API Gateway.
2.  **API Gateway:** Validates tokens, handles rate limiting, and interacts directly with the PostgreSQL database via Prisma to manage user state, decks, and SM-2 memory statistics.
3.  **AI Microservice:** When a user requests new flashcards, the API Gateway securely forwards the prompt to an isolated Python microservice, which handles the complex LLM orchestration and returns structured JSON data.

## Getting Started (Local Development)

### Prerequisites

- Node.js (v18+)
- Python (v3.9+)
- PostgreSQL database (Local or Neon/Supabase)
- SendGrid Account (Free Tier)
- Google Gemini API Key

### 1. Clone the repository

\`\`\`bash
git clone https://github.com/Kasuto22/AI-Study-Assistant-App.git
cd AI-Study-Assistant-App
\`\`\`

### 2. Set up the API Gateway (Backend)

\`\`\`bash
cd api-gateway
npm install
\`\`\`
Create a `.env` file in the `api-gateway` directory:
\`\`\`env
PORT=3000
DATABASE_URL="postgresql://user:password@your-database-host:5432/dbname?sslmode=require"
JWT_SECRET="your_super_secret_jwt_key"
FRONTEND_URL="http://localhost:3001"
AI_SERVICE_URL="http://localhost:8000"
SENDGRID_API_KEY="SG.your_sendgrid_api_key"
GMAIL_USER="your.verified.email@gmail.com"
\`\`\`
Initialize the database and start the server:
\`\`\`bash
npx prisma db push
npx prisma generate
npm run dev
\`\`\`

### 3. Set up the Frontend

\`\`\`bash
cd ../frontend
npm install
\`\`\`
Create a `.env.local` file in the `frontend` directory:
\`\`\`env
NEXT_PUBLIC_API_URL="http://localhost:3000"
\`\`\`
Start the development server:
\`\`\`bash
npm run dev
\`\`\`

_(Note: Ensure your Python AI microservice is running locally on port 8000 to utilize the generation features)._

## Roadmap / Future Enhancements

- **Media Support (V2):** Integration with AWS S3/Cloudinary to allow users to attach images to flashcards.
- **Interactive Canvas:** Implement HTML5 Canvas API for drawing custom diagrams directly onto the back of flashcards.
