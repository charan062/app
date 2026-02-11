import { useEffect, useState, useCallback } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants,
  useParticipants,
  useTracks,
  VideoTrack,
  AudioTrack,
  TrackRefContext,
  ParticipantTile,
  TrackLoop,
  GridLayout,
} from '@livekit/components-react';
import { Track, RoomEvent, ConnectionState } from 'livekit-client';
import '@livekit/components-styles';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff,
  Users,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Connection status indicator
const ConnectionIndicator = ({ state }) => {
  const getStatusInfo = () => {
    switch (state) {
      case ConnectionState.Connected:
        return { icon: Wifi, color: 'text-green-400', label: 'Connected' };
      case ConnectionState.Connecting:
        return { icon: RefreshCw, color: 'text-yellow-400', label: 'Connecting...' };
      case ConnectionState.Reconnecting:
        return { icon: RefreshCw, color: 'text-orange-400', label: 'Reconnecting...' };
      case ConnectionState.Disconnected:
        return { icon: WifiOff, color: 'text-red-400', label: 'Disconnected' };
      default:
        return { icon: WifiOff, color: 'text-slate-400', label: 'Unknown' };
    }
  };

  const { icon: Icon, color, label } = getStatusInfo();
  const isSpinning = state === ConnectionState.Connecting || state === ConnectionState.Reconnecting;

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/50 border border-slate-700 ${color}`}>
      <Icon className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} strokeWidth={1.5} />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
};

// Individual participant video tile
const ParticipantVideo = ({ participant, isLocal, isTeacher }) => {
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone], { 
    onlySubscribed: false 
  }).filter(track => track.participant.identity === participant.identity);

  const videoTrack = tracks.find(t => t.source === Track.Source.Camera);
  const audioTrack = tracks.find(t => t.source === Track.Source.Microphone);
  const isMuted = !audioTrack || audioTrack.publication?.isMuted;
  const hasVideo = videoTrack && !videoTrack.publication?.isMuted;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`
        relative rounded-xl overflow-hidden border-2
        ${isTeacher ? 'border-sky-500/50' : 'border-slate-700'}
        ${isLocal ? 'ring-2 ring-sky-500' : ''}
        bg-slate-900 aspect-video
      `}
      data-testid={`participant-video-${participant.identity}`}
    >
      {/* Video or avatar placeholder */}
      {hasVideo ? (
        <VideoTrack 
          trackRef={videoTrack} 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold
            ${isTeacher ? 'bg-sky-500/20 text-sky-400' : 'bg-fuchsia-500/20 text-fuchsia-400'}
          `}>
            {participant.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        </div>
      )}

      {/* Name and status overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-medium truncate max-w-[120px]">
              {participant.name || 'Unknown'}
            </span>
            {isTeacher && (
              <span className="text-xs px-2 py-0.5 rounded bg-sky-500/30 text-sky-400">
                Teacher
              </span>
            )}
            {isLocal && (
              <span className="text-xs px-2 py-0.5 rounded bg-fuchsia-500/30 text-fuchsia-400">
                You
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isMuted ? (
              <MicOff className="w-4 h-4 text-red-400" strokeWidth={1.5} />
            ) : (
              <Mic className="w-4 h-4 text-green-400" strokeWidth={1.5} />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Main video grid showing all participants
const VideoGrid = ({ teacherId }) => {
  const participants = useParticipants();
  
  if (participants.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-500 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" strokeWidth={1.5} />
          <p>Waiting for participants...</p>
        </div>
      </div>
    );
  }

  // Sort: teacher first, then others
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.identity === teacherId) return -1;
    if (b.identity === teacherId) return 1;
    return 0;
  });

  const gridCols = participants.length <= 2 ? 'grid-cols-1 md:grid-cols-2' :
                   participants.length <= 4 ? 'grid-cols-2' :
                   participants.length <= 6 ? 'grid-cols-2 md:grid-cols-3' :
                   'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

  return (
    <div className={`grid ${gridCols} gap-4 p-4 flex-1 auto-rows-fr`}>
      <AnimatePresence>
        {sortedParticipants.map((participant) => (
          <ParticipantVideo
            key={participant.identity}
            participant={participant}
            isLocal={participant.isLocal}
            isTeacher={participant.identity === teacherId}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Media controls inside LiveKit room
const MediaControls = ({ 
  onLeave, 
  isTeacher,
  onMuteAll 
}) => {
  const { localParticipant } = useLocalParticipant();
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOff, setIsVideoOff] = useState(true);

  // Sync state with actual track state
  useEffect(() => {
    if (localParticipant) {
      const audioTrack = localParticipant.getTrackPublication(Track.Source.Microphone);
      const videoTrack = localParticipant.getTrackPublication(Track.Source.Camera);
      setIsMuted(!audioTrack || audioTrack.isMuted);
      setIsVideoOff(!videoTrack || videoTrack.isMuted);
    }
  }, [localParticipant]);

  const toggleMic = async () => {
    if (!localParticipant) return;
    
    try {
      if (isMuted) {
        await localParticipant.setMicrophoneEnabled(true);
        setIsMuted(false);
      } else {
        await localParticipant.setMicrophoneEnabled(false);
        setIsMuted(true);
      }
    } catch (err) {
      console.error('Failed to toggle microphone:', err);
    }
  };

  const toggleVideo = async () => {
    if (!localParticipant) return;
    
    try {
      if (isVideoOff) {
        await localParticipant.setCameraEnabled(true);
        setIsVideoOff(false);
      } else {
        await localParticipant.setCameraEnabled(false);
        setIsVideoOff(true);
      }
    } catch (err) {
      console.error('Failed to toggle camera:', err);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Mic toggle */}
      <Button
        onClick={toggleMic}
        className={`
          w-12 h-12 rounded-full transition-all duration-200
          ${isMuted 
            ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' 
            : 'bg-sky-500/20 text-sky-400 border border-sky-500/50 hover:bg-sky-500/30'}
        `}
        data-testid="livekit-mic-toggle"
      >
        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </Button>

      {/* Video toggle */}
      <Button
        onClick={toggleVideo}
        className={`
          w-12 h-12 rounded-full transition-all duration-200
          ${isVideoOff 
            ? 'bg-slate-700/50 text-slate-400 border border-slate-600 hover:bg-slate-700' 
            : 'bg-sky-500/20 text-sky-400 border border-sky-500/50 hover:bg-sky-500/30'}
        `}
        data-testid="livekit-video-toggle"
      >
        {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
      </Button>

      {/* Teacher: Mute All */}
      {isTeacher && (
        <Button
          onClick={onMuteAll}
          className="px-4 h-12 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/50 hover:bg-orange-500/30"
          data-testid="mute-all-media-btn"
        >
          <MicOff className="w-4 h-4 mr-2" />
          Mute All
        </Button>
      )}

      {/* Leave */}
      <Button
        onClick={onLeave}
        className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
        data-testid="livekit-leave-btn"
      >
        <PhoneOff className="w-5 h-5" />
      </Button>
    </div>
  );
};

