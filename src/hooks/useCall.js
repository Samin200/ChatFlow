import { useState, useEffect, useRef, useCallback } from 'react';
import { emitSocketEvent, subscribeSocketEvent, connectSocket } from '../services/socketService';
import { getAuthToken } from '../services/storageService';

const API_BASE_URL = import.meta.env.VITE_API_URL;

export function useCall(currentUser) {
  const [callState, setCallState] = useState('idle'); // idle, ringing, calling, connected
  const [activeCall, setActiveCall] = useState(null); // { callId, chatId, roomName, token, serverUrl, contact, isVideo }
  const [incomingCall, setIncomingCall] = useState(null); // { callId, from, roomName, callerName, chatId, isVideo }

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
      // The backend returns { success: true, serverUrl: '...', token: '...', roomName: '...' }
      if (!data.token) return null;
      return data; // token, serverUrl, roomName
    } catch (error) {
      console.error('Failed to fetch LiveKit token:', error);
      return null;
    }
  };

  const startCall = useCallback(async (contact, chatId, isVideo = false) => {
    if (!contact?.id || !chatId) return;
    setCallState('calling');
    emitSocketEvent('start-call', { to: contact.id, chatId, isVideo });
    // We wait for 'call-started' to set full activeCall data
    setActiveCall({ contact, chatId, isVideo });
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
      if (callState === 'calling' || callState === 'ringing') {
        emitSocketEvent('cancel-call', {
          to: current.contact?.id,
          callId: current.callId,
          chatId: current.chatId
        });
      } else {
        emitSocketEvent('end-call', {
          otherUserId: current.contact?.id,
          callId: current.callId,
          chatId: current.chatId
        });
      }
    } else if (incomingCall) {
      // If we're ending while ringing (recipient side)
      emitSocketEvent('reject-call', { from: incomingCall.from, callId: incomingCall.callId });
    }

    setCallState('idle');
    setActiveCall(null);
    setIncomingCall(null);
  }, [callState, incomingCall]);

  useEffect(() => {
    if (!currentUser?.id) return;

    // Ensure socket is connected before subscribing
    connectSocket();

    const onIncomingCall = (data) => {
      console.log('[VoiceCall] Incoming call received:', data);
      
      // If already in a call, auto-reject with busy status
      if (activeCallRef.current || callState !== 'idle') {
        console.log('[VoiceCall] Busy, auto-rejecting call');
        emitSocketEvent('reject-call', { from: data.from, callId: data.callId, reason: 'busy' });
        return;
      }

      setIncomingCall(data);
      setCallState('ringing');
    };

    const onCallStarted = async (data) => {
      console.log('[VoiceCall] Call started (caller side):', data);
      
      let tokenData = null;
      if (data.isGroup) {
        tokenData = await fetchToken(data.roomName, currentUser.id);
        if (tokenData) {
          setCallState('connected');
        }
      }

      setActiveCall(prev => ({
        ...prev,
        ...data,
        ...tokenData
      }));
    };

    const onCallAccepted = async (data) => {
      console.log('[VoiceCall] Call accepted:', data);
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

    const onCallRejected = (data) => {
      console.log('[VoiceCall] Call rejected:', data?.reason || 'declined');
      setCallState('idle');
      setActiveCall(null);
      setIncomingCall(null);
    };

    const onCallEnded = () => {
      setCallState('idle');
      setActiveCall(null);
      setIncomingCall(null);
    };

    const onCallFailed = (data) => {
      console.warn('[VoiceCall] Call failed:', data.message);
      setCallState('idle');
      setActiveCall(null);
      setIncomingCall(null);
    };

    const onCallCanceled = () => {
      console.log('[VoiceCall] Call canceled by caller');
      setCallState('idle');
      setActiveCall(null);
      setIncomingCall(null);
    };

    const unsubIncoming = subscribeSocketEvent('incoming-call', onIncomingCall);
    const unsubStarted = subscribeSocketEvent('call-started', onCallStarted);
    const unsubAccepted = subscribeSocketEvent('call-accepted', onCallAccepted);
    const unsubRejected = subscribeSocketEvent('call-rejected', onCallRejected);
    const unsubEnded = subscribeSocketEvent('call-ended', onCallEnded);
    const unsubFailed = subscribeSocketEvent('call-failed', onCallFailed);
    const unsubCanceled = subscribeSocketEvent('call-canceled', onCallCanceled);

    return () => {
      unsubIncoming();
      unsubStarted();
      unsubAccepted();
      unsubRejected();
      unsubEnded();
      unsubFailed();
      unsubCanceled();
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
