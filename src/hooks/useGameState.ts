// Legacy Guardians - Game State Hook

import { useState, useCallback } from 'react';
import { Dilemma } from '../types';
import tasksData from '../constants/tasks.json';
import { events as eventsData } from '../modules/events';
import { dilemmas as dilemmaQuestions } from '../modules/dilemmas';
import { handleSpinWheel as spinWheel } from '../modules/spinWheel';
import aiPersonalities from '../constants/ai-personalities.json';
import { assets as assetsData } from '../modules/assets';
import { getAiResponse } from '../utils/ai';
import { taskGoals } from '../constants/task-goals';
import {
  calculateDailyReturns,
  generateRandomEvent,
  generateRandomDilemma,
  generateRandomQuiz,
  checkEasterEgg,
  checkBadgeEligibility,
  checkGameEnd,
} from '../utils/game-logic';
import { GAME_CONFIG, ASSET_CATEGORIES } from '../constants/game-config';

export const useGameState = () => {
  // Company/Avatar Customization
  const [companyName, setCompanyName] = useState(GAME_CONFIG.DEFAULT_COMPANY_NAME);
  const [avatar, setAvatar] = useState(GAME_CONFIG.AVATAR_OPTIONS[0]);
  const [theme, setTheme] = useState('cyberpunk');

  // Resource Management
  const [coins, setCoins] = useState(GAME_CONFIG.INITIAL_COINS);
  const [gems, setGems] = useState(GAME_CONFIG.INITIAL_GEMS);
  const [stars, setStars] = useState(0);
  const [progress, setProgress] = useState(0);
  const [allowedAssets, setAllowedAssets] = useState<string[]>(Object.values(ASSET_CATEGORIES));
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

  // Dilemma/Quiz state
  const [dilemma, setDilemma] = useState<Dilemma | null>(null);
  const [currentDilemmaIndex, setCurrentDilemmaIndex] = useState<number | null>(null);
  const [quiz, setQuiz] = useState<{ question: string, options: string[], answer: string } | null>(null);
  const [quizAnswered, setQuizAnswered] = useState<string | null>(null);

  // Main game state
  const [endgame, setEndgame] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [completedDilemmas, setCompletedDilemmas] = useState<number[]>([]);
  const [skillProgress, setSkillProgress] = useState<{ [key: string]: number }>({
    diversification: 0,
    'risk-management': 0,
    knowledge: 0
  });
  const [weights, setWeights] = useState<{ [key: string]: number }>({ tech: 16, bond: 16, gold: 16, crypto: 16, esg: 16, stablecoin: 10, yield: 10 });
  const [day, setDay] = useState(0);
  const [returns, setReturns] = useState<number | null>(null);
  const [volatility, setVolatility] = useState<number | null>(null);
  const [drawdown, setDrawdown] = useState<number | null>(null);
  const [portfolioValue, setPortfolioValue] = useState(1);
  const [peakValue, setPeakValue] = useState(1);
  const [event, setEvent] = useState<any>(null);
  const [task, setTask] = useState<any>(tasksData[0]);
  const [taskObjective, setTaskObjective] = useState<string>(taskGoals[tasksData[0].id].objective);
  const [lastTaskResult, setLastTaskResult] = useState<
    { title: string; completed: boolean; reward: { coins: number; gems: number; badge?: string } } | null
  >(null);
  const [badges, setBadges] = useState<string[]>([]);

  // Sidebar/modal state
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<string>('');
  const [pendingCompanyName, setPendingCompanyName] = useState(companyName);

  // Quiz state
  const [quizActive, setQuizActive] = useState(false);
  const [quizResult, setQuizResult] = useState('');

  // Avatar options
  const avatarOptions = GAME_CONFIG.AVATAR_OPTIONS;

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
    setAllowedAssets(prev => {
      if (prev.includes(asset)) {
        setWeights(w => ({ ...w, [asset]: 0 }));
        return prev.filter(a => a !== asset);
      }
      return [...prev, asset];
    });
  }, [setWeights]);

  const addStars = useCallback((count: number = 1) => {
    setStars(prev => {
      const newStars = prev + count;
      const newProgress = Math.min(100, Math.floor(newStars / 5) * 25);
      setProgress(newProgress);
      return newStars;
    });
  }, []);

  const handleDilemmaAnswer = useCallback((optionIndex: number) => {
    if (!dilemma || currentDilemmaIndex === null) return '';
    const option = dilemma.options[optionIndex];
    setCompletedDilemmas(prev => [...prev, currentDilemmaIndex]);
    setSkillProgress(prev => ({
      ...prev,
      [option.skill]: (prev[option.skill] || 0) + 1,
    }));
    setCurrentDilemmaIndex(null);
    return option.consequence;
  }, [dilemma, currentDilemmaIndex]);


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
    setTaskObjective(taskGoals[tasksData[0].id].objective);
    setLastTaskResult(null);
    setBadges([]);
    setHistory([]);
    setVolatility(null);
    setDrawdown(null);
    setPortfolioValue(1);
    setPeakValue(1);
    setQuizActive(false);
    setQuizResult('');
    setCoins(GAME_CONFIG.INITIAL_COINS);
    setGems(GAME_CONFIG.INITIAL_GEMS);
    setStars(0);
    setProgress(0);
    setEndgame(false);
    setShowSummary(false);
    setDilemma(null);
    setCurrentDilemmaIndex(null);
    setCompletedDilemmas([]);
    setSkillProgress({ diversification: 0, 'risk-management': 0, knowledge: 0 });
  }, []);

  // Handle weight change
  const handleWeightChange = useCallback((key: string, value: number) => {
    const sanitized = Object.fromEntries(
      Object.entries(weights).map(([k, v]) => [k, allowedAssets.includes(k) ? v : 0])
    ) as { [key: string]: number };

    if (!allowedAssets.includes(key)) {
      setWeights(sanitized);
      return;
    }

    const total = Object.entries(sanitized).reduce(
      (sum, [k, v]) => (k === key ? sum + value : sum + (v as number)),
      0
    );

    if (total <= 100) {
      setWeights({ ...sanitized, [key]: value });
    } else {
      setWeights(sanitized);
    }
  }, [weights, allowedAssets]);

  // Next day function
  const nextDay = useCallback((choiceIndex?: number) => {
    // Resolve pending event choice
    if (event && event.choices && choiceIndex !== undefined) {
      const choice = event.choices[choiceIndex];
      const selectedEvent = { ...event, impactRange: choice.impactRange };
      const result = calculateDailyReturns(weights, assetsData, selectedEvent, portfolioValue, peakValue);
      const dayReturn = result.returns;
      setReturns(dayReturn);
      setVolatility(result.volatility);
      setDrawdown(result.drawdown);
      setPortfolioValue(result.portfolioValue);
      setPeakValue(result.peakValue);

      setCoins(c => c + Math.max(0, Math.floor(dayReturn / 10)));
      if (dayReturn > 50) setGems(g => g + 1);
      if (dayReturn > 0) addStars(1);

      const goal = taskGoals[task.id];
      let taskCompleted = false;
      if (goal && goal.check(weights)) {
        taskCompleted = true;
        setCoins(c => c + goal.reward.coins);
        setGems(g => g + goal.reward.gems);
      }

      const earnedBadges = checkBadgeEligibility(weights, history, dayReturn, badges);
      let newBadges = [...badges, ...earnedBadges];
      if (goal && taskCompleted && goal.reward.badge && !newBadges.includes(goal.reward.badge)) {
        newBadges.push(goal.reward.badge);
      }
      setBadges(newBadges);

      const taskIdx = (day + 1) % tasksData.length;
      setTask(tasksData[taskIdx]);
      setTaskObjective(taskGoals[tasksData[taskIdx].id].objective);
      setDay(day + 1);

      const sanitizedWeights = Object.fromEntries(
        Object.entries(weights).map(([k, v]) => [k, allowedAssets.includes(k) ? v : 0])
      );
      setHistory([
        ...history,
        {
          day: day + 1,
          weights: { ...sanitizedWeights },
          eventId: event.id,
          effect: choice.effect,
          returns: dayReturn,
          taskId: task.id,
          taskCompleted,
          reward: taskCompleted ? goal.reward : undefined,
        },
      ]);

      setLastTaskResult(goal ? { title: task.title, completed: taskCompleted, reward: goal.reward } : null);

      // remove choices after resolving
      setEvent({ ...event, choices: undefined });
      return;
    }

    // Fun event: meme or surprise
    if (checkEasterEgg()) {
      setShowModal(true);
      setModalContent('🎉 彩蛋事件：你发现了一只会跳舞的柴犬！\n\n奖励：收益+5%，心情+100！');
      setReturns(r => (r !== null ? r + 5 : 5));
      setCoins(c => c + 10);
      setGems(g => g + 1);
    }

    setWheelUsed(false);

    // Randomly trigger a dilemma or quiz
    const randomDilemma = generateRandomDilemma(dilemmaQuestions, completedDilemmas);
    if (randomDilemma) {
      const idx = dilemmaQuestions.indexOf(randomDilemma);
      if (idx !== -1) {
        setDilemma(randomDilemma);
        setCurrentDilemmaIndex(idx);
        return;
      }
    }

    const randomQuiz = generateRandomQuiz(GAME_CONFIG.QUIZ_QUESTIONS);
    if (randomQuiz) {
      setQuiz(randomQuiz);
      return;
    }

    // Endgame trigger
    if (
      returns !== null &&
      checkGameEnd(returns, badges, GAME_CONFIG.MAX_BADGES) &&
      !endgame
    ) {
      setEndgame(true);
      setTimeout(() => setShowSummary(true), 2500);
    }

    // Pick a random event
    const ev = generateRandomEvent(eventsData);
    setEvent(ev);

    // If event has choices, wait for user decision
    if (ev && ev.choices && ev.choices.length > 0) {
      return;
    }

    const taskIdx = (day + 1) % tasksData.length;
    setTask(tasksData[taskIdx]);
    setTaskObjective(taskGoals[tasksData[taskIdx].id].objective);
    setDay(day + 1);

    const result = calculateDailyReturns(weights, assetsData, ev, portfolioValue, peakValue);
    const dayReturn = result.returns;
    setReturns(dayReturn);
    setVolatility(result.volatility);
    setDrawdown(result.drawdown);
    setPortfolioValue(result.portfolioValue);
    setPeakValue(result.peakValue);

    setCoins(c => c + Math.max(0, Math.floor(dayReturn / 10)));
    if (dayReturn > 50) setGems(g => g + 1);
    if (dayReturn > 0) addStars(1);

    const goal = taskGoals[task.id];
    let taskCompleted = false;
    if (goal && goal.check(weights)) {
      taskCompleted = true;
      setCoins(c => c + goal.reward.coins);
      setGems(g => g + goal.reward.gems);
    }

    const earnedBadges = checkBadgeEligibility(weights, history, dayReturn, badges);
    let newBadges = [...badges, ...earnedBadges];
    if (goal && taskCompleted && goal.reward.badge && !newBadges.includes(goal.reward.badge)) {
      newBadges.push(goal.reward.badge);
    }
    setBadges(newBadges);

    const sanitizedWeights = Object.fromEntries(
      Object.entries(weights).map(([k, v]) => [k, allowedAssets.includes(k) ? v : 0])
    );
    setHistory([
      ...history,
      {
        day: day + 1,
        weights: { ...sanitizedWeights },
        eventId: ev ? ev.id : undefined,
        effect: ev ? ev.description : undefined,
        returns: dayReturn,
        taskId: task.id,
        taskCompleted,
        reward: taskCompleted ? goal.reward : undefined,
      },
    ]);

    setLastTaskResult(goal ? { title: task.title, completed: taskCompleted, reward: goal.reward } : null);
  }, [day, returns, badges, weights, history, completedDilemmas, portfolioValue, peakValue, event, task, allowedAssets, endgame]);

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
    taskObjective,
    lastTaskResult,
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
    completedDilemmas,
    skillProgress,
    
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
    addStars,
    handleDilemmaAnswer
  };
};
