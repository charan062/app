import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Plus, 
  LogIn, 
  LogOut, 
  GraduationCap,
  Copy,
  Sparkles
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [createdRoom, setCreatedRoom] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/rooms`, { name: roomName });
      setCreatedRoom(response.data);
      toast.success('Classroom created!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/rooms/join`, { code: roomCode });
      toast.success('Joining classroom...');
      navigate(`/classroom/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Room not found');
    } finally {
      setLoading(false);
    }
  };

  const copyRoomCode = () => {
    if (createdRoom) {
      navigator.clipboard.writeText(createdRoom.code);
      toast.success('Room code copied!');
    }
  };

  const enterCreatedRoom = () => {
    if (createdRoom) {
      navigate(`/classroom/${createdRoom.id}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/5 rounded-full blur-3xl" />
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(14, 165, 233, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(14, 165, 233, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-6 glass-panel border-t-0 border-x-0 rounded-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-500/50 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-sky-400" strokeWidth={1.5} />
            </div>
            <span className="font-heading text-xl text-white tracking-wider">ORBITAL</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-400 hidden sm:block">
              Welcome, <span className="text-sky-400">{user?.name}</span>
            </span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              className="text-slate-400 hover:text-white"
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Logout
            </Button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl"
          >
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/30 mb-6">
                <Sparkles className="w-4 h-4 text-sky-400" strokeWidth={1.5} />
                <span className="text-sm text-sky-400 font-medium">Mission Control</span>
              </div>
              <h1 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-4">
                Ready to Launch?
              </h1>
              <p className="text-slate-400 text-lg">
                Create a new classroom or join an existing one
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {/* Create Room Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="glass-panel rounded-2xl p-8 cursor-pointer group"
                onClick={() => setCreateModalOpen(true)}
                data-testid="create-room-card"
              >
                <div className="w-16 h-16 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mb-6 group-hover:shadow-[0_0_30px_rgba(14,165,233,0.3)] transition-shadow">
                  <Plus className="w-8 h-8 text-sky-400" strokeWidth={1.5} />
                </div>
                <h2 className="font-heading text-2xl text-white mb-2">Create Classroom</h2>
                <p className="text-slate-500">
                  Start a new session as the teacher. Share the room code with your students.
                </p>
              </motion.div>

              {/* Join Room Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="glass-panel rounded-2xl p-8 cursor-pointer group"
                onClick={() => setJoinModalOpen(true)}
                data-testid="join-room-card"
              >
                <div className="w-16 h-16 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center mb-6 group-hover:shadow-[0_0_30px_rgba(217,70,239,0.3)] transition-shadow">
                  <LogIn className="w-8 h-8 text-fuchsia-400" strokeWidth={1.5} />
                </div>
                <h2 className="font-heading text-2xl text-white mb-2">Join Classroom</h2>
                <p className="text-slate-500">
                  Enter a room code to join an existing session as a student.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </main>
      </div>

      {/* Create Room Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="glass-panel border-slate-800 sm:max-w-md" data-testid="create-room-modal">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-white">
              {createdRoom ? 'Classroom Ready!' : 'Create Classroom'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {createdRoom 
                ? 'Share the room code with your students' 
                : 'Give your classroom a name to get started'}
            </DialogDescription>
          </DialogHeader>

          {!createdRoom ? (
            <form onSubmit={handleCreateRoom} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="room-name" className="text-slate-400">Classroom Name</Label>
                <Input
                  id="room-name"
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="bg-slate-900/50 border-slate-700 focus:border-sky-500 mt-1"
                  placeholder="e.g., Physics 101"
                  required
                  data-testid="room-name-input"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full neon-button-primary rounded-lg"
                disabled={loading}
                data-testid="create-room-submit"
              >
                {loading ? 'Creating...' : 'Create Classroom'}
              </Button>
            </form>
          ) : (
            <div className="space-y-6 mt-4">
              <div className="text-center p-6 rounded-xl bg-slate-900/50 border border-sky-500/30">
                <p className="text-slate-400 text-sm mb-2">Room Code</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-heading text-3xl text-sky-400 tracking-widest" data-testid="room-code-display">
                    {createdRoom.code}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyRoomCode}
                    className="text-slate-400 hover:text-sky-400"
                    data-testid="copy-room-code"
                  >
                    <Copy className="w-5 h-5" strokeWidth={1.5} />
                  </Button>
                </div>
              </div>
              <Button 
                onClick={enterCreatedRoom}
                className="w-full neon-button-primary rounded-lg"
                data-testid="enter-room-btn"
              >
                Enter Classroom
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Join Room Modal */}
      <Dialog open={joinModalOpen} onOpenChange={setJoinModalOpen}>
        <DialogContent className="glass-panel border-slate-800 sm:max-w-md" data-testid="join-room-modal">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-white">Join Classroom</DialogTitle>
            <DialogDescription className="text-slate-400">
              Enter the room code shared by your teacher
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleJoinRoom} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="room-code" className="text-slate-400">Room Code</Label>
              <Input
                id="room-code"
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="bg-slate-900/50 border-slate-700 focus:border-fuchsia-500 mt-1 font-mono text-lg tracking-widest text-center"
                placeholder="XXXXXXXX"
                maxLength={8}
                required
                data-testid="room-code-input"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/50 hover:bg-fuchsia-500/20 hover:shadow-[0_0_15px_rgba(217,70,239,0.4)] rounded-lg"
              disabled={loading}
              data-testid="join-room-submit"
            >
              {loading ? 'Joining...' : 'Join Classroom'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardPage;
