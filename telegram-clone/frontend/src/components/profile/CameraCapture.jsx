import { useEffect, useRef, useState } from 'react';
import { pushBackHandler, popBackHandler } from '../../utils/backStack';
import {
  BackArrowIcon, FlashOffIcon, FlashOnIcon, GridToggleIcon, FlipCameraIcon,
  GalleryIcon, ShutterIcon, VideoShutterIcon, CheckCircleIcon
} from './ProfileIcons';

// Full-screen in-app camera for "Add a post": live viewfinder, front/back
// flip, gallery import, and Photo / Video / Live mode tabs — modeled on
// mobile-builds/camera-story-page.jpg. Live streaming to other people in
// real time needs signaling/relay infrastructure this app doesn't have, so
// "Live" records a clip the same way Video does (disclosed to the user);
// Photo and Video are fully real: getUserMedia + MediaRecorder, actually
// captured from the device camera.
export default function CameraCapture({ onClose, onSubmit }) {
  const [mode, setMode] = useState('photo'); // 'live' | 'photo' | 'video'
  const [facingMode, setFacingMode] = useState('environment');
  const [streamError, setStreamError] = useState(null);
  const [flash, setFlash] = useState(false);
  const [grid, setGrid] = useState(false);
  const [recording, setRecording] = useState(false);
  const [captured, setCaptured] = useState(null); // { blob, url, type }
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const [liveNoticeShown, setLiveNoticeShown] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const close = () => (captured ? setCaptured(null) : onClose());
    pushBackHandler(close);
    return () => popBackHandler(close);
  }, [captured, onClose]);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      stopStream();
      setStreamError(null);
      try {
        const constraints = { video: { facingMode }, audio: mode !== 'photo' };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        if (!cancelled) setStreamError(err.message || 'Could not access the camera');
      }
    }
    if (!captured) start();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode, mode, captured]);

  useEffect(() => () => stopStream(), []);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function toggleFlash() {
    const next = !flash;
    setFlash(next);
    try {
      const track = streamRef.current?.getVideoTracks?.()[0];
      if (track && track.getCapabilities && track.getCapabilities().torch) {
        await track.applyConstraints({ advanced: [{ torch: next }] });
      }
    } catch {
      // Torch control isn't supported on this device/browser — the icon
      // still toggles so the control isn't dead, it just has no effect.
    }
  }

  function flipCamera() {
    setFacingMode((f) => (f === 'user' ? 'environment' : 'user'));
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setCaptured({ blob, url: URL.createObjectURL(blob), type: 'photo' });
    }, 'image/jpeg', 0.92);
  }

  function startRecording() {
    if (!streamRef.current) return;
    if (mode === 'live' && !liveNoticeShown) setLiveNoticeShown(true);
    chunksRef.current = [];
    let recorder;
    try {
      recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp8,opus' });
    } catch {
      recorder = new MediaRecorder(streamRef.current);
    }
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
      setCaptured({ blob, url: URL.createObjectURL(blob), type: 'video' });
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  function onShutterTap() {
    if (mode === 'photo') { takePhoto(); return; }
    if (recording) stopRecording();
    else startRecording();
  }

  function onGalleryPick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const type = file.type.startsWith('video/') ? 'video' : 'photo';
    setCaptured({ blob: file, url: URL.createObjectURL(file), type });
  }

  async function confirmPost() {
    setPosting(true);
    try {
      await onSubmit(captured.blob, captured.type, caption.trim());
      onClose();
    } catch (err) {
      alert('Could not publish your post: ' + (err.response?.data?.error || err.message));
    } finally {
      setPosting(false);
    }
  }

  if (captured) {
    return (
      <div className="camera-capture">
        <div className="camera-capture__preview-stage">
          {captured.type === 'video' ? (
            <video src={captured.url} className="camera-capture__preview-media" controls autoPlay loop playsInline />
          ) : (
            <img src={captured.url} className="camera-capture__preview-media" alt="Captured" />
          )}
        </div>
        <div className="camera-capture__preview-bar">
          <button className="camera-capture__retake" onClick={() => setCaptured(null)} disabled={posting}>
            <BackArrowIcon /> Retake
          </button>
          <input
            className="camera-capture__caption"
            placeholder="Add a caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={posting}
          />
          <button className="camera-capture__post-btn" onClick={confirmPost} disabled={posting}>
            {posting ? 'Posting…' : (<><CheckCircleIcon /> Post</>)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="camera-capture">
      <div className="camera-capture__topbar">
        <button className="camera-capture__icon-btn" onClick={onClose}><BackArrowIcon /></button>
        <div className="camera-capture__topbar-right">
          <button className="camera-capture__icon-btn" onClick={toggleFlash}>{flash ? <FlashOnIcon /> : <FlashOffIcon />}</button>
          <button className="camera-capture__icon-btn" onClick={() => setGrid((g) => !g)}><GridToggleIcon /></button>
        </div>
      </div>

      <div className="camera-capture__stage">
        {streamError ? (
          <div className="camera-capture__error">
            <p>{streamError}</p>
            <p className="camera-capture__error-hint">You can still pick a photo or video from your gallery below.</p>
          </div>
        ) : (
          <video ref={videoRef} className={`camera-capture__video ${facingMode === 'user' ? 'is-mirrored' : ''}`} muted playsInline autoPlay />
        )}
        {grid && !streamError && (
          <div className="camera-capture__grid">
            <span /><span /><span /><span />
          </div>
        )}
        {recording && <div className="camera-capture__rec-badge">● REC</div>}
      </div>

      <div className="camera-capture__controls">
        <button className="camera-capture__gallery-btn" onClick={() => fileInputRef.current?.click()}>
          <GalleryIcon />
        </button>
        <input type="file" accept="image/*,video/*" ref={fileInputRef} className="hidden" onChange={onGalleryPick} />

        <button className="camera-capture__shutter" onClick={onShutterTap} disabled={!!streamError}>
          {mode === 'photo' ? <ShutterIcon /> : <VideoShutterIcon />}
        </button>

        <button className="camera-capture__flip-btn" onClick={flipCamera}>
          <FlipCameraIcon />
        </button>
      </div>

      <div className="camera-capture__modes">
        {['live', 'photo', 'video'].map((m) => (
          <button
            key={m}
            className={`camera-capture__mode ${mode === m ? 'is-active' : ''}`}
            onClick={() => { if (!recording) setMode(m); }}
          >
            {m === 'live' ? 'Live' : m === 'photo' ? 'Photo' : 'Video'}
          </button>
        ))}
      </div>
      {mode === 'live' && (
        <div className="camera-capture__live-note">Live streaming isn't available yet — this records a clip and posts it instead.</div>
      )}
    </div>
  );
}
