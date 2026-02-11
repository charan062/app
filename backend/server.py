from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import socketio
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import jwt
import bcrypt
import redis.asyncio as redis

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Redis connection (optional, fallback to in-memory if not available)
redis_client = None
room_states = {}  # In-memory fallback for room states

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'orbital-classroom-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'

# Security
security = HTTPBearer()

# Socket.IO setup
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
fastapi_app = FastAPI(title="Orbital Classroom API")

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    created_at: str

class RoomCreate(BaseModel):
    name: str
    
class RoomResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    code: str
    host_id: str
    host_name: str
    created_at: str
    is_active: bool

class RoomJoin(BaseModel):
    code: str

class ParticipantResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    role: str  # 'teacher' or 'student'
    is_muted: bool
    is_video_on: bool
    is_hand_raised: bool
    is_presenting: bool

class MessageCreate(BaseModel):
    content: str
    room_id: str

class MessageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    user_name: str
    content: str
    timestamp: str

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str, name: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'name': name,
        'exp': datetime.now(timezone.utc).timestamp() + (24 * 60 * 60)  # 24 hours
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def generate_room_code() -> str:
    return str(uuid.uuid4())[:8].upper()

# ==================== AUTH ROUTES ====================

@fastapi_app.post("/api/auth/register", response_model=dict)
async def register(user: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user.email,
        "password": hash_password(user.password),
        "name": user.name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user.email, user.name)
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user.email,
            "name": user.name
        }
    }

@fastapi_app.post("/api/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"], user["name"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"]
        }
    }

@fastapi_app.get("/api/auth/me", response_model=dict)
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["user_id"],
        "email": current_user["email"],
        "name": current_user["name"]
    }

# ==================== ROOM ROUTES ====================

@fastapi_app.post("/api/rooms", response_model=RoomResponse)
async def create_room(room: RoomCreate, current_user: dict = Depends(get_current_user)):
    room_id = str(uuid.uuid4())
    room_code = generate_room_code()
    
    room_doc = {
        "id": room_id,
        "name": room.name,
        "code": room_code,
        "host_id": current_user["user_id"],
        "host_name": current_user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True
    }
    await db.rooms.insert_one(room_doc)
    
    # Initialize room state
    room_states[room_id] = {
        "participants": {},
        "messages": [],
        "smartboard_content": None
    }
    
    return RoomResponse(**room_doc)

@fastapi_app.post("/api/rooms/join", response_model=RoomResponse)
async def join_room(join_data: RoomJoin, current_user: dict = Depends(get_current_user)):
    room = await db.rooms.find_one({"code": join_data.code.upper(), "is_active": True}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found or inactive")
    
    return RoomResponse(**room)

@fastapi_app.get("/api/rooms/{room_id}", response_model=RoomResponse)
async def get_room(room_id: str, current_user: dict = Depends(get_current_user)):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return RoomResponse(**room)

@fastapi_app.get("/api/rooms/{room_id}/participants", response_model=List[ParticipantResponse])
async def get_participants(room_id: str, current_user: dict = Depends(get_current_user)):
    if room_id not in room_states:
        return []
    
    participants = list(room_states[room_id]["participants"].values())
    return participants

@fastapi_app.get("/api/rooms/{room_id}/messages", response_model=List[MessageResponse])
async def get_messages(room_id: str, current_user: dict = Depends(get_current_user)):
    messages = await db.messages.find({"room_id": room_id}, {"_id": 0}).sort("timestamp", 1).to_list(100)
    return messages

@fastapi_app.delete("/api/rooms/{room_id}")
async def end_room(room_id: str, current_user: dict = Depends(get_current_user)):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if room["host_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Only host can end the room")
    
    await db.rooms.update_one({"id": room_id}, {"$set": {"is_active": False}})
    
    # Notify all participants
    await sio.emit('room_ended', {"room_id": room_id}, room=room_id)
    
    # Clean up room state
    if room_id in room_states:
        del room_states[room_id]
    
    return {"message": "Room ended successfully"}

@fastapi_app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ==================== SOCKET.IO EVENTS ====================

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    # Remove participant from any room they were in
    for room_id, state in room_states.items():
        for user_id, participant in list(state["participants"].items()):
            if participant.get("sid") == sid:
                del state["participants"][user_id]
                await sio.emit('participant_left', {
                    "user_id": user_id,
                    "name": participant["name"]
                }, room=room_id)
                break

@sio.event
async def join_room(sid, data):
    room_id = data.get("room_id")
    user_id = data.get("user_id")
    name = data.get("name")
    
    if not room_id or not user_id:
        logger.warning(f"join_room called without room_id or user_id for {sid}")
        return
    
    await sio.enter_room(sid, room_id)
    
    # Initialize room state if not exists
    if room_id not in room_states:
        room_states[room_id] = {
            "participants": {},
            "messages": [],
            "smartboard_content": None
        }
    
    # Check if user is host (teacher) or student
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    role = "teacher" if room and room.get("host_id") == user_id else "student"
    
    # Add participant
    participant = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": name,
        "role": role,
        "is_muted": True,
        "is_video_on": False,
        "is_hand_raised": False,
        "is_presenting": False,
        "sid": sid
    }
    room_states[room_id]["participants"][user_id] = participant
    
    logger.info(f"User {name} ({user_id}) joined room {room_id} as {role}")
    
    # Notify all participants in the room
    await sio.emit('participant_joined', participant, room=room_id)
    
    # Send current state to the new participant
    await sio.emit('room_state', {
        "participants": list(room_states[room_id]["participants"].values()),
        "smartboard_content": room_states[room_id]["smartboard_content"]
    }, to=sid)

