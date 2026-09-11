import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import {
  MemberModel,
  TransactionModel,
  ItemModel,
  OrderModel,
  StreamModel,
  WeeklyRecordModel,
  AuditLogModel,
  GangFundModel,
  AnnouncementModel,
  CycleModel,
  WarModel,
} from './models.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Starter Red Network Tactical Stash Items
const STARTER_ITEMS = [
  {
    id: 'item_wpn_1',
    name: 'Heavy Pistol .45',
    price: 3500,
    priceSvc: 35,
    quantity: 14,
    maxCapacity: 30,
    category: 'weapons',
    description: 'High caliber syndicate standard sidearm.',
    lastUpdated: nowIso(),
    updatedBy: 'Red Boss',
  },
  {
    id: 'item_wpn_2',
    name: 'Micro SMG 9mm',
    price: 8500,
    priceSvc: 85,
    quantity: 8,
    maxCapacity: 20,
    category: 'weapons',
    description: 'Rapid spray compact automatic for drive-bys.',
    lastUpdated: nowIso(),
    updatedBy: 'Red Boss',
  },
  {
    id: 'item_wpn_3',
    name: 'Special Carbine 5.56',
    price: 22000,
    priceSvc: 220,
    quantity: 4,
    maxCapacity: 10,
    category: 'weapons',
    description: 'Heavy duty tactical assault rifle for gang wars.',
    lastUpdated: nowIso(),
    updatedBy: 'Red Boss',
  },
  {
    id: 'item_ammo_1',
    name: '9mm Ammunition Box (250 rnds)',
    price: 1200,
    priceSvc: 12,
    quantity: 45,
    maxCapacity: 100,
    category: 'ammo',
    description: 'Pistol & SMG combat rounds.',
    lastUpdated: nowIso(),
    updatedBy: 'Underboss',
  },
  {
    id: 'item_ammo_2',
    name: '5.56mm Rifle Ammo Box (200 rnds)',
    price: 2400,
    priceSvc: 24,
    quantity: 28,
    maxCapacity: 80,
    category: 'ammo',
    description: 'High velocity penetration rounds.',
    lastUpdated: nowIso(),
    updatedBy: 'Underboss',
  },
  {
    id: 'item_armor_1',
    name: 'Tactical Heavy Body Armor',
    price: 3000,
    priceSvc: 30,
    quantity: 22,
    maxCapacity: 50,
    category: 'armor',
    description: 'Reinforced ballistic vest with Red Network insignia.',
    lastUpdated: nowIso(),
    updatedBy: 'Red Boss',
  },
  {
    id: 'item_med_1',
    name: 'Military Medkit',
    price: 1500,
    priceSvc: 15,
    quantity: 35,
    maxCapacity: 100,
    category: 'meds',
    description: 'Full trauma care kit for firefight stabilization.',
    lastUpdated: nowIso(),
    updatedBy: 'Underboss',
  },
  {
    id: 'item_med_2',
    name: 'Oxycodone Pills (x10)',
    price: 800,
    priceSvc: 8,
    quantity: 60,
    maxCapacity: 150,
    category: 'meds',
    description: 'Rapid pain relief & adrenaline booster.',
    lastUpdated: nowIso(),
    updatedBy: 'Enforcer',
  },
  {
    id: 'item_tool_1',
    name: 'Advanced Lockpick Set',
    price: 2500,
    priceSvc: 25,
    quantity: 18,
    maxCapacity: 40,
    category: 'tools',
    description: 'High grade tension wrenches for vehicle & door entry.',
    lastUpdated: nowIso(),
    updatedBy: 'Enforcer',
  },
  {
    id: 'item_tool_2',
    name: 'Thermite Breach Charge',
    price: 12500,
    priceSvc: 125,
    quantity: 5,
    maxCapacity: 15,
    category: 'tools',
    description: 'Incendiary compound for melting vault locks & security panels.',
    lastUpdated: nowIso(),
    updatedBy: 'Red Boss',
  },
  {
    id: 'item_tool_3',
    name: 'Encrypted Radio & GPS',
    price: 1800,
    priceSvc: 18,
    quantity: 20,
    maxCapacity: 30,
    category: 'tools',
    description: 'Secure frequency radio tuner for syndicate comms.',
    lastUpdated: nowIso(),
    updatedBy: 'Red Boss',
  },
  {
    id: 'item_contra_1',
    name: 'Red Kush Brick (1kg)',
    price: 15000,
    priceSvc: 150,
    quantity: 12,
    maxCapacity: 50,
    category: 'contraband',
    description: 'Syndicate grown high purity grade contraband.',
    lastUpdated: nowIso(),
    updatedBy: 'Red Boss',
  },
];

