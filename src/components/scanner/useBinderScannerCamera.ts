import { useState, useEffect, useRef, useCallback } from "react"
import { useTranslation } from "@/i18n"
import type { CapturedBinderPage } from "./BinderScannerModal"

interface UseBinderScannerCameraProps {
  open: boolean
  autoSnap: boolean
  layout: "2x2" | "3x3" | "4x3"
  onCapture: (page: CapturedBinderPage) => void
}

export function useBinderScannerCamera({
  open,
  autoSnap,
  layout,
  onCapture,
}: UseBinderScannerCameraProps) {
  const { t } = useTranslation()
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [flashActive, setFlashActive] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null)
  const stillCountRef = useRef(0)
  const lastSnapTimeRef = useRef(0)

  // Start camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setIsCameraActive(true)
    } catch (err: any) {
      console.warn("Camera start error:", err)
      setCameraError(t("scanner.cameraNotAvailable"))
      setIsCameraActive(false)
    }
  }, [t])

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCameraActive(false)
  }, [])

  // Manage camera on modal open/close
  useEffect(() => {
    if (open) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [open, startCamera, stopCamera])

  // Capture current camera frame
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !isCameraActive) return
    const video = videoRef.current
    if (video.videoWidth === 0 || video.videoHeight === 0) return

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9)

    // Trigger visual flash
    setFlashActive(true)
    setTimeout(() => setFlashActive(false), 200)

    onCapture({
      id: crypto.randomUUID(),
      image: dataUrl,
      layout,
    })
    lastSnapTimeRef.current = Date.now()
  }, [isCameraActive, layout, onCapture])

  // Stillness detection loop for auto-snap
  useEffect(() => {
    if (!isCameraActive || !autoSnap) return

    const interval = setInterval(() => {
      const video = videoRef.current
      if (!video || video.videoWidth === 0) return

      const now = Date.now()
      if (now - lastSnapTimeRef.current < 3000) return

      const sampleCanvas = document.createElement("canvas")
      sampleCanvas.width = 48
      sampleCanvas.height = 48
      const sCtx = sampleCanvas.getContext("2d")
      if (!sCtx) return

      sCtx.drawImage(video, 0, 0, 48, 48)
      const frame = sCtx.getImageData(0, 0, 48, 48).data

      if (prevFrameDataRef.current) {
        let diff = 0
        const prev = prevFrameDataRef.current
        for (let i = 0; i < frame.length; i += 4) {
          diff += Math.abs(frame[i] - prev[i])
        }
        const avgDiff = diff / (48 * 48)

        if (avgDiff < 15) {
          stillCountRef.current++
          if (stillCountRef.current >= 3) {
            stillCountRef.current = 0
            captureFrame()
          }
        } else {
          stillCountRef.current = 0
        }
      }
      prevFrameDataRef.current = frame
    }, 400)

    return () => clearInterval(interval)
  }, [isCameraActive, autoSnap, captureFrame])

  return {
    videoRef,
    isCameraActive,
    cameraError,
    flashActive,
    startCamera,
    stopCamera,
    captureFrame,
  }
}
