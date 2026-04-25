import { Phone, PhoneOff, User, MessageCircle } from 'lucide-react';

export default function IncomingCallModal({ incoming, onAccept, onReject }) {
  if (!incoming) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0f172a] text-white animate-in fade-in duration-500 overflow-hidden">
      {/* Background Ambient Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      {/* Top Content */}
      <div className="relative flex-1 flex flex-col items-center pt-24 px-6 text-center">
        <div className="relative mb-12">
          {/* Animated Rings */}
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping duration-[3s]" />
          <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping duration-[3s] delay-1000" />
          
          <div className="relative w-40 h-40 rounded-full p-1.5 bg-gradient-to-br from-emerald-500/50 to-blue-500/50 shadow-2xl shadow-emerald-500/20">
            {incoming.avatar ? (
              <img 
                src={incoming.avatar} 
                className="w-full h-full rounded-full object-cover border-4 border-[#0f172a]" 
                alt={incoming.callerName} 
              />
            ) : (
              <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-5xl border-4 border-[#0f172a]">
                {incoming.callerName?.charAt(0) || <User size={64} />}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 animate-in slide-in-from-bottom-8 duration-700">
          <h2 className="text-4xl font-black tracking-tight">{incoming.callerName || 'Unknown Caller'}</h2>
          <div className="flex flex-col items-center gap-3">
            <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-emerald-400 font-bold uppercase tracking-[0.2em] text-[10px]">Incoming Voice Call</p>
            </div>
            <p className="text-slate-400 text-sm">CallFlow Real-time Audio</p>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="relative pb-24 px-10 flex justify-center items-center gap-16 md:gap-32 max-w-2xl mx-auto w-full">
        {/* Reject Button */}
        <div className="flex flex-col items-center gap-4">
          <button 
            onClick={() => onReject(incoming)}
            className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-900/40 transition-all hover:scale-110 active:scale-90"
          >
            <PhoneOff size={32} />
          </button>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Decline</span>
        </div>

        {/* Accept Button */}
        <div className="flex flex-col items-center gap-4">
          <button 
            onClick={() => onAccept(incoming)}
            className="w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-xl shadow-emerald-900/40 transition-all hover:scale-110 active:scale-90 animate-bounce duration-[2s]"
          >
            <Phone size={32} />
          </button>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Accept</span>
        </div>
      </div>
    </div>
  );
}
