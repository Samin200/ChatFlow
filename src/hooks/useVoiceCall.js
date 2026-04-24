import { useState, useEffect, useRef, useCallback } from 'react';
import { emitSocketEvent, subscribeSocketEvent, connectSocket } from '../services/socketService';
import { getAuthToken } from '../services/storageService';

const API_BASE_URL = import.meta.env.VITE_API_URL;

export function useVoiceCall(currentUser) {
  const [callState, setCallState] = useState('idle'); // idle, ringing, calling, connected
  const [activeCall, setActiveCall] = useState(null); // { callId, chatId, roomName, token, serverUrl, contact }
  const [incomingCall, setIncomingCall] = useState(null); // { callId, from, roomName, callerName, chatId }

  const activeCallRef = useRef(null);
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);

  const fetchToken = async (roomName, identity) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/livekit/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ roomName, identity })
      });
      const data = await response.json();
      return data.data; // token, serverUrl, roomName
    } catch (error) {
      console.error('Failed to fetch LiveKit token:', error);
      return null;
    }
  };

  const startCall = useCallback(async (contact, chatId) => {
    if (!contact?.id || !chatId) return;
    setCallState('calling');
    emitSocketEvent('start-call', { to: contact.id, chatId });
    // We wait for 'call-started' to set full activeCall data
    setActiveCall({ contact, chatId });
  }, []);

  const acceptCall = useCallback(async (incoming) => {
    const tokenData = await fetchToken(incoming.roomName, currentUser.id);
    if (!tokenData) return;

    setCallState('connected');
    setActiveCall({
      ...incoming,
      ...tokenData,
      contact: { id: incoming.from, displayName: incoming.callerName, avatar: incoming.avatar }
    });
    setIncomingCall(null);

    emitSocketEvent('accept-call', {
      from: incoming.from,
      chatId: incoming.chatId,
      roomName: incoming.roomName,
      callId: incoming.callId,
      acceptedBy: currentUser.id
    });
  }, [currentUser?.id]);

  const rejectCall = useCallback((incoming) => {
    emitSocketEvent('reject-call', { from: incoming.from, callId: incoming.callId });
    setIncomingCall(null);
    setCallState('idle');
  }, []);

  const endCall = useCallback(() => {
    const current = activeCallRef.current;
    if (current) {
      emitSocketEvent('end-call', {
        otherUserId: current.contact.id,
        callId: current.callId,
        chatId: current.chatId
      });
    }
    setCallState('idle');
    setActiveCall(null);
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;

    // Ensure socket is connected before subscribing
    connectSocket();

    const onIncomingCall = (data) => {
      setIncomingCall(data);
      setCallState('ringing');
    };

    const onCallAccepted = async (data) => {
      // The caller receives this
      const tokenData = await fetchToken(data.roomName, currentUser.id);
      if (tokenData) {
        setCallState('connected');
        setActiveCall(prev => ({
          ...prev,
          ...data,
          ...tokenData
        }));
      }
    };

    const onCallRejected = () => {
      setCallState('idle');
      setActiveCall(null);
    };

    const onCallEnded = () => {
      setCallState('idle');
      setActiveCall(null);
    };

    const onCallStarted = (data) => {
      // The caller receives this
      setActiveCall(prev => ({
        ...prev,
        ...data
      }));
    };

    const unsubIncoming = subscribeSocketEvent('incoming-call', onIncomingCall);
    const unsubStarted = subscribeSocketEvent('call-started', onCallStarted);
    const unsubAccepted = subscribeSocketEvent('call-accepted', onCallAccepted);
    const unsubRejected = subscribeSocketEvent('call-rejected', onCallRejected);
    const unsubEnded = subscribeSocketEvent('call-ended', onCallEnded);

    return () => {
      unsubIncoming();
      unsubStarted();
      unsubAccepted();
      unsubRejected();
      unsubEnded();
    };
  }, [currentUser?.id]);

  return {
    callState,
    activeCall,
    incomingCall,
    startCall,
    acceptCall,
    rejectCall,
    endCall
  };
}
