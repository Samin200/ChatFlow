import { Phone, PhoneOff, User } from 'lucide-react';

export default function IncomingCallModal({ incoming, onAccept, onReject }) {
  if (!incoming) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/50 animate-in zoom-in duration-300">
        <div className="p-8 flex flex-col items-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping duration-[2s]" />
            {incoming.avatar ? (
              <img src={incoming.avatar} className="relative w-24 h-24 rounded-full object-cover border-2 border-white/10" alt={incoming.callerName} />
            ) : (
              <div className="relative w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-3xl border-2 border-white/10">
                {incoming.callerName?.charAt(0) || <User size={40} />}
              </div>
            )}
          </div>
          
          <h3 className="text-xl font-bold text-white mb-1">{incoming.callerName || 'Unknown Caller'}</h3>
          <p className="text-emerald-400 font-medium text-sm animate-pulse">Incoming voice call...</p>
        </div>

        <div className="flex border-t border-white/5 h-20">
          <button 
            onClick={() => onReject(incoming)}
            className="flex-1 flex flex-col items-center justify-center gap-1 hover:bg-red-500/10 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all">
              <PhoneOff size={20} />
            </div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 group-hover:text-red-500">Decline</span>
          </button>
          
          <div className="w-[1px] bg-white/5" />
          
          <button 
            onClick={() => onAccept(incoming)}
            className="flex-1 flex flex-col items-center justify-center gap-1 hover:bg-emerald-500/10 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
              <Phone size={20} className="animate-bounce" />
            </div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 group-hover:text-emerald-500">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}
