import React, { useState, useEffect } from 'react';
import { ScoringSettings, SCORING_CATEGORIES, ScoringCategory, YAHOO_NFL_DEFAULTS } from '../types/ScoringSettings';
import { scoringSettingsService } from '../services/scoringSettingsService';
import './ScoringSettingsSection.css';

interface ScoringSettingsSectionProps {
  leagueId: number;
  onSave?: (settings: ScoringSettings) => void;
}

const ScoringSettingsSection: React.FC<ScoringSettingsSectionProps> = ({ leagueId, onSave }) => {
  const [scoringSettings, setScoringSettings] = useState<ScoringSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [activeCategory, setActiveCategory] = useState<ScoringCategory>('passing');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<ScoringSettings | null>(null);

  useEffect(() => {
    loadScoringSettings();
  }, [leagueId]);

  const loadScoringSettings = async () => {
    try {
      setIsLoading(true);
      setSaveMessage(null);
      
      // Try to get existing settings, or create defaults
      const settings = await scoringSettingsService.ensureDefaultScoringSettings(leagueId);
      setScoringSettings(settings);
      setOriginalSettings({...settings});
      
      console.log('✅ Loaded scoring settings for league', leagueId);
    } catch (error) {
      console.error('❌ Failed to load scoring settings:', error);
      setSaveMessage({
        type: 'error',
        text: 'Failed to load scoring settings. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setSaveMessage(null);
    setHasUnsavedChanges(false);
  };

  const handleCancelEdit = () => {
    if (originalSettings) {
      setScoringSettings({...originalSettings});
    }
    setIsEditing(false);
    setHasUnsavedChanges(false);
    setSaveMessage(null);
  };

  const handleSettingChange = (key: keyof ScoringSettings, value: number) => {
    if (!scoringSettings) return;
    
    const updatedSettings = {
      ...scoringSettings,
      [key]: value
    };
    
    setScoringSettings(updatedSettings);
    setHasUnsavedChanges(true);
  };

  const handleSaveSettings = async () => {
    if (!scoringSettings || !hasUnsavedChanges) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await scoringSettingsService.updateScoringSettings(scoringSettings.id, scoringSettings);
      
      setOriginalSettings({...scoringSettings});
      setIsEditing(false);
      setHasUnsavedChanges(false);
      
      setSaveMessage({
        type: 'success',
        text: 'Scoring settings updated successfully!'
      });

      if (onSave) {
        onSave(scoringSettings);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('❌ Failed to save scoring settings:', error);
      setSaveMessage({
        type: 'error',
        text: 'Failed to save scoring settings. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    if (!scoringSettings) return;

    const defaultSettings = {
      ...scoringSettings,
      ...YAHOO_NFL_DEFAULTS
    };

    setScoringSettings(defaultSettings);
    setHasUnsavedChanges(true);
  };

  const renderScoringCategory = (category: ScoringCategory) => {
    if (!scoringSettings || !isEditing) return null;

    const categoryConfig = SCORING_CATEGORIES.find(c => c.key === category);
    if (!categoryConfig) return null;

    return (
      <div key={category} className="scoring-category">
        <div className="category-header">
          <h4 className="category-title">{categoryConfig.name}</h4>
          <p className="category-description">{categoryConfig.description}</p>
        </div>
        
        <div className="category-settings">
          {categoryConfig.settings.map(setting => (
            <div key={setting.key} className="scoring-setting">
              <div className="setting-info">
                <label className="setting-label">{setting.label}</label>
                <p className="setting-description">{setting.description}</p>
              </div>
              
              <div className="setting-input-group">
                <input
                  type="number"
                  value={scoringSettings[setting.key] as number}
                  onChange={(e) => handleSettingChange(setting.key, parseFloat(e.target.value) || 0)}
                  min={setting.min}
                  max={setting.max}
                  step={setting.step || 1}
                  className="setting-input"
                  disabled={isSaving}
                />
                {setting.suffix && <span className="setting-suffix">{setting.suffix}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderReadOnlySettings = () => {
    if (!scoringSettings || isEditing) return null;

    return (
      <div className="readonly-settings">
        <div className="settings-grid">
          <div className="setting-display">
            <span className="setting-label">Reception Scoring</span>
            <span className="setting-value">
              {scoringSettings.receptionPoints === 0 ? 'Standard (No PPR)' :
               scoringSettings.receptionPoints === 0.5 ? 'Half PPR' :
               scoringSettings.receptionPoints === 1 ? 'Full PPR' :
               `${scoringSettings.receptionPoints} pts per reception`}
            </span>
          </div>
          
          <div className="setting-display">
            <span className="setting-label">Passing TD</span>
            <span className="setting-value">{scoringSettings.passingTouchdownPoints} pts</span>
          </div>
          
          <div className="setting-display">
            <span className="setting-label">Rushing/Receiving TD</span>
            <span className="setting-value">{scoringSettings.rushingTouchdownPoints} pts</span>
          </div>
          
          <div className="setting-display">
            <span className="setting-label">Passing Yards</span>
            <span className="setting-value">1 pt per {scoringSettings.passingYardsPerPoint} yards</span>
          </div>
          
          <div className="setting-display">
            <span className="setting-label">Rushing/Receiving Yards</span>
            <span className="setting-value">1 pt per {scoringSettings.rushingYardsPerPoint} yards</span>
          </div>
          
          <div className="setting-display">
            <span className="setting-label">Interceptions</span>
            <span className="setting-value">{scoringSettings.passingInterceptionPoints} pts</span>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="scoring-settings-section">
        <div className="section-header">
          <h2 className="section-title">
            <span className="section-icon">🏆</span>
            Scoring & Rules
          </h2>
          <p className="section-description">
            Configure league scoring system and game rules
          </p>
        </div>
        
        <div className="loading-state">
          <span className="spinner"></span>
          <span>Loading scoring settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="scoring-settings-section">
      <div className="section-header">
        <h2 className="section-title">
          <span className="section-icon">🏆</span>
          Scoring & Rules
        </h2>
        <p className="section-description">
          Configure league scoring system and game rules
        </p>
        
        {!isEditing && scoringSettings && (
          <button onClick={handleEditClick} className="edit-btn">
            <span className="btn-icon">⚙️</span>
            Customize Scoring
          </button>
        )}
      </div>

      {scoringSettings && (
        <>
          {/* Read-only display */}
          {renderReadOnlySettings()}

          {/* Editing interface */}
          {isEditing && (
            <div className="scoring-editor">
              <div className="editor-header">
                <div className="preset-actions">
                  <button
                    onClick={handleResetToDefaults}
                    className="preset-btn"
                    disabled={isSaving}
                  >
                    <span className="btn-icon">🔄</span>
                    Reset to Yahoo Defaults
                  </button>
                </div>
                
                <div className="editor-actions">
                  <button
                    onClick={handleSaveSettings}
                    disabled={!hasUnsavedChanges || isSaving}
                    className="save-btn"
                  >
                    {isSaving ? (
                      <>
                        <span className="spinner"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <span className="btn-icon">💾</span>
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Category tabs */}
              <div className="category-tabs">
                {SCORING_CATEGORIES.map(category => (
                  <button
                    key={category.key}
                    onClick={() => setActiveCategory(category.key)}
                    className={`category-tab ${activeCategory === category.key ? 'active' : ''}`}
                    disabled={isSaving}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {/* Active category settings */}
              <div className="category-content">
                {renderScoringCategory(activeCategory)}
              </div>
            </div>
          )}
        </>
      )}

      {saveMessage && (
        <div className={`save-message ${saveMessage.type}`}>
          <span className="message-icon">
            {saveMessage.type === 'success' ? '✅' : '❌'}
          </span>
          {saveMessage.text}
        </div>
      )}
    </div>
  );
};

export default ScoringSettingsSection;