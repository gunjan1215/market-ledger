import { Transaction } from './types';

export const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'demo-1',
    type: 'capital',
    amount: 150000,
    date: '2026-06-10',
    note: 'Initial broker account funding',
  },
  {
    id: 'demo-2',
    type: 'profit',
    amount: 12450,
    date: '2026-06-11',
    note: 'Nifty Options breakout strategy trade',
  },
  {
    id: 'demo-3',
    type: 'loss',
    amount: 4300,
    date: '2026-06-12',
    note: 'Auto stock stop-loss hit',
  },
  {
    id: 'demo-4',
    type: 'capital',
    amount: 50000,
    date: '2026-06-14',
    note: 'Secondary capital injection',
  },
  {
    id: 'demo-5',
    type: 'profit',
    amount: 24100,
    date: '2026-06-15',
    note: 'Swing trade on energy sector breakthrough',
  },
  {
    id: 'demo-6',
    type: 'withdraw',
    amount: 30000,
    date: '2026-06-17',
    note: 'Withdrew profit for personal reserve',
  },
  {
    id: 'demo-7',
    type: 'loss',
    amount: 2500,
    date: '2026-06-18',
    note: 'Slight slip on index options contract expiry',
  },
  {
    id: 'demo-8',
    type: 'profit',
    amount: 8900,
    date: '2026-06-19',
    note: 'Long position liquidation on tech stocks',
  },
];
