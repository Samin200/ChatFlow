import { Phone, PhoneOff, User } from 'lucide-react';

export default function IncomingCallModal({ incoming, onAccept, onReject }) {
  if (!incoming) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-between p-8 bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] backdrop-blur-md overflow-hidden animate-in fade-in duration-500">
      {/* Background Ambient Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-50">
        <div className="absolute top-0 left-0 w-full h-full bg-black/20" />
      </div>

      {/* Top: Avatar + Status */}
      <div className="relative safe-top flex flex-col items-center mt-12 w-full max-w-lg">
        <div className="relative mb-8">
          {/* Pulsing Ring */}
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ring-pulse ring-4 ring-emerald-500/30" />
          
          <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-slate-900 shadow-2xl">
            {incoming.avatar ? (
              <img 
                src={incoming.avatar} 
                className="w-full h-full object-cover" 
                alt={incoming.callerName} 
              />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-5xl text-white">
                {incoming.callerName?.charAt(0) || <User size={64} />}
              </div>
            )}
          </div>
        </div>

        <div className="text-center space-y-3 z-10">
          <h2 className="text-3xl font-bold text-white tracking-tight">{incoming.callerName || 'Unknown Caller'}</h2>
          <p className="text-lg text-emerald-400 font-medium animate-pulse tracking-wide">Incoming voice call...</p>
        </div>
      </div>

      {/* Center: Pulsing Icon */}
      <div className="flex-1 flex items-center justify-center">
        <Phone className="text-white/10 w-48 h-48 md:w-64 md:h-64 animate-pulse duration-[2s]" />
      </div>

      {/* Bottom: Controls */}
      <div className="relative w-full max-w-md safe-bottom flex justify-around items-center mb-12">
        <div className="flex flex-col items-center gap-3">
          <button 
            onClick={() => onReject(incoming)}
            className="w-20 h-20 md:w-24 md:h-24 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all group"
          >
            <PhoneOff size={32} className="text-white group-hover:rotate-12 transition-transform" />
          </button>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Decline</span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button 
            onClick={() => onAccept(incoming)}
            className="w-20 h-20 md:w-24 md:h-24 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all group animate-bounce duration-[2s]"
          >
            <Phone size={32} className="text-white group-hover:rotate-12 transition-transform" />
          </button>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Accept</span>
        </div>
      </div>
    </div>
  );
}
