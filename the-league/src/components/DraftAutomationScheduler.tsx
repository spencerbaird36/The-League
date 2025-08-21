import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Player } from '../types/Player';
import { DraftPick } from '../hooks/useDraftState';
import './DraftAutomationScheduler.css';

interface DraftAutomationSchedulerProps {
  leagueId?: number;
  userId?: number;
  picks: DraftPick[];
  draftOrder: number[];
  availablePlayers: Player[];
  currentPickNumber: number;
  isVisible: boolean;
  onToggle: () => void;
  onScheduleDraft: (schedule: DraftSchedule) => void;
  onConfigureAutopick: (config: AutopickConfig) => void;
  className?: string;
}

interface DraftSchedule {
  id: string;
  name: string;
  startTime: Date;
  timePerPick: number; // seconds
  pauseBetweenRounds: number; // minutes
  autoStart: boolean;
  notifications: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
    reminders: number[]; // hours before start
  };
  rules: {
    allowAutopick: boolean;
    maxAutopickTime: number;
    pauseOnManagerAbsence: boolean;
    continueWithAutopick: boolean;
  };
  recurring?: {
    enabled: boolean;
    frequency: 'weekly' | 'biweekly' | 'monthly';
    endDate?: Date;
  };
}

interface AutopickConfig {
  userId: number;
  enabled: boolean;
  strategy: 'bpa' | 'positional' | 'custom'; // best player available, positional need, custom rules
  positionPriorities: { position: string; priority: number; minCount: number; maxCount: number }[];
  playerPreferences: {
    avoided: string[]; // player IDs to avoid
    preferred: string[]; // player IDs to prefer
    teamAvoidance: string[]; // teams to avoid
    riskTolerance: 'conservative' | 'balanced' | 'aggressive';
  };
  advancedRules: {
    handcuffs: boolean; // draft backup RBs for owned RBs
    stackingPreference: 'none' | 'qb_wr' | 'team_stack';
    byeWeekConsideration: boolean;
    injuryHistory: boolean;
  };
  backupPlans: {
    fallbackStrategy: 'bpa' | 'random';
    emergencyTimeout: number; // seconds before fallback
  };
}

interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  timePerPick: number;
  totalDuration: number; // estimated minutes
  difficulty: 'casual' | 'standard' | 'expert';
  features: string[];
}

interface AutomationJob {
  id: string;
  type: 'scheduled_draft' | 'autopick' | 'reminder' | 'backup';
  status: 'pending' | 'running' | 'completed' | 'failed';
  scheduledFor: Date;
  details: any;
  progress?: number;
  lastRun?: Date;
  nextRun?: Date;
}

