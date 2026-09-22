/**
 * DREX state persistence boundary.
 *
 * VUA governs authorization, proof and mutation ordering; this boundary only
 * persists already-verified state. No DLT implementation is required here.
 */
import type { DrexAccountState } from '../types/drex.js';

export interface DrexStateStore {
  get(id: string): DrexAccountState | undefined;
  put(account: DrexAccountState): void;
  snapshot(): Map<string, DrexAccountState>;
}

const clone = (account: DrexAccountState): DrexAccountState => ({ ...account });

export class MapDrexStateStore implements DrexStateStore {
  private readonly accounts = new Map<string, DrexAccountState>();

  constructor(accounts: DrexAccountState[]) {
    for (const account of accounts) this.put(account);
  }

  get(id: string): DrexAccountState | undefined {
    const account = this.accounts.get(id);
    return account ? clone(account) : undefined;
  }

  put(account: DrexAccountState): void {
    this.accounts.set(account.id, clone(account));
  }

  snapshot(): Map<string, DrexAccountState> {
    return new Map([...this.accounts.entries()].map(([id, account]) => [id, clone(account)]));
  }
}

/**
 * A non-DLT append-log store used to prove that execution governance does not
 * depend on a particular ledger persistence mechanism.
 */
export class AppendLogDrexStateStore implements DrexStateStore {
  private readonly state = new Map<string, DrexAccountState>();
  private readonly mutations: DrexAccountState[] = [];

  constructor(accounts: DrexAccountState[]) {
    for (const account of accounts) this.state.set(account.id, clone(account));
  }

  get(id: string): DrexAccountState | undefined {
    const account = this.state.get(id);
    return account ? clone(account) : undefined;
  }

  put(account: DrexAccountState): void {
    const next = clone(account);
    this.mutations.push(next);
    this.state.set(next.id, next);
  }

  snapshot(): Map<string, DrexAccountState> {
    return new Map([...this.state.entries()].map(([id, account]) => [id, clone(account)]));
  }

  mutationCount(): number {
    return this.mutations.length;
  }
}
