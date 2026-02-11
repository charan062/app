import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { toast } from 'sonner';

import ClassroomScene from '@/components/classroom/ClassroomScene';
import ControlBar from '@/components/classroom/ControlBar';
import ParticipantsPanel from '@/components/classroom/ParticipantsPanel';
import ChatPanel from '@/components/classroom/ChatPanel';
import RoomHeader from '@/components/classroom/RoomHeader';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClassroomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { emit, on, off, connected } = useSocket();

  // Room state
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Local user state
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);

  // UI state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [smartboardContent, setSmartboardContent] = useState(null);

  // Determine if user is teacher
  const isTeacher = room?.host_id === user?.id;

  // Fetch room data
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const [roomRes, messagesRes] = await Promise.all([
          axios.get(`${API}/rooms/${roomId}`),
          axios.get(`${API}/rooms/${roomId}/messages`)
        ]);
        setRoom(roomRes.data);
        setMessages(messagesRes.data);
        setLoading(false);
      } catch (error) {
        toast.error('Failed to load classroom');
        navigate('/dashboard');
      }
    };

    fetchRoom();
  }, [roomId, navigate]);

  // Socket connection
  useEffect(() => {
    if (!connected || !user || !room) return;

    // Join the room
    emit('join_room', {
      room_id: roomId,
      user_id: user.id,
      name: user.name
    });

    // Socket event handlers
    const handleRoomState = (data) => {
      setParticipants(data.participants || []);
      setSmartboardContent(data.smartboard_content);
    };

    const handleParticipantJoined = (participant) => {
      setParticipants(prev => {
        const exists = prev.find(p => p.user_id === participant.user_id);
        if (exists) return prev;
        return [...prev, participant];
      });
      if (participant.user_id !== user.id) {
        toast.info(`${participant.name} joined the classroom`);
      }
    };

    const handleParticipantLeft = (data) => {
      setParticipants(prev => prev.filter(p => p.user_id !== data.user_id));
      toast.info(`${data.name} left the classroom`);
    };

    const handleParticipantUpdated = (data) => {
      setParticipants(prev => prev.map(p => 
        p.user_id === data.user_id ? { ...p, ...data } : p
      ));
    };

    const handleHandRaised = (data) => {
      if (data.user_id !== user.id && data.is_hand_raised) {
        toast.info(`${data.name} raised their hand`);
      }
    };

    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };

    const handlePresentationStarted = (data) => {
      setSmartboardContent(data.content_url);
      toast.info(`${data.name} started presenting`);
    };

    const handlePresentationStopped = () => {
      setSmartboardContent(null);
    };

    const handleAllMuted = () => {
      if (!isTeacher) {
        setIsMuted(true);
        toast.info('The teacher muted all students');
      }
    };

    const handleRoomEnded = () => {
      toast.info('The classroom session has ended');
      navigate('/dashboard');
    };

    // Subscribe to events
    on('room_state', handleRoomState);
    on('participant_joined', handleParticipantJoined);
    on('participant_left', handleParticipantLeft);
    on('participant_updated', handleParticipantUpdated);
    on('hand_raised', handleHandRaised);
    on('new_message', handleNewMessage);
    on('presentation_started', handlePresentationStarted);
    on('presentation_stopped', handlePresentationStopped);
    on('all_muted', handleAllMuted);
    on('room_ended', handleRoomEnded);

    return () => {
      // Leave room on unmount
      emit('leave_room', { room_id: roomId, user_id: user.id });
      
      // Unsubscribe from events
      off('room_state', handleRoomState);
      off('participant_joined', handleParticipantJoined);
      off('participant_left', handleParticipantLeft);
      off('participant_updated', handleParticipantUpdated);
      off('hand_raised', handleHandRaised);
      off('new_message', handleNewMessage);
      off('presentation_started', handlePresentationStarted);
      off('presentation_stopped', handlePresentationStopped);
      off('all_muted', handleAllMuted);
      off('room_ended', handleRoomEnded);
    };
  }, [connected, user, room, roomId, emit, on, off, navigate, isTeacher]);

  // Control handlers
  const toggleMute = useCallback(() => {
    const newState = !isMuted;
    setIsMuted(newState);
    emit('toggle_mute', { room_id: roomId, user_id: user.id, is_muted: newState });
  }, [isMuted, emit, roomId, user]);

  const toggleVideo = useCallback(() => {
    const newState = !isVideoOn;
    setIsVideoOn(newState);
    emit('toggle_video', { room_id: roomId, user_id: user.id, is_video_on: newState });
  }, [isVideoOn, emit, roomId, user]);

  const toggleHand = useCallback(() => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    emit('raise_hand', { room_id: roomId, user_id: user.id, is_hand_raised: newState });
  }, [isHandRaised, emit, roomId, user]);

  const togglePresent = useCallback(() => {
    if (isPresenting) {
      setIsPresenting(false);
      emit('stop_presenting', { room_id: roomId, user_id: user.id });
    } else {
      setIsPresenting(true);
      // For demo, using a placeholder URL
      emit('start_presenting', { 
        room_id: roomId, 
        user_id: user.id, 
        content_url: 'presentation' 
      });
    }
  }, [isPresenting, emit, roomId, user]);

  const sendMessage = useCallback((content) => {
    emit('send_message', {
      room_id: roomId,
      user_id: user.id,
      user_name: user.name,
      content
    });
  }, [emit, roomId, user]);

  const muteAll = useCallback(() => {
    if (isTeacher) {
      emit('mute_all', { room_id: roomId, host_id: user.id });
      toast.success('All students muted');
    }
  }, [isTeacher, emit, roomId, user]);

  const leaveRoom = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const endRoom = useCallback(async () => {
    if (isTeacher) {
      try {
        await axios.delete(`${API}/rooms/${roomId}`);
      } catch (error) {
        console.error('Failed to end room:', error);
      }
    }
  }, [isTeacher, roomId]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <div className="text-sky-400 font-heading text-xl animate-pulse">
          Entering Classroom...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-950 overflow-hidden relative" data-testid="classroom-page">
      {/* 3D Scene (Background) */}
      <div className="absolute inset-0 z-0">
        <ClassroomScene 
          participants={participants}
          smartboardContent={smartboardContent}
          currentUserId={user?.id}
        />
      </div>

      {/* UI Layer */}
      <div className="relative z-10 h-full flex flex-col pointer-events-none">
        {/* Header */}
        <RoomHeader 
          room={room}
          isTeacher={isTeacher}
          participantCount={participants.length}
          onEndRoom={endRoom}
        />

        {/* Middle section - Participants panel */}
        <div className="flex-1 flex justify-end p-4 overflow-hidden">
          <ParticipantsPanel 
            participants={participants}
            currentUserId={user?.id}
            isTeacher={isTeacher}
            onMuteAll={muteAll}
          />
        </div>

        {/* Control Bar */}
        <ControlBar
          isMuted={isMuted}
          isVideoOn={isVideoOn}
          isHandRaised={isHandRaised}
          isPresenting={isPresenting}
          isTeacher={isTeacher}
          isChatOpen={isChatOpen}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onToggleHand={toggleHand}
          onTogglePresent={togglePresent}
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
          onLeave={leaveRoom}
        />
      </div>

      {/* Chat Panel (Overlay) */}
      <ChatPanel
        isOpen={isChatOpen}
        messages={messages}
        currentUserId={user?.id}
        onSend={sendMessage}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
};

export default ClassroomPage;
