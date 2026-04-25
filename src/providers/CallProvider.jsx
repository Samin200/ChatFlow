import React, { createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useVoiceCall } from '../hooks/useVoiceCall';
import IncomingCallModal from '../features/chat/IncomingCallModal';
import ActiveVoiceCall from '../features/chat/ActiveVoiceCall';

const CallContext = createContext(null);

export function useCallContext() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCallContext must be used within a CallProvider');
  }
  return context;
}

export function CallProvider({ children }) {
  const { user: currentUser } = useAuth();
  const voiceCall = useVoiceCall(currentUser);

  return (
    <CallContext.Provider value={voiceCall}>
      {children}
      
      {/* Global Call UI - Now handles Portals internally */}
      <IncomingCallModal 
        incoming={voiceCall.incomingCall} 
        onAccept={voiceCall.acceptCall} 
        onReject={voiceCall.rejectCall} 
      />

      {voiceCall.callState !== 'idle' && (
        <ActiveVoiceCall 
          {...voiceCall.activeCall} 
          state={voiceCall.callState} 
          onEnd={voiceCall.endCall} 
        />
      )}
    </CallContext.Provider>
  );
}
