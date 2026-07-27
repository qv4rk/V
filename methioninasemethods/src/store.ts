import { useState, useCallback } from 'react';
import { LogEntry, AppSettings } from './types';

export function useAppState() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    medCheckCount: 0,
    dailyLimit: 150,
  });

  const getTodayLogs = useCallback(() => {
    const today = new Date().toLocaleDateString();
    return logs.filter(log => log.date === today);
  }, [logs]);

  const getTodayTotal = useCallback(() => {
    const todayLogs = getTodayLogs();
    return todayLogs.reduce((total, log) => total + log.amount, 0);
  }, [getTodayLogs]);

  const getTodayWater = useCallback(() => {
    const today = new Date().toLocaleDateString();
    const waterLog = logs.find(log => log.name === 'Water' && log.date === today);
    return waterLog ? waterLog.amount : 0;
  }, [logs]);

  const addLog = useCallback((name: string, amount: number, isEstimate: boolean = false) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      amount,
      isEstimate,
      date: new Date().toLocaleDateString(),
    };
    setLogs(prev => [...prev, newLog]);
  }, []);

  const removeLog = useCallback((id: string) => {
    setLogs(prev => prev.filter(log => log.id !== id));
  }, []);

  const addWater = useCallback(() => {
    const today = new Date().toLocaleDateString();
    const waterLog = logs.find(log => log.name === 'Water' && log.date === today);
    if (waterLog) {
      setLogs(prev =>
        prev.map(log =>
          log.id === waterLog.id ? { ...log, amount: log.amount + 1 } : log
        )
      );
    } else {
      addLog('Water', 1);
    }
  }, [logs, addLog]);

  return {
    logs,
    settings,
    setSettings,
    getTodayLogs,
    getTodayTotal,
    getTodayWater,
    addLog,
    removeLog,
    addWater,
  };
}
