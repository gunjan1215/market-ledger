export type TransactionType = 'profit' | 'loss' | 'capital' | 'withdraw';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  note?: string;
}

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  locale: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  INR: { code: 'INR', symbol: '₹', locale: 'en-IN' },
  USD: { code: 'USD', symbol: '$', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB' },
};

export interface UserProfile {
  name: string;
  experience: 'Beginner' | 'Intermediate' | 'Professional';
  targetMonthlyProfit: number;
}
