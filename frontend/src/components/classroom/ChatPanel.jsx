import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, X } from 'lucide-react';

const ChatMessage = ({ message, isOwn }) => {
  const time = new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs ${isOwn ? 'text-sky-400' : 'text-fuchsia-400'}`}>
          {isOwn ? 'You' : message.user_name}
        </span>
        <span className="text-xs text-slate-600">{time}</span>
      </div>
      <div className={`
        max-w-[80%] px-3 py-2 rounded-lg text-sm
        ${isOwn 
          ? 'bg-sky-500/20 text-sky-100 border border-sky-500/30' 
          : 'bg-slate-800/50 text-slate-200 border border-slate-700'}
      `}>
        {message.content}
      </div>
    </div>
  );
};

const ChatPanel = ({ isOpen, messages, currentUserId, onSend, onClose }) => {
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSend(newMessage.trim());
      setNewMessage('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed right-0 top-0 bottom-0 w-80 z-50 glass-panel border-l border-slate-800 flex flex-col"
          data-testid="chat-panel"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-sky-400" strokeWidth={1.5} />
              <span className="font-medium text-white">Chat</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
              data-testid="close-chat-btn"
            >
              <X className="w-5 h-5" strokeWidth={1.5} />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isOwn={message.user_id === currentUserId}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="bg-slate-900/50 border-slate-700 focus:border-sky-500"
                data-testid="chat-input"
              />
              <Button
                type="submit"
                size="icon"
                className="neon-button-primary"
                disabled={!newMessage.trim()}
                data-testid="send-message-btn"
              >
                <Send className="w-4 h-4" strokeWidth={1.5} />
              </Button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatPanel;
