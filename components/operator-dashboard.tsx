"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Shield, Search, LogOut, Camera, AlertTriangle, CheckCircle, RefreshCcw, History, ArrowRight, Zap, Car } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import type { Driver, Vehicle, DailyPayment, Operator } from "@/lib/types"
import { config } from "@/lib/config"

export default function OperatorDashboard({ operator }: { operator: Operator }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [driver, setDriver] = useState<Driver | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [dailyPayment, setDailyPayment] = useState<DailyPayment | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [history, setHistory] = useState<(Vehicle & { paid: boolean, time: string })[]>([])
  const [hasCameraAccess, setHasCameraAccess] = useState(false)
  const [autoScanEnabled, setAutoScanEnabled] = useState(false)
  const [detections, setDetections] = useState<any[]>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // Initialize Audio Context
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  const playAlert = (type: "success" | "warning") => {
    if (!audioContextRef.current) return
    const ctx = audioContextRef.current
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === "success") {
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1)
    } else {
      osc.frequency.setValueAtTime(440, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.2)
      osc.type = "sawtooth"
    }

    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
    osc.start()
    osc.stop(ctx.currentTime + 0.3)
  }

  // Camera Setup
  useEffect(() => {
    let stream: MediaStream | null = null

    async function startCamera() {
      try {
        // First, try to enumerate devices to find the default camera (index 0)
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(device => device.kind === 'videoinput')
        if (videoDevices.length === 0) {
          throw new Error('No camera devices found')
        }

        // Prefer device 0 (default/laptop camera) by specifying deviceId if available
        let constraints: MediaStreamConstraints = {
          video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        }
        if (videoDevices[0].deviceId) {
          constraints.video = { ...(constraints.video as MediaTrackConstraints), deviceId: { exact: videoDevices[0].deviceId } }
        }

        stream = await navigator.mediaDevices.getUserMedia(constraints)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setHasCameraAccess(true)
        }
      } catch (err) {
        console.error("Camera error:", err)
        toast({ title: "Erreur Caméra", description: "Impossible d'accéder à la caméra.", variant: "destructive" })
      }
    }
    
    startCamera()

    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [toast])

  // Auto-detection loop (for bounding box visualization only)
  // Optimized for faster real-time detection
  useEffect(() => {
    if (!hasCameraAccess || !autoScanEnabled) return

    let isProcessing = false
    let lastDetectionTime = 0
    const MIN_DETECTION_INTERVAL = 500 // Minimum 500ms between detections
    const MAX_DETECTION_INTERVAL = 2000 // Fallback to 2s if no vehicles detected

    const performDetection = async () => {
      if (isProcessing || !videoRef.current) return
      
      const now = Date.now()
      const timeSinceLastDetection = now - lastDetectionTime
      
      // Throttle: Don't detect too frequently if we just detected something
      if (timeSinceLastDetection < MIN_DETECTION_INTERVAL) {
        return
      }

      isProcessing = true
      const video = videoRef.current
      const originalWidth = video.videoWidth
      const originalHeight = video.videoHeight

      try {
        // Optimize: Resize image before sending to reduce payload
        const MAX_DIM = 800
        let resizedWidth = originalWidth
        let resizedHeight = originalHeight

        if (originalWidth > originalHeight) {
          if (originalWidth > MAX_DIM) {
            resizedHeight = Math.round(originalHeight * (MAX_DIM / originalWidth))
            resizedWidth = MAX_DIM
          }
        } else {
          if (originalHeight > MAX_DIM) {
            resizedWidth = Math.round(originalWidth * (MAX_DIM / originalHeight))
            resizedHeight = MAX_DIM
          }
        }

        // Use off-screen canvas for capture
        const offscreenCanvas = document.createElement('canvas')
        offscreenCanvas.width = resizedWidth
        offscreenCanvas.height = resizedHeight
        const ctx = offscreenCanvas.getContext('2d')
        if (!ctx) {
          isProcessing = false
          return
        }

        ctx.drawImage(video, 0, 0, resizedWidth, resizedHeight)

        // Convert to blob directly (more efficient than data URL)
        const blob = await new Promise<Blob | null>((resolve) => {
          offscreenCanvas.toBlob(resolve, 'image/jpeg', 0.7) // Lower quality for speed
        })

        if (!blob) {
          isProcessing = false
          return
        }

        const formData = new FormData()
        formData.append('image', blob, 'frame.jpg')
        formData.append('save_image', 'false')

        const res = await fetch(config.api.visionApiEndpoint, {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          const data = await res.json()
          
          // ALWAYS log API response (not just in dev mode)
          console.log('🔍 API Response:', {
            hasResults: !!data.results,
            hasDetections: !!(data.results?.detections || data.detections),
            detectionsCount: (data.results?.detections || data.detections || []).length,
            isVehicle: data.is_vehicle,
            resultsStructure: data.results,
            detectionsArray: data.results?.detections || data.detections,
            fullData: JSON.stringify(data, null, 2)
          })
          
          // Try multiple paths to get detections
          const results = data.results?.detections || data.detections || data.results || []
          
          if (results.length === 0) {
            console.warn('⚠️ No detections found in API response. Response structure:', Object.keys(data), 'Full response:', data)
          } else {
            console.log('✅ Found detections in API response:', results.length, results)
          }
          
          // Scale coordinates from resized image back to original video size
          const scaleX = originalWidth / resizedWidth
          const scaleY = originalHeight / resizedHeight
          
          const scaledResults = results.map((det: any) => {
            const scaled = { ...det }
            
            // Scale plate coordinates if present
            if (scaled.plate?.coordinates) {
              const coords = scaled.plate.coordinates
              if (coords.x1 !== undefined) {
                coords.x1 = Math.round(coords.x1 * scaleX)
                coords.y1 = Math.round(coords.y1 * scaleY)
                coords.x2 = Math.round(coords.x2 * scaleX)
                coords.y2 = Math.round(coords.y2 * scaleY)
              }
            }
            
            // Scale bbox if present (YOLO/RFDETR format)
            if (scaled.bbox && Array.isArray(scaled.bbox) && scaled.bbox.length >= 4) {
              scaled.bbox[0] = Math.round(scaled.bbox[0] * scaleX) // x
              scaled.bbox[1] = Math.round(scaled.bbox[1] * scaleY) // y
              scaled.bbox[2] = Math.round(scaled.bbox[2] * scaleX) // w
              scaled.bbox[3] = Math.round(scaled.bbox[3] * scaleY) // h
            }
            
            return scaled
          })
          
          // ALWAYS log detections (not just in dev mode)
          console.log('📦 Scaled detections:', {
            count: scaledResults.length,
            detections: scaledResults,
            firstDetection: scaledResults[0],
            allDetections: scaledResults
          })
          
          if (scaledResults.length > 0) {
            lastDetectionTime = Date.now()
            console.log('✅ Setting detections in state:', scaledResults.length, 'items', scaledResults)
          } else {
            console.warn('⚠️ No detections to display - API returned empty array')
          }
          
          setDetections(scaledResults)
        } else {
          // Log API errors in development
          if (config.app.isDevelopment) {
            const errorText = await res.text().catch(() => 'Unknown error')
            console.debug('API Error:', res.status, errorText)
          }
        }
      } catch (e) {
        // Silently handle errors for background detection
        if (config.app.isDevelopment) {
          console.debug('Detection error:', e)
        }
      } finally {
        isProcessing = false
      }
    }

    // Start with immediate detection, then use adaptive interval
    performDetection()

    // Use requestAnimationFrame for smoother, more efficient updates
    let animationFrameId: number
    let lastFrameTime = 0
    const TARGET_FPS = 2 // 2 detections per second (500ms interval)

    const loop = (currentTime: number) => {
      const elapsed = currentTime - lastFrameTime
      const interval = 1000 / TARGET_FPS // 500ms

      if (elapsed >= interval) {
        performDetection()
        lastFrameTime = currentTime
      }

      animationFrameId = requestAnimationFrame(loop)
    }

    animationFrameId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [hasCameraAccess, autoScanEnabled])

  // Draw bounding boxes - Optimized for smooth real-time rendering
  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) {
      if (config.app.isDevelopment) {
        console.debug('Canvas or video not available:', { canvas: !!canvas, video: !!video })
      }
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      if (config.app.isDevelopment) {
        console.debug('Canvas context not available')
      }
      return
    }

    // Sync canvas size with video
    const updateCanvasSize = () => {
      if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        if (config.app.isDevelopment) {
          console.debug('Canvas size updated:', { width: canvas.width, height: canvas.height, videoWidth: video.videoWidth, videoHeight: video.videoHeight })
        }
      }
    }
    
    updateCanvasSize()
    
    // Watch for video size changes
    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateCanvasSize)
      resizeObserver.observe(video)
    }

    let animationFrameId: number
    let lastDetections = detections

    const draw = () => {
      // Always update canvas size
      updateCanvasSize()
      
      // Always clear and redraw for smooth updates
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Check if detections changed
      const detectionsChanged = JSON.stringify(lastDetections) !== JSON.stringify(detections)
      if (detectionsChanged) {
        lastDetections = detections
        console.log('🎯 Detections updated:', {
          count: detections.length,
          detections: detections,
          canvasSize: { width: canvas.width, height: canvas.height },
          videoSize: { width: video.videoWidth, height: video.videoHeight }
        })
      }

      // Draw test box ALWAYS (for debugging visibility) - TOP RIGHT CORNER
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 3
      ctx.strokeRect(canvas.width - 200, 10, 190, 50)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.fillRect(canvas.width - 200, 10, 190, 50)
      ctx.fillStyle = '#00ff00'
      ctx.font = 'bold 16px sans-serif'
      ctx.fillText(`Detections: ${detections.length}`, canvas.width - 195, 30)
      ctx.fillText(`Canvas: ${canvas.width}x${canvas.height}`, canvas.width - 195, 50)

        detections.forEach((det: any, index: number) => {
          let x, y, w, h;
          let label = 'vehicle';
          let plateText = '';
          let confidence = det.confidence || 0;

          // Handle Gemini format (plate object with coordinates)
          if (det.plate?.coordinates) {
            const { x1, y1, x2, y2 } = det.plate.coordinates;
            if (x1 !== undefined && y2 !== undefined && x2 > x1 && y2 > y1) {
              x = x1;
              y = y1;
              w = x2 - x1;
              h = y2 - y1;
              plateText = det.ocr?.[0]?.text || '';
            }
          }
          // Handle legacy/YOLO/RFDETR format (bbox array: [x, y, width, height])
          else if (det.bbox && Array.isArray(det.bbox) && det.bbox.length >= 4) {
            [x, y, w, h] = det.bbox;
            label = det.type || det.class || 'vehicle';
            plateText = det.ocr?.[0]?.text || '';
            confidence = det.confidence || 0;
          }

          // Debug logging - ALWAYS log invalid detections
          if (x === undefined || w === undefined || w <= 0 || h <= 0) {
            console.warn(`❌ Detection ${index} INVALID:`, {
              hasPlate: !!det.plate,
              hasBbox: !!det.bbox,
              bbox: det.bbox,
              x, y, w, h,
              det
            })
          }

          // Draw if we have valid dimensions
          if (x !== undefined && y !== undefined && w !== undefined && h !== undefined && w > 0 && h > 0) {
            // Coordinates are already scaled to original video size, just scale to canvas if needed
            const scaleX = canvas.width / (video.videoWidth || 1)
            const scaleY = canvas.height / (video.videoHeight || 1)
            
            const scaledX = x * scaleX
            const scaledY = y * scaleY
            const scaledW = w * scaleX
            const scaledH = h * scaleY

            console.log(`🎯 Drawing RED box ${index}:`, {
              original: { x, y, w, h },
              scaled: { x: scaledX, y: scaledY, w: scaledW, h: scaledH },
              scale: { scaleX, scaleY },
              label,
              plateText,
              confidence,
              canvas: { width: canvas.width, height: canvas.height },
              video: { width: video.videoWidth, height: video.videoHeight }
            })

            // Draw RED bounding box (like YOLO reference) - THICK AND VISIBLE
            ctx.strokeStyle = '#ff0000'  // Bright red color
            ctx.lineWidth = 4  // Thicker line
            ctx.setLineDash([])
            ctx.strokeRect(scaledX, scaledY, scaledW, scaledH)
            
            // Draw a second red stroke for extra visibility
            ctx.strokeStyle = '#ff0000'
            ctx.lineWidth = 2
            ctx.strokeRect(scaledX + 2, scaledY + 2, scaledW - 4, scaledH - 4)

            // Prepare label text: "VehicleType (LicensePlate)" or "VehicleType (Not visible)"
            const displayLabel = plateText 
              ? `${label} (${plateText})` 
              : `${label} (Not visible)`
            
            // Measure text for background sizing
            ctx.font = 'bold 16px sans-serif'
            const textMetrics = ctx.measureText(displayLabel)
            const textWidth = textMetrics.width
            const textHeight = 20
            const padding = 8

            // Draw black background for label (like YOLO reference)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
            ctx.fillRect(
              scaledX, 
              scaledY - textHeight - padding, 
              textWidth + (padding * 2), 
              textHeight + padding
            )

            // Draw white text on black background
            ctx.fillStyle = '#ffffff'
            ctx.font = 'bold 16px sans-serif'
            ctx.fillText(displayLabel, scaledX + padding, scaledY - padding - 2)

            // Draw confidence if available (smaller text below)
            if (confidence > 0) {
              const confText = `${Math.round(confidence * 100)}%`
              ctx.font = '12px sans-serif'
              const confWidth = ctx.measureText(confText).width
              
              ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
              ctx.fillRect(
                scaledX,
                scaledY + scaledH + 2,
                confWidth + 8,
                18
              )
              
              ctx.fillStyle = '#ffff00'
              ctx.fillText(confText, scaledX + 4, scaledY + scaledH + 15)
            }
          }
        })
      }

      animationFrameId = requestAnimationFrame(draw)
    }

    // Start drawing immediately
    draw()

    return () => {
      cancelAnimationFrame(animationFrameId)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
    }
  }, [detections, videoRef, canvasRef, hasCameraAccess])

  // Enable auto-scan on login
  useEffect(() => {
    if (hasCameraAccess) {
      setAutoScanEnabled(true)
    }
  }, [hasCameraAccess])

  // Process a License Plate (Manual or Auto)
  const processPlate = async (plate: string) => {
    if (!plate) return
    
    // Basic plate validation
    const cleanedPlate = plate.trim().toUpperCase()
    if (cleanedPlate.length < 3) {
      toast({
        title: "Plaque invalide",
        description: "La plaque d'immatriculation est trop courte.",
        variant: "destructive"
      })
      return
    }
    
    setIsScanning(true)

    try {
      const { data: vehicleData, error: vehicleError } = await supabase
        .from("vehicles")
        .select("*, driver:drivers(*)")
        .eq("plate_number", cleanedPlate)
        .single()
      
      if (vehicleError && vehicleError.code !== 'PGRST116') {
        throw vehicleError
      }

      if (vehicleData) {
        setVehicle(vehicleData as Vehicle)
        setDriver(vehicleData.driver as Driver)

        // Check Payment
        const today = new Date().toISOString().split("T")[0]
        const { data: payment, error: paymentError } = await supabase
          .from("daily_payments")
          .select("*")
          .eq("vehicle_id", vehicleData.id)
          .eq("payment_date", today)
          .single()

        if (paymentError && paymentError.code !== 'PGRST116') {
          if (config.app.isDevelopment) {
            console.error('Payment check error:', paymentError)
          }
        }

        setDailyPayment(payment as DailyPayment | null)

        // Alert
        if (payment) {
          playAlert("success")
          toast({ title: "Conforme", description: `Véhicule ${cleanedPlate} en règle.` })
        } else {
          playAlert("warning")
          toast({ title: "Alerte", description: `Véhicule ${cleanedPlate} NON PAYÉ !`, variant: "destructive" })
        }

        // Add to History
        setHistory(prev => [{
          ...vehicleData,
          paid: !!payment,
          time: new Date().toLocaleTimeString()
        }, ...prev.slice(0, 9)])

      } else {
        toast({ title: "Inconnu", description: "Véhicule non trouvé dans la base.", variant: "destructive" })
        setVehicle(null)
        setDriver(null)
        setDailyPayment(null)
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Erreur lors de la recherche du véhicule"
      if (config.app.isDevelopment) {
        console.error('Process plate error:', e)
      }
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsScanning(false)
    }
  }

  // --- Helper function for scanning ---
  const captureAndScan = async () => {
    if (!videoRef.current) return

    // Performance Optimization: Resize image before sending
    // Target max dimension: 800px (Sufficient for LPR, vastly reduces payload)
    const MAX_DIM = 800
    let width = videoRef.current.videoWidth
    let height = videoRef.current.videoHeight

    if (width > height) {
      if (width > MAX_DIM) {
        height = Math.round(height * (MAX_DIM / width))
        width = MAX_DIM
      }
    } else {
      if (height > MAX_DIM) {
        width = Math.round(width * (MAX_DIM / height))
        height = MAX_DIM
      }
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw resized image
    ctx.drawImage(videoRef.current, 0, 0, width, height)

    // Wrap in promise to await completion
    return new Promise<void>((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) { resolve(); return }

        const formData = new FormData()
        formData.append('image', blob)
        // CRITICAL: Disable saving to disk for auto-scans to reduce I/O latency
        formData.append('save_image', 'false')

        try {
          const res = await fetch(config.api.visionApiEndpoint, { method: 'POST', body: formData })
          if (res.ok) {
            const data = await res.json()
            const plate = data.detections?.[0]?.ocr?.[0]?.text
            if (plate) {
              setSearchQuery(plate)
              processPlate(plate)
            }
          }
        } catch (e) {
          console.error('Capture and scan error:', e)
        }
        resolve()
      }, 'image/jpeg', 0.6) // Lower quality for faster upload
    })
  }

  // --- Auto-Scan Loop (Recursive, waits for previous scan) ---
  // Optimized to work in harmony with bounding box detection
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    let isMounted = true
    let isScanning = false
    let lastPlateProcessed = ''
    let lastProcessTime = 0
    const MIN_PROCESS_INTERVAL = 2000 // Process same plate max once per 2 seconds

    const runScan = async () => {
      // Base checks
      if (!autoScanEnabled || !hasCameraAccess || !videoRef.current || !isMounted || isScanning) return

      // Throttle: Don't process if we just processed this plate
      const now = Date.now()
      if (now - lastProcessTime < MIN_PROCESS_INTERVAL) {
        if (isMounted && autoScanEnabled) {
          timeoutId = setTimeout(runScan, 1000)
        }
        return
      }

      isScanning = true
      try {
        await captureAndScan()
        lastProcessTime = Date.now()
      } catch (error) {
        if (config.app.isDevelopment) {
          console.error("Scan error:", error)
        }
      } finally {
        isScanning = false
        // Schedule next scan ONLY after current one finishes
        if (isMounted && autoScanEnabled) {
          timeoutId = setTimeout(runScan, 1500) // Slightly longer interval to avoid conflicts with detection
        }
      }
    }

    if (autoScanEnabled && hasCameraAccess) {
      // Small delay to let bounding box detection start first
      timeoutId = setTimeout(runScan, 500)
    }

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [autoScanEnabled, hasCameraAccess])

  // Realtime Subscription
  useEffect(() => {
    const channel = supabase.channel('live-scans').on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'scan_events' },
      (payload) => {
        if (payload.new?.plate_text) {
          setSearchQuery(payload.new.plate_text)
          processPlate(payload.new.plate_text)
        }
      }
    ).subscribe()
    
    return () => {
      supabase.removeChannel(channel).catch(console.error)
    }
  }, [supabase])

  const handleMarkAsPaid = async () => {
    if (!vehicle) return
    setIsProcessing(true)
    try {
      const today = new Date().toISOString().split("T")[0]
      const { error } = await supabase.from("daily_payments").insert({
        vehicle_id: vehicle.id,
        payment_date: today,
        amount: 500,
        is_paid: true
      })
      if (error) throw error
      setDailyPayment({ id: "temp", vehicle_id: vehicle.id, payment_date: today, amount: 500, is_paid: true } as any)
      playAlert("success")
      toast({ title: "Payé", description: "Paiement enregistré avec succès." })

      // Update history
      setHistory(prev => prev.map(h => h.id === vehicle.id ? { ...h, paid: true } : h))
    } catch (e) {
      toast({ title: "Erreur", description: "Échec du paiement.", variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col font-sans overflow-hidden">

      {/* Header */}
      <header className="h-16 shrink-0 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-950">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-yellow-500/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide">TaxiGuard Vision</h1>
            <p className="text-[10px] text-zinc-500 font-mono">OP: {operator.badge_number}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-zinc-500 hover:text-white">
          <LogOut className="w-4 h-4 mr-2" /> Déconnexion
        </Button>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 p-4 grid grid-cols-12 gap-4 overflow-hidden h-full">

        {/* Left Column: Camera Feed (7 cols) */}
        <div className="col-span-12 lg:col-span-7 flex flex-col h-full">
          <div className="relative flex-1 bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            {/* Video Feed */}
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

            {/* Canvas Overlay for Bounding Boxes */}
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ 
                zIndex: 10,
                imageRendering: 'pixelated' // Ensure crisp rendering
              }}
            />

            {/* Status Badge Overlay */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full border border-white/10 flex items-center gap-2" style={{ zIndex: 20 }}>
              <div className={`w-2 h-2 rounded-full ${autoScanEnabled ? 'bg-green-500 animate-pulse' : 'bg-zinc-500'}`} />
              <span className="text-xs font-bold tracking-wide text-white/80">
                {autoScanEnabled ? 'SCAN AUTO' : 'SCAN MANUEL'}
              </span>
            </div>

            {/* Mobile Controls Overlay */}
            <div className="absolute bottom-4 right-4" style={{ zIndex: 20 }}>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/10 hover:bg-white/20 text-white backdrop-blur border border-white/10"
                onClick={() => { initAudio(); setAutoScanEnabled(!autoScanEnabled) }}
              >
                <Zap className={`w-4 h-4 mr-2 ${autoScanEnabled ? 'text-yellow-400' : 'text-zinc-400'}`} />
                {autoScanEnabled ? 'Désactiver' : 'Activer Auto'}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Controls & Info (5 cols) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4 h-full">

          {/* 1. Manual Entry Card */}
          <div className="bg-zinc-900/50 border border-white/10 p-4 rounded-2xl flex gap-3 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
              <Input
                placeholder="ENTRER PLAQUE (EX: DK-1234-A)"
                className="pl-10 h-11 bg-black/50 border-white/10 font-mono text-lg uppercase tracking-wider focus-visible:ring-yellow-500/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && processPlate(searchQuery)}
              />
            </div>
            <Button size="lg" className="px-6 bg-white text-black hover:bg-zinc-200" onClick={() => processPlate(searchQuery)}>
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>

          {/* 2. Vehicle Status Card (Dynamic) */}
          <div className={`flex-1 rounded-2xl border transition-all duration-300 p-6 flex flex-col min-h-0 overflow-y-auto ${!vehicle ? 'bg-zinc-900/30 border-dashed border-white/10 justify-center items-center text-zinc-600' :
            dailyPayment ? 'bg-green-950/20 border-green-500/30' : 'bg-red-950/20 border-red-500/30'
            }`}>
            {!vehicle ? (
              <div className="text-center space-y-3">
                <Car className="w-12 h-12 mx-auto opacity-20" />
                <p className="text-sm font-medium">En attente de véhicule...</p>
              </div>
            ) : (
              <div className="flex flex-col h-full w-full">
                {/* Header: Plate & Status */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-4xl font-black font-mono tracking-tighter">{vehicle.plate_number}</h2>
                    <p className="text-zinc-400 text-sm mt-1">{vehicle.make} {vehicle.model}</p>
                  </div>
                  <Badge className={`px-3 py-1 text-sm ${dailyPayment ? 'bg-green-500/20 text-green-400 hover:bg-green-500/20' : 'bg-red-500/20 text-red-400 hover:bg-red-500/20'}`}>
                    {dailyPayment ? 'VALIDE' : 'NON PAYÉ'}
                  </Badge>
                </div>

                {/* Driver Info */}
                <div className="p-4 bg-black/20 rounded-xl mb-auto border border-white/5 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Chauffeur</span>
                    <span className="font-medium text-white">{driver?.full_name || 'Inconnu'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Licence</span>
                    <span className="font-mono text-white">{driver?.license_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Type</span>
                    <span className="text-white">{vehicle.type}</span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-6">
                  {dailyPayment ? (
                    <div className="w-full py-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center gap-2 text-green-400 font-bold">
                      <CheckCircle className="w-5 h-5" />
                      <span>Paiement Validé pour Aujourd'hui</span>
                    </div>
                  ) : (
                    <Button
                      className="w-full py-7 text-lg font-bold bg-white text-black hover:bg-zinc-200 shadow-xl"
                      onClick={handleMarkAsPaid}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'TRAITEMENT...' : 'RÉGULARISER MAINTENANT (500F)'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. Recent History (Compact) */}
          <div className="h-[200px] bg-zinc-900/30 rounded-2xl border border-white/10 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">
              <History className="w-3 h-3" /> Historique Récent
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {history.map((h, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-8 rounded-full ${h.paid ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="font-mono font-bold text-sm">{h.plate_number}</p>
                      <p className="text-[10px] text-zinc-500">{h.time}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${h.paid ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500'}`}>
                    {h.paid ? 'OK' : 'NON'}
                  </span>
                </div>
              ))}
              {history.length === 0 && (
                <div className="h-full flex items-center justify-center text-zinc-600 text-xs italic">
                  Aucun scan récent
                </div>
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  )
}