// Room content component
const RoomContent = ({ teacherId, onLeave, isTeacher, onMuteAll, connectionState }) => {
  return (
    <div className="flex flex-col h-full">
      {/* Connection indicator */}
      <div className="absolute top-4 left-4 z-10">
        <ConnectionIndicator state={connectionState} />
      </div>

      {/* Video grid */}
      <VideoGrid teacherId={teacherId} />

      {/* Global audio renderer - this renders all remote audio */}
      <RoomAudioRenderer />

      {/* Controls */}
      <div className="flex justify-center pb-6">
        <div className="glass-panel rounded-full px-6 py-3">
          <MediaControls 
            onLeave={onLeave}
            isTeacher={isTeacher}
            onMuteAll={onMuteAll}
          />
        </div>
      </div>
    </div>
  );
};

// Main LiveKit Video component
const LiveKitVideo = ({ 
  token, 
  serverUrl, 
  teacherId,
  currentUserId,
  onLeave,
  onMuteAll 
}) => {
  const [connectionState, setConnectionState] = useState(ConnectionState.Disconnected);
  const isTeacher = currentUserId === teacherId;

  const handleConnected = () => {
    console.log('LiveKit: Connected to room');
    setConnectionState(ConnectionState.Connected);
  };

  const handleDisconnected = () => {
    console.log('LiveKit: Disconnected from room');
    setConnectionState(ConnectionState.Disconnected);
  };

  const handleReconnecting = () => {
    console.log('LiveKit: Reconnecting...');
    setConnectionState(ConnectionState.Reconnecting);
  };

  const handleReconnected = () => {
    console.log('LiveKit: Reconnected successfully');
    setConnectionState(ConnectionState.Connected);
  };

  if (!token || !serverUrl) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sky-400 animate-pulse">Loading video...</div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      video={false}  // Start with video off
      audio={false}  // Start with audio off
      onConnected={handleConnected}
      onDisconnected={handleDisconnected}
      onReconnecting={handleReconnecting}
      onReconnected={handleReconnected}
      options={{
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          audioPreset: { maxBitrate: 48000 },
          videoSimulcastLayers: [
            { width: 640, height: 360, bitrate: 500000 },
            { width: 320, height: 180, bitrate: 150000 },
          ],
        },
        reconnectPolicy: {
          nextRetryDelayInMs: (retryCount) => {
            // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
            return Math.min(1000 * Math.pow(2, retryCount), 30000);
          },
        },
      }}
      data-testid="livekit-room"
    >
      <RoomContent 
        teacherId={teacherId}
        onLeave={onLeave}
        isTeacher={isTeacher}
        onMuteAll={onMuteAll}
        connectionState={connectionState}
      />
    </LiveKitRoom>
  );
};

export default LiveKitVideo;
