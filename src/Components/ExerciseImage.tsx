import { useState } from "react"
import { imgBase } from "./ExerciseProvider"
import { useOnline } from "../utils"

interface Props {
  /** Relative path from the exercise data, e.g. "3_4_Sit-Up/0.jpg" */
  src: string
  alt: string
  className?: string
  loading?: 'lazy' | 'eager'
}

/**
 * An exercise image from the CDN. crossOrigin lets the service worker store it at its real size
 * (otherwise Chrome counts each cached image as ~7 MB). If it can't load, e.g. offline and never
 * viewed before, show a short placeholder instead of a broken-image icon.
 */
export default function ExerciseImage({ src, alt, className, loading }: Props) {
  const online = useOnline()
  // remember which src failed, so a different image (or coming back online) tries again
  const [failed, setFailed] = useState<{ src: string, online: boolean } | null>(null)

  if (failed && failed.src === src && failed.online === online) {
    return (
      <div role="img" aria-label={alt} className={`${className ?? ''} flex min-h-24 items-center justify-center border-2 border-outline p-4 text-center text-sm opacity-70`}>
        {online ? "Image couldn't load" : 'Image not saved for offline use yet'}
      </div>
    )
  }

  return (
    <img
      src={imgBase + src}
      alt={alt}
      crossOrigin="anonymous"
      loading={loading}
      className={className}
      onError={() => setFailed({ src, online })}
    />
  )
}
