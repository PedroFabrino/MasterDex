import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Camera,
  CameraOff,
  Upload,
  Video,
  Sparkles,
  Trash2,
  CheckCircle2,
  Loader2,
  X,
  Scan,
} from "lucide-react"
import { useTranslation } from "@/i18n"

export interface CapturedBinderPage {
  id: string
  image: string
  layout: "2x2" | "3x3" | "4x3"
}

interface BinderScannerModalProps {
  open: boolean
  onClose: () => void
  onProceedToReview: (pages: CapturedBinderPage[]) => void
}

type GridLayout = "2x2" | "3x3" | "4x3"

export const BinderScannerModal: React.FC<BinderScannerModalProps> = ({
  open,
  onClose,
  onProceedToReview,
}) => {
  const { t } = useTranslation()
  const [layout, setLayout] = useState<GridLayout>("3x3")
  const [capturedPages, setCapturedPages] = useState<CapturedBinderPage[]>([])
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [autoSnap, setAutoSnap] = useState(false)
  const [isProcessingVideo, setIsProcessingVideo] = useState(false)
  const [flashActive, setFlashActive] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null)
  const stillCountRef = useRef(0)
  const lastSnapTimeRef = useRef(0)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

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

    setCapturedPages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        image: dataUrl,
        layout,
      },
    ])
    lastSnapTimeRef.current = Date.now()
  }, [isCameraActive, layout])

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

  // Handle file uploads (batch photos)
  const handleImageFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        if (result) {
          setCapturedPages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), image: result, layout },
          ])
        }
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ""
  }

  // Handle video keyframe extraction
  const handleVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessingVideo(true)
    const videoUrl = URL.createObjectURL(file)
    const tempVideo = document.createElement("video")
    tempVideo.src = videoUrl
    tempVideo.muted = true
    tempVideo.playsInline = true

    await new Promise((res) => {
      tempVideo.onloadedmetadata = () => res(true)
    })

    const duration = tempVideo.duration || 1
    const frameInterval = Math.max(2, duration / 6)
    const extracted: CapturedBinderPage[] = []

    for (let time = 1; time < duration; time += frameInterval) {
      tempVideo.currentTime = time
      await new Promise((res) => {
        tempVideo.onseeked = () => res(true)
      })

      const canvas = document.createElement("canvas")
      canvas.width = tempVideo.videoWidth || 1280
      canvas.height = tempVideo.videoHeight || 720
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height)
        extracted.push({
          id: crypto.randomUUID(),
          image: canvas.toDataURL("image/jpeg", 0.85),
          layout,
        })
      }
    }

    setCapturedPages((prev) => [...prev, ...extracted])
    URL.revokeObjectURL(videoUrl)
    setIsProcessingVideo(false)
    e.target.value = ""
  }

  const removePage = (id: string) => {
    setCapturedPages((prev) => prev.filter((p) => p.id !== id))
  }

  // Render SVG pocket grid guide
  const renderGridOverlay = () => {
    const rows = layout === "2x2" ? 2 : layout === "4x3" ? 4 : 3
    const cols = layout === "2x2" ? 2 : 3

    return (
      <div className="absolute inset-4 pointer-events-none border-2 border-violet-500/60 rounded-xl overflow-hidden shadow-2xl">
        <div
          className="w-full h-full grid gap-1.5 p-1.5"
          style={{
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: rows * cols }).map((_, i) => (
            <div
              key={i}
              className="border border-dashed border-violet-400/40 rounded-lg flex items-center justify-center bg-violet-950/5"
            >
              <span className="text-[10px] font-mono font-bold text-violet-400/40">
                #{i + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-100 p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-300">
                <Scan className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-zinc-100">
                  {t("scanner.title")}
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  {t("scanner.description")}
                </DialogDescription>
              </div>
            </div>

            {/* Layout Switcher */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg">
              {(["2x2", "3x3", "4x3"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLayout(l)}
                  className={`px-2 py-0.5 text-[11px] font-mono rounded transition-all cursor-pointer ${
                    layout === l
                      ? "bg-violet-600 text-white font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Viewfinder Window */}
        <div className="relative aspect-[4/3] w-full rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${isCameraActive ? "block" : "hidden"}`}
          />

          {isCameraActive && renderGridOverlay()}

          {flashActive && <div className="absolute inset-0 bg-white/70 animate-pulse pointer-events-none" />}

          {!isCameraActive && (
            <div className="flex flex-col items-center gap-2.5 p-6 text-center text-zinc-400">
              <CameraOff className="size-10 text-zinc-600 stroke-[1.5]" />
              <p className="text-xs max-w-xs">{cameraError || t("scanner.cameraPermissionPrompt")}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={startCamera}
                className="mt-2 border-zinc-700 bg-zinc-800 text-xs text-zinc-200"
              >
                <Camera className="size-3.5 mr-1.5 text-violet-400" />
                {t("scanner.startCamera")}
              </Button>
            </div>
          )}

          {/* Guide hint pill */}
          {isCameraActive && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-zinc-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-zinc-800 text-[10px] text-zinc-300 pointer-events-none">
              {t("scanner.alignGuideHint")}
            </div>
          )}
        </div>

        {/* Camera Controls Bar */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2">
            <input
              ref={imageInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleImageFiles}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => imageInputRef.current?.click()}
              className="h-8 text-xs border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 cursor-pointer"
            >
              <Upload className="size-3.5 mr-1.5 text-sky-400" />
              {t("scanner.uploadPhotos")}
            </Button>

            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleVideoFile}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isProcessingVideo}
              onClick={() => videoInputRef.current?.click()}
              className="h-8 text-xs border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 cursor-pointer"
            >
              {isProcessingVideo ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5 text-violet-400" />
                  {t("scanner.processingVideo")}
                </>
              ) : (
                <>
                  <Video className="size-3.5 mr-1.5 text-amber-400" />
                  {t("scanner.uploadVideo")}
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAutoSnap(!autoSnap)}
              className={`h-8 text-xs cursor-pointer ${
                autoSnap ? "text-emerald-400 bg-emerald-950/30" : "text-zinc-500"
              }`}
            >
              <Sparkles className="size-3.5 mr-1" />
              {autoSnap ? t("scanner.autoSnapEnabled") : t("scanner.autoSnapDisabled")}
            </Button>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={captureFrame}
            disabled={!isCameraActive}
            className="h-9 px-4 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-950/50 cursor-pointer"
          >
            <Camera className="size-4 mr-1.5" />
            {t("scanner.capturePage")}
          </Button>
        </div>

        {/* Captured Pages Queue Strip */}
        <div className="pt-2 border-t border-zinc-800/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-300">
                {t("scanner.scannedPagesCount", { count: capturedPages.length })}
              </span>
              {capturedPages.length > 0 && (
                <Badge variant="outline" className="text-[10px] border-violet-800 text-violet-300">
                  {capturedPages.length}
                </Badge>
              )}
            </div>

            {capturedPages.length > 0 && (
              <button
                onClick={() => setCapturedPages([])}
                className="text-[11px] text-zinc-500 hover:text-red-400 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="size-3" />
                {t("scanner.clearQueue")}
              </button>
            )}
          </div>

          {capturedPages.length === 0 ? (
            <p className="text-[11px] text-zinc-500 italic py-2 text-center">
              {t("scanner.noPagesScanned")}
            </p>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
              {capturedPages.map((page, idx) => (
                <div
                  key={page.id}
                  className="relative group shrink-0 size-16 rounded-lg border border-zinc-700 overflow-hidden bg-zinc-900"
                >
                  <img src={page.image} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0.5 left-0.5 bg-black/70 px-1 rounded text-[9px] font-mono text-zinc-200">
                    P{idx + 1}
                  </span>
                  <button
                    onClick={() => removePage(page.id)}
                    className="absolute top-0.5 right-0.5 bg-red-600/90 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title={t("scanner.removePage")}
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {capturedPages.length > 0 && (
            <Button
              type="button"
              onClick={() => {
                onProceedToReview(capturedPages)
                onClose()
              }}
              className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="size-4" />
              {t("scanner.reviewPagesAction", { count: capturedPages.length })}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