// Starter Red Network Gang Members
const STARTER_MEMBERS = [
  {
    id: 'rn_mem_1',
    name: 'Marcus "Red" Vance',
    alias: 'Vance',
    rank: 'leader',
    contribution: 50000,
    contributionSvc: 100,
    hasPaid: true,
    status: 'in-city',
    phone: '555-0101',
    discordId: '',
    joinDate: '2026-01-01',
    order: 1,
  },
  {
    id: 'rn_mem_2',
    name: 'Damian Cross',
    alias: 'Ghost',
    rank: 'underboss',
    contribution: 50000,
    contributionSvc: 100,
    hasPaid: true,
    status: 'active',
    phone: '555-0102',
    discordId: '',
    joinDate: '2026-01-15',
    order: 2,
  },
  {
    id: 'rn_mem_3',
    name: 'Jax "Trigger" Thorne',
    alias: 'Trigger',
    rank: 'enforcer',
    contribution: 50000,
    contributionSvc: 100,
    hasPaid: true,
    status: 'in-city',
    phone: '555-0103',
    discordId: '',
    joinDate: '2026-02-01',
    order: 3,
  },
  {
    id: 'rn_mem_4',
    name: 'Elena "Viper" Reyes',
    alias: 'Viper',
    rank: 'hitman',
    contribution: 50000,
    contributionSvc: 100,
    hasPaid: false,
    status: 'active',
    phone: '555-0104',
    discordId: '',
    joinDate: '2026-02-10',
    order: 4,
  },
  {
    id: 'rn_mem_5',
    name: 'Leo "Cortex" Morales',
    alias: 'Cortex',
    rank: 'soldier',
    contribution: 50000,
    contributionSvc: 100,
    hasPaid: true,
    status: 'active',
    phone: '555-0105',
    discordId: '',
    joinDate: '2026-03-01',
    order: 5,
  },
  {
    id: 'rn_mem_6',
    name: 'Ronnie Cole',
    alias: 'Rookie',
    rank: 'recruit',
    contribution: 50000,
    contributionSvc: 100,
    hasPaid: false,
    status: 'loa',
    phone: '555-0106',
    discordId: '',
    joinDate: '2026-03-04',
    order: 6,
  },
];

const STARTER_STREAMS = [
  {
    id: 'stream_rn_1',
    memberName: 'Lawrence "Vance" Williams',
    platform: 'kick',
    channelSlug: 'msdplays',
    title: '',
    isLive: false,
    thumbnailUrl: '',
    viewers: 0,
    addedBy: 'Leader',
    createdAt: nowIso(),
  },
  {
    id: 'stream_rn_2',
    memberName: 'Damian "Ghost" Cross',
    platform: 'kick',
    channelSlug: '8bit_goldy',
    title: '',
    isLive: false,
    thumbnailUrl: '',
    viewers: 0,
    addedBy: 'Leader',
    createdAt: nowIso(),
  },
  {
    id: 'stream_rn_3',
    memberName: 'Jax "Trigger" Thorne',
    platform: 'kick',
    channelSlug: '8bitheadflicker',
    title: '',
    isLive: false,
    thumbnailUrl: '',
    viewers: 0,
    addedBy: 'Trigger',
    createdAt: nowIso(),
  },
  {
    id: 'stream_rn_4',
    memberName: 'Elena "Viper" Reyes',
    platform: 'youtube',
    channelSlug: 'PRATEEKYT',
    title: '',
    isLive: false,
    thumbnailUrl: '',
    viewers: 0,
    addedBy: 'Viper',
    createdAt: nowIso(),
  },
  {
    id: 'stream_rn_5',
    memberName: 'Leo "Cortex" Morales',
    platform: 'kick',
    channelSlug: '8bit_rusherwow',
    title: '',
    isLive: false,
    thumbnailUrl: '',
    viewers: 0,
    addedBy: 'Leader',
    createdAt: nowIso(),
  },
  {
    id: 'stream_rn_6',
    memberName: 'Ronnie "Rookie" Cole',
    platform: 'kick',
    channelSlug: 'flashnxtgaming',
    title: '',
    isLive: false,
    thumbnailUrl: '',
    viewers: 0,
    addedBy: 'Leader',
    createdAt: nowIso(),
  },
];

const DEFAULT_ANNOUNCEMENT = {
  id: 'main',
  text: '🔴 RED NETWORK ALERT: Weekly dues are $50,000. All operatives report to Stash Warehouse for Syndicate Operations!',
  updatedBy: 'Red Command',
  updatedAt: nowIso(),
};

const DEFAULT_CYCLE = {
  id: 'main',
  currentWeekNumber: 1,
  cycleStartDate: nowIso(),
  lastResetAt: nowIso(),
  lastResetBy: 'RED COMMAND',
};

const STARTER_WARS = [
  {
    id: 'war_1',
    rivalGang: 'Ballas',
    outcome: 'W',
    date: '2026-03-05',
    location: 'Grove Street Cul-de-sac',
    score: 'RN 15 - 3 Ballas',
    summary: 'Full tactical wipeout of Ballas frontline after an ambush at Grove Street. Controlled all rooftops and secured the weapon crate.',
    addedBy: 'Red Leader',
    povs: [
      {
        id: 'pov_1_1',
        operativeName: 'Marcus "Red" Vance',
        title: 'Leader POV // Assault Lead & Flank',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        platform: 'youtube',
      },
      {
        id: 'pov_1_2',
        operativeName: 'Jax "Trigger" Thorne',
        title: 'Trigger POV // Heavy Sniper Overwatch',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        platform: 'youtube',
      },
    ],
  },
  {
    id: 'war_2',
    rivalGang: 'Los Santos Vagos',
    outcome: 'W',
    date: '2026-03-02',
    location: 'Rancho Projects',
    score: 'RN 12 - 5 Vagos',
    summary: 'Retaliation raid over stolen weapons shipment. Vagos compound breached and perimeter secured.',
    addedBy: 'Red Leader',
    povs: [
      {
        id: 'pov_2_1',
        operativeName: 'Dante "Ghost" Rossi',
        title: 'Ghost POV // Alleyway Push & SMG Spray',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        platform: 'youtube',
      },
    ],
  },
  {
    id: 'war_3',
    rivalGang: 'Marabunta Grande',
    outcome: 'L',
    date: '2026-02-24',
    location: 'El Burro Heights Oil Refinery',
    score: 'RN 6 - 9 Marabunta',
    summary: 'Night skirmish at oil tanks. Heavy police crossfire resulted in tactical call to disengage and regroup.',
    addedBy: 'Red Leader',
    povs: [
      {
        id: 'pov_3_1',
        operativeName: 'Elena "Viper" Reyes',
        title: 'Viper POV // Defensive Smoke & Extraction',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        platform: 'youtube',
      },
    ],
  },
];

