export type TransactionType = 'income' | 'expense';
export type PotTransactionType = 'deposit' | 'withdraw';
import {
  Briefcase,
  Laptop,
  TrendingUp,
  Store,
  Coins,
  Utensils,
  Car,
  ShoppingBag,
  FileText,
  Activity,
  Film,
  Book,
  Landmark,
  Banknote,
  Tag
} from 'lucide-react';

export type Category =
  | 'gaji'
  | 'freelance'
  | 'investasi'
  | 'bisnis'
  | 'lainnya_pemasukan'
  | 'makan'
  | 'transport'
  | 'belanja'
  | 'tagihan'
  | 'kesehatan'
  | 'hiburan'
  | 'pendidikan'
  | 'tabungan'
  | 'lainnya_pengeluaran';

export interface Transaction {
  id: string;
  userId: string;
  coupleId: string;
  type: TransactionType;
  category: Category;
  amount: number;
  description: string;
  date: string; // ISO string
  createdAt: string;
  addedBy: string; // user displayName
  relatedPotId?: string;
}


export interface MonthlyAllocation {
  id: string;
  coupleId: string;
  name: string;
  amountA: number;
  userIdA: string;
  amountB: number;
  userIdB: string;
  order: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  coupleId: string | null;
  partnerEmail: string | null;
  partnerName: string | null;
  partnerUid: string | null;
  inviteCode: string;
  gender: 'male' | 'female' | null;
  fcmTokens?: string[];
}

export interface CoupleData {
  id: string;
  members: string[]; // array of UIDs
  createdAt: string;
}

export const INCOME_CATEGORIES: { value: Category; label: string; icon: any }[] = [
  { value: 'gaji', label: 'Gaji', icon: Briefcase },
  { value: 'freelance', label: 'Freelance', icon: Laptop },
  { value: 'investasi', label: 'Investasi', icon: TrendingUp },
  { value: 'bisnis', label: 'Bisnis', icon: Store },
  { value: 'lainnya_pemasukan', label: 'Lainnya', icon: Coins },
];

export const EXPENSE_CATEGORIES: { value: Category; label: string; icon: any }[] = [
  { value: 'makan', label: 'Makan & Minum', icon: Utensils },
  { value: 'transport', label: 'Transportasi', icon: Car },
  { value: 'belanja', label: 'Belanja', icon: ShoppingBag },
  { value: 'tagihan', label: 'Tagihan', icon: FileText },
  { value: 'kesehatan', label: 'Kesehatan', icon: Activity },
  { value: 'hiburan', label: 'Hiburan', icon: Film },
  { value: 'pendidikan', label: 'Pendidikan', icon: Book },
  { value: 'tabungan', label: 'Tabungan', icon: Landmark },
  { value: 'lainnya_pengeluaran', label: 'Lainnya', icon: Banknote },
];

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

export function getCategoryInfo(cat: Category) {
  return ALL_CATEGORIES.find(c => c.value === cat) || { value: cat, label: cat, icon: Tag };
}

export const MAX_AMOUNT = 100_000_000;
export const MAX_POTS = 10;

export interface SavingsPot {
  id: string;
  coupleId: string;
  name: string;
  emoji: string;
  color: string; // hex color
  targetAmount?: number | null;
  currentBalance: number;
  createdAt: string;
  order: number;
}

export interface PotTransaction {
  id: string;
  potId: string;
  coupleId: string;
  type: PotTransactionType;
  amount: number;
  note: string;
  date: string;
  addedBy: string;
  createdAt: string;
}

export const POT_COLORS = [
  '#4F6F52', // Sage
  '#E6A4B4', // Rose
  '#7A9D54', // Olive
  '#8EACCD', // Blue
  '#C2A83E', // Gold
  '#9B72CF', // Purple
  '#E07B54', // Coral
  '#4AADA8', // Teal
  '#D4845A', // Terracotta
  '#5C7FA3', // Steel Blue
];

export const POT_EMOJIS = ['🍜', '🎁', '🏥', '🚗', '📚', '✈️', '🏠', '💎', '🎮', '👗', '💪', '🐾', '🎵', '🌱', '☕'];

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function parseRupiah(val: string): number {
  const nums = val.replace(/\D/g, '');
  return nums ? parseInt(nums) : 0;
}
