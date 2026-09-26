import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { User } from "../App";
import { setUserAvatar } from "../utils/userPreferences";

interface Props {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onAvatarUpdated: (newAvatar: string | null) => void;
}

const PRESET_AVATARS = [
  { id: "prof", label: "Professor", emoji: "🎓", bg: "#1e293b", fg: "#38bdf8" },
  { id: "sci", label: "Scientist", emoji: "🔬", bg: "#0f766e", fg: "#2dd4bf" },
  { id: "arch", label: "Archivist", emoji: "📚", bg: "#854d0e", fg: "#fde047" },
  { id: "neuro", label: "Neuroscientist", emoji: "🧠", bg: "#701a75", fg: "#f472b6" },
  { id: "comp", label: "Computer Scientist", emoji: "💻", bg: "#1e3a8a", fg: "#60a5fa" },
  { id: "phil", label: "Philosopher", emoji: "🏛️", bg: "#374151", fg: "#e5e7eb" },
  { id: "hist", label: "Historian", emoji: "📜", bg: "#78350f", fg: "#fcd34d" },
  { id: "eco", label: "Ecologist", emoji: "🌱", bg: "#14532d", fg: "#86efac" },
];

function generateEmojiAvatar(emoji: string, bg: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Circle background
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(80, 80, 80, 0, Math.PI * 2);
  ctx.fill();

  // Emoji text
  ctx.font = "82px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, 80, 88);

  return canvas.toDataURL("image/png");
}

