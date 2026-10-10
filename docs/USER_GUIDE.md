# 👤 End-User & Operator Guide

A complete walkthrough for end users interacting with the AI Voice Agent and operators monitoring the Usage & Cost Dashboard.

---

## 🎙️ Part 1: Interacting with the Voice Agent

### 1. Starting a Voice Call
1. Open your browser and navigate to **[http://localhost:5173/](http://localhost:5173/)**.
2. Select your desired persona from the dropdown menu (e.g., *Nova - Friendly Assistant*, *Atlas - Technical Support*, or *Lyra - Executive Concierge*).
3. Click the large circular **"Start Voice Session"** button.
4. When prompted by your browser, grant permission to use the microphone.

---

### 2. Conversational Voice Experience
- **Speaking**: Speak naturally into your microphone. As you speak, the dynamic audio waveform visualizer pulses in response to your volume.
- **Listening**: The AI agent responds in fluid, human-like voice with low latency. Real-time transcript subtitles appear on screen as the agent speaks.
- **Barge-In (Interruption)**: You do not need to wait for the agent to finish talking before responding. Simply start speaking; the agent will immediately stop talking, discard its playback buffer, and listen to your new question.
- **Mute**: Click the microphone icon button to temporarily mute your audio stream without dropping the conversation session.
- **Ending Call**: Click the red **"End Call"** button to hang up and complete the session.

---

## 📊 Part 2: Usage & Cost Dashboard

The dashboard provides real-time financial transparency into Gemini Live API consumption.

### Accessing the Dashboard
- Click **"Dashboard"** in the top navigation bar.
- If prompted, log in with administrator credentials:
  - **Username**: `admin`
  - **Password**: `admin123`

---

### 1. Summary KPI Cards
At the top of the dashboard, four real-time KPI cards display:
- **Active / Completed Calls**: Live count of current calls and historical completed calls.
- **Total Spend (USD)**: Exact aggregate cost of all processed calls.
- **Token Consumption**: Total token volume broken down by modality:
  - **Text Tokens** (System instructions + typed input/output)
  - **Audio Tokens** (Spoken user audio + synthesized voice output)
- **Total Duration**: Cumulative call time across all sessions.

---

### 2. Interactive Trend Visualizations
- **Daily Spend Trends**: An interactive area chart illustrating running spend in US Dollars ($) across recent days.
- **Token Modality Breakdown**: A stacked bar chart visualizing the ratio of audio tokens vs. text tokens consumed per day.

---

### 3. Session Telemetry & Audit Drawer
The session table displays every historical call with:
- Session ID (UUID)
- Persona used
- Status badge (*Completed*, *Active*, or *Error*)
- Duration (seconds)
- Audio vs. Text token counts
- Total calculated session cost

#### Granular Session Inspection:
Click on **any row** in the table to open the slide-out **Session Audit Drawer**:
1. **Full Conversation Transcript**: Timestamped log of user prompts and AI responses with individual turn audio durations.
2. **Mathematical Cost Equation**: Complete transparent formula showing how the cost was calculated:
   $$\text{Total Cost} = (T_{\text{text, in}} \times R_{\text{text, in}}) + (T_{\text{audio, in}} \times R_{\text{audio, in}}) + (T_{\text{text, out}} \times R_{\text{text, out}}) + (T_{\text{audio, out}} \times R_{\text{audio, out}})$$
3. **Model & Hardware Metadata**: Gemini model identifier and connection latency.

---

### 4. Pricing Rates Inspector
Click the **"View Pricing Rates"** button in the dashboard header to inspect the active billing rates per 1,000,000 tokens for the current Gemini model tier.
