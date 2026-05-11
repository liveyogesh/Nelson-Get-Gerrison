import React, { useEffect } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth';

export default function NotificationListener() {
  const { user } = useAuthStore();

  useEffect(() => {
    // Determine the WS URL from the backend URL
    const socket = io(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:3001');

    socket.on('connect', () => {
      console.log('Connected to notification server');
      socket.emit('join_room', 'global_notifications'); 
    });

    socket.on('notification', (data) => {
      // Check filtering
      if (data.userId && user?.id !== data.userId) return;
      
      let hasRole = true;
      if (data.role && Array.isArray(data.role)) {
        hasRole = data.role.includes(user?.role);
      } else if (data.role && typeof data.role === 'string') {
        hasRole = user?.role === data.role;
      }
      
      if (!hasRole) return;

      if (data.type === 'error' || data.type === 'danger') {
        toast.error(`${data.title}: ${data.message}`, { duration: 6000 });
      } else if (data.type === 'warning') {
        toast((t) => (
          <div className="flex flex-col gap-1">
            <b className="text-orange-600">{data.title}</b>
            <span className="text-sm text-gray-700">{data.message}</span>
          </div>
        ), { duration: 6000, style: { border: '1px solid #fed7aa' } });
      } else {
        toast.success(`${data.title}: ${data.message}`, { duration: 5000 });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return null;
}
