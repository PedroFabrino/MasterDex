import React, { useState, useRef, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Camera,
  CameraOff,
  Upload,
  Video,
  Sparkles,
  Loader2,
  Scan,
} from "lucide-react"
import { useTranslation } from "@/i18n"
import { ScannerGridOverlay } from "./ScannerGridOverlay"
import { ScannerQueueStrip } from "./ScannerQueueStrip"
import { ScannerCameraSelector } from "./ScannerCameraSelector"
import { useBinderScannerCamera } from "./useBinderScannerCamera"

export interface CapturedBinderPage {
  id: string
  image: string
  layout: "2x2" | "3x3" | "4x3" | "4x4"
}

interface BinderScannerModalProps {
  open: boolean
  onClose: () => void
  onProceedToReview: (pages: CapturedBinderPage[]) => void
}

type GridLayout = "2x2" | "3x3" | "4x3" | "4x4"

export const BinderScannerModal: React.FC<BinderScannerModalProps> = ({
  open,
  onClose,
  onProceedToReview,
}) => {
  const { t } = useTranslation()
  const [layout, setLayout] = useState<GridLayout>("3x3")
  const [capturedPages, setCapturedPages] = useState<CapturedBinderPage[]>([])
  const [autoSnap, setAutoSnap] = useState(false)
  const [isProcessingVideo, setIsProcessingVideo] = useState(false)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const handleCapturePage = useCallback((page: CapturedBinderPage) => {
    setCapturedPages((prev) => [...prev, page])
  }, [])

  const {
    videoRef,
    isCameraActive,
    cameraError,
    flashActive,
    videoDevices,
    selectedDeviceId,
    startCamera,
    captureFrame,
    switchCamera,
  } = useBinderScannerCamera({
    open,
    autoSnap,
    layout,
    onCapture: handleCapturePage,
  })

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl w-full max-h-[92vh] overflow-y-auto bg-zinc-950 border-zinc-800 text-zinc-100 p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 w-full">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-300 shrink-0">
                <Scan className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-zinc-100">
                  {t("scanner.title")}
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  {t("scanner.description")}
                </DialogDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
              <ScannerCameraSelector
                devices={videoDevices}
                selectedDeviceId={selectedDeviceId}
                onSelectDevice={switchCamera}
              />

              {/* Layout Switcher */}
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg shrink-0">
                <span className="text-[10px] uppercase font-semibold text-zinc-500 px-1.5 hidden sm:inline">
                  {t("scanner.layoutSelectorLabel")}:
                </span>
                {(["2x2", "3x3", "4x3", "4x4"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLayout(l)}
                    className={`px-2.5 py-1 text-xs font-mono rounded transition-all cursor-pointer ${
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
          </div>
        </DialogHeader>

        {/* Viewfinder Window */}
        <div className="relative aspect-[4/3] w-full max-h-[56vh] max-w-3xl mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center min-w-0">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${isCameraActive ? "block" : "hidden"}`}
          />

          {isCameraActive && <ScannerGridOverlay layout={layout} />}

          {flashActive && <div className="absolute inset-0 bg-white/70 animate-pulse pointer-events-none" />}

          {!isCameraActive && (
            <div className="flex flex-col items-center gap-2.5 p-6 text-center text-zinc-400">
              <CameraOff className="size-10 text-zinc-600 stroke-[1.5]" />
              <p className="text-xs max-w-xs">{cameraError || t("scanner.cameraPermissionPrompt")}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => startCamera()}
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
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 min-w-0 w-full">
          <div className="flex flex-wrap items-center gap-2">
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
            className="h-9 px-4 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-950/50 cursor-pointer shrink-0"
          >
            <Camera className="size-4 mr-1.5" />
            {t("scanner.capturePage")}
          </Button>
        </div>

        {/* Captured Pages Queue Strip */}
        <ScannerQueueStrip
          capturedPages={capturedPages}
          onRemovePage={(id) => setCapturedPages((prev) => prev.filter((p) => p.id !== id))}
          onClearQueue={() => setCapturedPages([])}
          onProceed={() => {
            onProceedToReview(capturedPages)
            onClose()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
