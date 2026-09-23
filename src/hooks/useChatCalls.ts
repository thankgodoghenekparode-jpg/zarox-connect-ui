import { useEffect, useRef, useState } from 'react'
import { emitChatEvent, subscribeChatEvents } from '../lib/notificationsSocket'

export type CallStatus = 'idle' | 'outgoing' | 'ringing' | 'incoming' | 'active' | 'ended'

export interface ChatCallState {
  status: CallStatus
  sessionId: string | null
  conversationId: string | null
  peerUserId: string | null
  peerName: string
  withVideo: boolean
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  label: string
}

export interface CallSessionInfo {
  sessionId: string
  conversationId: string
  peerUserId: string
  peerName: string
  withVideo: boolean
}

interface SignalPayload extends Record<string, unknown> {
  sessionId?: string
  conversationId?: string
}

const idleState: ChatCallState = {
  status: 'idle',
  sessionId: null,
  conversationId: null,
  peerUserId: null,
  peerName: '',
  withVideo: false,
  localStream: null,
  remoteStream: null,
  label: '',
}

function iceServers(): RTCIceServer[] {
  const raw = import.meta.env.VITE_STUN_SERVERS as string | undefined
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) return parsed as RTCIceServer[]
    } catch {
      // fall through to the default STUN server
    }
  }
  return [{ urls: 'stun:stun.l.google.com:19302' }]
}

