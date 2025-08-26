// Legacy Guardians - Game State Hook

import { useState, useCallback } from 'react';
import tasksData from '../constants/tasks.json';
import { events as eventsData } from '../modules/events';
import { badges as badgeData } from '../modules/badges';
import { dilemmas as dilemmaQuestions } from '../modules/dilemmas';
import { handleSpinWheel as spinWheel } from '../modules/spinWheel';
import aiPersonalities from '../constants/ai-personalities.json';
import aiFeedbackRules from '../constants/ai-feedback.json';
import { assets as assetsData } from '../modules/assets';
import { getAiResponse } from '../utils/ai';
import { calculateDailyReturns } from '../utils/game-logic';

export const useGameState = () => {
  // Company/Avatar Customization
  const [companyName, setCompanyName] = useState('我的空岛公司');
  const [avatar, setAvatar] = useState('https://cdn-icons-png.flaticon.com/512/616/616494.png');
  const [theme, setTheme] = useState('cyberpunk');

  // Resource Management
  const [coins, setCoins] = useState(100);
  const [gems, setGems] = useState(5);
  const [stars, setStars] = useState(0);
  const [progress, setProgress] = useState(0);
  const [allowedAssets, setAllowedAssets] = useState<string[]>(['tech','bond','gold','crypto','esg','stablecoin','yield']);
  const [pendingCoinRequest, setPendingCoinRequest] = useState<number | null>(null);

  // Spin the Wheel state
  const [wheelOpen, setWheelOpen] = useState(false);
  const [wheelResult, setWheelResult] = useState<string | null>(null);
  const [wheelUsed, setWheelUsed] = useState(false);

  // AI chat state
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiPersonality, setAiPersonality] = useState<string>(aiPersonalities[0].id);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiMessages, setAiMessages] = useState<string[]>([]);

  // Dilemma/Quiz state
  const [dilemma, setDilemma] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<{ question: string, options: string[], answer: string } | null>(null);
  const [quizAnswered, setQuizAnswered] = useState<string | null>(null);

  // Main game state
  const [endgame, setEndgame] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [askedDilemmas, setAskedDilemmas] = useState<number[]>([]);
  const [weights, setWeights] = useState<{ [key: string]: number }>({ tech: 16, bond: 16, gold: 16, crypto: 16, esg: 16, stablecoin: 10, yield: 10 });
  const [day, setDay] = useState(0);
  const [returns, setReturns] = useState<number | null>(null);
  const [volatility, setVolatility] = useState<number | null>(null);
  const [drawdown, setDrawdown] = useState<number | null>(null);
  const [portfolioValue, setPortfolioValue] = useState(1);
  const [peakValue, setPeakValue] = useState(1);
  const [event, setEvent] = useState<any>(null);
  const [task, setTask] = useState<any>(tasksData[0]);
  const [badges, setBadges] = useState<string[]>([]);

  // Sidebar/modal state
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<string>('');
  const [pendingCompanyName, setPendingCompanyName] = useState(companyName);

  // Quiz state
  const [quizActive, setQuizActive] = useState(false);
  const [quizResult, setQuizResult] = useState('');

  // Avatar options
  const avatarOptions = [
    'https://cdn-icons-png.flaticon.com/512/616/616494.png',
    'https://cdn-icons-png.flaticon.com/512/616/616408.png',
    'https://cdn-icons-png.flaticon.com/512/616/616430.png',
    'https://cdn-icons-png.flaticon.com/512/616/616408.png',
    'https://cdn-icons-png/flaticon.com/512/616/616408.png',
    'https://cdn-icons-png.flaticon.com/512/616/616408.png'
  ];

  // Parent controls
  const requestCoins = useCallback((amount: number) => {
    setPendingCoinRequest(amount);
  }, []);

  const approveCoinRequest = useCallback(() => {
    if (pendingCoinRequest !== null) {
      setCoins(c => c + pendingCoinRequest);
      setPendingCoinRequest(null);
    }
  }, [pendingCoinRequest]);

  const rejectCoinRequest = useCallback(() => setPendingCoinRequest(null), []);

  const toggleAllowedAsset = useCallback((asset: string) => {
    setAllowedAssets(prev =>
      prev.includes(asset) ? prev.filter(a => a !== asset) : [...prev, asset]
    );
  }, []);

  const addStars = useCallback((count: number = 1) => {
    setStars(prev => {
      const newStars = prev + count;
      const newProgress = Math.min(100, Math.floor(newStars / 5) * 25);
      setProgress(newProgress);
      return newStars;
    });
  }, []);


  // Handle spin wheel
  const handleSpinWheel = useCallback(() => {
    spinWheel({
      setReturns,
      setBadges,
      setWheelResult,
      setWheelUsed,
      setWheelOpen,
    });
  }, [setReturns, setBadges, setWheelResult, setWheelUsed, setWheelOpen]);

  // Handle AI ask
  const handleAiAsk = useCallback(async () => {
    const input = aiInput.trim();
    if (!input || !aiEnabled) return;
    setAiResponse('正在思考...');
    const personality = aiPersonalities.find(p => p.id === aiPersonality) || aiPersonalities[0];
    const reply = await getAiResponse(input, weights, personality);
    setAiResponse(reply);
  }, [aiInput, weights, aiPersonality, aiEnabled]);

  // Reset game function
  const resetGame = useCallback(() => {
    setWeights({ tech: 16, bond: 16, gold: 16, crypto: 16, esg: 16, stablecoin: 10, yield: 10 });
    setDay(0);
    setReturns(null);
    setEvent(null);
    setTask(tasksData[0]);
    setBadges([]);
    setHistory([]);
    setVolatility(null);
    setDrawdown(null);
    setPortfolioValue(1);
    setPeakValue(1);
    setQuizActive(false);
    setQuizResult('');
    setCoins(100);
    setGems(5);
    setStars(0);
    setProgress(0);
    setEndgame(false);
    setShowSummary(false);
  }, []);

  // Handle weight change
  const handleWeightChange = useCallback((key: string, value: number) => {
    if (!allowedAssets.includes(key)) return;
    const total = Object.entries(weights).reduce((sum, [k, v]) =>
      k === key ? sum + value : sum + (v as number), 0
    );
    if (total <= 100) {
      setWeights({ ...weights, [key]: value });
    }
  }, [weights, allowedAssets]);

  // Next day function
  const nextDay = useCallback(() => {
    // Fun event: meme or surprise
    if (Math.random() < 0.15) {
      setShowModal(true);
      setModalContent('🎉 彩蛋事件：你发现了一只会跳舞的柴犬！\n\n奖励：收益+5%，心情+100！');
      setReturns(r => (r !== null ? r + 5 : 5));
      setCoins(c => c + 10);
      setGems(g => g + 1);
    }

    setWheelUsed(false);

    // Randomly trigger a dilemma or quiz
    if (Math.random() < 0.4) {
      const available = dilemmaQuestions.map((_, i) => i).filter(i => !askedDilemmas.includes(i));
      if (available.length > 0) {
        const idx = available[Math.floor(Math.random() * available.length)];
        setDilemma(dilemmaQuestions[idx].text);
        setAskedDilemmas(prev => [...prev, idx]);
        return;
      }
    }

    if (Math.random() < 0.2) {
      setQuiz({
        question: '分散投资的最大好处是什么？',
        options: ['降低风险', '增加波动', '提高单一资产收益'],
        answer: '降低风险'
      });
      return;
    }

    // Endgame trigger
    const wealthGoal = 300;
    const allBadges = badgeData.map(b => b.name.replace('徽章',''));
    const hasAllBadges = allBadges.every(b => badges.includes(b));
    if (returns !== null && returns >= wealthGoal && hasAllBadges) {
      setEndgame(true);
      setTimeout(() => setShowSummary(true), 2500);
      return;
    }

    // Pick a random event
    const eventIdx = Math.floor(Math.random() * eventsData.length);
    const ev = eventsData[eventIdx];
    setEvent(ev);

    // Pick next task
    const taskIdx = (day + 1) % tasksData.length;
    setTask(tasksData[taskIdx]);
    setDay(day + 1);

    // Calculate returns using asset data
    const result = calculateDailyReturns(weights, assetsData, ev, portfolioValue, peakValue);
    const dayReturn = result.returns;
    setReturns(dayReturn);
    setVolatility(result.volatility);
    setDrawdown(result.drawdown);
    setPortfolioValue(result.portfolioValue);
    setPeakValue(result.peakValue);

    // Update coins/gems based on returns
    setCoins(c => c + Math.max(0, Math.floor(dayReturn / 10)));
    if (dayReturn > 50) setGems(g => g + 1);

    if (dayReturn > 0) addStars(1);

    // Badge logic
    let newBadges = [...badges];
    if (Object.values(weights).filter((w) => (w as number) > 0).length >= 4 && !badges.includes('分散者')) {
      newBadges.push('分散者');
    }
    if (history.length >= 2 && history.slice(-2).every(h => h.returns > 0) && dayReturn > 0 && !badges.includes('长远目光')) {
      newBadges.push('长远目光');
    }
    if (Object.values(weights).some(w => w > 60) && dayReturn > 0 && !badges.includes('风险管理者')) {
      newBadges.push('风险管理者');
    }
    if ((weights.esg || 0) >= 20 && !badges.includes('绿色先锋')) {
      newBadges.push('绿色先锋');
    }
    if ((weights.gold || 0) >= 20 && !badges.includes('避险守护者')) {
      newBadges.push('避险守护者');
    }
    if ((weights.stablecoin || 0) >= 20 && !badges.includes('平静守护者')) {
      newBadges.push('平静守护者');
    }
    if ((weights.yield || 0) >= 20 && !badges.includes('收益智者')) {
      newBadges.push('收益智者');
    }
    const earnedBadges = newBadges.filter(b => !badges.includes(b));
    setBadges(newBadges);

    // Track history
    setHistory([...history, { day: day + 1, weights: { ...weights }, event: ev, returns: dayReturn }]);

    // AI feedback rules
    if (aiEnabled) {
      const personality = aiPersonalities.find(p => p.id === aiPersonality) || aiPersonalities[0];
      const queue: string[] = [];
      aiFeedbackRules.forEach(rule => {
        if (rule.type === 'returnsBelow' && dayReturn < rule.threshold) {
          const msg = rule.template.replace('{returns}', dayReturn.toFixed(2));
          queue.push(msg);
        }
        if (rule.type === 'weightAbove') {
          const w = (weights as any)[rule.asset] || 0;
          if (w > rule.threshold) {
            const msg = rule.template
              .replace('{asset}', rule.asset)
              .replace('{percent}', String(w));
            queue.push(msg);
          }
        }
        if (rule.type === 'badgeEarned' && earnedBadges.length > 0) {
          earnedBadges.forEach(b => {
            const msg = rule.template.replace('{badge}', b);
            queue.push(msg);
          });
        }
      });
      if (queue.length > 0) {
        const styled = queue.map(m => `${personality.name}：${m}`);
        setAiMessages(prev => [...prev, ...styled]);
        setAiChatOpen(true);
      }
    }
  }, [day, returns, badges, weights, history, askedDilemmas, portfolioValue, peakValue, aiEnabled, aiPersonality]);

  return {
    // State
    companyName,
    avatar,
    theme,
    coins,
    gems,
    stars,
    progress,
    wheelOpen,
    wheelResult,
    wheelUsed,
    aiChatOpen,
    aiInput,
    aiResponse,
    aiMessages,
    dilemma,
    quiz,
    quizAnswered,
    endgame,
    showSummary,
    history,
    weights,
    day,
    returns,
    volatility,
    drawdown,
    event,
    task,
    badges,
    showModal,
    modalContent,
    pendingCompanyName,
    quizActive,
    quizResult,
    allowedAssets,
    pendingCoinRequest,
    aiPersonality,
    aiEnabled,
    
    // Options
    avatarOptions,
    dilemmaQuestions,
    
    // Actions
    setCompanyName,
    setAvatar,
    setTheme,
    setCoins,
    setGems,
    setStars,
    setProgress,
    setWheelOpen,
    setWheelResult,
    setWheelUsed,
    setAiChatOpen,
    setAiInput,
    setAiResponse,
    setAiPersonality,
    setAiEnabled,
    setDilemma,
    setQuiz,
    setQuizAnswered,
    setEndgame,
    setShowSummary,
    setHistory,
    setWeights,
    setDay,
    setReturns,
    setVolatility,
    setDrawdown,
    setEvent,
    setTask,
    setBadges,
    setShowModal,
    setModalContent,
    setPendingCompanyName,
    setQuizActive,
    setQuizResult,

    // Functions
    handleSpinWheel,
    handleAiAsk,
    resetGame,
    handleWeightChange,
    nextDay,
    requestCoins,
    approveCoinRequest,
    rejectCoinRequest,
    toggleAllowedAsset,
    addStars
  };
};
