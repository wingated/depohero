# Deposition AI Platform

An AI-powered platform for managing and analyzing legal depositions and discovery documents.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example` and fill in your environment variables:
```
VITE_AUTH0_DOMAIN=your-auth0-domain
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_OPENAI_API_KEY=your-openai-api-key
VITE_MONGODB_URI=mongodb://localhost:27017/depohero
VITE_API_URL=http://localhost:3001/api
```

3. Start MongoDB:
Make sure you have MongoDB installed and running locally, or use a cloud MongoDB instance and update the `VITE_MONGODB_URI` accordingly.

4. Start the development server:
```bash
npm run dev
```

## Features

- Case Management
- Document Upload and Management
- Deposition Transcripts
- AI-Powered Analysis
  - Document Analysis
  - Deposition Analysis
  - Cross-Reference Discovery Documents
  - Suggested Questions
  - Discrepancy Detection

## Architecture

- Frontend: React + TypeScript + Vite
- Backend: Express + TypeScript
- Database: MongoDB + Mongoose
- Authentication: Auth0
- AI: OpenAI API

## Development

The project uses a monorepo structure with both frontend and backend code in the same repository.

- `/src` - Frontend React application
- `/src/server` - Backend Express server
- `/src/lib/mongodb` - MongoDB models and configuration
- `/scripts` - Utility scripts