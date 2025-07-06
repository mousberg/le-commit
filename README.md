<div align="center">
  <img src="frontend/public/logo.svg" alt="Le Commit" width="400" />
</div>

# LeCommit - AI-Powered Reference Calling

A web application that automates reference checking for recruiters using ElevenLabs Conversational AI and Twilio.

## 🚀 Features

- **AI-Powered Conversations**: Uses ElevenLabs Conversational AI for natural reference checking calls
- **Automated Calling**: Integrates with Twilio for reliable phone call delivery
- **Simple Setup**: Direct API integration without complex webhook configurations
- **Professional UI**: Clean, modern interface built with Next.js and Tailwind CSS

## 🏗️ Architecture

**ElevenLabs Conversational Agent Approach**:
- ElevenLabs handles the entire conversation flow
- No TwiML or complex webhooks required
- Natural language processing for reference checking
- Direct API integration for call initiation

## 📋 Prerequisites

1. **ElevenLabs Account**: Sign up at https://elevenlabs.io
2. **Twilio Account**: Sign up at https://console.twilio.com

## 🔧 Setup Instructions

### 1. ElevenLabs Setup

1. **Create a Conversational Agent**:
   - Go to your ElevenLabs dashboard
   - Navigate to "Conversational AI" section
   - Create a new agent
   - Configure it with prompts for reference checking
   - Copy the **Agent ID** (format: `agent_xxxxxxxxxxxxxxxx`)

2. **Set up Twilio Integration**:
   - In your ElevenLabs workspace, go to "Phone Numbers"
   - Add your Twilio phone number
   - Set the webhook URL to: `https://api.elevenlabs.io/twilio/inbound_call`
   - Create a workspace secret with your Twilio Auth Token
   - Copy the **Phone Number ID**

### 2. Environment Configuration

1. Copy `env.sample` to `frontend/.env.local`
2. Fill in your credentials:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_elevenlabs_voice_id

# ElevenLabs Conversational Agent
ELEVENLABS_AGENT_ID=agent_your_agent_id_here
ELEVENLABS_AGENT_PHONE_NUMBER_ID=your_agent_phone_number_id
```

### 3. Install Dependencies

```bash
cd frontend
npm install
```

### 4. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 🎯 How It Works

1. **User Input**: Enter candidate details and reference contact information
2. **API Call**: Application calls ElevenLabs Conversational Agent API
3. **Call Initiation**: ElevenLabs uses Twilio to place the call
4. **AI Conversation**: ElevenLabs agent conducts the reference check
5. **Call Recording**: Conversation is recorded and processed

## 🛠️ Development

Built with:
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **ElevenLabs API**: AI conversation handling
- **Twilio**: Phone call infrastructure

## 📱 Usage

1. Navigate to `/call` in your browser
2. Fill in the reference checking form:
   - Candidate's name
   - Reference contact's name and phone number
   - Company name (optional)
   - Role title (optional)
   - Work duration (optional)
3. Click "Start Reference Call"
4. The AI will automatically call and conduct the reference check

## 🔒 Security Notes

- Never commit `.env` files to version control
- Use environment variables for all sensitive data
- Ensure compliance with local calling regulations
- Always get consent before recording calls

## 🎮 Hackathon Project

This project was built for the Raise Summit Hackathon, demonstrating the power of AI-driven automation in HR processes.
