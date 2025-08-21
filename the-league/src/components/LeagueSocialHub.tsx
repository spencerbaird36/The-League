import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Player } from '../types/Player';
import { DraftPick } from '../hooks/useDraftState';
import { DraftChatMessage, useDraftChat } from '../hooks/useDraftChat';
import './LeagueSocialHub.css';

interface LeagueSocialHubProps {
  leagueId?: number;
  userId?: number;
  username?: string;
  picks: DraftPick[];
  draftOrder: number[];
  currentPickNumber: number;
  isVisible: boolean;
  onToggle: () => void;
  className?: string;
}

interface Achievement {
  id: string;
  type: 'draft' | 'strategy' | 'social' | 'special';
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt: Date;
  userId: number;
  progress?: number;
  maxProgress?: number;
}

interface LeagueMoment {
  id: string;
  type: 'pick' | 'celebration' | 'milestone' | 'reaction';
  title: string;
  description: string;
  participants: number[];
  timestamp: Date;
  data?: any;
}

interface SocialPost {
  id: string;
  userId: number;
  username: string;
  content: string;
  type: 'text' | 'pick_reaction' | 'prediction' | 'meme';
  timestamp: Date;
  likes: number[];
  comments: SocialComment[];
  reactions: { emoji: string; users: number[] }[];
  isHighlighted?: boolean;
}

interface SocialComment {
  id: string;
  userId: number;
  username: string;
  content: string;
  timestamp: Date;
  likes: number[];
}

interface DraftCelebration {
  id: string;
  type: 'great_pick' | 'steal' | 'surprise' | 'run_starter' | 'position_lock';
  playerId: string;
  playerName: string;
  userId: number;
  pickNumber: number;
  intensity: number; // 1-100
  reactions: string[];
}

