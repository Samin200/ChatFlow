import React, { createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useCall } from '../hooks/useCall';
import IncomingCallModal from '../features/chat/IncomingCallModal';
import ActiveCallUI from '../features/chat/ActiveCallUI';
import OutgoingCallModal from '../features/chat/OutgoingCallModal';
import GroupCallUI from '../features/chat/GroupCallUI';

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
  const call = useCall(currentUser);

  return (
    <CallContext.Provider value={call}>
      {children}

      {/* Only ONE global instance of call UI */}
      {call.callState === 'calling' && call.activeCall && (
        <OutgoingCallModal
          contact={call.activeCall.contact}
          isVideo={call.activeCall.isVideo}
          onEnd={call.endCall}
        />
      )}

      {call.incomingCall && (
        <IncomingCallModal
          incoming={call.incomingCall}
          onAccept={call.acceptCall}
          onReject={call.rejectCall}
        />
      )}

      {call.activeCall && call.callState === 'connected' && (
        call.activeCall.isGroup ? (
          <GroupCallUI
            token={call.activeCall.token}
            serverUrl={call.activeCall.serverUrl}
            chatName={call.activeCall.contact?.displayName || 'Group Call'}
            onEnd={call.endCall}
          />
        ) : (
          <ActiveCallUI
            token={call.activeCall.token}
            serverUrl={call.activeCall.serverUrl}
            contact={call.activeCall.contact}
            isVideo={call.activeCall.isVideo}
            onEnd={call.endCall}
          />
        )
      )}
    </CallContext.Provider>
  );
}