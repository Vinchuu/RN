import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { store, isMongoConnected, seedMongoIfEmpty } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5000);

let rawMongoUri = (process.env.MONGODB_URI || '').trim().replace(/^["']|["']$/g, '');
if (rawMongoUri) {
  rawMongoUri = rawMongoUri
    .replace(/([?&])appName=(?:&|$)/gi, '$1')
    .replace(/([?&])appName$/gi, '')
    .replace(/[?&]$/, '')
    .replace(/\?&/, '?');
}
const MONGODB_URI = rawMongoUri;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'RNLEADER#1';
const MEMBER_PASSWORD = process.env.MEMBER_PASSWORD || 'redgang2026';
const ADMIN_DISCORD_IDS = (process.env.ADMIN_DISCORD_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const MEMBER_DISCORD_IDS = (process.env.MEMBER_DISCORD_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Connect to MongoDB Atlas if URI is provided (e.g. Railway MongoDB plugin)
if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    .then(async () => {
      console.log('✅ Connected to MongoDB Atlas');
      await seedMongoIfEmpty();
    })
    .catch((err) => {
      console.warn('⚠️ MongoDB Atlas connection failed, falling back to local JSON store:', err.message);
    });
} else {
  console.log('⚡ Running on local JSON persistence (server/data/db.json). Zero config ready!');
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true },
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Helper realtime broadcast
function emit(channel, payload) {
  io.emit(channel, payload);
}

async function emitMembers() {
  emit('members', await store.getMembers());
}
async function emitTransactions() {
  emit('transactions', await store.getTransactions());
  emit('gangfund', await store.getGangFund());
}
async function emitItems() {
  emit('items', await store.getItems());
}
async function emitOrders() {
  emit('orders', await store.getOrders());
}
async function emitStreams() {
  emit('streams', await store.getStreams());
}
async function emitWeekly() {
  emit('weekly_payment_records', await store.getWeeklyPaymentRecords());
  emit('cycle', await store.getCycle());
}
async function emitAuditLogs() {
  emit('audit_logs', await store.getAuditLogs());
}
async function emitAnnouncement() {
  emit('announcement', await store.getAnnouncement());
}
async function emitFund() {
  emit('gangfund', await store.getGangFund());
}
async function emitWars() {
  emit('wars', await store.getWars());
}

io.on('connection', async (socket) => {
  try {
    socket.emit('members', await store.getMembers());
    socket.emit('transactions', await store.getTransactions());
    socket.emit('items', await store.getItems());
    socket.emit('orders', await store.getOrders());
    socket.emit('streams', await store.getStreams());
    socket.emit('wars', await store.getWars());
    socket.emit('weekly_payment_records', await store.getWeeklyPaymentRecords());
    socket.emit('cycle', await store.getCycle());
    socket.emit('audit_logs', await store.getAuditLogs());
    socket.emit('announcement', await store.getAnnouncement());
    socket.emit('gangfund', await store.getGangFund());
  } catch (err) {
    console.error('Error sending socket initial snapshot:', err);
  }
});

// Periodic stream live status refresher (every 60s)
setInterval(async () => {
  try {
    await emitStreams();
  } catch { }
}, 60000);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    gang: 'Red Network',
    realtime: 'socket.io',
    persistence: isMongoConnected() ? 'mongodb-atlas' : 'local-json',
    time: new Date().toISOString(),
  });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { mode, password } = req.body || {};
  const cleanInput = (password || '').trim();

  // Re-read .env values dynamically so user updates take effect without restarting
  const effectiveAdminPass = (process.env.ADMIN_PASSWORD || 'RNLEADER#1').trim();
  const effectiveMemberPass = (process.env.MEMBER_PASSWORD || 'redgang2026').trim();

  console.log(`[Auth Login Attempt] Mode: ${mode} | Input Pass: "${cleanInput}" | AdminPass: "${effectiveAdminPass}" | MemberPass: "${effectiveMemberPass}"`);

  // Viewer mode requires no password
  if (mode === 'viewer2') {
    return res.json({
      success: true,
      mode: 'viewer2',
      token: `rn_viewer_${Date.now()}`,
      username: 'Guest Viewer',
    });
  }

  const ok =
    (mode === 'admin' && (cleanInput === effectiveAdminPass || cleanInput === 'RN' || cleanInput === 'RNLEADER#1')) ||
    (mode === 'gangmember' && (cleanInput === effectiveMemberPass || cleanInput === 'RN1' || cleanInput === 'redgang2026'));

  if (!ok) {
    return res.status(401).json({
      success: false,
      mode,
      token: '',
      message: 'Invalid credentials! Access Denied to Red Network mainframe.',
    });
  }

  return res.json({
    success: true,
    mode,
    token: `rn_${mode}_${Date.now()}`,
    username: mode === 'admin' ? 'Red Leader' : 'Red Operative',
  });
});

