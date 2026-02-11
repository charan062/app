import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  GraduationCap, 
  Copy, 
  Users, 
  Settings,
  Power
} from 'lucide-react';

const RoomHeader = ({ room, isTeacher, participantCount, onEndRoom }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const copyRoomCode = () => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
      toast.success('Room code copied to clipboard!');
    }
  };

  const handleEndRoom = () => {
    onEndRoom();
    setSettingsOpen(false);
  };

  return (
    <>
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto flex items-center justify-between p-4 glass-panel border-b border-slate-800 rounded-none"
        data-testid="room-header"
      >
        {/* Left: Logo and room info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/50 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-sky-400" strokeWidth={1.5} />
            </div>
            <span className="font-heading text-lg text-white tracking-wider hidden sm:block">ORBITAL</span>
          </div>
          
          <div className="h-6 w-px bg-slate-700 hidden sm:block" />
          
          <div className="flex flex-col">
            <span className="text-white font-medium text-sm sm:text-base" data-testid="room-name">
              {room?.name}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs font-mono" data-testid="room-code">
                {room?.code}
              </span>
              <button
                onClick={copyRoomCode}
                className="text-slate-500 hover:text-sky-400 transition-colors"
                title="Copy room code"
                data-testid="copy-code-btn"
              >
                <Copy className="w-3 h-3" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Participant count and settings */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Users className="w-4 h-4" strokeWidth={1.5} />
            <span data-testid="participant-count">{participantCount}</span>
          </div>

          {isTeacher && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="text-slate-400 hover:text-white"
              data-testid="room-settings-btn"
            >
              <Settings className="w-5 h-5" strokeWidth={1.5} />
            </Button>
          )}
        </div>
      </motion.header>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="glass-panel border-slate-800 sm:max-w-md" data-testid="room-settings-modal">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-white">Room Settings</DialogTitle>
            <DialogDescription className="text-slate-400">
              Manage your classroom settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Room info */}
            <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 text-sm">Room Name</span>
                <span className="text-white">{room?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Room Code</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sky-400">{room?.code}</span>
                  <button
                    onClick={copyRoomCode}
                    className="text-slate-500 hover:text-sky-400 transition-colors"
                  >
                    <Copy className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>

            {/* End room button */}
            <Button
              onClick={handleEndRoom}
              className="w-full neon-button-danger"
              data-testid="end-room-btn"
            >
              <Power className="w-4 h-4 mr-2" strokeWidth={1.5} />
              End Classroom Session
            </Button>

            <p className="text-xs text-slate-500 text-center">
              This will end the session for all participants
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RoomHeader;