@sio.event
async def leave_room(sid, data):
    room_id = data.get("room_id")
    user_id = data.get("user_id")
    
    if room_id and room_id in room_states:
        participant = room_states[room_id]["participants"].pop(user_id, None)
        if participant:
            await sio.emit('participant_left', {
                "user_id": user_id,
                "name": participant["name"]
            }, room=room_id)
    
    await sio.leave_room(sid, room_id)

@sio.event
async def toggle_mute(sid, data):
    room_id = data.get("room_id")
    user_id = data.get("user_id")
    is_muted = data.get("is_muted")
    
    if room_id in room_states and user_id in room_states[room_id]["participants"]:
        room_states[room_id]["participants"][user_id]["is_muted"] = is_muted
        await sio.emit('participant_updated', {
            "user_id": user_id,
            "is_muted": is_muted
        }, room=room_id)

@sio.event
async def toggle_video(sid, data):
    room_id = data.get("room_id")
    user_id = data.get("user_id")
    is_video_on = data.get("is_video_on")
    
    if room_id in room_states and user_id in room_states[room_id]["participants"]:
        room_states[room_id]["participants"][user_id]["is_video_on"] = is_video_on
        await sio.emit('participant_updated', {
            "user_id": user_id,
            "is_video_on": is_video_on
        }, room=room_id)

@sio.event
async def raise_hand(sid, data):
    room_id = data.get("room_id")
    user_id = data.get("user_id")
    is_hand_raised = data.get("is_hand_raised")
    
    if room_id in room_states and user_id in room_states[room_id]["participants"]:
        room_states[room_id]["participants"][user_id]["is_hand_raised"] = is_hand_raised
        name = room_states[room_id]["participants"][user_id]["name"]
        await sio.emit('hand_raised', {
            "user_id": user_id,
            "name": name,
            "is_hand_raised": is_hand_raised
        }, room=room_id)

@sio.event
async def send_message(sid, data):
    room_id = data.get("room_id")
    user_id = data.get("user_id")
    user_name = data.get("user_name")
    content = data.get("content")
    
    if not room_id or not content:
        return
    
    message = {
        "id": str(uuid.uuid4()),
        "room_id": room_id,
        "user_id": user_id,
        "user_name": user_name,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Store in database
    await db.messages.insert_one(message.copy())
    
    # Broadcast to room
    await sio.emit('new_message', message, room=room_id)

@sio.event
async def start_presenting(sid, data):
    room_id = data.get("room_id")
    user_id = data.get("user_id")
    content_url = data.get("content_url")  # Could be screen share URL or slide URL
    
    if room_id in room_states:
        # Stop any current presenter
        for uid, p in room_states[room_id]["participants"].items():
            p["is_presenting"] = False
        
        # Set new presenter
        if user_id in room_states[room_id]["participants"]:
            room_states[room_id]["participants"][user_id]["is_presenting"] = True
            room_states[room_id]["smartboard_content"] = content_url
            
            await sio.emit('presentation_started', {
                "user_id": user_id,
                "name": room_states[room_id]["participants"][user_id]["name"],
                "content_url": content_url
            }, room=room_id)

@sio.event
async def stop_presenting(sid, data):
    room_id = data.get("room_id")
    user_id = data.get("user_id")
    
    if room_id in room_states:
        if user_id in room_states[room_id]["participants"]:
            room_states[room_id]["participants"][user_id]["is_presenting"] = False
        room_states[room_id]["smartboard_content"] = None
        
        await sio.emit('presentation_stopped', {
            "user_id": user_id
        }, room=room_id)

@sio.event
async def mute_all(sid, data):
    """Teacher-only: Mute all students"""
    room_id = data.get("room_id")
    host_id = data.get("host_id")
    
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room or room["host_id"] != host_id:
        return  # Only host can mute all
    
    if room_id in room_states:
        for user_id, participant in room_states[room_id]["participants"].items():
            if participant["role"] == "student":
                participant["is_muted"] = True
        
        await sio.emit('all_muted', {"room_id": room_id}, room=room_id)

# ==================== APP SETUP ====================

from starlette.middleware.cors import CORSMiddleware

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Wrap FastAPI with Socket.IO
socket_app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path='/api/socket.io')
app = socket_app

@fastapi_app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
