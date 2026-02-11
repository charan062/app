# Orbital Classroom - 3D Virtual Classroom Platform

## Original Problem Statement
Build a production-ready futuristic 3D virtual classroom platform similar to Google Meet with an immersive 3D classroom, real-time collaboration, teacher/student roles, smartboard presentations, and WebSocket-based communication.

## Architecture
- **Frontend**: React 19 + Three.js (raw) + Shadcn UI + Tailwind CSS
- **Backend**: FastAPI + Socket.IO (WebSocket) + MongoDB
- **Real-time**: Hybrid WebSocket/WebRTC approach (Socket.IO for signaling/state)
- **Auth**: JWT-based authentication
- **Database**: MongoDB for persistence

## User Personas
1. **Teacher**: Creates classrooms, presents on smartboard, mutes students, manages sessions
2. **Student**: Joins via room code, raises hand, participates in chat, view-only smartboard

## Core Requirements (Static)
- 3D classroom rendering with avatar representation
- Google Meet-like UI (bottom control bar, right participant list)
- Role-based permissions (teacher vs student)
- Real-time mute/unmute, raise hand, chat
- Smartboard presentation system
- Room code sharing for easy access

## What's Been Implemented (Jan 2026)
- ✅ Futuristic landing page with "Orbital" theme
- ✅ JWT authentication (register/login)
- ✅ Dashboard with Create/Join classroom flows
- ✅ 3D classroom scene (raw Three.js for React 19 compatibility)
- ✅ Real-time participant management via Socket.IO
- ✅ Control bar (mic, video, hand raise, present, chat, leave)
- ✅ Participant panel with status indicators
- ✅ Chat panel with real-time messaging
- ✅ Teacher controls (mute all, end session)
- ✅ Room header with code sharing

## Prioritized Backlog

### P0 (Critical - Next Sprint)
- Actual WebRTC audio/video integration (LiveKit)
- Screen sharing functionality
- Persistent room history

### P1 (Important)
- Smartboard content upload/display
- Recording sessions
- Breakout rooms
- User profile management

### P2 (Nice to Have)
- Spatial audio (position-based)
- VR mode support (WebXR)
- Virtual whiteboard collaboration
- AI-powered attendance/participation tracking

## Next Tasks
1. Integrate LiveKit for WebRTC audio/video
2. Implement actual screen sharing
3. Add persistent room history
4. Build smartboard file upload system
