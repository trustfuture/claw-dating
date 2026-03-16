import { useEffect, useRef, useCallback, useState } from 'react'
import type { WSEvent, EventState } from '../types'

const WS_URL = `ws://${window.location.hostname}:8000/ws`

export function useWebSocket(onEvent: (event: WSEvent) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        setConnected(true)
      }

      ws.onmessage = (e) => {
        try {
          const event: WSEvent = JSON.parse(e.data)
          onEventRef.current(event)
        } catch (err) {
          console.error('Failed to parse WS message:', err)
        }
      }

      ws.onclose = () => {
        setConnected(false)
        setTimeout(connect, 2000)
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      wsRef.current?.close()
    }
  }, [])

  return { connected }
}
