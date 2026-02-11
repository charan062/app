import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { 
  Users, 
  Mic, 
  MicOff, 
  Video,
  VideoOff,
  Hand,
  Crown,
  VolumeX,
  RefreshCw
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ParticipantItem = ({ participant, isCurrentUser }) => {
  const isTeacher = participant.role === 'teacher';
  
  return (
    <div 
      className={`
        flex items-center gap-3 p-3 rounded-lg transition-colors
        ${isCurrentUser ? 'bg-sky-500/10 border border-sky-500/30' : 'hover:bg-slate-800/50'}
      `}
      data-testid={`participant-${participant.user_id}`}
    >
      {/* Avatar */}
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
        ${isTeacher 
          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/50' 
          : 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/50'}
      `}>
        {participant.name.charAt(0).toUpperCase()}
      </div>

      {/* Name and status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">
            {participant.name}
          </span>
          {isTeacher && (
            <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" strokeWidth={1.5} />
          )}
          {isCurrentUser && (
            <span className="text-xs text-slate-500">(You)</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {participant.is_hand_raised && (
            <div className="flex items-center gap-1 text-yellow-500">
              <Hand className="w-3 h-3" strokeWidth={1.5} />
              <span className="text-xs">Hand raised</span>
            </div>
          )}
        </div>
      </div>

      {/* Status icons */}
      <div className="flex items-center gap-2">
        {participant.is_muted ? (
          <MicOff className="w-4 h-4 text-red-400" strokeWidth={1.5} />
        ) : (
          <Mic className="w-4 h-4 text-green-400" strokeWidth={1.5} />
        )}
        {participant.is_video_on ? (
          <Video className="w-4 h-4 text-green-400" strokeWidth={1.5} />
        ) : (
          <VideoOff className="w-4 h-4 text-slate-500" strokeWidth={1.5} />
        )}
      </div>
    </div>
  );
};

const ParticipantsPanel = ({ participants, currentUserId, isTeacher, onMuteAll }) => {
  // Sort: teacher first, then current user, then others
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.role === 'teacher') return -1;
    if (b.role === 'teacher') return 1;
    if (a.user_id === currentUserId) return -1;
    if (b.user_id === currentUserId) return 1;
    return 0;
  });

  const teacherCount = participants.filter(p => p.role === 'teacher').length;
  const studentCount = participants.length - teacherCount;

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
      className="pointer-events-auto w-72 glass-panel rounded-xl overflow-hidden"
      data-testid="participants-panel"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" strokeWidth={1.5} />
            <span className="font-medium text-white">Participants</span>
          </div>
          <span className="text-sm text-slate-400">{participants.length}</span>
        </div>
        
        {/* Teacher controls */}
        {isTeacher && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMuteAll}
            className="w-full mt-3 text-slate-400 hover:text-white hover:bg-slate-800/50"
            data-testid="mute-all-btn"
          >
            <VolumeX className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Mute All Students
          </Button>
        )}
      </div>

      {/* Participants list */}
      <ScrollArea className="h-80">
        <div className="p-2 space-y-1">
          {sortedParticipants.map(participant => (
            <ParticipantItem
              key={participant.user_id}
              participant={participant}
              isCurrentUser={participant.user_id === currentUserId}
            />
          ))}
          
          {participants.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No participants yet
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer stats */}
      <div className="p-3 border-t border-slate-800 flex justify-center gap-6 text-xs text-slate-500">
        <span>{teacherCount} Teacher{teacherCount !== 1 && 's'}</span>
        <span>{studentCount} Student{studentCount !== 1 && 's'}</span>
      </div>
    </motion.div>
  );
};

export default ParticipantsPanel;
