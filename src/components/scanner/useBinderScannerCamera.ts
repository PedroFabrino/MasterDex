import { useState, useEffect, useRef, useCallback } from "react"
import { useTranslation } from "@/i18n"
import type { CapturedBinderPage } from "./BinderScannerModal"
import type { VideoDeviceOption } from "./ScannerCameraSelector"

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
  const [videoDevices, setVideoDevices] = useState<VideoDeviceOption[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
    try {
      return localStorage.getItem("masterdex_camera_device_id") || ""
    } catch {
      return ""
    }
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null)
  const stillCountRef = useRef(0)
  const lastSnapTimeRef = useRef(0)

  // Enumerate connected cameras
  const refreshDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return []
    }
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const videoInputs = allDevices.filter((d) => d.kind === "videoinput")
      const options: VideoDeviceOption[] = videoInputs.map((d, index) => ({
        deviceId: d.deviceId || `cam-${index}`,
        label: d.label || `${t("scanner.cameraSelectorLabel")} ${index + 1}`,
      }))
      setVideoDevices(options)
      return options
    } catch (err) {
      console.warn("Failed to enumerate devices:", err)
      return []
    }
  }, [t])

  // Listen for cameras plugged/unplugged
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.addEventListener) {
      return
    }
    const handleDeviceChange = () => {
      refreshDevices()
    }
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange)
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange)
    }
  }, [refreshDevices])

  // Start or restart camera stream
  const startCamera = useCallback(
    async (deviceIdToUse?: string) => {
      setCameraError(null)
      const targetId = deviceIdToUse !== undefined ? deviceIdToUse : selectedDeviceId
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }

        const constraints: MediaStreamConstraints = {
          video:
            targetId && targetId !== "default"
              ? {
                  deviceId: { exact: targetId },
                  width: { ideal: 1920 },
                  height: { ideal: 1080 },
                }
              : {
                  facingMode: { ideal: "environment" },
                  width: { ideal: 1920 },
                  height: { ideal: 1080 },
                },
          audio: false,
        }

        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints)
        } catch (firstErr) {
          if (targetId && targetId !== "default") {
            try {
              // Virtual cameras (e.g. phone/OBS) may reject exact constraints
              stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: targetId },
                audio: false,
              })
            } catch {
              // Graceful fallback to default system camera if device disconnected
              stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" } },
                audio: false,
              })
            }
          } else {
            throw firstErr
          }
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setIsCameraActive(true)

        // Query devices to obtain unlocked labels after permission grant
        await refreshDevices()

        // Sync active device ID if default was used
        const activeTrack = stream.getVideoTracks()[0]
        const activeId = activeTrack?.getSettings()?.deviceId
        if (activeId && (!targetId || targetId === "default")) {
          setSelectedDeviceId(activeId)
        } else if (targetId && targetId !== "default") {
          setSelectedDeviceId(targetId)
        }
      } catch (err: any) {
        console.warn("Camera start error:", err)
        setCameraError(t("scanner.cameraNotAvailable"))
        setIsCameraActive(false)
      }
    },
    [selectedDeviceId, refreshDevices, t]
  )

  // Switch to a chosen camera
  const switchCamera = useCallback(
    async (deviceId: string) => {
      const previousId = selectedDeviceId
      setSelectedDeviceId(deviceId)
      try {
        localStorage.setItem("masterdex_camera_device_id", deviceId)
      } catch {}
      if (!isCameraActive || previousId !== deviceId) {
        await startCamera(deviceId)
      }
    },
    [selectedDeviceId, isCameraActive, startCamera]
  )

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
      refreshDevices()
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [open, startCamera, stopCamera, refreshDevices])

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
    videoDevices,
    selectedDeviceId,
    startCamera,
    stopCamera,
    captureFrame,
    switchCamera,
    refreshDevices,
  }
}