const LeagueSocialHub: React.FC<LeagueSocialHubProps> = ({
  leagueId,
  userId,
  username,
  picks,
  draftOrder,
  currentPickNumber,
  isVisible,
  onToggle,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'feed' | 'achievements' | 'moments' | 'celebrations'>('feed');
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leagueMoments, setLeagueMoments] = useState<LeagueMoment[]>([]);
  const [celebrations, setCelebrations] = useState<DraftCelebration[]>([]);

  // Use draft chat for real-time social features
  const { chatState, actions: chatActions } = useDraftChat({
    leagueId,
    userId,
    username,
    isEnabled: true
  });

  // Generate mock achievements based on draft activity
  const generatedAchievements = useMemo((): Achievement[] => {
    const userPicks = picks.filter(pick => pick.userId === userId);
    const achievements: Achievement[] = [];

    // First pick achievement
    if (userPicks.length > 0) {
      achievements.push({
        id: 'first-pick',
        type: 'draft',
        title: 'Draft Starter',
        description: 'Made your first draft pick',
        icon: '🎯',
        rarity: 'common',
        unlockedAt: new Date(),
        userId: userId || 0
      });
    }

    // Position diversity
    const positions = new Set(userPicks.map(pick => pick.playerPosition));
    if (positions.size >= 4) {
      achievements.push({
        id: 'position-diverse',
        type: 'strategy',
        title: 'Jack of All Trades',
        description: 'Drafted players from 4+ different positions',
        icon: '🎪',
        rarity: 'rare',
        unlockedAt: new Date(),
        userId: userId || 0
      });
    }

    // Early round strategy
    const earlyPicks = userPicks.filter(pick => pick.pickNumber <= 24);
    if (earlyPicks.length >= 2 && earlyPicks.every(pick => pick.playerPosition === 'RB')) {
      achievements.push({
        id: 'rb-heavy',
        type: 'strategy',
        title: 'Ground and Pound',
        description: 'Went RB-heavy in early rounds',
        icon: '🏃‍♂️',
        rarity: 'epic',
        unlockedAt: new Date(),
        userId: userId || 0
      });
    }

    // Social participation
    if (chatState.messages.filter(msg => msg.userId === userId).length >= 5) {
      achievements.push({
        id: 'chatty',
        type: 'social',
        title: 'League Socialite',
        description: 'Sent 5+ messages during draft',
        icon: '💬',
        rarity: 'common',
        unlockedAt: new Date(),
        userId: userId || 0
      });
    }

    // Special achievements
    if (userPicks.length >= 8) {
      achievements.push({
        id: 'halfway',
        type: 'special',
        title: 'Halfway Hero',
        description: 'Completed half your draft picks',
        icon: '⭐',
        rarity: 'legendary',
        unlockedAt: new Date(),
        userId: userId || 0,
        progress: userPicks.length,
        maxProgress: 15
      });
    }

    return achievements;
  }, [picks, userId, chatState.messages]);

  // Generate league moments
  const generatedMoments = useMemo((): LeagueMoment[] => {
    const moments: LeagueMoment[] = [];

    // Position runs
    const recentPicks = picks.slice(-6);
    const positionCounts = recentPicks.reduce((acc, pick) => {
      acc[pick.playerPosition] = (acc[pick.playerPosition] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(positionCounts).forEach(([position, count]) => {
      if (count >= 3) {
        moments.push({
          id: `run-${position}-${Date.now()}`,
          type: 'milestone',
          title: `${position} Run!`,
          description: `${count} ${position}s picked in the last 6 picks`,
          participants: recentPicks
            .filter(pick => pick.playerPosition === position)
            .map(pick => pick.userId),
          timestamp: new Date(),
          data: { position, count }
        });
      }
    });

    // Draft milestones
    if (picks.length === 24) {
      moments.push({
        id: 'first-round-complete',
        type: 'milestone',
        title: 'First Round Complete!',
        description: 'All teams have made their first two picks',
        participants: draftOrder,
        timestamp: new Date()
      });
    }

    if (picks.length === draftOrder.length * 8) {
      moments.push({
        id: 'halfway-point',
        type: 'milestone',
        title: 'Halfway Point Reached!',
        description: 'Draft is 50% complete',
        participants: draftOrder,
        timestamp: new Date()
      });
    }

    // Surprise picks (QBs taken early, kickers taken way too early, etc.)
    const surprisePicks = picks.filter(pick => {
      const round = Math.ceil(pick.pickNumber / draftOrder.length);
      if (pick.playerPosition === 'QB' && round <= 2) return true;
      if (pick.playerPosition === 'TE' && round <= 3) return true;
      return false;
    });

    surprisePicks.forEach(pick => {
      moments.push({
        id: `surprise-${pick.id}`,
        type: 'pick',
        title: 'Surprise Pick!',
        description: `${pick.playerName} (${pick.playerPosition}) taken in round ${Math.ceil(pick.pickNumber / draftOrder.length)}`,
        participants: [pick.userId],
        timestamp: new Date(),
        data: pick
      });
    });

    return moments.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);
  }, [picks, draftOrder]);

  // Generate social feed posts
  const generatedSocialPosts = useMemo((): SocialPost[] => {
    const posts: SocialPost[] = [];

    // Convert chat messages to social posts
    chatState.messages.forEach(message => {
      if (message.type === 'pick_reaction' || message.type === 'celebration') {
        posts.push({
          id: `chat-${message.id}`,
          userId: message.userId,
          username: message.username,
          content: message.message,
          type: 'pick_reaction',
          timestamp: new Date(message.timestamp),
          likes: [],
          comments: [],
          reactions: message.reactions?.map(r => ({
            emoji: r.emoji,
            users: r.users
          })) || [],
          isHighlighted: message.type === 'celebration'
        });
      }
    });

    // Generate prediction posts
    if (picks.length > 0 && picks.length % 12 === 0) {
      const round = picks.length / draftOrder.length + 1;
      posts.push({
        id: `prediction-round-${round}`,
        userId: 0, // System post
        username: 'Draft Oracle',
        content: `Round ${round} Prediction: Expect a run on WRs and TEs based on current trends! 🔮`,
        type: 'prediction',
        timestamp: new Date(),
        likes: [],
        comments: [],
        reactions: []
      });
    }

    // Recent picks as social posts
    picks.slice(-3).forEach(pick => {
      posts.push({
        id: `pick-${pick.id}`,
        userId: pick.userId,
        username: `User ${pick.userId}`,
        content: `Just drafted ${pick.playerName} (${pick.playerPosition}, ${pick.playerTeam})! Thoughts? 🤔`,
        type: 'pick_reaction',
        timestamp: new Date(),
        likes: [],
        comments: [
          {
            id: `comment-${pick.id}-1`,
            userId: draftOrder[Math.floor(Math.random() * draftOrder.length)],
            username: 'LeagueManager',
            content: Math.random() > 0.5 ? 'Great pick!' : 'Interesting choice...',
            timestamp: new Date(),
            likes: []
          }
        ],
        reactions: []
      });
    });

    return posts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);
  }, [chatState.messages, picks, draftOrder]);

  // Handle new post creation
  const handleCreatePost = useCallback(() => {
    if (!newPostContent.trim() || !userId || !username) return;

    const newPost: SocialPost = {
      id: `post-${Date.now()}`,
      userId,
      username,
      content: newPostContent.trim(),
      type: 'text',
      timestamp: new Date(),
      likes: [],
      comments: [],
      reactions: []
    };

    setSocialPosts(prev => [newPost, ...prev]);
    setNewPostContent('');

    // Also send to chat if it's a general message
    chatActions.sendMessage(newPostContent.trim());
  }, [newPostContent, userId, username, chatActions]);

  // Handle post reactions
  const handlePostReaction = useCallback((postId: string, emoji: string) => {
    if (!userId) return;

    setSocialPosts(prev => prev.map(post => {
      if (post.id !== postId) return post;

      const reactions = [...post.reactions];
      const existingReaction = reactions.find(r => r.emoji === emoji);

      if (existingReaction) {
        if (existingReaction.users.includes(userId)) {
          existingReaction.users = existingReaction.users.filter(id => id !== userId);
          if (existingReaction.users.length === 0) {
            return { ...post, reactions: reactions.filter(r => r.emoji !== emoji) };
          }
        } else {
          existingReaction.users.push(userId);
        }
      } else {
        reactions.push({ emoji, users: [userId] });
      }

      return { ...post, reactions };
    }));
  }, [userId]);

  // Initialize achievements
  useEffect(() => {
    setAchievements(generatedAchievements);
  }, [generatedAchievements]);

  // Initialize moments
  useEffect(() => {
    setLeagueMoments(generatedMoments);
  }, [generatedMoments]);

  // Initialize social posts
  useEffect(() => {
    setSocialPosts(generatedSocialPosts);
  }, [generatedSocialPosts]);

  if (!isVisible) {
    return (
      <div className="league-social-hub league-social-hub--collapsed">
        <button 
          className="social-hub-toggle"
          onClick={onToggle}
          title="League Social Hub"
        >
          🎉
          {achievements.length > 0 && (
            <span className="achievement-badge">{achievements.length}</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={`league-social-hub league-social-hub--expanded ${className}`}>
      <div className="social-hub-header">
        <div className="hub-title">
          <h3>🎉 League Social Hub</h3>
          <div className="hub-stats">
            <span className="stat-item">
              🏆 {achievements.length} achievements
            </span>
            <span className="stat-item">
              ⚡ {leagueMoments.length} moments
            </span>
          </div>
        </div>
        
        <div className="hub-controls">
          <div className="hub-tabs">
            <button 
              className={`tab-button ${activeTab === 'feed' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('feed')}
            >
              📱 Feed
            </button>
            <button 
              className={`tab-button ${activeTab === 'achievements' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('achievements')}
            >
              🏆 Achievements
            </button>
            <button 
              className={`tab-button ${activeTab === 'moments' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('moments')}
            >
              ⚡ Moments
            </button>
            <button 
              className={`tab-button ${activeTab === 'celebrations' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('celebrations')}
            >
              🎊 Celebrations
            </button>
          </div>
          
          <button 
            className="social-hub-toggle"
            onClick={onToggle}
            title="Close Social Hub"
          >
            ✖
          </button>
        </div>
      </div>
      
      <div className="social-hub-content">
        {activeTab === 'feed' && (
          <div className="feed-tab">
            <div className="post-composer">
              <div className="composer-header">
                <div className="user-avatar">👤</div>
                <div className="composer-info">
                  <div className="user-name">{username || 'You'}</div>
                  <div className="composer-prompt">What's on your mind about the draft?</div>
                </div>
              </div>
              
              <textarea
                className="post-input"
                placeholder="Share your thoughts, predictions, or reactions..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleCreatePost();
                  }
                }}
              />
              
              <div className="composer-actions">
                <div className="post-options">
                  <button className="option-btn">📸 Photo</button>
                  <button className="option-btn">🎯 Prediction</button>
                  <button className="option-btn">😂 Meme</button>
                </div>
                <button 
                  className="post-btn"
                  onClick={handleCreatePost}
                  disabled={!newPostContent.trim()}
                >
                  Post
                </button>
              </div>
            </div>
            
            <div className="social-feed">
              {socialPosts.map(post => (
                <div key={post.id} className={`social-post ${post.isHighlighted ? 'highlighted' : ''}`}>
                  <div className="post-header">
                    <div className="post-author">
                      <div className="author-avatar">👤</div>
                      <div className="author-info">
                        <div className="author-name">{post.username}</div>
                        <div className="post-time">
                          {post.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className={`post-type-badge post-type-badge--${post.type}`}>
                      {post.type === 'pick_reaction' ? '🎯' : 
                       post.type === 'prediction' ? '🔮' :
                       post.type === 'meme' ? '😂' : '💭'}
                    </div>
                  </div>
                  
                  <div className="post-content">{post.content}</div>
                  
                  {post.reactions.length > 0 && (
                    <div className="post-reactions">
                      {post.reactions.map(reaction => (
                        <button 
                          key={reaction.emoji}
                          className={`reaction-btn ${reaction.users.includes(userId || 0) ? 'active' : ''}`}
                          onClick={() => handlePostReaction(post.id, reaction.emoji)}
                        >
                          {reaction.emoji} {reaction.users.length}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <div className="post-actions">
                    <button 
                      className="action-btn"
                      onClick={() => handlePostReaction(post.id, '👍')}
                    >
                      👍 Like
                    </button>
                    <button className="action-btn">💬 Comment</button>
                    <button 
                      className="action-btn"
                      onClick={() => handlePostReaction(post.id, '🔥')}
                    >
                      🔥 Fire
                    </button>
                    <button className="action-btn">📤 Share</button>
                  </div>
                  
                  {post.comments.length > 0 && (
                    <div className="post-comments">
                      {post.comments.map(comment => (
                        <div key={comment.id} className="comment">
                          <div className="comment-author">{comment.username}</div>
                          <div className="comment-content">{comment.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'achievements' && (
          <div className="achievements-tab">
            <div className="achievements-header">
              <h4>🏆 Your Achievements</h4>
              <div className="achievement-stats">
                <span className="stat">
                  {achievements.length} unlocked
                </span>
              </div>
            </div>
            
            <div className="achievements-grid">
              {achievements.map(achievement => (
                <div key={achievement.id} className={`achievement-card achievement-card--${achievement.rarity}`}>
                  <div className="achievement-icon">{achievement.icon}</div>
                  <div className="achievement-info">
                    <div className="achievement-title">{achievement.title}</div>
                    <div className="achievement-description">{achievement.description}</div>
                    <div className="achievement-rarity">{achievement.rarity}</div>
                    {achievement.progress !== undefined && achievement.maxProgress && (
                      <div className="achievement-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                          />
                        </div>
                        <span className="progress-text">
                          {achievement.progress} / {achievement.maxProgress}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="achievement-timestamp">
                    {achievement.unlockedAt.toLocaleDateString()}
                  </div>
                </div>
              ))}
              
              {achievements.length === 0 && (
                <div className="no-achievements">
                  <div className="empty-icon">🏆</div>
                  <h4>No Achievements Yet</h4>
                  <p>Start drafting to unlock achievements!</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'moments' && (
          <div className="moments-tab">
            <div className="moments-header">
              <h4>⚡ League Moments</h4>
              <div className="moments-filter">
                <button className="filter-btn active">All</button>
                <button className="filter-btn">Milestones</button>
                <button className="filter-btn">Picks</button>
                <button className="filter-btn">Reactions</button>
              </div>
            </div>
            
            <div className="moments-timeline">
              {leagueMoments.map(moment => (
                <div key={moment.id} className={`moment-card moment-card--${moment.type}`}>
                  <div className="moment-timestamp">
                    {moment.timestamp.toLocaleTimeString()}
                  </div>
                  <div className="moment-content">
                    <div className="moment-title">{moment.title}</div>
                    <div className="moment-description">{moment.description}</div>
                    <div className="moment-participants">
                      {moment.participants.length} participant{moment.participants.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="moment-reactions">
                    <button className="moment-reaction">🔥</button>
                    <button className="moment-reaction">⚡</button>
                    <button className="moment-reaction">💯</button>
                  </div>
                </div>
              ))}
              
              {leagueMoments.length === 0 && (
                <div className="no-moments">
                  <div className="empty-icon">⚡</div>
                  <h4>No Moments Yet</h4>
                  <p>League moments will appear as the draft progresses!</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'celebrations' && (
          <div className="celebrations-tab">
            <div className="celebrations-header">
              <h4>🎊 Draft Celebrations</h4>
              <button className="celebration-btn">
                🎉 Start Celebration
              </button>
            </div>
            
            <div className="celebration-options">
              <button 
                className="celebration-option"
                onClick={() => chatActions.sendCelebration('great_pick')}
              >
                🎯 Great Pick!
              </button>
              <button 
                className="celebration-option"
                onClick={() => chatActions.sendCelebration('steal')}
              >
                💎 What a Steal!
              </button>
              <button className="celebration-option">
                🚀 Bold Move!
              </button>
              <button className="celebration-option">
                🤔 Interesting...
              </button>
            </div>
            
            <div className="recent-celebrations">
              <h5>Recent Celebrations</h5>
              <div className="celebrations-list">
                {chatState.messages
                  .filter(msg => msg.type === 'celebration')
                  .slice(0, 5)
                  .map(celebration => (
                    <div key={celebration.id} className="celebration-item">
                      <div className="celebration-emoji">🎉</div>
                      <div className="celebration-details">
                        <div className="celebration-message">{celebration.message}</div>
                        <div className="celebration-author">{celebration.username}</div>
                      </div>
                      <div className="celebration-time">
                        {new Date(celebration.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeagueSocialHub;