import mongoose from 'mongoose';

const MemberSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  rank: { type: String, default: 'recruit' },
  contribution: { type: Number, default: 50000 },
  contributionSvc: { type: Number, default: 100 },
  hasPaid: { type: Boolean, default: false },
  joinDate: { type: String, default: () => new Date().toISOString() },
  order: { type: Number, default: 0 },
}, { timestamps: true });

const TransactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['cash', 'svc'], default: 'cash' },
  type: { type: String, enum: ['income', 'expense'], required: true },
  category: { type: String, default: 'operation' },
  addedBy: { type: String, default: 'Leader' },
  date: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

const ItemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, default: 0 },
  priceSvc: { type: Number, default: 0 },
  quantity: { type: Number, default: 0 },
  maxCapacity: { type: Number, default: 100 },
  category: { type: String, default: 'weapons' }, // weapons | ammo | armor | meds | tools | contraband | gear
  description: { type: String, default: '' },
  lastUpdated: { type: String, default: () => new Date().toISOString() },
  updatedBy: { type: String, default: 'Leader' },
}, { timestamps: true });

const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  memberId: { type: String, default: '' },
  memberName: { type: String, required: true },
  items: [{
    itemId: String,
    itemName: String,
    quantity: Number,
    price: Number,
    priceSvc: Number,
  }],
  totalAmount: { type: Number, required: true },
  currency: { type: String, enum: ['cash', 'svc'], default: 'cash' },
  status: { type: String, enum: ['pending', 'approved', 'completed', 'cancelled'], default: 'pending' },
  category: { type: String, default: 'gear' },
  orderDate: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

const StreamSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  memberName: { type: String, required: true },
  platform: { type: String, enum: ['kick', 'youtube', 'twitch'], required: true },
  channelSlug: { type: String, required: true },
  title: { type: String, default: '' },
  isLive: { type: Boolean, default: true },
  thumbnailUrl: { type: String, default: '' },
  viewers: { type: Number, default: 0 },
  addedBy: { type: String, default: 'system' },
  createdAt: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

const WeeklyRecordSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => `wk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  },
  memberId: { type: String, required: true },
  memberName: { type: String, required: true },
  weekStart: { type: String, required: true },
  weekEnd: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  contribution: { type: Number, required: true },
  contributionSvc: { type: Number, default: 100 },
  hasPaid: { type: Boolean, default: false },
  hasPaidSvc: { type: Boolean, default: false },
  paymentDate: { type: String },
  markedBy: { type: String, default: 'Leader' },
  markedAt: { type: String, default: () => new Date().toISOString() },
  notes: { type: String, default: '' },
}, { timestamps: true });

const AuditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  action: { type: String, required: true },
  category: { type: String, default: 'general' }, // members | dues | inventory | vault | streams | reset
  description: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  performedBy: { type: String, default: 'System' },
  timestamp: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

const GangFundSchema = new mongoose.Schema({
  id: { type: String, default: 'main', unique: true },
  baseAmount: { type: Number, default: 350000 },
  baseSvcAmount: { type: Number, default: 15000 },
  lastUpdated: { type: String, default: () => new Date().toISOString() },
  updatedBy: { type: String, default: 'system' },
}, { timestamps: true });

const AnnouncementSchema = new mongoose.Schema({
  id: { type: String, default: 'main', unique: true },
  text: { type: String, required: true },
  updatedBy: { type: String, default: 'RED COMMAND' },
  updatedAt: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

const CycleSchema = new mongoose.Schema({
  id: { type: String, default: 'main', unique: true },
  currentWeekNumber: { type: Number, default: 1 },
  cycleStartDate: { type: String, default: () => new Date().toISOString() },
  lastResetAt: { type: String, default: () => new Date().toISOString() },
  lastResetBy: { type: String, default: 'RED COMMAND' },
}, { timestamps: true });

const WarSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  rivalGang: { type: String, required: true },
  outcome: { type: String, enum: ['W', 'L'], default: 'W' },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  location: { type: String, default: 'South Los Santos' },
  score: { type: String, default: '' },
  summary: { type: String, default: '' },
  addedBy: { type: String, default: 'Red Leader' },
  povs: [{
    id: { type: String },
    operativeName: { type: String, required: true },
    title: { type: String, default: '' },
    url: { type: String, required: true },
    platform: { type: String, default: 'youtube' },
  }],
}, { timestamps: true });

export const MemberModel = mongoose.models.Member || mongoose.model('Member', MemberSchema);
export const TransactionModel = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
export const ItemModel = mongoose.models.Item || mongoose.model('Item', ItemSchema);
export const OrderModel = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export const StreamModel = mongoose.models.Stream || mongoose.model('Stream', StreamSchema);
export const WeeklyRecordModel = mongoose.models.WeeklyRecord || mongoose.model('WeeklyRecord', WeeklyRecordSchema);
export const AuditLogModel = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
export const GangFundModel = mongoose.models.GangFund || mongoose.model('GangFund', GangFundSchema);
export const AnnouncementModel = mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema);
export const CycleModel = mongoose.models.Cycle || mongoose.model('Cycle', CycleSchema);
export const WarModel = mongoose.models.War || mongoose.model('War', WarSchema);