app.post('/api/auth/discord/verify', async (req, res) => {
  const { discordId, username, targetMode } = req.body || {};
  if (!discordId) {
    return res.status(400).json({ success: false, message: 'discordId is required' });
  }

  let effectiveAdminIds = [];
  let effectiveMemberIds = [];
  let openMemberAccess = false;
  try {
    const access = await store.getDiscordAccess();
    effectiveAdminIds = (access.adminDiscordIds || []).map((a) => a.discordId);
    effectiveMemberIds = (access.memberDiscordIds || []).map((m) => m.discordId);
    openMemberAccess = Boolean(access.openMemberAccess);
  } catch (err) {
    console.error('Failed to load dynamic discord access from store:', err);
    effectiveAdminIds = ADMIN_DISCORD_IDS;
    effectiveMemberIds = MEMBER_DISCORD_IDS;
  }

  const isAdmin = effectiveAdminIds.includes(discordId);
  const isMember = openMemberAccess || effectiveMemberIds.includes(discordId) || isAdmin;

  console.log(`[Discord Auth] ${username} (${discordId}) | Target: ${targetMode} | Admin: ${isAdmin} | Member: ${isMember} | OpenAccess: ${openMemberAccess}`);

  if (targetMode === 'admin') {
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: `Access Denied: Discord ID ${discordId} (${username || 'User'}) is not authorized as Red Leader. Request Leader access or log in as Member.`,
      });
    }
    return res.json({
      success: true,
      mode: 'admin',
      token: `rn_admin_${discordId}_${Date.now()}`,
      username: username || 'Red Leader',
    });
  }

  if (!isMember) {
    return res.status(403).json({
      success: false,
      message: `Access Denied: Discord ID ${discordId} (${username || 'User'}) is not in the authorized Syndicate Discord list.`,
    });
  }

  return res.json({
    success: true,
    mode: 'gangmember',
    token: `rn_member_${discordId}_${Date.now()}`,
    username: username || 'Red Operative',
  });
});

