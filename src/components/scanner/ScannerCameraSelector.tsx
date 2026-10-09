import React from "react"
import { Camera } from "lucide-react"
import { useTranslation } from "@/i18n"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface VideoDeviceOption {
  deviceId: string
  label: string
}

interface ScannerCameraSelectorProps {
  devices: VideoDeviceOption[]
  selectedDeviceId: string
  onSelectDevice: (deviceId: string) => void
  disabled?: boolean
}

export const ScannerCameraSelector: React.FC<ScannerCameraSelectorProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  disabled = false,
}) => {
  const { t } = useTranslation()

  // Ensure value is non-empty for Radix UI Select
  const effectiveValue =
    selectedDeviceId && devices.some((d) => d.deviceId === selectedDeviceId)
      ? selectedDeviceId
      : devices.length > 0
        ? devices[0].deviceId
        : "default"
  const selectedDevice = devices.find((d) => d.deviceId === effectiveValue)
  const displayLabel =
    selectedDevice?.label ||
    (effectiveValue === "default" ? t("scanner.defaultCamera") : "")

  return (
    <div className="flex items-center gap-1.5 shrink-0" data-testid="camera-selector">
      <Select
        value={effectiveValue}
        onValueChange={(val) => {
          if (val) {
            onSelectDevice(val === "default" ? "" : val)
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger
          className="h-8 max-w-[170px] sm:max-w-[220px] text-xs bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-850 hover:text-zinc-100 focus:ring-violet-500/30 cursor-pointer"
          size="sm"
        >
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden text-left">
            <Camera className="size-3.5 text-violet-400 shrink-0" />
            <SelectValue placeholder={t("scanner.selectCameraPlaceholder")}>
              {displayLabel}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent className="z-[60] bg-zinc-900 border-zinc-800 text-zinc-100 max-h-56">
          {devices.length === 0 ? (
            <SelectItem value="default" className="text-xs text-zinc-200 cursor-pointer">
              {t("scanner.defaultCamera")}
            </SelectItem>
          ) : (
            devices.map((device, idx) => (
              <SelectItem
                key={device.deviceId || `cam-${idx}`}
                value={device.deviceId || `cam-${idx}`}
                className="text-xs text-zinc-200 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer"
              >
                {device.label || `${t("scanner.cameraSelectorLabel")} ${idx + 1}`}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  )
}
