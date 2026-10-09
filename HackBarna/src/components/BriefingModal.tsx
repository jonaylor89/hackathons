import { useEffect, useRef, useState } from 'react'
import OT from '@vonage/client-sdk-video'

interface BriefingModalProps {
  open: boolean
  onClose: () => void
}

interface VonageCredentials {
  applicationId: string
  sessionId: string
  token: string
  expiresAt: string
  simulated: true
}

interface LiaisonReply {
  transcript: string
  answer: string
  source: string
  conversationId: string
  responder: 'ARI_LLM' | 'DETERMINISTIC_FALLBACK'
  simulated: true
}

async function errorMessage(response: Response): Promise<string> {
  const body = await response.text()
  try {
    const parsed = JSON.parse(body) as { error?: string; message?: string }
    return parsed.error ?? parsed.message ?? body
  } catch {
    return body || `Request failed (${response.status})`
  }
}

export function BriefingModal({ open, onClose }: BriefingModalProps) {
  const localVideo = useRef<HTMLDivElement>(null)
  const remoteVideo = useRef<HTMLDivElement>(null)
  const sessionRef = useRef<OT.Session | null>(null)
  const publisherRef = useRef<OT.Publisher | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const conversationIdRef = useRef(crypto.randomUUID())
  const speechRef = useRef<{ audio: HTMLAudioElement; url: string } | null>(null)
  const speechRequestRef = useRef<AbortController | null>(null)
  const [videoStatus, setVideoStatus] = useState('VIDEO ROOM STANDBY')
  const [voiceStatus, setVoiceStatus] = useState('SLNG VOICE STANDBY')
  const [joining, setJoining] = useState(false)
  const [connected, setConnected] = useState(false)
  const [recording, setRecording] = useState(false)
  const [question, setQuestion] = useState('')
  const [reply, setReply] = useState<LiaisonReply | null>(null)

  const stopSpeech = () => {
    speechRequestRef.current?.abort()
    speechRequestRef.current = null
    const activeSpeech = speechRef.current
    if (activeSpeech) {
      activeSpeech.audio.pause()
      activeSpeech.audio.removeAttribute('src')
      activeSpeech.audio.load()
      URL.revokeObjectURL(activeSpeech.url)
      speechRef.current = null
    }
    setVoiceStatus('SLNG VOICE STANDBY')
  }

  const leaveRoom = async () => {
    stopSpeech()
    const recorder = recorderRef.current
    if (recorder?.state === 'recording') recorder.stop()
    recorderRef.current = null
    const session = sessionRef.current
    const publisher = publisherRef.current
    publisherRef.current = null
    sessionRef.current = null
    if (session && publisher) session.unpublish(publisher)
    if (session) await session.disconnect().catch(() => undefined)
    if (localVideo.current) localVideo.current.replaceChildren()
    if (remoteVideo.current) remoteVideo.current.replaceChildren()
    setConnected(false)
    setRecording(false)
    setVideoStatus('VIDEO ROOM STANDBY')
  }

  useEffect(() => () => { void leaveRoom() }, [])
  useEffect(() => {
    if (!open) conversationIdRef.current = crypto.randomUUID()
  }, [open])

  if (!open) return null

  const joinRoom = async () => {
    setJoining(true)
    setVideoStatus('MINTING VONAGE SESSION…')
    try {
      const response = await fetch('/sim/briefing/session', { method: 'POST' })
      if (!response.ok) throw new Error(await errorMessage(response))
      const credentials = await response.json() as VonageCredentials
      const session = OT.initSession(credentials.applicationId, credentials.sessionId)
      sessionRef.current = session
      session.on('streamCreated', (event) => {
        if (!remoteVideo.current) return
        session.subscribe(event.stream, remoteVideo.current, {
          insertMode: 'replace',
          width: '100%',
          height: '100%',
          fitMode: 'cover',
        }, (error) => {
          if (error) setVideoStatus(`REMOTE VIDEO ERROR: ${error.message}`)
        })
      })
      session.connect(credentials.token, (connectError) => {
        if (connectError) {
          setVideoStatus(`VIDEO CONNECTION ERROR: ${connectError.message}`)
          return
        }
        if (!localVideo.current) return
        const publisher = OT.initPublisher(localVideo.current, {
          insertMode: 'replace',
          width: '100%',
          height: '100%',
          fitMode: 'cover',
          name: 'Simulated incident coordinator',
          publishAudio: true,
          publishVideo: true,
          resolution: '640x480',
        }, (publishError) => {
          if (publishError) {
            setVideoStatus(`CAMERA/MIC UNAVAILABLE: ${publishError.message}`)
            return
          }
          session.publish(publisher, (sessionPublishError) => {
            if (sessionPublishError) {
              setVideoStatus(`VIDEO PUBLISH ERROR: ${sessionPublishError.message}`)
              return
            }
            publisherRef.current = publisher
            setConnected(true)
            setVideoStatus('VONAGE VIDEO CONNECTED · SIMULATED BRIEFING')
          })
        })
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error'
      await leaveRoom()
      setVideoStatus(`VIDEO UNAVAILABLE: ${message}`)
    } finally {
      setJoining(false)
    }
  }

  const speak = async (text: string) => {
    stopSpeech()
    const controller = new AbortController()
    speechRequestRef.current = controller
    setVoiceStatus('SLNG TTS SYNTHESIZING…')
    try {
      const response = await fetch('/sim/liaison/speech', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: text }),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(await errorMessage(response))
      const url = URL.createObjectURL(await response.blob())
      if (controller.signal.aborted) {
        URL.revokeObjectURL(url)
        return
      }
      const audio = new Audio(url)
      speechRef.current = { audio, url }
      audio.onended = () => {
        if (speechRef.current?.audio !== audio) return
        URL.revokeObjectURL(url)
        speechRef.current = null
        setVoiceStatus('SLNG VOICE READY')
      }
      await audio.play()
      if (!controller.signal.aborted) setVoiceStatus('SLNG TTS SPEAKING')
    } catch (error) {
      if (controller.signal.aborted) return
      setVoiceStatus(`SLNG TTS UNAVAILABLE: ${error instanceof Error ? error.message : 'unknown error'}`)
    } finally {
      if (speechRequestRef.current === controller) speechRequestRef.current = null
    }
  }

  const handleReply = async (response: Response) => {
    if (!response.ok) throw new Error(await errorMessage(response))
    const next = await response.json() as LiaisonReply
    setQuestion(next.transcript)
    setReply(next)
    void speak(next.answer)
  }

  const askTextQuestion = async () => {
    if (!question.trim()) return
    setVoiceStatus('PREPARING GROUNDED BRIEFING…')
    try {
      await handleReply(await fetch('/sim/liaison/text', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question, conversationId: conversationIdRef.current }),
      }))
    } catch (error) {
      setVoiceStatus(`BRIEFING ERROR: ${error instanceof Error ? error.message : 'unknown error'}`)
    }
  }

  const sendRecordedQuestion = async (audio: Blob) => {
    setVoiceStatus('SLNG STT TRANSCRIBING…')
    try {
      const form = new FormData()
      form.append('conversationId', conversationIdRef.current)
      form.append('audio', audio, 'coordinator-question.webm')
      await handleReply(await fetch('/sim/liaison/transcribe', { method: 'POST', body: form }))
    } catch (error) {
      setVoiceStatus(`SLNG STT UNAVAILABLE: ${error instanceof Error ? error.message : 'unknown error'}`)
    }
  }

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop()
      setRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const chunks: BlobPart[] = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        recorderRef.current = null
        void sendRecordedQuestion(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }))
      }
      recorderRef.current = recorder
      recorder.start()
      setRecording(true)
      setVoiceStatus('RECORDING QUESTION · PRESS STOP WHEN FINISHED')
    } catch (error) {
      setVoiceStatus(`MICROPHONE UNAVAILABLE: ${error instanceof Error ? error.message : 'permission denied'}`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid overflow-y-auto bg-[#080a10]/90 p-2 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="briefing-title">
      <section className="gba-panel m-auto w-full max-w-5xl overflow-hidden border-gba-uiAccent">
        <header className="flex items-start justify-between gap-3 border-b-2 border-gba-uiBorder bg-[#232839] p-3 sm:items-center">
          <div>
            <h2 id="briefing-title" className="pixel-font text-[10px] text-gba-uiAccent sm:text-[12px]">SIMULATED INCIDENT BRIEFING</h2>
            <p className="mt-1 text-[9px] leading-4 text-gba-uiDim">HISTORICAL REPLAY · NO REAL RESPONDERS, DISPATCH, OR PUBLIC WARNINGS</p>
          </div>
          <button className="gba-btn" onClick={() => { void leaveRoom(); onClose() }}>CLOSE</button>
        </header>

        <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="overflow-hidden border-2 border-gba-uiBorder bg-[#10131f]">
                <div className="border-b border-gba-uiBorder bg-[#171a27] px-2 py-1 pixel-font text-[7px] text-gba-uiDim">YOU // COORDINATOR</div>
                <div ref={localVideo} className="liaison-video grid aspect-video min-h-0 place-items-center overflow-hidden text-[9px] text-gba-uiDim">JOIN TO ENABLE CAMERA</div>
              </div>
              <div className="overflow-hidden border-2 border-gba-fireHi bg-[#241812]">
                <div className="border-b border-gba-fireHi/50 bg-[#382115] px-2 py-1 pixel-font text-[7px] text-gba-fireHi">FIELD LIAISON // AI</div>
                {/* Pokémon encounter scene */}
                <div ref={remoteVideo} className="liaison-video relative flex aspect-video min-h-0 flex-col overflow-hidden">
                  <div className="pointer-events-none absolute inset-0 flex flex-col">
                    {/* Scene background — mint gradient like Gen IV */}
                    <div
                      className="relative flex flex-1 items-end justify-center pb-4"
                      style={{ background: 'linear-gradient(180deg, #c8e8e0 0%, #a8d8d0 55%, #88c8bc 100%)' }}
                    >
                      {/* Ground shadow ellipse */}
                      <div className="absolute bottom-6 h-5 w-28 rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(60,110,90,0.30) 0%, transparent 72%)' }} />
                      {/* Firefighter sprite — Pokemon NPC proportions, narrow body, arms close to sides */}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 80" className="relative z-10 mb-4 h-64 w-auto" style={{ imageRendering: 'pixelated' }}>
                        {/* ── HELMET ── */}
                        {/* dome top */}
                        <rect x="15" y="0"  width="18" height="1" fill="#D98010"/>
                        <rect x="13" y="1"  width="22" height="2" fill="#F0A020"/>
                        <rect x="12" y="3"  width="24" height="2" fill="#E8961A"/>
                        {/* dome highlight */}
                        <rect x="15" y="1"  width="8"  height="1" fill="#FFBE40"/>
                        {/* brim — wider strip */}
                        <rect x="9"  y="5"  width="30" height="2" fill="#C07010"/>
                        <rect x="10" y="7"  width="28" height="1" fill="#904010"/>
                        {/* visor band */}
                        <rect x="13" y="5"  width="22" height="2" fill="#101018"/>
                        {/* visor glint */}
                        <rect x="14" y="5"  width="4"  height="1" fill="#2040C0"/>

                        {/* ── FACE ── */}
                        <rect x="14" y="8"  width="20" height="15" fill="#E8B890"/>
                        {/* ears */}
                        <rect x="12" y="10" width="2"  height="8"  fill="#E8B890"/>
                        <rect x="34" y="10" width="2"  height="8"  fill="#E8B890"/>
                        <rect x="12" y="12" width="2"  height="4"  fill="#C89870"/>
                        <rect x="34" y="12" width="2"  height="4"  fill="#C89870"/>
                        {/* eyebrows — angled, expressive */}
                        <rect x="16" y="11" width="5"  height="1"  fill="#3A2810"/>
                        <rect x="27" y="11" width="5"  height="1"  fill="#3A2810"/>
                        <rect x="15" y="10" width="2"  height="1"  fill="#3A2810"/>
                        <rect x="31" y="10" width="2"  height="1"  fill="#3A2810"/>
                        {/* eye whites */}
                        <rect x="16" y="12" width="5"  height="3"  fill="#F0E8D8"/>
                        <rect x="27" y="12" width="5"  height="3"  fill="#F0E8D8"/>
                        {/* pupils */}
                        <rect x="17" y="13" width="3"  height="2"  fill="#1A1010"/>
                        <rect x="28" y="13" width="3"  height="2"  fill="#1A1010"/>
                        {/* eye shine */}
                        <rect x="19" y="13" width="1"  height="1"  fill="#FFFFFF"/>
                        <rect x="30" y="13" width="1"  height="1"  fill="#FFFFFF"/>
                        {/* nose */}
                        <rect x="22" y="17" width="4"  height="1"  fill="#C89870"/>
                        <rect x="21" y="18" width="2"  height="1"  fill="#C89870"/>
                        <rect x="25" y="18" width="2"  height="1"  fill="#C89870"/>
                        {/* friendly smile */}
                        <rect x="18" y="20" width="12" height="1"  fill="#B07050"/>
                        <rect x="17" y="21" width="2"  height="1"  fill="#B07050"/>
                        <rect x="29" y="21" width="2"  height="1"  fill="#B07050"/>
                        {/* chin shadow */}
                        <rect x="15" y="22" width="18" height="1"  fill="#D0A878"/>

                        {/* ── NECK ── */}
                        <rect x="20" y="23" width="8"  height="3"  fill="#E8B890"/>
                        <rect x="20" y="25" width="8"  height="1"  fill="#D0A878"/>

                        {/* ── JACKET body — narrow, proportional ── */}
                        {/* shoulders (just a little wider than head) */}
                        <rect x="10" y="25" width="28" height="4"  fill="#F0A020"/>
                        <rect x="11" y="25" width="26" height="2"  fill="#F8B030"/>
                        <rect x="10" y="28" width="28" height="1"  fill="#C07010"/>
                        {/* left panel */}
                        <rect x="12" y="29" width="8"  height="20" fill="#E8901C"/>
                        <rect x="12" y="29" width="1"  height="20" fill="#B06810"/>
                        {/* right panel */}
                        <rect x="28" y="29" width="8"  height="20" fill="#E8901C"/>
                        <rect x="35" y="29" width="1"  height="20" fill="#B06810"/>
                        {/* centre — dark shirt/zip */}
                        <rect x="20" y="26" width="8"  height="23" fill="#1A2040"/>
                        <rect x="20" y="29" width="1"  height="20" fill="#253060"/>
                        <rect x="27" y="29" width="1"  height="20" fill="#253060"/>
                        {/* reflective tape 1 */}
                        <rect x="12" y="34" width="8"  height="3"  fill="#E0E0C0"/>
                        <rect x="28" y="34" width="8"  height="3"  fill="#E0E0C0"/>
                        <rect x="12" y="34" width="8"  height="1"  fill="#F4F4D8"/>
                        <rect x="28" y="34" width="8"  height="1"  fill="#F4F4D8"/>
                        {/* reflective tape 2 */}
                        <rect x="12" y="42" width="8"  height="3"  fill="#E0E0C0"/>
                        <rect x="28" y="42" width="8"  height="3"  fill="#E0E0C0"/>
                        <rect x="12" y="42" width="8"  height="1"  fill="#F4F4D8"/>
                        <rect x="28" y="42" width="8"  height="1"  fill="#F4F4D8"/>
                        {/* chest pocket left */}
                        <rect x="13" y="38" width="6"  height="4"  fill="#D08018"/>
                        <rect x="13" y="38" width="6"  height="1"  fill="#C07010"/>

                        {/* ── LEFT ARM — angled out like Oak's gesture ── */}
                        {/* upper arm going diagonally out-and-down */}
                        <rect x="5"  y="27" width="7"  height="2"  fill="#F0A020"/>
                        <rect x="4"  y="29" width="7"  height="2"  fill="#E8901C"/>
                        <rect x="3"  y="31" width="7"  height="2"  fill="#E8901C"/>
                        <rect x="3"  y="33" width="6"  height="2"  fill="#E8901C"/>
                        {/* reflective band on left arm */}
                        <rect x="3"  y="35" width="6"  height="2"  fill="#E0E0C0"/>
                        {/* lower arm */}
                        <rect x="3"  y="37" width="6"  height="5"  fill="#E8901C"/>
                        {/* hand — open, 3 visible fingers */}
                        <rect x="1"  y="42" width="7"  height="4"  fill="#E8B890"/>
                        <rect x="1"  y="46" width="2"  height="2"  fill="#E8B890"/>
                        <rect x="4"  y="46" width="2"  height="2"  fill="#E8B890"/>
                        <rect x="7"  y="44" width="2"  height="3"  fill="#E8B890"/>
                        <rect x="2"  y="42" width="2"  height="1"  fill="#C89870"/>
                        <rect x="5"  y="42" width="2"  height="1"  fill="#C89870"/>

                        {/* ── RIGHT ARM — hanging at side, slightly bent ── */}
                        <rect x="36" y="27" width="7"  height="2"  fill="#F0A020"/>
                        <rect x="37" y="29" width="7"  height="2"  fill="#E8901C"/>
                        <rect x="38" y="31" width="6"  height="2"  fill="#E8901C"/>
                        <rect x="38" y="33" width="6"  height="2"  fill="#E8901C"/>
                        {/* reflective band on right arm */}
                        <rect x="38" y="35" width="6"  height="2"  fill="#E0E0C0"/>
                        {/* lower arm */}
                        <rect x="38" y="37" width="6"  height="5"  fill="#E8901C"/>
                        {/* hand */}
                        <rect x="38" y="42" width="6"  height="4"  fill="#E8B890"/>
                        <rect x="38" y="46" width="2"  height="2"  fill="#E8B890"/>
                        <rect x="41" y="46" width="2"  height="2"  fill="#E8B890"/>
                        <rect x="38" y="42" width="2"  height="1"  fill="#C89870"/>
                        <rect x="42" y="42" width="2"  height="1"  fill="#C89870"/>

                        {/* ── BELT ── */}
                        <rect x="16" y="49" width="16" height="3"  fill="#18182A"/>
                        <rect x="21" y="49" width="6"  height="3"  fill="#B89020"/>
                        <rect x="22" y="50" width="4"  height="1"  fill="#D8B030"/>

                        {/* ── PANTS ── */}
                        <rect x="16" y="52" width="7"  height="18" fill="#1A2040"/>
                        <rect x="25" y="52" width="7"  height="18" fill="#1A2040"/>
                        {/* inner seam */}
                        <rect x="22" y="52" width="4"  height="8"  fill="#101828"/>
                        <rect x="16" y="52" width="1"  height="18" fill="#101828"/>
                        <rect x="31" y="52" width="1"  height="18" fill="#101828"/>
                        {/* reflective ankle stripe */}
                        <rect x="16" y="62" width="7"  height="2"  fill="#E0E0C0"/>
                        <rect x="25" y="62" width="7"  height="2"  fill="#E0E0C0"/>

                        {/* ── BOOTS ── */}
                        <rect x="13" y="70" width="11" height="10" fill="#201008"/>
                        <rect x="26" y="70" width="11" height="10" fill="#201008"/>
                        <rect x="14" y="70" width="9"  height="2"  fill="#342015"/>
                        <rect x="27" y="70" width="9"  height="2"  fill="#342015"/>
                        {/* sole */}
                        <rect x="12" y="78" width="13" height="2"  fill="#100804"/>
                        <rect x="25" y="78" width="13" height="2"  fill="#100804"/>
                      </svg>
                    </div>

                    {/* Pokémon-style dialogue box */}
                    <div className="mx-2 mb-2 rounded-2xl border-[3px] border-[#9090a0] bg-[#e8eef2] px-4 py-3 shadow-lg">
                      <p className="font-mono text-[11px] leading-6 text-[#1a1a1a]">
                        {reply?.answer
                          ? reply.answer.length > 90 ? reply.answer.slice(0, 88) + '…' : reply.answer
                          : 'Hello, there!\nI\'m the Field Liaison!'}
                      </p>
                      <div className="mt-1 text-right font-mono text-[10px] text-[#606060]">▼</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border border-gba-uiBorder bg-[#10131f] p-2">
              <button className="gba-btn gba-btn--accent" disabled={joining || connected} onClick={() => void joinRoom()}>{joining ? 'CONNECTING…' : connected ? 'VIDEO CONNECTED' : 'JOIN VIDEO ROOM'}</button>
              {connected && <button className="gba-btn" onClick={() => void leaveRoom()}>LEAVE ROOM</button>}
              <span className="text-[9px] text-gba-uiDim">{videoStatus}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="border-2 border-gba-uiBorder bg-[#10131f] p-2">
              <div className="pixel-font text-[8px] text-gba-uiInfo">SLNG VOICE RELAY</div>
              <p className="mt-2 text-[9px] leading-4 text-gba-uiDim">Ask about time-local evidence, drone routes, assets at risk, or forecast limits. Speech is transcribed and spoken by SLNG when configured.</p>
              <div className="mt-2 flex gap-2">
                <button className={`gba-btn flex-1 ${recording ? 'gba-btn--selected' : ''}`} onClick={() => void toggleRecording()}>{recording ? 'STOP + SEND' : 'HOLD TO ASK'}</button>
                <button className="gba-btn" onClick={() => void askTextQuestion()}>ASK</button>
              </div>
              <textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={1200} placeholder="What evidence supports the drone reroute?" className="mt-2 min-h-20 w-full resize-y border-2 border-gba-uiBorder bg-[#171a27] p-2 font-mono text-[10px] text-gba-uiText outline-none focus:border-gba-uiAccent" />
              <div className="mt-2 text-[8px] leading-4 text-gba-uiDim">{voiceStatus}</div>
            </div>
            <div className="min-h-36 border-2 border-gba-uiBorder bg-[#171a27] p-2">
              <div className="pixel-font text-[8px] text-gba-fireHi">LIAISON RESPONSE</div>
              <p className="mt-2 text-[10px] leading-5 text-gba-uiText">{reply?.answer ?? 'The liaison only summarizes the selected historical fixture and simulated state.'}</p>
              {reply && <p className="mt-2 text-[8px] text-gba-uiDim">{reply.responder === 'ARI_LLM' ? 'ARI · CONVERSATIONAL' : 'FALLBACK'} · SOURCE: {reply.source.toUpperCase()} · SIMULATED</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