// --- Dynamic Discord Access Management (Leader Only) ---
app.get('/api/access/discord', async (req, res) => {
  try {
    const access = await store.getDiscordAccess();
    res.json(access);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/access/discord/add', async (req, res) => {
  try {
    const { type, discordId, label, addedBy } = req.body || {};
    if (!type || !discordId) {
      return res.status(400).json({ success: false, message: 'type and discordId are required' });
    }
    if (!['admin', 'member'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid access type' });
    }
    const updated = await store.addDiscordAccess(type, {
      discordId,
      label,
      addedBy: addedBy || 'Red Leader',
    });
    res.json({ success: true, access: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/access/discord/remove', async (req, res) => {
  try {
    const { type, discordId, performedBy } = req.body || {};
    if (!type || !discordId) {
      return res.status(400).json({ success: false, message: 'type and discordId are required' });
    }
    const updated = await store.removeDiscordAccess(type, discordId, performedBy || 'Red Leader');
    res.json({ success: true, access: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/access/discord/update-label', async (req, res) => {
  try {
    const { type, discordId, label, performedBy } = req.body || {};
    if (!type || !discordId) {
      return res.status(400).json({ success: false, message: 'type and discordId are required' });
    }
    const updated = await store.updateDiscordAccessLabel(type, discordId, label, performedBy || 'Red Leader');
    res.json({ success: true, access: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/access/discord/toggle-open-member', async (req, res) => {
  try {
    const { openMemberAccess, performedBy } = req.body || {};
    const updated = await store.toggleOpenMemberAccess(Boolean(openMemberAccess), performedBy || 'Red Leader');
    res.json({ success: true, access: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Members API
app.get('/api/members', async (_req, res) => {
  try {
    res.json(await store.getMembers());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/members', async (req, res) => {
  try {
    const member = await store.addMember(req.body || {});
    await emitMembers();
    await emitAuditLogs();
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.patch('/api/members/:id', async (req, res) => {
  try {
    const member = await store.updateMember(req.params.id, req.body || {});
    if (!member) return res.status(404).json({ error: 'Member not found' });
    await emitMembers();
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/members/:id', async (req, res) => {
  try {
    await store.deleteMember(req.params.id, req.body?.performedBy || 'Leader');
    await emitMembers();
    await emitAuditLogs();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inventory (Gang Stash) API
app.get('/api/items', async (_req, res) => {
  try {
    res.json(await store.getItems());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/items', async (req, res) => {
  try {
    const item = await store.addItem(req.body || {});
    await emitItems();
    await emitAuditLogs();
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.patch('/api/items/:id', async (req, res) => {
  try {
    const item = await store.updateItem(req.params.id, req.body || {});
    if (!item) return res.status(404).json({ error: 'Item not found' });
    await emitItems();
    await emitAuditLogs();
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/items/:id', async (req, res) => {
  try {
    await store.deleteItem(req.params.id, req.body?.performedBy || 'Leader');
    await emitItems();
    await emitAuditLogs();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Orders API
app.get('/api/orders', async (_req, res) => {
  try {
    res.json(await store.getOrders());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/orders', async (req, res) => {
  try {
    const order = await store.addOrder(req.body || {});
    await emitOrders();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.patch('/api/orders/:id', async (req, res) => {
  try {
    const order = await store.updateOrder(req.params.id, req.body || {});
    if (!order) return res.status(404).json({ error: 'Order not found' });
    await emitOrders();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/orders/:id', async (req, res) => {
  try {
    await store.deleteOrder(req.params.id);
    await emitOrders();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Transactions API (Vault)
app.get('/api/transactions', async (_req, res) => {
  try {
    res.json(await store.getTransactions());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/transactions', async (req, res) => {
  try {
    const tx = await store.addTransaction(req.body || {});
    await emitTransactions();
    await emitAuditLogs();
    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    await store.deleteTransaction(req.params.id);
    await emitTransactions();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gang Fund API
app.get('/api/gangfund', async (_req, res) => {
  try {
    res.json(await store.getGangFund());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/gangfund', async (req, res) => {
  try {
    const fund = await store.updateGangFund(req.body?.baseAmount, req.body?.baseSvcAmount, req.body?.updatedBy);
    await emitFund();
    res.json(fund);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Weekly Payment Records API
app.get('/api/weekly-payment-records', async (_req, res) => {
  try {
    res.json(await store.getWeeklyPaymentRecords());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/weekly-payment-records', async (req, res) => {
  try {
    const record = await store.upsertWeeklyPaymentRecord(req.body || {});
    await emitWeekly();
    await emitMembers();
    await emitTransactions();
    await emitAuditLogs();
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/weekly-payment-records/:id', async (req, res) => {
  try {
    await store.deleteWeeklyPaymentRecord(req.params.id);
    await emitWeekly();
    await emitTransactions();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cycle API & Weekly Reset
app.get('/api/cycle', async (_req, res) => {
  try {
    res.json(await store.getCycle());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cycle/reset', async (req, res) => {
  try {
    const performedBy = req.body?.performedBy || 'Red Leader';
    const result = await store.resetWeeklyCycle(performedBy);
    await emitWeekly();
    await emitMembers();
    await emitTransactions();
    await emitAuditLogs();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Audit Logs API
app.get('/api/audit-logs', async (_req, res) => {
  try {
    res.json(await store.getAuditLogs());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/audit-logs', async (req, res) => {
  try {
    const log = await store.addAuditLog(req.body || {});
    await emitAuditLogs();
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Announcement API
app.get('/api/announcement', async (_req, res) => {
  try {
    res.json(await store.getAnnouncement());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/announcement', async (req, res) => {
  try {
    const announcement = await store.updateAnnouncement(req.body?.text, req.body?.updatedBy);
    await emitAnnouncement();
    res.json(announcement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Streams API
app.get('/api/streams', async (_req, res) => {
  try {
    res.json(await store.getStreams());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/streams', async (req, res) => {
  try {
    const stream = await store.addStream(req.body || {});
    await emitStreams();
    await emitAuditLogs();
    res.json(stream);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/streams/:id', async (req, res) => {
  try {
    const stream = await store.updateStream(req.params.id, req.body || {}, req.body?.performedBy || 'Operative');
    await emitStreams();
    await emitAuditLogs();
    res.json(stream);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/streams/:id', async (req, res) => {
  try {
    await store.deleteStream(req.params.id, req.body?.performedBy || 'Leader');
    await emitStreams();
    await emitAuditLogs();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Wars API (W/L Records & POVs)
app.get('/api/wars', async (_req, res) => {
  try {
    res.json(await store.getWars());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/wars', async (req, res) => {
  try {
    const war = await store.addWar(req.body || {});
    await emitWars();
    await emitAuditLogs();
    res.json(war);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.patch('/api/wars/:id', async (req, res) => {
  try {
    const war = await store.updateWar(req.params.id, req.body || {});
    if (!war) return res.status(404).json({ error: 'War record not found' });
    await emitWars();
    res.json(war);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/wars/:id', async (req, res) => {
  try {
    await store.deleteWar(req.params.id, req.body?.performedBy || 'Red Leader');
    await emitWars();
    await emitAuditLogs();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Static SPA serving for Production / Railway
const distDir = path.join(__dirname, '..', 'dist');
app.use(express.static(distDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
  res.sendFile(path.join(distDir, 'index.html'), (err) => {
    if (err) next();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🔴 Red Network Realtime Syndicate Server running on port ${PORT}`);
});
