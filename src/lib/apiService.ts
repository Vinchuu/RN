import { io, Socket } from 'socket.io-client';

export interface Member {
  id: string;
  name: string;
  rank?: string;
  contribution: number;
  contributionSvc?: number;
  hasPaid: boolean;
  joinDate: string;
  order: number;
}

export interface Announcement {
  id?: string;
  text: string;
  updatedBy: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  currency?: 'cash' | 'svc';
  date: string;
  type: 'income' | 'expense';
  category: string;
  addedBy?: string;
}

export interface Item {
  id: string;
  name: string;
  price: number;
  priceSvc?: number;
  quantity: number;
  maxCapacity?: number;
  category: 'weapons' | 'ammo' | 'armor' | 'meds' | 'tools' | 'contraband' | 'gear' | string;
  description?: string;
  lastUpdated?: string;
  updatedBy?: string;
}

export interface Order {
  id: string;
  memberId: string;
  memberName: string;
  items: {
    itemId: string;
    itemName: string;
    quantity: number;
    price: number;
    priceSvc?: number;
  }[];
  totalAmount: number;
  currency?: 'cash' | 'svc';
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  category?: string;
  orderDate: string;
}

export interface GangFund {
  id: string;
  baseAmount: number;
  totalAmount?: number;
  baseSvcAmount?: number;
  totalSvcAmount?: number;
  lastUpdated: string;
  updatedBy: string;
}

export interface WeeklyPaymentRecord {
  id: string;
  memberId: string;
  memberName: string;
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  contribution: number;
  contributionSvc?: number;
  hasPaid: boolean;
  hasPaidSvc?: boolean;
  paymentDate?: string;
  markedBy: string;
  markedAt: string;
  notes?: string;
}

export interface Cycle {
  id?: string;
  currentWeekNumber: number;
  cycleStartDate: string;
  lastResetAt: string;
  lastResetBy: string;
}

export interface AuditLog {
  id: string;
  action: string;
  category: 'members' | 'dues' | 'inventory' | 'vault' | 'streams' | 'reset' | 'system' | string;
  description: string;
  details?: Record<string, any>;
  performedBy: string;
  timestamp: string;
}

export interface StreamChannel {
  id: string;
  memberName: string;
  platform: 'kick' | 'youtube' | 'twitch';
  channelSlug: string;
  videoId?: string;
  title?: string;
  isLive?: boolean;
  addedBy: string;
  createdAt: string;
  thumbnailUrl?: string;
  viewers?: number;
  likes?: number;
  views?: number;
}

export interface WarPov {
  id?: string;
  operativeName: string;
  title?: string;
  url: string;
  platform?: 'youtube' | 'medal' | 'kick' | 'twitch' | 'streamable' | string;
}

export interface War {
  id: string;
  rivalGang: string;
  outcome: 'W' | 'L';
  date: string;
  location: string;
  score?: string;
  summary?: string;
  addedBy: string;
  povs: WarPov[];
}

const DEFAULT_ANNOUNCEMENT: Announcement = {
  text: '🔴 RED NETWORK ALERT: Weekly dues are $50,000. All operatives report to Stash Warehouse for Syndicate Operations!',
  updatedBy: 'Red Command',
  updatedAt: new Date().toISOString(),
};

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
      else if (body?.error) message = body.error;
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

let socketInstance: Socket | null = null;

