import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { toast } from 'sonner';

import LiveKitVideo from '@/components/classroom/LiveKitVideo';
import ParticipantsPanel from '@/components/classroom/ParticipantsPanel';
import ChatPanel from '@/components/classroom/ChatPanel';
import RoomHeader from '@/components/classroom/RoomHeader';
import { Button } from '@/components/ui/button';
import { Hand, MessageSquare } from 'lucide-react';

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

  // LiveKit state
  const [livekitToken, setLivekitToken] = useState(null);
  const [livekitUrl, setLivekitUrl] = useState(null);

  // Local user state
  const [isHandRaised, setIsHandRaised] = useState(false);

  // UI state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Determine if user is teacher
  const isTeacher = room?.host_id === user?.id;

  // Fetch room data and LiveKit token
  useEffect(() => {
    const fetchRoomAndToken = async () => {
      try {
        // Fetch room details
        const roomRes = await axios.get(`${API}/rooms/${roomId}`);
        setRoom(roomRes.data);

        // Fetch LiveKit token
        const tokenRes = await axios.post(`${API}/livekit/token`, { room_id: roomId });
        setLivekitToken(tokenRes.data.token);
        setLivekitUrl(tokenRes.data.server_url);

        // Fetch messages
        const messagesRes = await axios.get(`${API}/rooms/${roomId}/messages`);
        setMessages(messagesRes.data);

        setLoading(false);
      } catch (error) {
        console.error('Failed to load classroom:', error);
        toast.error('Failed to load classroom');
        navigate('/dashboard');
      }
    };

    fetchRoomAndToken();
  }, [roomId, navigate]);

  // Socket connection for signaling (chat, hand raise, etc.)
  useEffect(() => {
    if (!connected || !user || !room) return;

    emit('join_room', {
      room_id: roomId,
      user_id: user.id,
      name: user.name
    });

    const handleRoomState = (data) => {
      setParticipants(data.participants || []);
    };

    const handleParticipantJoined = (participant) => {
      setParticipants(prev => {
        const exists = prev.find(p => p.user_id === participant.user_id);
        if (exists) return prev;
        return [...prev, participant];
      });
      if (participant.user_id !== user.id) {
        toast.info(`${participant.name} joined`);
      }
    };

    const handleParticipantLeft = (data) => {
      setParticipants(prev => prev.filter(p => p.user_id !== data.user_id));
      toast.info(`${data.name} left`);
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

    const handleAllMuted = () => {
      if (!isTeacher) {
        toast.info('The teacher muted all students');
      }
    };

    const handleRoomEnded = () => {
      toast.info('The classroom session has ended');
      navigate('/dashboard');
    };

    on('room_state', handleRoomState);
    on('participant_joined', handleParticipantJoined);
    on('participant_left', handleParticipantLeft);
    on('participant_updated', handleParticipantUpdated);
    on('hand_raised', handleHandRaised);
    on('new_message', handleNewMessage);
    on('all_muted', handleAllMuted);
    on('room_ended', handleRoomEnded);

    return () => {
      emit('leave_room', { room_id: roomId, user_id: user.id });
      off('room_state', handleRoomState);
      off('participant_joined', handleParticipantJoined);
      off('participant_left', handleParticipantLeft);
      off('participant_updated', handleParticipantUpdated);
      off('hand_raised', handleHandRaised);
      off('new_message', handleNewMessage);
      off('all_muted', handleAllMuted);
      off('room_ended', handleRoomEnded);
    };
  }, [connected, user, room, roomId, emit, on, off, navigate, isTeacher]);

  // Handlers
  const toggleHand = useCallback(() => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    emit('raise_hand', { room_id: roomId, user_id: user.id, is_hand_raised: newState });
  }, [isHandRaised, emit, roomId, user]);

  const sendMessage = useCallback((content) => {
    emit('send_message', {
      room_id: roomId,
      user_id: user.id,
      user_name: user.name,
      content
    });
  }, [emit, roomId, user]);

  const handleMuteAll = useCallback(async () => {
    if (!isTeacher) return;
    
    try {
      const response = await axios.post(`${API}/rooms/${roomId}/mute-all`);
      toast.success(`Muted ${response.data.muted_count} audio tracks`);
    } catch (error) {
      console.error('Failed to mute all:', error);
      toast.error('Failed to mute all students');
    }
  }, [isTeacher, roomId]);

  const leaveRoom = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const endRoom = useCallback(async () => {
    if (isTeacher) {
      try {
        await axios.delete(`${API}/rooms/${roomId}`);
        navigate('/dashboard');
      } catch (error) {
        console.error('Failed to end room:', error);
      }
    }
  }, [isTeacher, roomId, navigate]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-sky-400 font-heading text-xl">
            Entering Classroom...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-950 overflow-hidden flex flex-col" data-testid="classroom-page">
      {/* Header */}
      <RoomHeader 
        room={room}
        isTeacher={isTeacher}
        participantCount={participants.length}
        onEndRoom={endRoom}
      />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col relative">
          <LiveKitVideo
            token={livekitToken}
            serverUrl={livekitUrl}
            teacherId={room?.host_id}
            currentUserId={user?.id}
            onLeave={leaveRoom}
            onMuteAll={handleMuteAll}
          />

          {/* Floating controls for students */}
          {!isTeacher && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-3">
              <Button
                onClick={toggleHand}
                className={`
                  px-4 py-2 rounded-full transition-all duration-200
                  ${isHandRaised 
                    ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]' 
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-700/50'}
                `}
                data-testid="raise-hand-btn"
              >
                <Hand className="w-4 h-4 mr-2" strokeWidth={1.5} />
                {isHandRaised ? 'Lower Hand' : 'Raise Hand'}
              </Button>
            </div>
          )}
        </div>

        {/* Side panel */}
        {isPanelOpen && (
          <div className="w-80 flex flex-col border-l border-slate-800 bg-slate-950/50">
            <ParticipantsPanel 
              participants={participants}
              currentUserId={user?.id}
              isTeacher={isTeacher}
              onMuteAll={handleMuteAll}
            />
          </div>
        )}
      </div>

      {/* Chat toggle */}
      <Button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className={`
          fixed bottom-6 right-6 w-12 h-12 rounded-full z-40
          ${isChatOpen 
            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/50' 
            : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-700/50'}
        `}
        data-testid="chat-toggle-floating"
      >
        <MessageSquare className="w-5 h-5" strokeWidth={1.5} />
      </Button>

      {/* Chat Panel */}
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
