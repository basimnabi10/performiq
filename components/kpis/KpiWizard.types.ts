export interface WizardTeam {
  id: string;
  name: string;
  memberCount: number;
}

export interface WizardCategory {
  id: string;
  name: string;
}

/** An existing KPI weight on a team, so the wizard can rebalance around it. */
export interface ExistingWeight {
  kpiTeamId: string;
  kpiId: string;
  teamId: string;
  kpiName: string;
  weightPct: number;
}

export type WeightMode = "auto" | "manual";
