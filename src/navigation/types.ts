import { Transaction } from '../types/models';

export type RootStackParamList = {
  Tabs: undefined;
  TransactionForm: { periodId: number; transaction?: Transaction };
  ReviewExtracted: { periodId: number };
  Settings: undefined;
};

export type TabParamList = {
  Home: undefined;
  Transactions: undefined;
  Reports: undefined;
};