const DraftAutomationScheduler: React.FC<DraftAutomationSchedulerProps> = ({
  leagueId,
  userId,
  picks,
  draftOrder,
  availablePlayers,
  currentPickNumber,
  isVisible,
  onToggle,
  onScheduleDraft,
  onConfigureAutopick,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'autopick' | 'automation' | 'templates'>('schedule');
  const [scheduleForm, setScheduleForm] = useState<Partial<DraftSchedule>>({
    name: '',
    timePerPick: 90,
    pauseBetweenRounds: 2,
    autoStart: true,
    notifications: {
      email: true,
      sms: false,
      inApp: true,
      reminders: [24, 1] // 24 hours and 1 hour before
    },
    rules: {
      allowAutopick: true,
      maxAutopickTime: 30,
      pauseOnManagerAbsence: false,
      continueWithAutopick: true
    }
  });
  
  const [autopickConfig, setAutopickConfig] = useState<Partial<AutopickConfig>>({
    enabled: false,
    strategy: 'bpa',
    positionPriorities: [
      { position: 'QB', priority: 1, minCount: 1, maxCount: 2 },
      { position: 'RB', priority: 2, minCount: 2, maxCount: 4 },
      { position: 'WR', priority: 3, minCount: 2, maxCount: 5 },
      { position: 'TE', priority: 4, minCount: 1, maxCount: 2 },
      { position: 'K', priority: 5, minCount: 1, maxCount: 1 },
      { position: 'DEF', priority: 6, minCount: 1, maxCount: 1 }
    ],
    playerPreferences: {
      avoided: [],
      preferred: [],
      teamAvoidance: [],
      riskTolerance: 'balanced'
    },
    advancedRules: {
      handcuffs: false,
      stackingPreference: 'none',
      byeWeekConsideration: true,
      injuryHistory: true
    },
    backupPlans: {
      fallbackStrategy: 'bpa',
      emergencyTimeout: 10
    }
  });

  const [automationJobs, setAutomationJobs] = useState<AutomationJob[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);

  // Schedule templates
  const scheduleTemplates: ScheduleTemplate[] = useMemo(() => [
    {
      id: 'casual',
      name: 'Casual Draft',
      description: 'Relaxed pace, perfect for beginners',
      timePerPick: 120,
      totalDuration: 180,
      difficulty: 'casual',
      features: ['Extended time per pick', 'Autopick safety net', 'Email reminders']
    },
    {
      id: 'standard',
      name: 'Standard Draft',
      description: 'Balanced timing for most leagues',
      timePerPick: 90,
      totalDuration: 120,
      difficulty: 'standard',
      features: ['Standard timing', 'Chat enabled', 'Live updates']
    },
    {
      id: 'expert',
      name: 'Expert Draft',
      description: 'Fast-paced for experienced players',
      timePerPick: 60,
      totalDuration: 90,
      difficulty: 'expert',
      features: ['Quick decisions', 'Advanced analytics', 'No autopick safety net']
    },
    {
      id: 'lightning',
      name: 'Lightning Draft',
      description: 'Ultra-fast for draft experts',
      timePerPick: 30,
      totalDuration: 45,
      difficulty: 'expert',
      features: ['Rapid fire', 'Instant decisions', 'High intensity']
    }
  ], []);

  // Generate autopick recommendations based on current roster
  const autopickRecommendations = useMemo(() => {
    if (!userId) return [];
    
    const userPicks = picks.filter(pick => pick.userId === userId);
    const positionCounts = userPicks.reduce((acc, pick) => {
      acc[pick.playerPosition] = (acc[pick.playerPosition] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recommendations = [];
    
    // Analyze roster needs
    const totalPicks = userPicks.length;
    
    if (totalPicks < 3 && !positionCounts.RB) {
      recommendations.push({
        type: 'position_need',
        title: 'Draft RB Early',
        description: 'Running backs have high scarcity. Consider drafting in first 3 rounds.',
        priority: 'high'
      });
    }
    
    if (totalPicks >= 5 && !positionCounts.QB) {
      recommendations.push({
        type: 'position_need',
        title: 'Consider QB Soon',
        description: 'Mid-round QBs offer good value. Consider drafting in rounds 6-8.',
        priority: 'medium'
      });
    }
    
    if (totalPicks >= 8 && (!positionCounts.K || !positionCounts.DEF)) {
      recommendations.push({
        type: 'late_round',
        title: 'Fill Remaining Positions',
        description: 'Draft kicker and defense in final rounds.',
        priority: 'low'
      });
    }
    
    return recommendations;
  }, [picks, userId]);

  // Handle schedule creation
  const handleCreateSchedule = useCallback(async () => {
    if (!scheduleForm.name || !scheduleForm.startTime) {
      alert('Please fill in all required fields');
      return;
    }

    setIsScheduling(true);
    try {
      const schedule: DraftSchedule = {
        id: `schedule_${Date.now()}`,
        name: scheduleForm.name,
        startTime: scheduleForm.startTime,
        timePerPick: scheduleForm.timePerPick || 90,
        pauseBetweenRounds: scheduleForm.pauseBetweenRounds || 2,
        autoStart: scheduleForm.autoStart || false,
        notifications: scheduleForm.notifications || {
          email: true,
          sms: false,
          inApp: true,
          reminders: [24, 1]
        },
        rules: scheduleForm.rules || {
          allowAutopick: true,
          maxAutopickTime: 30,
          pauseOnManagerAbsence: false,
          continueWithAutopick: true
        }
      };

      // Add automation job
      const job: AutomationJob = {
        id: `job_${Date.now()}`,
        type: 'scheduled_draft',
        status: 'pending',
        scheduledFor: schedule.startTime,
        details: schedule,
        nextRun: schedule.startTime
      };

      setAutomationJobs(prev => [...prev, job]);
      onScheduleDraft(schedule);

      // Reset form
      setScheduleForm({
        name: '',
        timePerPick: 90,
        pauseBetweenRounds: 2,
        autoStart: true,
        notifications: {
          email: true,
          sms: false,
          inApp: true,
          reminders: [24, 1]
        },
        rules: {
          allowAutopick: true,
          maxAutopickTime: 30,
          pauseOnManagerAbsence: false,
          continueWithAutopick: true
        }
      });

      alert('Draft scheduled successfully!');
    } catch (error) {
      console.error('Failed to schedule draft:', error);
      alert('Failed to schedule draft. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  }, [scheduleForm, onScheduleDraft]);

  // Handle autopick configuration
  const handleSaveAutopickConfig = useCallback(() => {
    if (!userId || !autopickConfig) return;

    const config: AutopickConfig = {
      userId,
      enabled: autopickConfig.enabled || false,
      strategy: autopickConfig.strategy || 'bpa',
      positionPriorities: autopickConfig.positionPriorities || [],
      playerPreferences: autopickConfig.playerPreferences || {
        avoided: [],
        preferred: [],
        teamAvoidance: [],
        riskTolerance: 'balanced'
      },
      advancedRules: autopickConfig.advancedRules || {
        handcuffs: false,
        stackingPreference: 'none',
        byeWeekConsideration: true,
        injuryHistory: true
      },
      backupPlans: autopickConfig.backupPlans || {
        fallbackStrategy: 'bpa',
        emergencyTimeout: 10
      }
    };

    onConfigureAutopick(config);
    alert('Autopick configuration saved!');
  }, [userId, autopickConfig, onConfigureAutopick]);

  // Apply schedule template
  const applyTemplate = useCallback((template: ScheduleTemplate) => {
    setScheduleForm(prev => ({
      ...prev,
      name: `${template.name} - ${new Date().toLocaleDateString()}`,
      timePerPick: template.timePerPick,
      pauseBetweenRounds: template.difficulty === 'expert' ? 1 : 2,
      rules: {
        allowAutopick: template.difficulty !== 'expert',
        maxAutopickTime: Math.floor(template.timePerPick / 3),
        pauseOnManagerAbsence: prev.rules?.pauseOnManagerAbsence ?? false,
        continueWithAutopick: prev.rules?.continueWithAutopick ?? true
      }
    }));
    setActiveTab('schedule');
  }, []);

  if (!isVisible) {
    return (
      <div className="draft-automation-scheduler draft-automation-scheduler--collapsed">
        <button 
          className="automation-toggle"
          onClick={onToggle}
          title="Draft Automation & Scheduling"
        >
          ⚙️
          {automationJobs.filter(job => job.status === 'pending').length > 0 && (
            <span className="jobs-badge">
              {automationJobs.filter(job => job.status === 'pending').length}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={`draft-automation-scheduler draft-automation-scheduler--expanded ${className}`}>
      <div className="automation-header">
        <div className="automation-title">
          <h3>⚙️ Draft Automation & Scheduling</h3>
          <div className="automation-status">
            <span className="status-item">
              🕒 {automationJobs.filter(job => job.status === 'pending').length} scheduled
            </span>
            <span className="status-item">
              ⚡ {automationJobs.filter(job => job.status === 'running').length} active
            </span>
          </div>
        </div>
        
        <div className="automation-controls">
          <div className="automation-tabs">
            <button 
              className={`tab-button ${activeTab === 'schedule' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('schedule')}
            >
              📅 Schedule
            </button>
            <button 
              className={`tab-button ${activeTab === 'autopick' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('autopick')}
            >
              🤖 Autopick
            </button>
            <button 
              className={`tab-button ${activeTab === 'automation' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('automation')}
            >
              ⚙️ Jobs
            </button>
            <button 
              className={`tab-button ${activeTab === 'templates' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('templates')}
            >
              📋 Templates
            </button>
          </div>
          
          <button 
            className="automation-toggle"
            onClick={onToggle}
            title="Close Automation"
          >
            ✖
          </button>
        </div>
      </div>
      
      <div className="automation-content">
        {activeTab === 'schedule' && (
          <div className="schedule-tab">
            <div className="schedule-form">
              <h4>📅 Schedule New Draft</h4>
              
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="draft-name">Draft Name</label>
                  <input
                    id="draft-name"
                    type="text"
                    value={scheduleForm.name || ''}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter draft name..."
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="start-time">Start Time</label>
                  <input
                    id="start-time"
                    type="datetime-local"
                    value={scheduleForm.startTime ? scheduleForm.startTime.toISOString().slice(0, 16) : ''}
                    onChange={(e) => setScheduleForm(prev => ({ 
                      ...prev, 
                      startTime: new Date(e.target.value) 
                    }))}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="time-per-pick">Time Per Pick (seconds)</label>
                  <input
                    id="time-per-pick"
                    type="number"
                    min="30"
                    max="300"
                    value={scheduleForm.timePerPick || 90}
                    onChange={(e) => setScheduleForm(prev => ({ 
                      ...prev, 
                      timePerPick: parseInt(e.target.value) 
                    }))}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="pause-between-rounds">Pause Between Rounds (minutes)</label>
                  <input
                    id="pause-between-rounds"
                    type="number"
                    min="0"
                    max="10"
                    value={scheduleForm.pauseBetweenRounds || 2}
                    onChange={(e) => setScheduleForm(prev => ({ 
                      ...prev, 
                      pauseBetweenRounds: parseInt(e.target.value) 
                    }))}
                    className="form-input"
                  />
                </div>
              </div>
              
              <div className="form-section">
                <h5>Draft Rules</h5>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={scheduleForm.autoStart || false}
                      onChange={(e) => setScheduleForm(prev => ({ 
                        ...prev, 
                        autoStart: e.target.checked 
                      }))}
                    />
                    <span className="checkbox-text">Auto-start draft at scheduled time</span>
                  </label>
                  
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={scheduleForm.rules?.allowAutopick || false}
                      onChange={(e) => setScheduleForm(prev => ({ 
                        ...prev, 
                        rules: { 
                          allowAutopick: e.target.checked,
                          maxAutopickTime: prev.rules?.maxAutopickTime ?? 30,
                          pauseOnManagerAbsence: prev.rules?.pauseOnManagerAbsence ?? false,
                          continueWithAutopick: prev.rules?.continueWithAutopick ?? true
                        } 
                      }))}
                    />
                    <span className="checkbox-text">Allow autopick for inactive managers</span>
                  </label>
                  
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={scheduleForm.rules?.continueWithAutopick || false}
                      onChange={(e) => setScheduleForm(prev => ({ 
                        ...prev, 
                        rules: { 
                          allowAutopick: prev.rules?.allowAutopick ?? true,
                          maxAutopickTime: prev.rules?.maxAutopickTime ?? 30,
                          pauseOnManagerAbsence: prev.rules?.pauseOnManagerAbsence ?? false,
                          continueWithAutopick: e.target.checked
                        } 
                      }))}
                    />
                    <span className="checkbox-text">Continue draft with autopick if manager absent</span>
                  </label>
                </div>
              </div>
              
              <div className="form-section">
                <h5>Notifications</h5>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={scheduleForm.notifications?.email || false}
                      onChange={(e) => setScheduleForm(prev => ({ 
                        ...prev, 
                        notifications: { 
                          email: e.target.checked,
                          sms: prev.notifications?.sms ?? false,
                          inApp: prev.notifications?.inApp ?? true,
                          reminders: prev.notifications?.reminders ?? [24, 1]
                        } 
                      }))}
                    />
                    <span className="checkbox-text">Email notifications</span>
                  </label>
                  
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={scheduleForm.notifications?.inApp || false}
                      onChange={(e) => setScheduleForm(prev => ({ 
                        ...prev, 
                        notifications: { 
                          email: prev.notifications?.email ?? true,
                          sms: prev.notifications?.sms ?? false,
                          inApp: e.target.checked,
                          reminders: prev.notifications?.reminders ?? [24, 1]
                        } 
                      }))}
                    />
                    <span className="checkbox-text">In-app notifications</span>
                  </label>
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  className="schedule-btn"
                  onClick={handleCreateSchedule}
                  disabled={isScheduling || !scheduleForm.name || !scheduleForm.startTime}
                >
                  {isScheduling ? '⏳ Scheduling...' : '📅 Schedule Draft'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'autopick' && (
          <div className="autopick-tab">
            <div className="autopick-header">
              <h4>🤖 Autopick Configuration</h4>
              <div className="autopick-toggle">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={autopickConfig.enabled || false}
                    onChange={(e) => setAutopickConfig(prev => ({ 
                      ...prev, 
                      enabled: e.target.checked 
                    }))}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-label">Enable Autopick</span>
                </label>
              </div>
            </div>
            
            {autopickConfig.enabled && (
              <>
                <div className="strategy-selection">
                  <h5>Draft Strategy</h5>
                  <div className="strategy-options">
                    <label className="strategy-option">
                      <input
                        type="radio"
                        name="strategy"
                        value="bpa"
                        checked={autopickConfig.strategy === 'bpa'}
                        onChange={(e) => setAutopickConfig(prev => ({ 
                          ...prev, 
                          strategy: e.target.value as any 
                        }))}
                      />
                      <div className="strategy-card">
                        <div className="strategy-icon">⭐</div>
                        <div className="strategy-info">
                          <div className="strategy-name">Best Player Available</div>
                          <div className="strategy-desc">Always draft the highest-ranked available player</div>
                        </div>
                      </div>
                    </label>
                    
                    <label className="strategy-option">
                      <input
                        type="radio"
                        name="strategy"
                        value="positional"
                        checked={autopickConfig.strategy === 'positional'}
                        onChange={(e) => setAutopickConfig(prev => ({ 
                          ...prev, 
                          strategy: e.target.value as any 
                        }))}
                      />
                      <div className="strategy-card">
                        <div className="strategy-icon">🎯</div>
                        <div className="strategy-info">
                          <div className="strategy-name">Positional Need</div>
                          <div className="strategy-desc">Draft based on roster needs and position priorities</div>
                        </div>
                      </div>
                    </label>
                    
                    <label className="strategy-option">
                      <input
                        type="radio"
                        name="strategy"
                        value="custom"
                        checked={autopickConfig.strategy === 'custom'}
                        onChange={(e) => setAutopickConfig(prev => ({ 
                          ...prev, 
                          strategy: e.target.value as any 
                        }))}
                      />
                      <div className="strategy-card">
                        <div className="strategy-icon">⚙️</div>
                        <div className="strategy-info">
                          <div className="strategy-name">Custom Rules</div>
                          <div className="strategy-desc">Advanced strategy with custom rules and preferences</div>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
                
                {autopickConfig.strategy === 'positional' && (
                  <div className="position-priorities">
                    <h5>Position Priorities</h5>
                    <div className="priorities-list">
                      {autopickConfig.positionPriorities?.map((pos, index) => (
                        <div key={pos.position} className="priority-item">
                          <div className="position-name">{pos.position}</div>
                          <div className="priority-controls">
                            <label>
                              Priority:
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={pos.priority}
                                onChange={(e) => {
                                  const newPriorities = [...(autopickConfig.positionPriorities || [])];
                                  newPriorities[index].priority = parseInt(e.target.value);
                                  setAutopickConfig(prev => ({ 
                                    ...prev, 
                                    positionPriorities: newPriorities 
                                  }));
                                }}
                                className="priority-input"
                              />
                            </label>
                            <label>
                              Min:
                              <input
                                type="number"
                                min="0"
                                max="5"
                                value={pos.minCount}
                                onChange={(e) => {
                                  const newPriorities = [...(autopickConfig.positionPriorities || [])];
                                  newPriorities[index].minCount = parseInt(e.target.value);
                                  setAutopickConfig(prev => ({ 
                                    ...prev, 
                                    positionPriorities: newPriorities 
                                  }));
                                }}
                                className="priority-input"
                              />
                            </label>
                            <label>
                              Max:
                              <input
                                type="number"
                                min="1"
                                max="8"
                                value={pos.maxCount}
                                onChange={(e) => {
                                  const newPriorities = [...(autopickConfig.positionPriorities || [])];
                                  newPriorities[index].maxCount = parseInt(e.target.value);
                                  setAutopickConfig(prev => ({ 
                                    ...prev, 
                                    positionPriorities: newPriorities 
                                  }));
                                }}
                                className="priority-input"
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="autopick-recommendations">
                  <h5>💡 Recommendations</h5>
                  <div className="recommendations-list">
                    {autopickRecommendations.map((rec, index) => (
                      <div key={index} className={`recommendation-item recommendation-item--${rec.priority}`}>
                        <div className="recommendation-icon">
                          {rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'}
                        </div>
                        <div className="recommendation-content">
                          <div className="recommendation-title">{rec.title}</div>
                          <div className="recommendation-desc">{rec.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="autopick-actions">
                  <button 
                    className="save-config-btn"
                    onClick={handleSaveAutopickConfig}
                  >
                    💾 Save Configuration
                  </button>
                  <button 
                    className="test-autopick-btn"
                    onClick={() => alert('Testing autopick with current configuration...')}
                  >
                    🧪 Test Autopick
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        
        {activeTab === 'automation' && (
          <div className="automation-tab">
            <div className="jobs-header">
              <h4>⚙️ Automation Jobs</h4>
              <div className="jobs-summary">
                <span className="summary-item">
                  {automationJobs.filter(job => job.status === 'pending').length} pending
                </span>
                <span className="summary-item">
                  {automationJobs.filter(job => job.status === 'completed').length} completed
                </span>
              </div>
            </div>
            
            <div className="jobs-list">
              {automationJobs.length > 0 ? (
                automationJobs.map(job => (
                  <div key={job.id} className={`job-item job-item--${job.status}`}>
                    <div className="job-icon">
                      {job.type === 'scheduled_draft' ? '📅' :
                       job.type === 'autopick' ? '🤖' :
                       job.type === 'reminder' ? '🔔' : '💾'}
                    </div>
                    
                    <div className="job-details">
                      <div className="job-type">{job.type.replace('_', ' ').toUpperCase()}</div>
                      <div className="job-schedule">
                        Scheduled: {job.scheduledFor.toLocaleString()}
                      </div>
                      {job.progress !== undefined && (
                        <div className="job-progress">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                          <span className="progress-text">{job.progress}%</span>
                        </div>
                      )}
                    </div>
                    
                    <div className={`job-status job-status--${job.status}`}>
                      {job.status.toUpperCase()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-jobs">
                  <div className="empty-icon">⚙️</div>
                  <h4>No Automation Jobs</h4>
                  <p>Schedule drafts or configure autopick to see automation jobs here.</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'templates' && (
          <div className="templates-tab">
            <div className="templates-header">
              <h4>📋 Schedule Templates</h4>
              <p>Quick setup with pre-configured draft settings</p>
            </div>
            
            <div className="templates-grid">
              {scheduleTemplates.map(template => (
                <div key={template.id} className={`template-card template-card--${template.difficulty}`}>
                  <div className="template-header">
                    <div className="template-name">{template.name}</div>
                    <div className={`difficulty-badge difficulty-badge--${template.difficulty}`}>
                      {template.difficulty}
                    </div>
                  </div>
                  
                  <div className="template-description">{template.description}</div>
                  
                  <div className="template-stats">
                    <div className="stat-item">
                      <span className="stat-label">Time per pick:</span>
                      <span className="stat-value">{template.timePerPick}s</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Duration:</span>
                      <span className="stat-value">~{template.totalDuration}min</span>
                    </div>
                  </div>
                  
                  <div className="template-features">
                    {template.features.map((feature, index) => (
                      <span key={index} className="feature-tag">{feature}</span>
                    ))}
                  </div>
                  
                  <button 
                    className="use-template-btn"
                    onClick={() => applyTemplate(template)}
                  >
                    📋 Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DraftAutomationScheduler;