function getSocket(): Socket {
  if (!socketInstance) {
    const socketUrl = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
    socketInstance = io(socketUrl || window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketInstance.on('connect', () => {
      console.log('🔴 Connected to Red Network Realtime Server');
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('Realtime Socket connection warning:', err.message);
    });
  }
  return socketInstance;
}

export const apiService = {
  // Members
  async getMembers(): Promise<Member[]> {
    return request<Member[]>('/api/members');
  },
  async addMember(member: Partial<Member>): Promise<Member> {
    return request<Member>('/api/members', { method: 'POST', body: JSON.stringify(member) });
  },
  async updateMember(id: string, updates: Partial<Member>): Promise<Member> {
    return request<Member>(`/api/members/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
  },
  async deleteMember(id: string, performedBy?: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/members/${id}`, { method: 'DELETE', body: JSON.stringify({ performedBy }) });
  },

  // Gang Stash Inventory
  async getItems(): Promise<Item[]> {
    return request<Item[]>('/api/items');
  },
  async addItem(item: Partial<Item>): Promise<Item> {
    return request<Item>('/api/items', { method: 'POST', body: JSON.stringify(item) });
  },
  async updateItem(id: string, updates: Partial<Item>): Promise<Item> {
    return request<Item>(`/api/items/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
  },
  async deleteItem(id: string, performedBy?: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/items/${id}`, { method: 'DELETE', body: JSON.stringify({ performedBy }) });
  },

  // Orders
  async getOrders(): Promise<Order[]> {
    return request<Order[]>('/api/orders');
  },
  async addOrder(order: Partial<Order>): Promise<Order> {
    return request<Order>('/api/orders', { method: 'POST', body: JSON.stringify(order) });
  },
  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    return request<Order>(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
  },
  async deleteOrder(id: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/orders/${id}`, { method: 'DELETE' });
  },

  // Transactions (Vault)
  async getTransactions(): Promise<Transaction[]> {
    return request<Transaction[]>('/api/transactions');
  },
  async addTransaction(tx: Partial<Transaction>): Promise<Transaction> {
    return request<Transaction>('/api/transactions', { method: 'POST', body: JSON.stringify(tx) });
  },
  async deleteTransaction(id: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/transactions/${id}`, { method: 'DELETE' });
  },

  // Gang Fund
  async getGangFund(): Promise<GangFund> {
    return request<GangFund>('/api/gangfund');
  },
  async updateGangFund(baseAmount: number, baseSvcAmount?: number, updatedBy?: string): Promise<GangFund> {
    return request<GangFund>('/api/gangfund', {
      method: 'PUT',
      body: JSON.stringify({ baseAmount, baseSvcAmount, updatedBy }),
    });
  },

  // Announcement
  async getAnnouncement(): Promise<Announcement> {
    try {
      return await request<Announcement>('/api/announcement');
    } catch {
      return DEFAULT_ANNOUNCEMENT;
    }
  },
  async updateAnnouncement(text: string, updatedBy?: string): Promise<Announcement> {
    return request<Announcement>('/api/announcement', {
      method: 'PUT',
      body: JSON.stringify({ text, updatedBy }),
    });
  },

  // Weekly Payment Records & Reset Cycle
  async getWeeklyPaymentRecords(): Promise<WeeklyPaymentRecord[]> {
    return request<WeeklyPaymentRecord[]>('/api/weekly-payment-records');
  },
  async upsertWeeklyPaymentRecord(rec: Partial<WeeklyPaymentRecord>): Promise<WeeklyPaymentRecord> {
    return request<WeeklyPaymentRecord>('/api/weekly-payment-records', {
      method: 'PUT',
      body: JSON.stringify(rec),
    });
  },
  async deleteWeeklyPaymentRecord(id: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/weekly-payment-records/${id}`, { method: 'DELETE' });
  },
  async getCycle(): Promise<Cycle> {
    return request<Cycle>('/api/cycle');
  },
  async resetWeeklyCycle(performedBy?: string): Promise<any> {
    return request<any>('/api/cycle/reset', {
      method: 'POST',
      body: JSON.stringify({ performedBy }),
    });
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    return request<AuditLog[]>('/api/audit-logs');
  },
  async addAuditLog(log: Partial<AuditLog>): Promise<AuditLog> {
    return request<AuditLog>('/api/audit-logs', {
      method: 'POST',
      body: JSON.stringify(log),
    });
  },

  // Streams
  async getStreams(): Promise<StreamChannel[]> {
    return request<StreamChannel[]>('/api/streams');
  },
  async addStream(stream: Partial<StreamChannel>): Promise<StreamChannel> {
    return request<StreamChannel>('/api/streams', {
      method: 'POST',
      body: JSON.stringify(stream),
    });
  },
  async updateStream(id: string, updates: Partial<StreamChannel>): Promise<StreamChannel> {
    return request<StreamChannel>(`/api/streams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
  async deleteStream(id: string, performedBy?: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/streams/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ performedBy }),
    });
  },

  // Wars & POVs
  async getWars(): Promise<War[]> {
    return request<War[]>('/api/wars');
  },
  async addWar(war: Partial<War>): Promise<War> {
    return request<War>('/api/wars', {
      method: 'POST',
      body: JSON.stringify(war),
    });
  },
  async updateWar(id: string, updates: Partial<War>): Promise<War> {
    return request<War>(`/api/wars/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },
  async deleteWar(id: string, performedBy?: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/wars/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ performedBy }),
    });
  },

  // Realtime Subscriptions
  subscribeToMembers(callback: (members: Member[]) => void): () => void {
    const s = getSocket();
    s.on('members', callback);
    return () => s.off('members', callback);
  },
  subscribeToItems(callback: (items: Item[]) => void): () => void {
    const s = getSocket();
    s.on('items', callback);
    return () => s.off('items', callback);
  },
  subscribeToOrders(callback: (orders: Order[]) => void): () => void {
    const s = getSocket();
    s.on('orders', callback);
    return () => s.off('orders', callback);
  },
  subscribeToTransactions(callback: (txs: Transaction[]) => void): () => void {
    const s = getSocket();
    s.on('transactions', callback);
    return () => s.off('transactions', callback);
  },
  subscribeToGangFund(callback: (fund: GangFund) => void): () => void {
    const s = getSocket();
    s.on('gangfund', callback);
    return () => s.off('gangfund', callback);
  },
  subscribeToWeeklyPaymentRecords(callback: (records: WeeklyPaymentRecord[]) => void): () => void {
    const s = getSocket();
    s.on('weekly_payment_records', callback);
    return () => s.off('weekly_payment_records', callback);
  },
  subscribeToCycle(callback: (cycle: Cycle) => void): () => void {
    const s = getSocket();
    s.on('cycle', callback);
    return () => s.off('cycle', callback);
  },
  subscribeToAuditLogs(callback: (logs: AuditLog[]) => void): () => void {
    const s = getSocket();
    s.on('audit_logs', callback);
    return () => s.off('audit_logs', callback);
  },
  subscribeToStreams(callback: (streams: StreamChannel[]) => void): () => void {
    const s = getSocket();
    s.on('streams', callback);
    return () => s.off('streams', callback);
  },
  subscribeToWars(callback: (wars: War[]) => void): () => void {
    const s = getSocket();
    s.on('wars', callback);
    return () => s.off('wars', callback);
  },
  subscribeToAnnouncement(callback: (ann: Announcement) => void): () => void {
    const s = getSocket();
    s.on('announcement', callback);
    return () => s.off('announcement', callback);
  },

  // Auth
  async login(mode: string, password?: string): Promise<{ success: boolean; mode?: string; token?: string; username?: string; message?: string }> {
    return request<{ success: boolean; mode?: string; token?: string; username?: string; message?: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ mode, password }),
      }
    );
  },
  async verifyDiscordUser(discordId: string, username: string, targetMode: string): Promise<{ success: boolean; mode?: string; token?: string; username?: string; message?: string }> {
    return request<{ success: boolean; mode?: string; token?: string; username?: string; message?: string }>(
      '/api/auth/discord/verify',
      {
        method: 'POST',
        body: JSON.stringify({ discordId, username, targetMode }),
      }
    );
  },
  getDiscordLoginUrl(targetMode: string): string {
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID || '1549427232827506739';
    if (!clientId) {
      return '#no_discord_client_id';
    }
    const redirectUri = encodeURIComponent(window.location.origin);
    const scope = encodeURIComponent('identify');
    return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}&state=${targetMode}`;
  },

  // --- Dynamic Discord Access Management (Leader Only) ---
  async getDiscordAccess(): Promise<{
    adminDiscordIds: { discordId: string; label?: string; addedBy?: string; addedAt?: string }[];
    memberDiscordIds: { discordId: string; label?: string; addedBy?: string; addedAt?: string }[];
    openMemberAccess: boolean;
  }> {
    return request('/api/access/discord');
  },

  async addDiscordAccess(
    type: 'admin' | 'member',
    discordId: string,
    label?: string,
    addedBy?: string
  ): Promise<{ success: boolean; access: any }> {
    return request('/api/access/discord/add', {
      method: 'POST',
      body: JSON.stringify({ type, discordId, label, addedBy }),
    });
  },

  async removeDiscordAccess(
    type: 'admin' | 'member',
    discordId: string,
    performedBy?: string
  ): Promise<{ success: boolean; access: any }> {
    return request('/api/access/discord/remove', {
      method: 'POST',
      body: JSON.stringify({ type, discordId, performedBy }),
    });
  },

  async updateDiscordAccessLabel(
    type: 'admin' | 'member',
    discordId: string,
    label: string,
    performedBy?: string
  ): Promise<{ success: boolean; access: any }> {
    return request('/api/access/discord/update-label', {
      method: 'POST',
      body: JSON.stringify({ type, discordId, label, performedBy }),
    });
  },

  async toggleOpenMemberAccess(
    openMemberAccess: boolean,
    performedBy?: string
  ): Promise<{ success: boolean; access: any }> {
    return request('/api/access/discord/toggle-open-member', {
      method: 'POST',
      body: JSON.stringify({ openMemberAccess, performedBy }),
    });
  },
};

