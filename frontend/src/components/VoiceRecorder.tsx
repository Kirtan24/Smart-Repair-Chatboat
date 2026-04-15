'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Square } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  onTranscript: (blob: Blob, mimeType: string) => void;
  onClose: () => void;
}

export default function VoiceRecorder({ onTranscript, onClose }: Props) {
  const [elapsed, setElapsed]     = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceScale, setVoiceScale]   = useState(1);

  const mediaRecorder  = useRef<MediaRecorder | null>(null);
  const chunks         = useRef<Blob[]>([]);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const analyserRef    = useRef<AnalyserNode | null>(null);
  const animFrameRef   = useRef<number | null>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const idleFrameRef   = useRef<number | null>(null);
  const idleStartRef   = useRef<number>(0);

  // Cleanup everything on unmount
  useEffect(() => {
    return () => {
      stopAllTimers();
      mediaRecorder.current?.state === 'recording' && mediaRecorder.current.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
    };
  }, []);

  // Idle breathing animation — runs only when NOT recording
  useEffect(() => {
    if (isRecording) {
      if (idleFrameRef.current) cancelAnimationFrame(idleFrameRef.current);
      return;
    }
    idleStartRef.current = performance.now();
    const animate = (now: number) => {
      const t = (now - idleStartRef.current) / 3000; // 3-second cycle
      setVoiceScale(1.0 + Math.sin(t * Math.PI * 2) * 0.09); // 0.91 → 1.09
      idleFrameRef.current = requestAnimationFrame(animate);
    };
    idleFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (idleFrameRef.current) cancelAnimationFrame(idleFrameRef.current);
    };
  }, [isRecording]);

  const stopAllTimers = () => {
    if (timerRef.current)     clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (idleFrameRef.current) cancelAnimationFrame(idleFrameRef.current);
    timerRef.current = animFrameRef.current = idleFrameRef.current = null;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Web Audio — analyser only (NOT connected to destination → no echo)
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      // DO NOT connect analyser → destination (that causes echo)

      // MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: mimeType });
        onTranscript(blob, mimeType);
      };

      recorder.start(250);
      mediaRecorder.current = recorder;
      setIsRecording(true);

      // Voice-reactive globe scale
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const visualize = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const intensity = avg / 255; // 0 → 1
        setVoiceScale(0.95 + intensity * 0.75); // 0.95 → 1.70
        animFrameRef.current = requestAnimationFrame(visualize);
      };
      visualize();

      // Timer
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    } catch (err: any) {
      const name = err?.name ?? '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        toast.error('Microphone permission denied. Enable it in browser settings.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        toast.error('No microphone detected. Connect one and try again.');
      } else {
        toast.error(`Microphone error: ${err?.message ?? 'Unknown error'}`);
      }
      onClose();
    }
  };

  const handleStart = async () => {
    setElapsed(0);
    chunks.current = [];
    await startRecording();
  };

  const handleStop = () => {
    stopAllTimers();
    setIsRecording(false);
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.stop();
    }
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
  };

  const handleCancel = () => {
    stopAllTimers();
    chunks.current = [];
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.ondataavailable = null;
      mediaRecorder.current.onstop = null;
      mediaRecorder.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setIsRecording(false);
    onClose();
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="voice-overlay" onClick={(e) => e.target === e.currentTarget && handleCancel()}>
      <div className="voice-modal">

        {/* Voice-reactive gradient orb */}
        <div
          className="voice-globe-area"
          style={{ transform: `scale(${voiceScale})` }}
        >
          <div className="voice-gradient-bg" />
        </div>

        {/* Content */}
        <div className="voice-content">
          {isRecording ? (
            <>
              <p className="voice-modal-title">Listening…</p>
              <div className="voice-timer">{fmt(elapsed)}</div>
              <p className="voice-hint">Speak clearly — tap Stop &amp; Send when done</p>
              <div className="voice-actions">
                <button className="voice-stop-btn" onClick={handleCancel}>
                  <X size={13} /> Cancel
                </button>
                <button className="voice-stop-btn voice-stop-send" onClick={handleStop}>
                  <Square size={13} /> Stop &amp; Send
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="voice-modal-title">Voice Input</p>
              <p className="voice-hint">Tap the button below to start recording your message</p>
              <button className="voice-start-btn" type="button" onClick={handleStart}>
                Start Recording
              </button>
              <button className="voice-stop-btn" onClick={handleCancel}>
                <X size={13} /> Cancel
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
