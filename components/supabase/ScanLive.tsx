'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ScanEvent } from '@/lib/types'

export default function ScanLive() {
  const [events, setEvents] = useState<ScanEvent[]>([])
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    // initial load: fetch recent events
    supabase
      .from('scan_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching scan events:', error)
          return
        }
        if (data && mounted) {
          setEvents(data as ScanEvent[])
        }
      })

    // subscribe to INSERT events
    const channel = supabase
      .channel('public:scan_events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scan_events' },
        (payload) => {
          if (mounted) {
            setEvents((prev) => [payload.new as ScanEvent, ...prev].slice(0, 50))
          }
        }
      )
      .subscribe()

    return () => {
      mounted = false
      try {
        // cleanup subscription
        if (channel) {
          supabase.removeChannel(channel).catch(console.error)
        }
      } catch (e) {
        // fallback for older supabase client
        if (channel && typeof (channel as any).unsubscribe === 'function') {
          (channel as any).unsubscribe()
        }
      }
    }
  }, [supabase])

  return (
    <div className="p-4 bg-white/5 rounded-md text-sm">
      <h3 className="font-semibold mb-2">Live Scans</h3>
      <ul className="space-y-2 max-h-80 overflow-auto">
        {events.map((ev) => (
          <li key={ev.id} className="flex items-start gap-3">
            <div className="flex-1">
              <div className="text-xs text-gray-400">{new Date(ev.created_at).toLocaleString()}</div>
              <div className="text-white font-medium">{ev.plate_text || 'UNKNOWN'}</div>
              <div className="text-xs text-gray-300">{ev.checkpoint_status} • Paid: {String(ev.has_paid)}</div>
            </div>
            {ev.image_url && (
              <img src={ev.image_url} alt="capture" className="w-20 h-12 object-cover rounded" />
            )}
          </li>
        ))}
        {events.length === 0 && <li className="text-gray-400">No scans yet.</li>}
      </ul>
    </div>
  )
}
