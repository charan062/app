# Orbital Classroom - 3D Virtual Classroom Platform

## Original Problem Statement
Build a production-ready futuristic 3D virtual classroom platform similar to Google Meet with an immersive 3D classroom, real-time collaboration, teacher/student roles, smartboard presentations, and WebSocket-based communication.

## Architecture
- **Frontend**: React 19 + Three.js (raw) + Shadcn UI + Tailwind CSS + LiveKit Components
- **Backend**: FastAPI + Socket.IO (WebSocket) + LiveKit API + MongoDB
- **Real-time Video**: LiveKit Cloud WebRTC (wss://classroom-3ntn08k8.livekit.cloud)
- **Signaling**: Socket.IO for chat, hand raise, and room state
- **Auth**: JWT-based authentication
- **Database**: MongoDB for persistence

## User Personas
1. **Teacher**: Creates classrooms, has `roomAdmin` permission, can mute all students at media level
2. **Student**: Joins via room code, no admin permissions, can raise hand and chat

## Core Requirements (Static)
- Real WebRTC audio/video via LiveKit
- Role-based token permissions (teacher vs student)
- Teacher can mute-all at LiveKit media level
- Multi-user support (3+ concurrent users)
- Reconnection strategy with exponential backoff
- Connection status indicator

## What's Been Implemented (Feb 2026)

### Phase 1: Foundation ✅
- Futuristic landing page with "Orbital" theme
- JWT authentication (register/login)
- Dashboard with Create/Join classroom flows
- 3D classroom scene (raw Three.js)
- Socket.IO for signaling

### Phase 2: LiveKit Integration ✅
- `/api/livekit/token` endpoint generates role-based tokens
- Teacher tokens get `roomAdmin: true`
- Student tokens get `roomAdmin: false`
- LiveKit video grid with participant tiles
- Mic/Video toggle controls
- Connection status indicator (Connected/Reconnecting)
- Mute All button for teachers (calls `/api/rooms/{id}/mute-all`)
- Reconnection with exponential backoff

## API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Rooms
- POST /api/rooms (create)
- POST /api/rooms/join (join by code)
- GET /api/rooms/{id}
- DELETE /api/rooms/{id} (end room)

### LiveKit
- POST /api/livekit/token
- POST /api/rooms/{id}/mute-all
- POST /api/rooms/{id}/unmute-participant/{pid}
- GET /api/rooms/{id}/livekit-participants

## LiveKit Configuration
```
LIVEKIT_URL=wss://classroom-3ntn08k8.livekit.cloud
LIVEKIT_API_KEY=APIeKE94R8DQ4px
LIVEKIT_API_SECRET=CE4QTA8tOcC1NudFlseuXdtCisNZjpbxcFPUPsnODuf
```

## Prioritized Backlog

### P0 (Complete) ✅
- LiveKit WebRTC integration
- Multi-user video grid
- Teacher mute-all control
- Role-based permissions

### P1 (Next)
- Screen sharing to smartboard
- Persistent room history
- User profile management

### P2 (Future)
- Recording sessions
- Breakout rooms
- Spatial audio (position-based)
- VR mode support (WebXR)

## Testing Notes
- 3+ users can join same room via room code
- Teacher gets roomAdmin grant in token
- Students get restricted permissions
- Mic/video toggles work (requires browser permissions)
- Mute-all calls LiveKit API to mute audio tracks