export default function AvatarModal({ user, isOpen, onClose, onAvatarUpdated }: Props) {
  const [activeMode, setActiveMode] = useState<"upload" | "camera" | "presets">("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera when closing or switching mode
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    setCameraStream(null);
    setCameraActive(false);
    setIsVideoReady(false);
    setCountdown(null);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setPreview(null);
      setCameraError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeMode !== "camera") {
      stopCamera();
    } else if (isOpen) {
      startCamera();
    }
    return () => {
      if (activeMode === "camera") {
        stopCamera();
      }
    };
  }, [activeMode, isOpen]);

  // Robust camera initialization with automatic constraint fallbacks
  async function startCamera() {
    setCameraError(null);
    setIsVideoReady(false);
    stopCamera();

    let stream: MediaStream | null = null;

    // Level 1: Ideal HD / front-facing selfie
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
    } catch {
      // Level 2: Simple user facing
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
      } catch {
        // Level 3: Bare minimum constraint (any webcam/USB device available on Windows/Mac)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (finalErr: any) {
          console.error("Camera access failed:", finalErr);
          let userMsg = "Could not access camera. Please allow camera permissions in your browser.";
          if (finalErr.name === "NotAllowedError" || finalErr.name === "PermissionDeniedError") {
            userMsg = "Camera permission was denied. Please click the camera icon in your address bar to allow access.";
          } else if (finalErr.name === "NotFoundError" || finalErr.name === "DevicesNotFoundError") {
            userMsg = "No webcam detected on this device. You can upload an image or use the device camera app below.";
          } else if (finalErr.name === "NotReadableError" || finalErr.name === "TrackStartError") {
            userMsg = "Camera is currently busy or in use by another application (e.g. Teams, Zoom).";
          }
          setCameraError(userMsg);
          setCameraActive(false);
          return;
        }
      }
    }

    if (!stream) {
      setCameraError("Unable to establish camera stream.");
      setCameraActive(false);
      return;
    }

    streamRef.current = stream;
    setCameraStream(stream);
    setCameraActive(true);

    // If video tag is already in DOM, attach immediately
    if (videoRef.current) {
      const v = videoRef.current;
      v.srcObject = stream;
      v.onloadedmetadata = () => {
        v.play().catch(() => {});
        setIsVideoReady(true);
      };
      v.play().catch(() => {});
    }
  }

  // Ref callback to ensure video attaches the instant the DOM node mounts
  const onVideoRef = (node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.onloadedmetadata = () => {
        node.play().catch((e) => console.warn("Video play error:", e));
        setIsVideoReady(true);
      };
      node.play().catch(() => {});
    }
  };

  // Re-attach if cameraStream updates
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      const v = videoRef.current;
      v.srcObject = cameraStream;
      v.onloadedmetadata = () => {
        v.play().catch(() => {});
        setIsVideoReady(true);
      };
      v.play().catch(() => {});
    }
  }, [cameraStream]);

  // Countdown timer for selfie snap
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 1) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    } else if (countdown === 1) {
      const t = setTimeout(() => {
        setCountdown(null);
        capturePhoto();
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  function triggerCountdown() {
    if (!isVideoReady) return;
    setCountdown(3);
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (!vw || !vh) {
      setCameraError("Camera video frames are still loading. Please wait 1 second and click again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = Math.min(vw, vh);
    const startX = (vw - size) / 2;
    const startY = (vh - size) / 2;

    // Mirror horizontally to match the mirrored selfie viewfinder
    ctx.save();
    ctx.translate(300, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, startX, startY, size, size, 0, 0, 300, 300);
    ctx.restore();

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    // Trigger visual shutter flash
    setShutterFlash(true);
    setTimeout(() => {
      setShutterFlash(false);
      setPreview(dataUrl);
      stopCamera();
    }, 180);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const size = Math.min(img.width, img.height);
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;
        ctx.drawImage(img, startX, startY, size, size, 0, 0, 300, 300);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        setPreview(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function saveAvatar(avatarUrl: string | null) {
    setUserAvatar(user.email, avatarUrl);
    onAvatarUpdated(avatarUrl);
    onClose();
  }

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.16)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999999,
        padding: "1.5rem 1rem",
        overflowY: "auto",
      }}
      onClick={() => {
        stopCamera();
        onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "480px",
          maxHeight: "90vh",
          overflowY: "auto",
          margin: "auto",
          background: "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(24px) saturate(1.4)",
          WebkitBackdropFilter: "blur(24px) saturate(1.4)",
          border: "1.5px solid rgba(255, 255, 255, 0.9)",
          borderRadius: 24,
          padding: "1.75rem",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 28px 72px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(15, 23, 42, 0.04), inset 0 2px 4px rgba(255, 255, 255, 0.9)",
          animation: "menuFadeIn 0.22s cubic-bezier(0.16,1,0.3,1) forwards",
        }}
      >
        <style>{`
          @keyframes menuFadeIn {
            from { opacity: 0; transform: scale(0.95) translateY(12px); }
            to   { opacity: 1; transform: scale(1)    translateY(0);    }
          }
          @keyframes pulseRecord {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%      { opacity: 0.4; transform: scale(1.15); }
          }
          @keyframes countdownPop {
            0%   { transform: scale(0.6); opacity: 0; }
            50%  { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1);   opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              Customize Your Avatar
            </h2>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              Choose a photo, take a picture live, or select an academic preset.
            </p>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "1px solid var(--border-strong)",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(15, 23, 42, 0.06)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            ✕
          </button>
        </div>

        {/* Mode Tabs */}
        <div style={{ display: "flex", gap: "0.35rem", background: "rgba(15, 23, 42, 0.05)", padding: "4px", borderRadius: "12px", marginBottom: "1.25rem" }}>
          {[
            { id: "upload", label: "📁 Upload Photo" },
            { id: "camera", label: "📸 Take Photo Live" },
            { id: "presets", label: "🎓 Presets" },
          ].map((tab) => {
            const isActive = activeMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setPreview(null);
                  setActiveMode(tab.id as any);
                }}
                style={{
                  flex: 1,
                  padding: "0.55rem 0.5rem",
                  borderRadius: "9px",
                  border: isActive ? "1px solid rgba(37, 99, 235, 0.2)" : "1px solid transparent",
                  fontSize: "0.78rem",
                  fontWeight: isActive ? 600 : 500,
                  cursor: "pointer",
                  background: isActive ? "#FFFFFF" : "transparent",
                  color: isActive ? "#1d4ed8" : "var(--text-secondary)",
                  boxShadow: isActive ? "0 2px 8px rgba(37, 99, 235, 0.1), 0 1px 2px rgba(0,0,0,0.04)" : "none",
                  transition: "all 0.18s ease",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div style={{ minHeight: "230px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {/* UPLOAD MODE */}
          {activeMode === "upload" && (
            <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileSelect} />
              {preview ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.85rem" }}>
                  <img
                    src={preview}
                    alt="Preview"
                    style={{ width: "120px", height: "120px", borderRadius: "50%", objectFit: "cover", border: "3px solid #2563eb", boxShadow: "0 8px 24px rgba(37, 99, 235, 0.2)" }}
                  />
                  <button onClick={() => fileInputRef.current?.click()} className="btn-secondary" style={{ padding: "0.35rem 0.85rem", fontSize: "0.75rem", borderRadius: "8px" }}>
                    Choose Another File
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: "100%",
                    padding: "2.5rem 1rem",
                    border: "2px dashed rgba(15, 23, 42, 0.18)",
                    borderRadius: "16px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: "rgba(255, 255, 255, 0.6)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#2563eb";
                    e.currentTarget.style.background = "#eff6ff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(15, 23, 42, 0.18)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.6)";
                  }}
                >
                  <div style={{ fontSize: "2.2rem", marginBottom: "0.5rem" }}>🖼️</div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                    Click to browse your device
                  </p>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Supports PNG, JPG, WebP (auto-centered square)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* CAMERA MODE */}
          {activeMode === "camera" && (
            <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.85rem" }}>
              {/* Hidden native hardware capture fallback */}
              <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                style={{ display: "none" }}
                onChange={handleFileSelect}
              />

              {cameraError ? (
                <div style={{ textAlign: "center", padding: "1.25rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "14px", width: "100%" }}>
                  <p style={{ color: "#dc2626", fontSize: "0.82rem", margin: "0 0 1rem", lineHeight: 1.45 }}>{cameraError}</p>
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      onClick={startCamera}
                      className="btn-secondary"
                      style={{ padding: "0.4rem 0.85rem", fontSize: "0.76rem", borderRadius: "8px" }}
                    >
                      ↺ Retry Live Camera
                    </button>
                    <button
                      onClick={() => nativeCameraInputRef.current?.click()}
                      style={{
                        padding: "0.4rem 0.85rem",
                        fontSize: "0.76rem",
                        borderRadius: "8px",
                        background: "#2563eb",
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      📷 Launch System Camera App
                    </button>
                  </div>
                </div>
              ) : preview ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.85rem" }}>
                  <div style={{ position: "relative" }}>
                    <img
                      src={preview}
                      alt="Captured"
                      style={{ width: "140px", height: "140px", borderRadius: "50%", objectFit: "cover", border: "3px solid #2563eb", boxShadow: "0 8px 24px rgba(37, 99, 235, 0.25)" }}
                    />
                    <div style={{ position: "absolute", bottom: 4, right: 4, background: "#16a34a", color: "#fff", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", border: "2px solid #fff" }}>
                      ✓
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => {
                        setPreview(null);
                        startCamera();
                      }}
                      className="btn-secondary"
                      style={{ padding: "0.4rem 0.9rem", fontSize: "0.76rem", borderRadius: "8px" }}
                    >
                      ↺ Retake Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", width: "100%" }}>
                  {/* Live Viewfinder Frame */}
                  <div
                    style={{
                      width: "160px",
                      height: "160px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: "3px solid #2563eb",
                      background: "#0F172A",
                      position: "relative",
                      boxShadow: "0 8px 28px rgba(37, 99, 235, 0.25)",
                    }}
                  >
                    <video
                      ref={onVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transform: "scaleX(-1)", // Mirror selfie preview
                      }}
                    />

                    {/* Camera Active Live Dot */}
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        background: "rgba(0,0,0,0.55)",
                        padding: "2px 6px",
                        borderRadius: "999px",
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: isVideoReady ? "#22c55e" : "#eab308",
                          animation: "pulseRecord 1.6s infinite",
                        }}
                      />
                      <span style={{ fontSize: "0.62rem", color: "#fff", fontWeight: 600, textTransform: "uppercase" }}>
                        {isVideoReady ? "LIVE" : "START"}
                      </span>
                    </div>

                    {/* Countdown Overlay */}
                    {countdown !== null && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(0,0,0,0.6)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: "3.2rem",
                          fontWeight: 800,
                          animation: "countdownPop 0.4s ease-out",
                        }}
                      >
                        {countdown}
                      </div>
                    )}

                    {/* Shutter Flash Animation */}
                    {shutterFlash && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "#ffffff",
                          opacity: 0.95,
                          transition: "opacity 0.18s ease-out",
                        }}
                      />
                    )}
                  </div>

                  {/* Camera Control Action Buttons */}
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                    <button
                      onClick={capturePhoto}
                      disabled={!isVideoReady || countdown !== null}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.45rem",
                        padding: "0.55rem 1.2rem",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        borderRadius: "999px",
                        border: "none",
                        background: isVideoReady ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "rgba(15, 23, 42, 0.2)",
                        color: "#FFFFFF",
                        cursor: isVideoReady ? "pointer" : "not-allowed",
                        boxShadow: isVideoReady ? "0 4px 14px rgba(37, 99, 235, 0.35)" : "none",
                        transition: "all 0.18s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (isVideoReady) {
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 6px 18px rgba(37, 99, 235, 0.45)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isVideoReady) {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 4px 14px rgba(37, 99, 235, 0.35)";
                        }
                      }}
                    >
                      📸 Click Photo Now
                    </button>

                    <button
                      onClick={triggerCountdown}
                      disabled={!isVideoReady || countdown !== null}
                      style={{
                        padding: "0.55rem 0.95rem",
                        fontSize: "0.78rem",
                        borderRadius: "999px",
                        border: "1.5px solid var(--border-strong)",
                        background: "#FFFFFF",
                        color: "var(--text-primary)",
                        cursor: isVideoReady ? "pointer" : "not-allowed",
                        fontWeight: 500,
                        transition: "all 0.18s ease",
                      }}
                    >
                      ⏱️ 3s Timer
                    </button>
                  </div>

                  {/* Fallback to native device camera */}
                  <div style={{ marginTop: "0.15rem" }}>
                    <button
                      type="button"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "var(--text-secondary)",
                        fontSize: "0.73rem",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Or snap photo using system camera app
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PRESETS MODE */}
          {activeMode === "presets" && (
            <div style={{ width: "100%" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
                {PRESET_AVATARS.map((p) => {
                  const avatarData = generateEmojiAvatar(p.emoji, p.bg);
                  const isSelected = preview === avatarData;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPreview(avatarData)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.35rem",
                        padding: "0.6rem 0.4rem",
                        borderRadius: "14px",
                        border: isSelected ? "2px solid #2563eb" : "1px solid rgba(0,0,0,0.08)",
                        background: isSelected ? "#eff6ff" : "rgba(255, 255, 255, 0.7)",
                        cursor: "pointer",
                        boxShadow: isSelected ? "0 2px 8px rgba(37, 99, 235, 0.16)" : "none",
                        transition: "all 0.18s ease",
                      }}
                    >
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          background: p.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.5rem",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                        }}
                      >
                        {p.emoji}
                      </div>
                      <span style={{ fontSize: "0.68rem", fontWeight: isSelected ? 600 : 500, color: isSelected ? "#1d4ed8" : "var(--text-secondary)", textAlign: "center", lineHeight: 1.2 }}>
                        {p.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-light)" }}>
          <button
            onClick={() => saveAvatar(null)}
            style={{
              padding: "0.45rem 0.85rem",
              background: "transparent",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#ef4444",
              borderRadius: "10px",
              fontSize: "0.75rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.18s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Reset to Initials
          </button>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "10px",
                border: "1px solid var(--border-strong)",
                background: "transparent",
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(15, 23, 42, 0.04)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              Cancel
            </button>
            <button
              disabled={!preview}
              onClick={() => preview && saveAvatar(preview)}
              style={{
                padding: "0.5rem 1.3rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                borderRadius: "10px",
                border: "none",
                background: preview ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "rgba(15, 23, 42, 0.12)",
                color: preview ? "#FFFFFF" : "rgba(15, 23, 42, 0.4)",
                cursor: preview ? "pointer" : "not-allowed",
                boxShadow: preview ? "0 4px 14px rgba(37, 99, 235, 0.28)" : "none",
                transition: "all 0.18s ease",
              }}
            >
              Apply Avatar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
