export interface MessageEvent {
  type: 'new_message' | 'message_read' | 'conversation_updated';
  data: {
    conversationId: number;
    messageId?: number;
    senderId?: number;
    content?: string;
    timestamp: string;
  };
}

class MessageEventSystem {
  private eventListeners: Map<string, Function[]> = new Map();
  private storageKey = 'cgu-message-events';

  constructor() {
    // Listen for localStorage changes (cross-tab communication)
    window.addEventListener('storage', this.handleStorageEvent.bind(this));
    
    // Listen for same-tab events
    window.addEventListener('message-event', this.handleMessageEvent.bind(this));
  }

  // Emit a message event
  emit(event: MessageEvent) {
    // Store in localStorage for cross-tab communication
    const events = this.getStoredEvents();
    events.push({
      ...event,
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 events to prevent storage overflow
    if (events.length > 100) {
      events.splice(0, events.length - 100);
    }
    
    localStorage.setItem(this.storageKey, JSON.stringify(events));

    // Dispatch custom event for same-tab listeners
    const customEvent = new CustomEvent('message-event', { detail: event });
    window.dispatchEvent(customEvent);
  }

  // Subscribe to message events
  on(eventType: string, callback: Function) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  // Handle localStorage events (cross-tab)
  private handleStorageEvent(e: StorageEvent) {
    if (e.key === this.storageKey && e.newValue) {
      try {
        const events = JSON.parse(e.newValue);
        const lastEvent = events[events.length - 1];
        if (lastEvent) {
          this.notifyListeners(lastEvent);
        }
      } catch (error) {
        console.error('Error parsing message events:', error);
      }
    }
  }

  // Handle same-tab events
  private handleMessageEvent(e: CustomEvent) {
    this.notifyListeners(e.detail);
  }

  // Notify all listeners of an event
  private notifyListeners(event: MessageEvent) {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in message event listener:', error);
        }
      });
    }

    // Also notify 'all' listeners
    const allListeners = this.eventListeners.get('*');
    if (allListeners) {
      allListeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in message event listener:', error);
        }
      });
    }
  }

  // Get stored events
  private getStoredEvents(): any[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading stored events:', error);
      return [];
    }
  }

  // Clear old events
  clearEvents() {
    localStorage.removeItem(this.storageKey);
  }

  // Get unread message count for a user
  getUnreadCount(userId: number): number {
    // This will be implemented by calling the database service
    return 0;
  }
}

// Create singleton instance
export const messageEventSystem = new MessageEventSystem();

// React hook for listening to message events
import { useEffect, useCallback, useState } from 'react';

export const useMessageEvents = (eventType: string = '*', callback?: (event: MessageEvent) => void) => {
  const [events, setEvents] = useState<MessageEvent[]>([]);

  const eventCallback = useCallback((event: MessageEvent) => {
    setEvents(prev => [...prev, event]);
    if (callback) {
      callback(event);
    }
  }, [callback]);

  useEffect(() => {
    const unsubscribe = messageEventSystem.on(eventType, eventCallback);
    return unsubscribe;
  }, [eventType, eventCallback]);

  return events;
};

// React hook for real-time message updates
export const useRealtimeMessages = (conversationId: number | null) => {
  const [shouldRefresh, setShouldRefresh] = useState(false);

  useEffect(() => {
    if (!conversationId) return;

    const handleMessageEvent = (event: MessageEvent) => {
      if (event.data.conversationId === conversationId) {
        setShouldRefresh(true);
      }
    };

    const unsubscribe = messageEventSystem.on('new_message', handleMessageEvent);
    return unsubscribe;
  }, [conversationId]);

  const resetRefresh = useCallback(() => {
    setShouldRefresh(false);
  }, []);

  return { shouldRefresh, resetRefresh };
};

// React hook for unread message count
export const useUnreadCount = (userId: number | null) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    // Update count when messages are received
    const handleMessageEvent = (event: MessageEvent) => {
      if (event.type === 'new_message' && event.data.senderId !== userId) {
        setUnreadCount(prev => prev + 1);
      } else if (event.type === 'message_read') {
        // Refresh count from database
        updateUnreadCount();
      }
    };

    const updateUnreadCount = async () => {
      try {
        // Import here to avoid circular dependency
        const { dbService } = await import('@/database');
        const count = await dbService.getUnreadMessageCount(userId);
        setUnreadCount(count);
      } catch (error) {
        console.error('Error updating unread count:', error);
      }
    };

    // Initial count
    updateUnreadCount();

    // Polling to ensure badge updates reliably (fallback)
    const polling = setInterval(updateUnreadCount, 5000); // Check every 5 seconds

    const unsubscribe = messageEventSystem.on('*', handleMessageEvent);
    
    return () => {
      unsubscribe();
      clearInterval(polling);
    };
  }, [userId]);

  return unreadCount;
};