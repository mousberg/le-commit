# 🚀 ElevenLabs Conversational Agent Setup Guide

This guide will walk you through setting up the ElevenLabs Conversational Agent approach for automated reference calling.

## 📋 What You Need

1. **ElevenLabs Account** with Conversational AI access
2. **Twilio Account** with a phone number
3. **Your credentials** from both services

## 🔧 Step-by-Step Setup

### 1. ElevenLabs Conversational Agent Setup

#### A. Create Your Agent
1. Go to [ElevenLabs Dashboard](https://elevenlabs.io)
2. Navigate to **"Conversational AI"** section
3. Click **"Create Agent"**
4. Configure your agent with this prompt:

```
You are a professional HR assistant conducting reference checks. Your job is to have natural, friendly conversations with references to gather information about candidates.

CONVERSATION FLOW:
1. Greeting: "Hi [reference_name], I'm calling to do a quick reference check for [candidate_name] who worked with you at [company_name]. Do you have about 3-4 minutes?"

2. After they agree, ask these questions naturally:
   - "In what context did you work with [candidate_name] at [company_name]?"
   - "Can you share any projects you remember [candidate_name] working on?"
   - "How would you describe [candidate_name]'s work style and reliability?"
   - "What were [candidate_name]'s main strengths?"
   - "Were there any areas where [candidate_name] could improve?"
   - "Would you work with [candidate_name] again if you had the opportunity?"

3. Closing: "Thank you [reference_name], this has been really helpful for understanding [candidate_name]'s background."

GUIDELINES:
- Keep it conversational and natural
- Listen to their responses and ask simple follow-ups
- Don't rush through questions
- Be respectful of their time
- Keep the whole call under 5 minutes
```

5. **Copy the Agent ID** (format: `agent_xxxxxxxxxxxxxxxx`)

#### B. Set Up Twilio Integration
1. In your ElevenLabs workspace, go to **"Phone Numbers"**
2. Click **"Add Phone Number"**
3. Select **"Twilio"** as the provider
4. Enter your Twilio phone number
5. Set the webhook URL to: `https://api.elevenlabs.io/twilio/inbound_call`
6. Create a workspace secret with your **Twilio Auth Token**
7. **Copy the Phone Number ID** that gets generated

### 2. Environment Configuration

1. Copy the environment template:
```bash
cp env.sample frontend/.env.local
```

2. Fill in your credentials in `frontend/.env.local`:

```env
# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# ElevenLabs Conversational Agent
ELEVENLABS_AGENT_ID=agent_your_agent_id_here
ELEVENLABS_AGENT_PHONE_NUMBER_ID=your_agent_phone_number_id
```

### 3. Installation & Testing

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000/call](http://localhost:3000/call)

4. Test with a call to your own phone number first!

## 🎯 How It Works

1. **User fills out form** with candidate and reference details
2. **API calls ElevenLabs** with conversation variables
3. **ElevenLabs creates conversation** with your agent
4. **ElevenLabs calls Twilio** to place the phone call
5. **Twilio delivers call** to the reference's phone
6. **AI agent conducts** the reference check conversation
7. **Call is recorded** and processed by ElevenLabs

## 📱 Testing Your Setup

### Test Call Process
1. Navigate to `/call` in your browser
2. Fill in the form:
   - **Candidate Name**: "John Doe"
   - **Reference Name**: "Jane Smith" 
   - **Phone Number**: Your own phone number (for testing)
   - **Company**: "Tech Corp"
   - **Role**: "Software Engineer"
   - **Duration**: "2 years"

3. Click **"Start Reference Call"**
4. You should receive a call from your Twilio number
5. The AI agent should introduce itself and start the reference check

### Troubleshooting

**If the call doesn't work:**
1. Check your browser's developer console for errors
2. Verify all environment variables are set correctly
3. Ensure your ElevenLabs agent ID is correct
4. Confirm your Twilio phone number is verified
5. Check that the Phone Number ID from ElevenLabs is correct

**Common Issues:**
- **401 Unauthorized**: Check your ElevenLabs API key
- **400 Bad Request**: Verify your agent ID format
- **Call not connecting**: Ensure Twilio integration is properly set up in ElevenLabs

## 🔒 Security & Compliance

- Never commit `.env.local` files to version control
- Always get consent before recording calls
- Comply with local calling and recording regulations
- Use the system responsibly and ethically

## 🎉 Success!

Once everything is working, you'll have:
- ✅ Automated reference calling
- ✅ Natural AI conversations
- ✅ No complex webhook setup
- ✅ Professional reference checking process

The ElevenLabs Conversational Agent handles all the complexity of managing the conversation flow, speech recognition, and natural language processing for you!

## 📞 Next Steps

- Test with real reference calls
- Customize the agent's conversation prompts
- Add more sophisticated logic to your frontend
- Consider adding call result storage and analysis

Happy reference checking! 🚀 