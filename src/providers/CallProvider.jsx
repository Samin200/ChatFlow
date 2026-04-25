import React, { createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useVoiceCall } from '../hooks/useVoiceCall';
import IncomingCallModal from '../features/chat/IncomingCallModal';
import ActiveVoiceCall from '../features/chat/ActiveVoiceCall';
import OutgoingCallModal from '../features/chat/OutgoingCallModal';
import GroupVoiceCall from '../features/chat/GroupVoiceCall';

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

      {/* Only ONE global instance of call UI */}
      {voiceCall.callState === 'calling' && voiceCall.activeCall && (
        <OutgoingCallModal
          contact={voiceCall.activeCall.contact}
          onEnd={voiceCall.endCall}
        />
      )}

      {voiceCall.incomingCall && (
        <IncomingCallModal
          incoming={voiceCall.incomingCall}
          onAccept={voiceCall.acceptCall}
          onReject={voiceCall.rejectCall}
        />
      )}

      {voiceCall.activeCall && voiceCall.callState === 'connected' && (
        voiceCall.activeCall.isGroup ? (
          <GroupVoiceCall
            token={voiceCall.activeCall.token}
            serverUrl={voiceCall.activeCall.serverUrl}
            chatName={voiceCall.activeCall.contact?.displayName || 'Group Call'}
            onEnd={voiceCall.endCall}
          />
        ) : (
          <ActiveVoiceCall
            token={voiceCall.activeCall.token}
            serverUrl={voiceCall.activeCall.serverUrl}
            contact={voiceCall.activeCall.contact}
            onEnd={voiceCall.endCall}
          />
        )
      )}
    </CallContext.Provider>
  );
}