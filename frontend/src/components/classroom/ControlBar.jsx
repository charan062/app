import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Hand,
  Monitor,
  MessageSquare,
  LogOut
} from 'lucide-react';

const ControlButton = ({ 
  icon: Icon, 
  activeIcon: ActiveIcon,
  isActive, 
  isDanger,
  tooltip,
  onClick,
  testId
}) => {
  const CurrentIcon = isActive && ActiveIcon ? ActiveIcon : Icon;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            className={`
              w-12 h-12 rounded-full transition-all duration-200
              ${isDanger 
                ? 'bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                : isActive
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/50 shadow-[0_0_15px_rgba(14,165,233,0.3)]'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-700/50 hover:text-white'
              }
            `}
            data-testid={testId}
          >
            <CurrentIcon className="w-5 h-5" strokeWidth={1.5} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="glass-panel border-slate-700">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const ControlBar = ({
  isMuted,
  isVideoOn,
  isHandRaised,
  isPresenting,
  isTeacher,
  isChatOpen,
  onToggleMute,
  onToggleVideo,
  onToggleHand,
  onTogglePresent,
  onToggleChat,
  onLeave
}) => {
  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
      className="pointer-events-auto flex justify-center pb-6"
    >
      <div 
        className="glass-panel rounded-full px-6 py-3 flex items-center gap-3"
        data-testid="control-bar"
      >
        {/* Mic toggle */}
        <ControlButton
          icon={MicOff}
          activeIcon={Mic}
          isActive={!isMuted}
          tooltip={isMuted ? 'Unmute' : 'Mute'}
          onClick={onToggleMute}
          testId="mic-toggle-btn"
        />

        {/* Video toggle */}
        <ControlButton
          icon={VideoOff}
          activeIcon={Video}
          isActive={isVideoOn}
          tooltip={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
          onClick={onToggleVideo}
          testId="video-toggle-btn"
        />

        {/* Divider */}
        <div className="w-px h-8 bg-slate-700" />

        {/* Raise hand (students) or Present (teacher) */}
        {isTeacher ? (
          <ControlButton
            icon={Monitor}
            isActive={isPresenting}
            tooltip={isPresenting ? 'Stop presenting' : 'Present to smartboard'}
            onClick={onTogglePresent}
            testId="present-toggle-btn"
          />
        ) : (
          <ControlButton
            icon={Hand}
            isActive={isHandRaised}
            tooltip={isHandRaised ? 'Lower hand' : 'Raise hand'}
            onClick={onToggleHand}
            testId="hand-toggle-btn"
          />
        )}

        {/* Chat toggle */}
        <ControlButton
          icon={MessageSquare}
          isActive={isChatOpen}
          tooltip={isChatOpen ? 'Close chat' : 'Open chat'}
          onClick={onToggleChat}
          testId="chat-toggle-btn"
        />

        {/* Divider */}
        <div className="w-px h-8 bg-slate-700" />

        {/* Leave button */}
        <ControlButton
          icon={LogOut}
          isDanger
          tooltip="Leave classroom"
          onClick={onLeave}
          testId="leave-room-btn"
        />
      </div>
    </motion.div>
  );
};

export default ControlBar;
