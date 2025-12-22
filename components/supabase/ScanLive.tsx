'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export default function ScanLive() {
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    // initial load: fetch recent events
    supabase
      .from('scan_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setEvents(data as any[])
      })

    // subscribe to INSERT events
    const channel = supabase
      .channel('public:scan_events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scan_events' },
        (payload) => {
          setEvents((prev) => [payload.new, ...prev].slice(0, 50))
        }
      )
      .subscribe()

    return () => {
      try {
        // cleanup subscription
        if (channel) {
          // @ts-ignore - supabase typings vary by version
          supabase.removeChannel(channel)
        }
      } catch (e) {
        // fallback for older supabase client
        // @ts-ignore
        channel.unsubscribe && channel.unsubscribe()
      }
    }
  }, [])

  return (
    <div className="p-4 bg-white/5 rounded-md text-sm">
      <h3 className="font-semibold mb-2">Live Scans</h3>
      <ul className="space-y-2 max-h-80 overflow-auto">
        {events.map((ev: any) => (
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
