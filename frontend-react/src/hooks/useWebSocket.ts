import { useEffect, useRef } from 'react';

const WS_URL = 'ws://localhost:5000/ws';

export interface WebSocketMessage {
    type: string;
    payload: any;
}

export const useWebSocket = (onMessage: (message: WebSocketMessage) => void, userId?: number) => {
    const ws = useRef<WebSocket | null>(null);
    const onMessageRef = useRef(onMessage);

    // Update ref if handler changes to avoid reconnecting
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    useEffect(() => {
        if (!userId) return; // Wait for user ID

        let isUnmounted = false;

        const connect = () => {
            if (isUnmounted) return;

            ws.current = new WebSocket(`${WS_URL}?userId=${userId}`);

            ws.current.onopen = () => {
                console.log('WS Connected');
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    onMessageRef.current(data);
                } catch (e) {
                    // console.error("Failed to parse WS message", e);
                }
            };

            ws.current.onclose = () => {
                if (!isUnmounted) {
                    // console.log('WS Disconnected, reconnecting in 3s...');
                    setTimeout(connect, 3000);
                }
            };

            ws.current.onerror = () => {
                ws.current?.close();
            };
        };

        connect();

        return () => {
            isUnmounted = true;
            ws.current?.close();
        };
    }, [userId]);
};