export function useChatCalls(
  resolvePeerName?: (conversationId: string, peerUserId: string) => string,
) {
  const [state, setState] = useState<ChatCallState>(idleState)
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localRef = useRef<MediaStream | null>(null)
  const offerRef = useRef<RTCSessionDescriptionInit | null>(null)
  const iceBufferRef = useRef<Record<string, RTCIceCandidateInit[]>>({})
  const sessionRef = useRef<CallSessionInfo | null>(null)
  const peerNameRef = useRef(resolvePeerName)

  const ringCtxRef = useRef<AudioContext | null>(null)
  const ringTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopRing = () => {
    if (ringTimerRef.current) clearInterval(ringTimerRef.current)
    ringTimerRef.current = null
    ringCtxRef.current?.close().catch(() => undefined)
    ringCtxRef.current = null
  }

  const playRing = () => {
    try {
      stopRing()
      const ctx = new AudioContext()
      ringCtxRef.current = ctx
      const tick = () => {
        const now = ctx.currentTime
        for (const t of [0, 1.0]) {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.value = 1200
          gain.gain.setValueAtTime(0.0001, now + t)
          gain.gain.exponentialRampToValueAtTime(0.2, now + t + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.9)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(now + t)
          osc.stop(now + t + 1)
        }
      }
      tick()
      ringTimerRef.current = setInterval(tick, 2500)
    } catch {
      // Audio unsupported or blocked — call still proceeds without a ringtone.
    }
  }

  const teardownPeer = () => {
    const pc = pcRef.current
    if (pc) {
      pc.onicecandidate = null
      pc.ontrack = null
      pc.close()
    }
    pcRef.current = null
    localRef.current?.getTracks().forEach((t) => t.stop())
    localRef.current = null
    offerRef.current = null
    iceBufferRef.current = {}
  }

  const toSessionState = (
    s: CallSessionInfo | null,
    patch: Partial<ChatCallState> = {},
  ): ChatCallState => ({
    status: 'idle',
    sessionId: s?.sessionId ?? null,
    conversationId: s?.conversationId ?? null,
    peerUserId: s?.peerUserId ?? null,
    peerName: s?.peerName ?? '',
    withVideo: s?.withVideo ?? false,
    localStream: patch.localStream ?? null,
    remoteStream: null,
    label: '',
    ...patch,
  })

  const setEnded = (label: string) => {
    const info = sessionRef.current
    teardownPeer()
    stopRing()
    sessionRef.current = null
    setState(toSessionState(info, { status: 'ended', label }))
  }

  const createPeer = async (): Promise<RTCPeerConnection> => {
    const pc = new RTCPeerConnection({ iceServers: iceServers() })
    pcRef.current = pc
    pc.onicecandidate = (e) => {
      const s = sessionRef.current
      if (!s || !e.candidate) return
      emitChatEvent('chat:call-ice', {
        sessionId: s.sessionId,
        conversationId: s.conversationId,
        candidate: e.candidate,
      })
    }
    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? null
      setState((prev) => ({ ...prev, remoteStream: stream }))
    }
    return pc
  }

  const applyIce = (sessionId: string, candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current
    if (!pc) {
      const buf = iceBufferRef.current[sessionId] ?? (iceBufferRef.current[sessionId] = [])
      buf.push(candidate)
      return
    }
    void pc.addIceCandidate(candidate).catch(() => undefined)
  }

  const flushIce = async (pc: RTCPeerConnection, sessionId: string) => {
    const buffered = iceBufferRef.current[sessionId] ?? []
    iceBufferRef.current[sessionId] = []
    for (const c of buffered) {
      await pc.addIceCandidate(c).catch(() => undefined)
    }
  }

  const startCall = async (conversationId: string, peerUserId: string, peerName: string, withVideo: boolean) => {
    const cur = stateRef.current
    if (cur.status !== 'idle' && cur.status !== 'ended') return
    const info: CallSessionInfo = {
      sessionId: crypto.randomUUID(),
      conversationId,
      peerUserId,
      peerName,
      withVideo,
    }
    sessionRef.current = info
    let local: MediaStream
    try {
      local = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo })
    } catch {
      sessionRef.current = null
      setState(toSessionState(info, { status: 'ended', label: 'Microphone unavailable' }))
      return
    }
    localRef.current = local
    setState(toSessionState(info, { status: 'outgoing', localStream: local, label: 'Calling…' }))
    try {
      const pc = await createPeer()
      local.getTracks().forEach((t) => pc.addTrack(t, local))
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      emitChatEvent('chat:call-invite', {
        sessionId: info.sessionId,
        conversationId,
        targetUserId: peerUserId,
        withVideo,
        offer,
      })
    } catch {
      setEnded('Call failed')
    }
  }

  const acceptCall = async () => {
    const s = sessionRef.current
    const offer = offerRef.current
    if (!s || !offer) return
    let local: MediaStream
    try {
      local = await navigator.mediaDevices.getUserMedia({ audio: true, video: s.withVideo })
    } catch {
      declineCall()
      return
    }
    localRef.current = local
    try {
      const pc = await createPeer()
      local.getTracks().forEach((t) => pc.addTrack(t, local))
      await pc.setRemoteDescription(offer)
      offerRef.current = null
      await flushIce(pc, s.sessionId)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      emitChatEvent('chat:call-answer', {
        sessionId: s.sessionId,
        conversationId: s.conversationId,
        answer,
      })
      stopRing()
      setState(toSessionState(s, { status: 'active', localStream: local, label: '' }))
    } catch {
      declineCall()
    }
  }

  const declineCall = () => {
    const s = sessionRef.current
    stopRing()
    if (s) {
      emitChatEvent('chat:call-decline', {
        sessionId: s.sessionId,
        conversationId: s.conversationId,
      })
    }
    teardownPeer()
    sessionRef.current = null
    setState(toSessionState(s, { status: 'ended', label: 'Call declined' }))
  }

  const endCall = () => {
    const s = sessionRef.current
    if (s) {
      emitChatEvent('chat:call-end', {
        sessionId: s.sessionId,
        conversationId: s.conversationId,
      })
    }
    teardownPeer()
    stopRing()
    sessionRef.current = null
    setState(toSessionState(s, { status: 'ended', label: 'Call ended' }))
  }

  const handlerRef = useRef<(event: string, payload: unknown) => void>(() => undefined)

  useEffect(() => {
    peerNameRef.current = resolvePeerName
    handlerRef.current = (event, raw) => {
      const payload = (raw ?? {}) as SignalPayload
      if (event === 'chat:call-incoming') {
        const incoming = payload as SignalPayload & {
          fromUserId?: string
          withVideo?: boolean
          offer?: RTCSessionDescriptionInit
        }
        const { sessionId, conversationId, fromUserId, withVideo, offer } = incoming
        const cur = stateRef.current
        if (!sessionId || !conversationId || !fromUserId || !offer) return
        if (cur.status !== 'idle' && cur.status !== 'ended') {
          emitChatEvent('chat:call-decline', { sessionId, conversationId })
          return
        }
        const info: CallSessionInfo = {
          sessionId,
          conversationId,
          peerUserId: fromUserId,
          peerName: peerNameRef.current?.(conversationId, fromUserId) ?? 'Someone',
          withVideo: Boolean(withVideo),
        }
        sessionRef.current = info
        offerRef.current = offer
        playRing()
        emitChatEvent('chat:call-ringing', { sessionId, conversationId })
        setState(toSessionState(info, { status: 'incoming', label: '' }))
      } else if (event === 'chat:call-ringing') {
        const s = sessionRef.current
        if (s && payload.sessionId === s.sessionId && stateRef.current.status === 'outgoing') {
          setState((prev) => ({ ...prev, status: 'ringing', label: 'Ringing…' }))
        }
      } else if (event === 'chat:call-answer') {
        const s = sessionRef.current
        if (s && payload.sessionId === s.sessionId) {
          const answer = payload.answer as RTCSessionDescriptionInit | undefined
          const pc = pcRef.current
          if (pc && answer) {
            void pc.setRemoteDescription(answer).catch(() => undefined).then(() => {
              if (pcRef.current === pc) return flushIce(pc, s.sessionId)
              return undefined
            })
          }
          stopRing()
          setState((prev) => ({ ...prev, status: 'active', label: '' }))
        }
      } else if (event === 'chat:call-ice') {
        const ice = payload as SignalPayload & { candidate?: RTCIceCandidateInit }
        if (ice.sessionId && ice.candidate) applyIce(ice.sessionId, ice.candidate)
      } else if (event === 'chat:call-decline') {
        const s = sessionRef.current
        if (s && payload.sessionId === s.sessionId) setEnded('Call declined')
      } else if (event === 'chat:call-end') {
        const s = sessionRef.current
        if (s && payload.sessionId === s.sessionId) setEnded('Call ended')
      } else if (event === 'chat:call-busy') {
        const s = sessionRef.current
        if (s && payload.sessionId === s.sessionId) setEnded('Busy')
      } else if (event === 'chat:call-already-active') {
        const s = sessionRef.current
        if (s && payload.sessionId === s.sessionId) setEnded('Already in a call')
      }
    }
  })

  useEffect(() => {
    const unsub = subscribeChatEvents((event, payload) => handlerRef.current(event, payload))
    return () => {
      unsub()
      const s = sessionRef.current
      if (s) {
        emitChatEvent('chat:call-end', {
          sessionId: s.sessionId,
          conversationId: s.conversationId,
        })
      }
      stopRing()
      pcRef.current?.close()
      pcRef.current = null
      localRef.current?.getTracks().forEach((t) => t.stop())
      localRef.current = null
    }
  }, [])

  return { state, startCall, acceptCall, declineCall, endCall }
}