function defaultDb() {
  return {
    members: [...STARTER_MEMBERS],
    transactions: [
      {
        id: 'tx_starter_1',
        description: 'Pacific Standard Bank Take',
        amount: 320000,
        currency: 'cash',
        type: 'income',
        category: 'heist',
        addedBy: 'Leader',
        date: nowIso().split('T')[0],
      },
      {
        id: 'tx_starter_2',
        description: 'Arsenal & Body Armor Restock',
        amount: 85000,
        currency: 'cash',
        type: 'expense',
        category: 'arsenal',
        addedBy: 'Underboss',
        date: nowIso().split('T')[0],
      },
      {
        id: 'tx_starter_3',
        description: 'Dark Web Crypto Laundering Pool',
        amount: 8500,
        currency: 'svc',
        type: 'income',
        category: 'crypto',
        addedBy: 'Leader',
        date: nowIso().split('T')[0],
      },
      {
        id: 'tx_starter_4',
        description: 'Encrypted Radio Node & Sat-Com Keys',
        amount: 1200,
        currency: 'svc',
        type: 'expense',
        category: 'tech',
        addedBy: 'Underboss',
        date: nowIso().split('T')[0],
      },
    ],
    items: [...STARTER_ITEMS],
    orders: [],
    streams: [...STARTER_STREAMS],
    wars: [...STARTER_WARS],
    weeklyPaymentRecords: [],
    auditLogs: [
      {
        id: 'log_init',
        action: 'system_initialized',
        category: 'system',
        description: 'Red Network Syndicate Mainframe Online.',
        details: { initDate: nowIso() },
        performedBy: 'System',
        timestamp: nowIso(),
      }
    ],
    cycle: { ...DEFAULT_CYCLE },
    gangFund: {
      id: 'main',
      baseAmount: 350000,
      baseSvcAmount: 15000,
      lastUpdated: nowIso(),
      updatedBy: 'system',
    },
    announcement: { ...DEFAULT_ANNOUNCEMENT },
  };
}

function load() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const fresh = defaultDb();
    persist(fresh);
    return fresh;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const merged = { ...defaultDb(), ...parsed };
    if (merged.gangFund && merged.gangFund.baseSvcAmount === undefined) {
      merged.gangFund.baseSvcAmount = 15000;
    }
    if (merged.members) {
      merged.members.forEach((m) => {
        if (m.contributionSvc === undefined) m.contributionSvc = 100;
      });
    }
    if (merged.items) {
      merged.items.forEach((i) => {
        if (i.priceSvc === undefined) i.priceSvc = Math.round((i.price || 0) / 100);
      });
    }
    return merged;
  } catch {
    const fresh = defaultDb();
    persist(fresh);
    return fresh;
  }
}

function persist(data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.copyFileSync(tmp, DB_PATH);
  try { fs.unlinkSync(tmp); } catch { }
}

let db = load();

function save() {
  persist(db);
}

export function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

export async function seedMongoIfEmpty() {
  if (!isMongoConnected()) return;
  try {
    const memCount = await MemberModel.countDocuments();
    if (memCount === 0) {
      await MemberModel.insertMany(STARTER_MEMBERS);
    }
    const itemCount = await ItemModel.countDocuments();
    if (itemCount === 0) {
      await ItemModel.insertMany(STARTER_ITEMS);
    }
    const fund = await GangFundModel.findOne({ id: 'main' });
    if (!fund) {
      await GangFundModel.create({
        id: 'main',
        baseAmount: 350000,
        lastUpdated: nowIso(),
        updatedBy: 'system',
      });
    }
    const ann = await AnnouncementModel.findOne({ id: 'main' });
    if (!ann) {
      await AnnouncementModel.create({ ...DEFAULT_ANNOUNCEMENT });
    }
    const cycle = await CycleModel.findOne({ id: 'main' });
    if (!cycle) {
      await CycleModel.create({ ...DEFAULT_CYCLE });
    }
  } catch (err) {
    console.error('Error seeding MongoDB Atlas collections:', err);
  }
}

