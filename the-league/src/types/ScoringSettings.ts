export interface ScoringSettings {
  id: number;
  leagueId: number;
  sport: string;
  
  // Quarterback Scoring
  passingYardsPerPoint: number;
  passingTouchdownPoints: number;
  passingInterceptionPoints: number;
  passingTwoPointConversion: number;
  
  // Rushing Scoring
  rushingYardsPerPoint: number;
  rushingTouchdownPoints: number;
  rushingTwoPointConversion: number;
  
  // Receiving Scoring
  receivingYardsPerPoint: number;
  receivingTouchdownPoints: number;
  receptionPoints: number;
  receivingTwoPointConversion: number;
  
  // General Offensive
  fumbleLostPoints: number;
  
  // Kicker Scoring
  extraPointPoints: number;
  fieldGoal0to39Points: number;
  fieldGoal40to49Points: number;
  fieldGoal50PlusPoints: number;
  missedExtraPointPoints: number;
  missedFieldGoalPoints: number;
  
  // Defense/Special Teams Scoring
  defenseTouchdownPoints: number;
  sackPoints: number;
  interceptionPoints: number;
  fumbleRecoveryPoints: number;
  safetyPoints: number;
  blockedKickPoints: number;
  
  // Defense Points Allowed
  defensePointsAllowed0Points: number;
  defensePointsAllowed1to6Points: number;
  defensePointsAllowed7to13Points: number;
  defensePointsAllowed14to20Points: number;
  defensePointsAllowed21to27Points: number;
  defensePointsAllowed28to34Points: number;
  defensePointsAllowed35PlusPoints: number;
  
  // Additional settings
  benchPoints: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScoringPreset {
  name: string;
  description: string;
  settings: Partial<ScoringSettings>;
}

export interface ScoringPresetsResponse {
  sport: string;
  presets: ScoringPreset[];
}

export type ScoringCategory = 
  | 'passing'
  | 'rushing' 
  | 'receiving'
  | 'kicking'
  | 'defense'
  | 'general';

export interface ScoringCategoryConfig {
  key: ScoringCategory;
  name: string;
  description: string;
  settings: Array<{
    key: keyof ScoringSettings;
    label: string;
    description: string;
    type: 'number' | 'decimal';
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
  }>;
}

// Yahoo Fantasy Football Default Values
export const YAHOO_NFL_DEFAULTS: Partial<ScoringSettings> = {
  sport: 'NFL',
  
  // Passing
  passingYardsPerPoint: 25,
  passingTouchdownPoints: 4,
  passingInterceptionPoints: -1,
  passingTwoPointConversion: 2,
  
  // Rushing
  rushingYardsPerPoint: 10,
  rushingTouchdownPoints: 6,
  rushingTwoPointConversion: 2,
  
  // Receiving (Half-PPR)
  receivingYardsPerPoint: 10,
  receivingTouchdownPoints: 6,
  receptionPoints: 0.5,
  receivingTwoPointConversion: 2,
  
  // General
  fumbleLostPoints: -2,
  
  // Kicking
  extraPointPoints: 1,
  fieldGoal0to39Points: 3,
  fieldGoal40to49Points: 4,
  fieldGoal50PlusPoints: 5,
  missedExtraPointPoints: -1,
  missedFieldGoalPoints: -1,
  
  // Defense
  defenseTouchdownPoints: 6,
  sackPoints: 1,
  interceptionPoints: 2,
  fumbleRecoveryPoints: 2,
  safetyPoints: 2,
  blockedKickPoints: 2,
  
  // Defense Points Allowed
  defensePointsAllowed0Points: 10,
  defensePointsAllowed1to6Points: 7,
  defensePointsAllowed7to13Points: 4,
  defensePointsAllowed14to20Points: 1,
  defensePointsAllowed21to27Points: 0,
  defensePointsAllowed28to34Points: -1,
  defensePointsAllowed35PlusPoints: -4,
  
  benchPoints: 0,
  isActive: true
};

// Scoring Categories Configuration
export const SCORING_CATEGORIES: ScoringCategoryConfig[] = [
  {
    key: 'passing',
    name: 'Passing',
    description: 'Quarterback passing statistics',
    settings: [
      {
        key: 'passingYardsPerPoint',
        label: 'Passing Yards',
        description: 'Yards needed for 1 point',
        type: 'number',
        min: 1,
        max: 100,
        suffix: 'yards = 1 pt'
      },
      {
        key: 'passingTouchdownPoints',
        label: 'Passing Touchdown',
        description: 'Points per passing TD',
        type: 'decimal',
        min: 0,
        max: 10,
        step: 0.5,
        suffix: 'pts'
      },
      {
        key: 'passingInterceptionPoints',
        label: 'Interception',
        description: 'Points lost per interception thrown',
        type: 'decimal',
        min: -5,
        max: 0,
        step: 0.5,
        suffix: 'pts'
      },
      {
        key: 'passingTwoPointConversion',
        label: '2-Point Conversion',
        description: 'Points for passing 2-point conversion',
        type: 'decimal',
        min: 0,
        max: 5,
        step: 0.5,
        suffix: 'pts'
      }
    ]
  },
  {
    key: 'rushing',
    name: 'Rushing',
    description: 'Running back and rushing statistics',
    settings: [
      {
        key: 'rushingYardsPerPoint',
        label: 'Rushing Yards',
        description: 'Yards needed for 1 point',
        type: 'number',
        min: 1,
        max: 50,
        suffix: 'yards = 1 pt'
      },
      {
        key: 'rushingTouchdownPoints',
        label: 'Rushing Touchdown',
        description: 'Points per rushing TD',
        type: 'decimal',
        min: 0,
        max: 10,
        step: 0.5,
        suffix: 'pts'
      },
      {
        key: 'rushingTwoPointConversion',
        label: '2-Point Conversion',
        description: 'Points for rushing 2-point conversion',
        type: 'decimal',
        min: 0,
        max: 5,
        step: 0.5,
        suffix: 'pts'
      }
    ]
  },
  {
    key: 'receiving',
    name: 'Receiving',
    description: 'Wide receiver and receiving statistics',
    settings: [
      {
        key: 'receivingYardsPerPoint',
        label: 'Receiving Yards',
        description: 'Yards needed for 1 point',
        type: 'number',
        min: 1,
        max: 50,
        suffix: 'yards = 1 pt'
      },
      {
        key: 'receivingTouchdownPoints',
        label: 'Receiving Touchdown',
        description: 'Points per receiving TD',
        type: 'decimal',
        min: 0,
        max: 10,
        step: 0.5,
        suffix: 'pts'
      },
      {
        key: 'receptionPoints',
        label: 'Reception',
        description: 'Points per reception (PPR setting)',
        type: 'decimal',
        min: 0,
        max: 2,
        step: 0.1,
        suffix: 'pts'
      },
      {
        key: 'receivingTwoPointConversion',
        label: '2-Point Conversion',
        description: 'Points for receiving 2-point conversion',
        type: 'decimal',
        min: 0,
        max: 5,
        step: 0.5,
        suffix: 'pts'
      }
    ]
  },
  {
    key: 'kicking',
    name: 'Kicking',
    description: 'Field goals and extra points',
    settings: [
      {
        key: 'extraPointPoints',
        label: 'Extra Point',
        description: 'Points per successful extra point',
        type: 'decimal',
        min: 0,
        max: 3,
        step: 0.5,
        suffix: 'pts'
      },
      {
        key: 'fieldGoal0to39Points',
        label: 'Field Goal 0-39 yards',
        description: 'Points for field goal 39 yards or less',
        type: 'decimal',
        min: 0,
        max: 5,
        step: 0.5,
        suffix: 'pts'
      },
      {
        key: 'fieldGoal40to49Points',
        label: 'Field Goal 40-49 yards',
        description: 'Points for field goal 40-49 yards',
        type: 'decimal',
        min: 0,
        max: 8,
        step: 0.5,
        suffix: 'pts'
      },
      {
        key: 'fieldGoal50PlusPoints',
        label: 'Field Goal 50+ yards',
        description: 'Points for field goal 50+ yards',
        type: 'decimal',
        min: 0,
        max: 10,
        step: 0.5,
        suffix: 'pts'
      }
    ]
  },
  {
    key: 'defense',
    name: 'Defense/Special Teams',
    description: 'Defensive and special teams statistics',
    settings: [
      {
        key: 'defenseTouchdownPoints',
        label: 'Defensive TD',
        description: 'Points for defensive/ST touchdowns',
        type: 'decimal',
        min: 0,
        max: 10,
        step: 0.5,
        suffix: 'pts'
      },
      {
        key: 'sackPoints',
        label: 'Sack',
        description: 'Points per sack',
        type: 'decimal',
        min: 0,
        max: 3,
        step: 0.5,
        suffix: 'pts'
      },
      {
        key: 'interceptionPoints',
        label: 'Interception',
        description: 'Points per defensive interception',
        type: 'decimal',
        min: 0,
        max: 5,
        step: 0.5,
        suffix: 'pts'
      },
      {
        key: 'fumbleRecoveryPoints',
        label: 'Fumble Recovery',
        description: 'Points per fumble recovery',
        type: 'decimal',
        min: 0,
        max: 5,
        step: 0.5,
        suffix: 'pts'
      },
      {
        key: 'safetyPoints',
        label: 'Safety',
        description: 'Points per safety',
        type: 'decimal',
        min: 0,
        max: 5,
        step: 0.5,
        suffix: 'pts'
      },
      {
        key: 'blockedKickPoints',
        label: 'Blocked Kick',
        description: 'Points per blocked kick',
        type: 'decimal',
        min: 0,
        max: 5,
        step: 0.5,
        suffix: 'pts'
      }
    ]
  },
  {
    key: 'general',
    name: 'General',
    description: 'Other scoring rules',
    settings: [
      {
        key: 'fumbleLostPoints',
        label: 'Fumble Lost',
        description: 'Points lost per fumble lost',
        type: 'decimal',
        min: -5,
        max: 0,
        step: 0.5,
        suffix: 'pts'
      }
    ]
  }
];