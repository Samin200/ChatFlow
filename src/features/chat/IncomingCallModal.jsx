import React from 'react';
import { createPortal } from 'react-dom';
import { Phone, PhoneOff, User } from 'lucide-react';

export default function IncomingCallModal({ incoming, onAccept, onReject }) {
  if (!incoming) return null;

  const content = (
    <div className="fixed inset-0 z-[99999] h-[100dvh] w-[100dvw] bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] flex flex-col items-center justify-between overflow-hidden">
      
      {/* Top Section */}
      <div className="pt-16 flex flex-col items-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-emerald-500/30 rounded-full animate-ring-pulse scale-110" />
          <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl">
            {incoming.avatar ? (
              <img src={incoming.avatar} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full bg-slate-700 flex items-center justify-center text-6xl">
                {incoming.callerName?.[0] || <User size={64} />}
              </div>
            )}
          </div>
        </div>

        <h2 className="text-3xl font-semibold text-white">{incoming.callerName || 'Unknown'}</h2>
        <p className="text-emerald-400 mt-2 text-lg">Incoming {incoming.isVideo ? 'video' : 'voice'} call</p>
      </div>

      {/* Bottom Controls */}
      <div className="pb-16 flex w-full max-w-[280px] justify-between">
        <button
          onClick={() => onReject(incoming)}
          className="flex flex-col items-center gap-2 text-white"
        >
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center active:scale-90 transition-transform">
            <PhoneOff size={28} />
          </div>
          <span className="text-sm font-medium">Decline</span>
        </button>

        <button
          onClick={() => onAccept(incoming)}
          className="flex flex-col items-center gap-2 text-white"
        >
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center active:scale-90 transition-transform animate-bounce">
            <Phone size={28} />
          </div>
          <span className="text-sm font-medium text-emerald-400">Accept</span>
        </button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}