function fundSnapshotLocal() {
  const cashIncome = (db.transactions || [])
    .filter((t) => (!t.currency || t.currency === 'cash') && t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const cashExpense = (db.transactions || [])
    .filter((t) => (!t.currency || t.currency === 'cash') && t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const svcIncome = (db.transactions || [])
    .filter((t) => t.currency === 'svc' && t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const svcExpense = (db.transactions || [])
    .filter((t) => t.currency === 'svc' && t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const baseAmount = Number(db.gangFund?.baseAmount ?? 350000);
  const baseSvcAmount = Number(db.gangFund?.baseSvcAmount ?? 15000);

  return {
    id: db.gangFund?.id || 'main',
    baseAmount,
    totalAmount: baseAmount + cashIncome - cashExpense,
    baseSvcAmount,
    totalSvcAmount: baseSvcAmount + svcIncome - svcExpense,
    lastUpdated: db.gangFund?.lastUpdated || nowIso(),
    updatedBy: db.gangFund?.updatedBy || 'system',
  };
}

async function fetchLiveStreamMetadata(platform, channelSlug, memberName) {
  let title = '';
  let thumbnailUrl = '';
  let viewers = 0;
  let isLive = false;

  const cleanSlug = (channelSlug || '').trim().replace(/^@/, '');

  if (platform === 'kick' && cleanSlug) {
    try {
      const kickRes = await fetch(`https://kick.com/api/v1/channels/${encodeURIComponent(cleanSlug)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      if (kickRes.ok) {
        const kickData = await kickRes.json();
        // Kick ONLY has .livestream when currently live
        if (kickData?.livestream) {
          isLive = true;
          title = kickData.livestream.session_title || '';
          thumbnailUrl = kickData.livestream.thumbnail?.url || kickData.user?.profile_pic || '';
          viewers = Number(kickData.livestream.viewer_count || 0);
        } else {
          // Channel is offline - do NOT show recent stream or previous_livestreams
          isLive = false;
          title = '';
          thumbnailUrl = '';
          viewers = 0;
        }
      }
    } catch (e) {
      // Ignore network failures
    }
  } else if (platform === 'youtube' && cleanSlug) {
    if (cleanSlug.length === 11) {
      try {
        const liveCheck = await fetch(`https://www.youtube.com/watch?v=${cleanSlug}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        const html = await liveCheck.text();
        const liveActive = html.includes('"isLive":true') || html.includes('"isLiveBroadcast":true');
        if (liveActive) {
          const ytRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${cleanSlug}&format=json`);
          if (ytRes.ok) {
            const ytData = await ytRes.json();
            title = ytData?.title || '';
            thumbnailUrl = ytData?.thumbnail_url || `https://img.youtube.com/vi/${cleanSlug}/hqdefault.jpg`;
            isLive = true;
          }
        } else {
          isLive = false;
          title = '';
          thumbnailUrl = '';
          viewers = 0;
        }
      } catch (e) {}
    } else {
      try {
        const liveRes = await fetch(`https://www.youtube.com/@${cleanSlug}/live`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          redirect: 'follow',
        });
        const html = await liveRes.text();
        const liveActive = html.includes('"isLive":true') || html.includes('"isLiveBroadcast":true');
        if (liveActive) {
          const vidMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
          if (vidMatch) {
            const oeRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vidMatch[1]}&format=json`);
            if (oeRes.ok) {
              const oe = await oeRes.json();
              title = oe.title || '';
              thumbnailUrl = oe.thumbnail_url || `https://img.youtube.com/vi/${vidMatch[1]}/hqdefault.jpg`;
              isLive = true;
            }
          }
        } else {
          // Channel is offline - do NOT show recent uploaded videos or past streams
          isLive = false;
          title = '';
          thumbnailUrl = '';
          viewers = 0;
        }
      } catch (e) {}
    }
  } else if (platform === 'twitch' && cleanSlug) {
    try {
      const [tRes, uRes, vRes, aRes] = await Promise.all([
        fetch(`https://decapi.me/twitch/title/${encodeURIComponent(cleanSlug)}`),
        fetch(`https://decapi.me/twitch/uptime/${encodeURIComponent(cleanSlug)}`),
        fetch(`https://decapi.me/twitch/viewercount/${encodeURIComponent(cleanSlug)}`),
        fetch(`https://decapi.me/twitch/avatar/${encodeURIComponent(cleanSlug)}`),
      ]);
      const t = (await tRes.text()).trim();
      const u = (await uRes.text()).trim();
      const v = (await vRes.text()).trim();
      const a = (await aRes.text()).trim();

      // Only live if uptime is active and not reporting offline
      if (u && !u.toLowerCase().includes('offline') && !u.toLowerCase().includes('not found')) {
        isLive = true;
        title = (t && !t.toLowerCase().includes('not found')) ? t : '';
        viewers = parseInt(v, 10) || 0;
        thumbnailUrl = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${cleanSlug}-640x360.jpg`;
      } else {
        // Channel is offline - do NOT show past broadcast title
        isLive = false;
        title = '';
        thumbnailUrl = '';
        viewers = 0;
      }
    } catch (e) {}
  }

  if (isLive && !title) {
    title = `${memberName} // Live Operation`;
  }

  return { title, thumbnailUrl, viewers, isLive };
}

export const store = {
  // --- Audit Logs ---
  async getAuditLogs() {
    if (isMongoConnected()) {
      return await AuditLogModel.find({}).sort({ timestamp: -1 }).limit(200).lean();
    }
    return [...(db.auditLogs || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  async addAuditLog(entry) {
    const logItem = {
      id: makeId('log'),
      action: entry.action || 'activity',
      category: entry.category || 'general',
      description: entry.description || '',
      details: entry.details || {},
      performedBy: entry.performedBy || 'System',
      timestamp: nowIso(),
    };
    if (isMongoConnected()) {
      return await AuditLogModel.create(logItem);
    }
    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.unshift(logItem);
    if (db.auditLogs.length > 500) db.auditLogs.length = 500;
    save();
    return logItem;
  },

  // --- Members ---
  async getMembers() {
    if (isMongoConnected()) {
      return await MemberModel.find({}).sort({ order: 1, createdAt: 1 }).lean();
    }
    return db.members || [];
  },

  async addMember(payload) {
    const member = {
      id: makeId('mem'),
      name: payload.name || 'New Operative',
      rank: payload.rank || 'recruit',
      contribution: Number(payload.contribution || 50000),
      contributionSvc: Number(payload.contributionSvc !== undefined ? payload.contributionSvc : 100),
      hasPaid: !!payload.hasPaid,
      joinDate: payload.joinDate || nowIso().split('T')[0],
      order: Number(payload.order || (db.members?.length || 0) + 1),
    };
    if (isMongoConnected()) {
      const created = await MemberModel.create(member);
      await this.addAuditLog({
        action: 'member_add',
        category: 'members',
        description: `Enlisted new member: ${member.name} (${member.rank.toUpperCase()})`,
        performedBy: payload.addedBy || 'Leader',
      });
      return created.toObject();
    }
    db.members.push(member);
    save();
    await this.addAuditLog({
      action: 'member_add',
      category: 'members',
      description: `Enlisted new member: ${member.name} (${member.rank.toUpperCase()})`,
      performedBy: payload.addedBy || 'Leader',
    });
    return member;
  },

  async updateMember(id, payload) {
    if (isMongoConnected()) {
      const updated = await MemberModel.findOneAndUpdate({ id }, { $set: payload }, { new: true }).lean();
      return updated;
    }
    const idx = db.members.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    db.members[idx] = { ...db.members[idx], ...payload };
    save();
    return db.members[idx];
  },

  async deleteMember(id, performedBy = 'Leader') {
    let deletedName = id;
    if (isMongoConnected()) {
      const found = await MemberModel.findOne({ id }).lean();
      if (found) deletedName = found.name;
      await MemberModel.deleteOne({ id });
    } else {
      const found = db.members.find((m) => m.id === id);
      if (found) deletedName = found.name;
      db.members = db.members.filter((m) => m.id !== id);
      save();
    }
    await this.addAuditLog({
      action: 'member_remove',
      category: 'members',
      description: `Discharged operative: ${deletedName}`,
      performedBy,
    });
    return true;
  },

  // --- Gang Inventory (Stash) ---
  async getItems() {
    if (isMongoConnected()) {
      return await ItemModel.find({}).sort({ category: 1, name: 1 }).lean();
    }
    return db.items || [];
  },

  async addItem(payload) {
    const item = {
      id: makeId('item'),
      name: payload.name || 'New Arsenal Asset',
      price: Number(payload.price || 0),
      priceSvc: Number(payload.priceSvc !== undefined ? payload.priceSvc : Math.round((payload.price || 0) / 100)),
      quantity: Number(payload.quantity || 0),
      maxCapacity: Number(payload.maxCapacity || 100),
      category: payload.category || 'weapons',
      description: payload.description || '',
      lastUpdated: nowIso(),
      updatedBy: payload.updatedBy || 'Leader',
    };
    if (isMongoConnected()) {
      const created = await ItemModel.create(item);
      await this.addAuditLog({
        action: 'inventory_add',
        category: 'inventory',
        description: `Added new stash asset: ${item.name} (${item.quantity} in stock)`,
        performedBy: item.updatedBy,
      });
      return created.toObject();
    }
    db.items.push(item);
    save();
    await this.addAuditLog({
      action: 'inventory_add',
      category: 'inventory',
      description: `Added new stash asset: ${item.name} (${item.quantity} in stock)`,
      performedBy: item.updatedBy,
    });
    return item;
  },

  async updateItem(id, payload) {
    const updateData = {
      ...payload,
      lastUpdated: nowIso(),
      updatedBy: payload.updatedBy || 'Leader',
    };
    if (isMongoConnected()) {
      const updated = await ItemModel.findOneAndUpdate({ id }, { $set: updateData }, { new: true }).lean();
      return updated;
    }
    const idx = db.items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const oldQty = db.items[idx].quantity;
    db.items[idx] = { ...db.items[idx], ...updateData };
    save();

    if (payload.quantity !== undefined && payload.quantity !== oldQty) {
      const diff = payload.quantity - oldQty;
      const sign = diff > 0 ? `+${diff}` : `${diff}`;
      await this.addAuditLog({
        action: 'inventory_stock_change',
        category: 'inventory',
        description: `Stash adjusted for ${db.items[idx].name}: ${sign} (Now: ${db.items[idx].quantity})`,
        performedBy: updateData.updatedBy,
      });
    }

    return db.items[idx];
  },

  async deleteItem(id, performedBy = 'Leader') {
    let itemName = id;
    if (isMongoConnected()) {
      const found = await ItemModel.findOne({ id }).lean();
      if (found) itemName = found.name;
      await ItemModel.deleteOne({ id });
    } else {
      const found = db.items.find((i) => i.id === id);
      if (found) itemName = found.name;
      db.items = db.items.filter((i) => i.id !== id);
      save();
    }
    await this.addAuditLog({
      action: 'inventory_delete',
      category: 'inventory',
      description: `Removed item from stash: ${itemName}`,
      performedBy,
    });
    return true;
  },

  // --- Orders ---
  async getOrders() {
    if (isMongoConnected()) {
      return await OrderModel.find({}).sort({ createdAt: -1 }).lean();
    }
    return db.orders || [];
  },

  async addOrder(payload) {
    const order = {
      id: makeId('order'),
      memberId: payload.memberId || '',
      memberName: payload.memberName || 'Operative',
      items: payload.items || [],
      totalAmount: Number(payload.totalAmount || 0),
      status: payload.status || 'pending',
      category: payload.category || 'gear',
      orderDate: payload.orderDate || nowIso(),
    };
    if (isMongoConnected()) {
      const created = await OrderModel.create(order);
      return created.toObject();
    }
    db.orders.unshift(order);
    save();
    return order;
  },

  async updateOrder(id, payload) {
    if (isMongoConnected()) {
      return await OrderModel.findOneAndUpdate({ id }, { $set: payload }, { new: true }).lean();
    }
    const idx = db.orders.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    db.orders[idx] = { ...db.orders[idx], ...payload };
    save();
    return db.orders[idx];
  },

  async deleteOrder(id) {
    if (isMongoConnected()) {
      await OrderModel.deleteOne({ id });
    } else {
      db.orders = db.orders.filter((o) => o.id !== id);
      save();
    }
    return true;
  },

  // --- Transactions & Vault ---
  async getTransactions() {
    if (isMongoConnected()) {
      return await TransactionModel.find({}).sort({ date: -1, createdAt: -1 }).lean();
    }
    return db.transactions || [];
  },

  async addTransaction(payload) {
    const currency = payload.currency === 'svc' ? 'svc' : 'cash';
    const tx = {
      id: makeId('tx'),
      description: payload.description || 'Syndicate Transaction',
      amount: Number(payload.amount || 0),
      currency,
      type: payload.type || 'expense',
      category: payload.category || 'operation',
      addedBy: payload.addedBy || 'Leader',
      date: payload.date || nowIso().split('T')[0],
    };
    const formattedAmount = currency === 'svc' ? `${tx.amount.toLocaleString()} SVC` : `$${tx.amount.toLocaleString()}`;
    if (isMongoConnected()) {
      const created = await TransactionModel.create(tx);
      await this.addAuditLog({
        action: 'vault_transaction',
        category: 'vault',
        description: `Vault ${tx.type.toUpperCase()}: ${formattedAmount} for "${tx.description}"`,
        performedBy: tx.addedBy,
      });
      return created.toObject();
    }
    db.transactions.unshift(tx);
    save();
    await this.addAuditLog({
      action: 'vault_transaction',
      category: 'vault',
      description: `Vault ${tx.type.toUpperCase()}: ${formattedAmount} for "${tx.description}"`,
      performedBy: tx.addedBy,
    });
    return tx;
  },

  async deleteTransaction(id) {
    if (isMongoConnected()) {
      await TransactionModel.deleteOne({ id });
    } else {
      db.transactions = db.transactions.filter((t) => t.id !== id);
      save();
    }
    return true;
  },

  // --- Gang Fund ---
  async getGangFund() {
    if (isMongoConnected()) {
      let fund = await GangFundModel.findOne({ id: 'main' }).lean();
      if (!fund) {
        fund = await GangFundModel.create({
          id: 'main',
          baseAmount: 350000,
          baseSvcAmount: 15000,
          updatedBy: 'system',
          lastUpdated: nowIso(),
        });
        fund = fund.toObject();
      }
      const txs = await TransactionModel.find({}).lean();
      const cashIncome = txs
        .filter((t) => (!t.currency || t.currency === 'cash') && t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const cashExpense = txs
        .filter((t) => (!t.currency || t.currency === 'cash') && t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const svcIncome = txs
        .filter((t) => t.currency === 'svc' && t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const svcExpense = txs
        .filter((t) => t.currency === 'svc' && t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const baseAmount = Number(fund.baseAmount ?? 350000);
      const baseSvcAmount = Number(fund.baseSvcAmount ?? 15000);

      return {
        ...fund,
        baseAmount,
        baseSvcAmount,
        totalAmount: baseAmount + cashIncome - cashExpense,
        totalSvcAmount: baseSvcAmount + svcIncome - svcExpense,
      };
    }
    return fundSnapshotLocal();
  },

  async updateGangFund(baseAmount, baseSvcAmount, updatedBy = 'system') {
    const amt = Number(baseAmount !== undefined ? baseAmount : 350000);
    const svcAmt = Number(baseSvcAmount !== undefined ? baseSvcAmount : 15000);
    if (isMongoConnected()) {
      const fund = await GangFundModel.findOneAndUpdate(
        { id: 'main' },
        { $set: { baseAmount: amt, baseSvcAmount: svcAmt, lastUpdated: nowIso(), updatedBy } },
        { new: true, upsert: true }
      ).lean();
      return await this.getGangFund();
    }
    if (!db.gangFund) db.gangFund = { id: 'main' };
    db.gangFund.baseAmount = amt;
    db.gangFund.baseSvcAmount = svcAmt;
    db.gangFund.lastUpdated = nowIso();
    db.gangFund.updatedBy = updatedBy;
    save();
    return fundSnapshotLocal();
  },

  // --- Weekly Payment Records & Reset Cycle ---
  async getWeeklyPaymentRecords() {
    if (isMongoConnected()) {
      return await WeeklyRecordModel.find({}).sort({ weekNumber: -1, createdAt: -1 }).lean();
    }
    return db.weeklyPaymentRecords || [];
  },

  async upsertWeeklyPaymentRecord(payload) {
    const { memberId, weekNumber } = payload;
    const updateData = {
      ...payload,
      markedAt: nowIso(),
    };

    let record;
    if (isMongoConnected()) {
      record = await WeeklyRecordModel.findOneAndUpdate(
        { memberId, weekNumber },
        { $set: updateData },
        { new: true, upsert: true }
      ).lean();
    } else {
      if (!db.weeklyPaymentRecords) db.weeklyPaymentRecords = [];
      const idx = db.weeklyPaymentRecords.findIndex(
        (r) => r.memberId === memberId && r.weekNumber === weekNumber
      );
      if (idx !== -1) {
        db.weeklyPaymentRecords[idx] = { ...db.weeklyPaymentRecords[idx], ...updateData };
        record = db.weeklyPaymentRecords[idx];
      } else {
        const item = {
          id: makeId('wk'),
          ...updateData,
        };
        db.weeklyPaymentRecords.push(item);
        record = item;
      }
      save();
    }

    // Also update member's hasPaid status if it's the current week
    const currentCycle = await this.getCycle();
    if (weekNumber === currentCycle.currentWeekNumber) {
      await this.updateMember(memberId, { hasPaid: !!payload.hasPaid });
    }

    // Record audit log
    const statusText = payload.hasPaid ? 'PAID' : 'PENDING';
    await this.addAuditLog({
      action: payload.hasPaid ? 'dues_paid' : 'dues_unpaid',
      category: 'dues',
      description: `Week ${weekNumber} dues marked as ${statusText} for ${payload.memberName || memberId} ($${(payload.contribution || 0).toLocaleString()})`,
      performedBy: payload.markedBy || 'Leader',
    });

    return record;
  },

  async deleteWeeklyPaymentRecord(id) {
    if (isMongoConnected()) {
      await WeeklyRecordModel.deleteOne({ id });
    } else {
      db.weeklyPaymentRecords = (db.weeklyPaymentRecords || []).filter((r) => r.id !== id);
      save();
    }
    return true;
  },

  // --- Cycle & Weekly Reset ---
  async getCycle() {
    if (isMongoConnected()) {
      let cycle = await CycleModel.findOne({ id: 'main' }).lean();
      if (!cycle) {
        cycle = await CycleModel.create({ ...DEFAULT_CYCLE });
        cycle = cycle.toObject();
      }
      return cycle;
    }
    return db.cycle || { ...DEFAULT_CYCLE };
  },

  async resetWeeklyCycle(performedBy = 'Leader') {
    const cycle = await this.getCycle();
    const currentWeekNumber = cycle.currentWeekNumber || 1;
    const members = await this.getMembers();

    const wStart = cycle.cycleStartDate || nowIso().split('T')[0];
    const wEnd = nowIso().split('T')[0];

    // 1. Snapshot all current members' status into weekly payment records for current week
    for (const m of members) {
      await this.upsertWeeklyPaymentRecord({
        memberId: m.id,
        memberName: m.name,
        weekNumber: currentWeekNumber,
        weekStart: wStart,
        weekEnd: wEnd,
        contribution: m.contribution || 50000,
        hasPaid: !!m.hasPaid,
        paymentDate: m.hasPaid ? nowIso().split('T')[0] : undefined,
        markedBy: performedBy,
        notes: `Archived during Week ${currentWeekNumber} reset`,
      });
    }

    // 2. Reset all members hasPaid to false for the fresh week
    if (isMongoConnected()) {
      await MemberModel.updateMany({}, { $set: { hasPaid: false } });
    } else {
      db.members = (db.members || []).map((m) => ({ ...m, hasPaid: false }));
    }

    // 3. Increment week number and update cycle timestamp
    const nextWeekNumber = currentWeekNumber + 1;
    const updatedCycle = {
      id: 'main',
      currentWeekNumber: nextWeekNumber,
      cycleStartDate: nowIso(),
      lastResetAt: nowIso(),
      lastResetBy: performedBy,
    };

    if (isMongoConnected()) {
      await CycleModel.findOneAndUpdate({ id: 'main' }, { $set: updatedCycle }, { new: true, upsert: true });
    } else {
      db.cycle = updatedCycle;
      save();
    }

    // 4. Record high-visibility audit log
    await this.addAuditLog({
      action: 'weekly_reset',
      category: 'reset',
      description: `Weekly Dues Cycle Reset: Concluded Week ${currentWeekNumber}. Activated Week ${nextWeekNumber} for all operatives.`,
      performedBy,
    });

    return {
      success: true,
      previousWeekNumber: currentWeekNumber,
      currentWeekNumber: nextWeekNumber,
      resetAt: nowIso(),
      resetBy: performedBy,
    };
  },

  // --- Streams ---
  async getStreams() {
    let list = [];
    if (isMongoConnected()) {
      list = await StreamModel.find({}).sort({ createdAt: -1 }).lean();
    } else {
      list = db.streams || [];
    }

    // Dynamically refresh live metadata for all registered streams so nothing is hardcoded
    const refreshed = await Promise.all(
      list.map(async (s) => {
        try {
          const live = await fetchLiveStreamMetadata(s.platform, s.channelSlug, s.memberName);
          return {
            ...s,
            title: live.isLive ? live.title : '',
            thumbnailUrl: live.isLive ? live.thumbnailUrl : '',
            viewers: live.isLive ? (live.viewers || 0) : 0,
            isLive: !!live.isLive,
          };
        } catch {
          return {
            ...s,
            title: '',
            thumbnailUrl: '',
            viewers: 0,
            isLive: false,
          };
        }
      })
    );

    return refreshed;
  },

  async addStream(payload) {
    const platform = payload.platform || 'kick';
    const channelSlug = payload.channelSlug || '';
    const memberName = payload.memberName || 'Operative';

    const liveMeta = await fetchLiveStreamMetadata(platform, channelSlug, memberName);

    const stream = {
      id: makeId('stream'),
      memberName,
      platform,
      channelSlug,
      title: liveMeta.title,
      isLive: liveMeta.isLive,
      thumbnailUrl: payload.thumbnailUrl || liveMeta.thumbnailUrl,
      viewers: Number(payload.viewers || liveMeta.viewers),
      addedBy: payload.addedBy || 'Operative',
      createdAt: nowIso(),
    };
    if (isMongoConnected()) {
      const created = await StreamModel.create(stream);
      await this.addAuditLog({
        action: 'stream_add',
        category: 'streams',
        description: `Broadcast feed linked for ${stream.memberName} (${stream.platform.toUpperCase()}: ${stream.channelSlug})`,
        performedBy: stream.addedBy,
      });
      return created.toObject();
    }
    db.streams.unshift(stream);
    save();
    await this.addAuditLog({
      action: 'stream_add',
      category: 'streams',
      description: `Broadcast feed linked for ${stream.memberName} (${stream.platform.toUpperCase()}: ${stream.channelSlug})`,
      performedBy: stream.addedBy,
    });
    return stream;
  },

  async updateStream(id, payload, performedBy = 'Operative') {
    let existing;
    if (isMongoConnected()) {
      existing = await StreamModel.findOne({ id }).lean();
    } else {
      existing = (db.streams || []).find((s) => s.id === id);
    }
    if (!existing) throw new Error('Stream feed not found');

    const platform = payload.platform || existing.platform;
    const channelSlug = payload.channelSlug !== undefined ? payload.channelSlug : existing.channelSlug;
    const memberName = payload.memberName || existing.memberName;

    const liveMeta = await fetchLiveStreamMetadata(platform, channelSlug, memberName);

    const updatedData = {
      ...existing,
      memberName,
      platform,
      channelSlug,
      title: liveMeta.title,
      isLive: liveMeta.isLive,
      thumbnailUrl: payload.thumbnailUrl || liveMeta.thumbnailUrl,
      viewers: Number(payload.viewers || liveMeta.viewers),
      updatedAt: nowIso(),
    };

    if (isMongoConnected()) {
      const updated = await StreamModel.findOneAndUpdate(
        { id },
        { $set: updatedData },
        { new: true }
      ).lean();
      await this.addAuditLog({
        action: 'stream_update',
        category: 'streams',
        description: `Broadcast feed updated for ${memberName} (${platform.toUpperCase()}: ${channelSlug})`,
        performedBy,
      });
      return updated;
    }

    const index = (db.streams || []).findIndex((s) => s.id === id);
    if (index !== -1) {
      db.streams[index] = updatedData;
      save();
    }
    await this.addAuditLog({
      action: 'stream_update',
      category: 'streams',
      description: `Broadcast feed updated for ${memberName} (${platform.toUpperCase()}: ${channelSlug})`,
      performedBy,
    });
    return updatedData;
  },

  async deleteStream(id, performedBy = 'Leader') {
    if (isMongoConnected()) {
      await StreamModel.deleteOne({ id });
    } else {
      db.streams = (db.streams || []).filter((s) => s.id !== id);
      save();
    }
    await this.addAuditLog({
      action: 'stream_remove',
      category: 'streams',
      description: `Broadcast feed removed`,
      performedBy,
    });
    return true;
  },

  // --- Announcement ---
  async getAnnouncement() {
    if (isMongoConnected()) {
      let ann = await AnnouncementModel.findOne({ id: 'main' }).lean();
      if (!ann) {
        ann = await AnnouncementModel.create({ ...DEFAULT_ANNOUNCEMENT });
        ann = ann.toObject();
      }
      return ann;
    }
    return db.announcement || { ...DEFAULT_ANNOUNCEMENT };
  },

  async updateAnnouncement(text, updatedBy = 'RED COMMAND') {
    const annData = {
      id: 'main',
      text: text || '',
      updatedBy,
      updatedAt: nowIso(),
    };
    if (isMongoConnected()) {
      const updated = await AnnouncementModel.findOneAndUpdate(
        { id: 'main' },
        { $set: annData },
        { new: true, upsert: true }
      ).lean();
      return updated;
    }
    db.announcement = annData;
    save();
    return annData;
  },

  // --- Gang Wars & POVs ---
  async getWars() {
    if (isMongoConnected()) {
      return await WarModel.find({}).sort({ date: -1, createdAt: -1 }).lean();
    }
    return db.wars || [...STARTER_WARS];
  },

  async addWar(payload) {
    const war = {
      id: makeId('war'),
      rivalGang: payload.rivalGang || 'Unknown Rival',
      outcome: payload.outcome === 'L' ? 'L' : 'W',
      date: payload.date || nowIso().split('T')[0],
      location: payload.location || 'South Los Santos',
      score: payload.score || '',
      summary: payload.summary || '',
      addedBy: payload.addedBy || 'Red Leader',
      povs: Array.isArray(payload.povs) ? payload.povs.map(p => ({
        id: p.id || makeId('pov'),
        operativeName: p.operativeName || 'Operative',
        title: p.title || 'War POV',
        url: p.url || '',
        platform: p.platform || 'youtube',
      })) : [],
    };
    if (isMongoConnected()) {
      const created = await WarModel.create(war);
      await this.addAuditLog({
        action: 'war_logged',
        category: 'wars',
        description: `Logged War vs ${war.rivalGang} [${war.outcome}]: ${war.location}`,
        performedBy: war.addedBy,
      });
      return created.toObject();
    }
    if (!db.wars) db.wars = [];
    db.wars.unshift(war);
    save();
    await this.addAuditLog({
      action: 'war_logged',
      category: 'wars',
      description: `Logged War vs ${war.rivalGang} [${war.outcome}]: ${war.location}`,
      performedBy: war.addedBy,
    });
    return war;
  },

  async updateWar(id, payload) {
    if (isMongoConnected()) {
      return await WarModel.findOneAndUpdate({ id }, { $set: payload }, { new: true }).lean();
    }
    if (!db.wars) db.wars = [];
    const idx = db.wars.findIndex((w) => w.id === id);
    if (idx === -1) return null;
    db.wars[idx] = { ...db.wars[idx], ...payload };
    save();
    return db.wars[idx];
  },

  async deleteWar(id, performedBy = 'Red Leader') {
    let rival = id;
    if (isMongoConnected()) {
      const found = await WarModel.findOne({ id }).lean();
      if (found) rival = found.rivalGang;
      await WarModel.deleteOne({ id });
    } else {
      if (!db.wars) db.wars = [];
      const found = db.wars.find((w) => w.id === id);
      if (found) rival = found.rivalGang;
      db.wars = db.wars.filter((w) => w.id !== id);
      save();
    }
    await this.addAuditLog({
      action: 'war_deleted',
      category: 'wars',
      description: `Deleted war record vs ${rival}`,
      performedBy,
    });
    return true;
  },
};
