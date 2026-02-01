import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { dbService } from '@/database';

export const useUnreadNotifications = (userId: number | undefined | null) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const location = useLocation();

    const fetchUnreadCount = useCallback(async () => {
        if (!userId) {
            setUnreadCount(0);
            return;
        }
        try {
            const count = await dbService.getUnreadNotificationCount(userId);
            setUnreadCount(count);
        } catch (error) {
            console.error("Error fetching unread notifications:", error);
        }
    }, [userId]);

    // Initial fetch (covers "refresh the site" i.e., mount)
    useEffect(() => {
        fetchUnreadCount();
    }, [fetchUnreadCount]);

    // Fetch when visiting Home page
    useEffect(() => {
        if (location.pathname === '/') {
            fetchUnreadCount();
        }
    }, [location.pathname, fetchUnreadCount]);

    return unreadCount;
};
