'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { fetchWithTimeout, readJsonResponse } from '@/lib/api';
import { useLanguage } from '@/lib/language';

const POLL_INTERVAL_MS = 15000;
const MAX_POLL_ATTEMPTS = 240;
const ACTIVE_AI_TASK_KEY = 'printforge_active_ai_task';
const ACTIVE_TASK_MAX_AGE_MS = 12 * 60 * 60 * 1000;

type GenerationMode = 'text' | 'image';

type ActiveAiTask = {
  taskId: string;
  modelId?: string;
  createdAt: number;
};

type StartGenerationInput = {
  mode: GenerationMode;
  prompt?: string;
  imageFile?: File | null;
  token: string;
};

type AiGenerationContextValue = {
  generating: boolean;
  generatedModelId: string | null;
  statusMessage: string;
  error: string;
  activeTaskId: string | null;
  startGeneration: (input: StartGenerationInput) => Promise<void>;
  setGeneratedModelId: (modelId: string | null) => void;
  clearError: () => void;
  clearResult: () => void;
};

const copy = {
  tr: {
    created: 'Model başarıyla oluşturuldu.',
    preparing: 'Üretim görevi hazırlanıyor...',
    running: 'Üretim arka planda devam ediyor. Katalogda gezmeye devam edebilirsiniz.',
    startError: 'Model üretimi başlatılamadı.',
    generateError: 'Model üretimi sırasında bir hata oluştu.',
    failed: 'Model üretimi başarısız oldu.',
    stillRunning: 'Üretim beklenenden uzun sürdü. Biraz sonra tekrar kontrol edin.',
    apiTimeout: 'Sunucudan beklenen sürede yanıt alınamadı. Üretim yoğun olabilir; lütfen biraz sonra tekrar deneyin.',
    busy: 'Devam eden bir üretim var. Tamamlanmasını bekleyin.',
  },
  en: {
    created: 'Model was created successfully.',
    preparing: 'Preparing the generation task...',
    running: 'Generation continues in the background. You can keep browsing the catalog.',
    startError: 'Model generation could not be started.',
    generateError: 'An error occurred while generating the model.',
    failed: 'Model generation failed.',
    stillRunning: 'Generation took longer than expected. Check again shortly.',
    apiTimeout: 'The server did not respond in time. Generation may be busy; please try again shortly.',
    busy: 'A generation is already running. Wait until it finishes.',
  },
};

const AiGenerationContext = createContext<AiGenerationContextValue | null>(null);

function readActiveTask(): ActiveAiTask | null {
  try {
    const raw = localStorage.getItem(ACTIVE_AI_TASK_KEY);
    if (!raw) return null;

    const task = JSON.parse(raw) as Partial<ActiveAiTask>;
    if (!task.taskId || !task.createdAt) {
      localStorage.removeItem(ACTIVE_AI_TASK_KEY);
      return null;
    }

    if (Date.now() - task.createdAt > ACTIVE_TASK_MAX_AGE_MS) {
      localStorage.removeItem(ACTIVE_AI_TASK_KEY);
      return null;
    }

    return {
      taskId: task.taskId,
      modelId: task.modelId,
      createdAt: task.createdAt,
    };
  } catch {
    localStorage.removeItem(ACTIVE_AI_TASK_KEY);
    return null;
  }
}

function saveActiveTask(task: ActiveAiTask) {
  localStorage.setItem(ACTIVE_AI_TASK_KEY, JSON.stringify(task));
}

function clearActiveTask() {
  localStorage.removeItem(ACTIVE_AI_TASK_KEY);
}

export function AiGenerationProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const text = copy[language];
  const textRef = useRef(text);
  const pollingTaskRef = useRef<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedModelId, setGeneratedModelIdState] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  const clearResult = useCallback(() => {
    setGeneratedModelIdState(null);
    setStatusMessage('');
  }, []);

  const setGeneratedModelId = useCallback((modelId: string | null) => {
    setGeneratedModelIdState(modelId);
    if (modelId) {
      setStatusMessage(textRef.current.created);
      setError('');
      setGenerating(false);
      setActiveTaskId(null);
      pollingTaskRef.current = null;
      clearActiveTask();
    }
  }, []);

  const pollForResult = useCallback(async (task: ActiveAiTask, token: string) => {
    if (pollingTaskRef.current === task.taskId) return;

    pollingTaskRef.current = task.taskId;
    setGenerating(true);
    setActiveTaskId(task.taskId);
    setStatusMessage(textRef.current.running);
    setError('');

    try {
      for (let i = 0; i < MAX_POLL_ATTEMPTS; i += 1) {
        if (pollingTaskRef.current !== task.taskId) return;

        const response = await fetchWithTimeout(
          `/api/ai/status/${task.taskId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
          60000,
        );

        if (!response.ok) {
          await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
          continue;
        }

        const status = await readJsonResponse<{ status?: string; modelId?: string; message?: string }>(
          response,
          textRef.current.apiTimeout,
        );

        if (status.status === 'completed') {
          const readyModelId = status.modelId || task.modelId || null;
          setGeneratedModelIdState(readyModelId);
          setStatusMessage(textRef.current.created);
          setGenerating(false);
          setActiveTaskId(null);
          pollingTaskRef.current = null;
          clearActiveTask();
          return;
        }

        if (status.status === 'failed') {
          throw new Error(status.message || textRef.current.failed);
        }

        setStatusMessage(textRef.current.running);
        await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
      }

      throw new Error(textRef.current.stillRunning);
    } catch (err: any) {
      if (pollingTaskRef.current !== task.taskId) return;

      setError(err.name === 'AbortError' ? textRef.current.apiTimeout : err.message || textRef.current.generateError);
      setGenerating(false);
      setActiveTaskId(null);
      pollingTaskRef.current = null;
      clearActiveTask();
    }
  }, []);

  const startGeneration = useCallback(
    async ({ mode, prompt, imageFile, token }: StartGenerationInput) => {
      if (generating) {
        setError(textRef.current.busy);
        return;
      }

      setError('');
      setGeneratedModelIdState(null);
      setGenerating(true);
      setStatusMessage(textRef.current.preparing);

      try {
        const formData = new FormData();
        formData.append('type', mode);

        if (mode === 'text') {
          formData.append('prompt', (prompt || '').trim());
        } else if (imageFile) {
          formData.append('image', imageFile);
        }

        const response = await fetchWithTimeout(
          '/api/ai/generate',
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          },
          180000,
        );

        const data = await readJsonResponse<{ taskId?: string; modelId?: string; error?: string }>(
          response,
          textRef.current.apiTimeout,
        );
        if (!response.ok) throw new Error(data.error || textRef.current.startError);
        if (!data.taskId) throw new Error(textRef.current.startError);

        const task: ActiveAiTask = {
          taskId: data.taskId,
          modelId: data.modelId,
          createdAt: Date.now(),
        };

        saveActiveTask(task);
        void pollForResult(task, token);
      } catch (err: any) {
        setError(err.name === 'AbortError' ? textRef.current.apiTimeout : err.message || textRef.current.generateError);
        setGenerating(false);
        setActiveTaskId(null);
        pollingTaskRef.current = null;
        clearActiveTask();
      }
    },
    [generating, pollForResult],
  );

  useEffect(() => {
    const token = localStorage.getItem('token');
    const task = token ? readActiveTask() : null;
    if (task && token) {
      void pollForResult(task, token);
    }
  }, [pollForResult]);

  const value = useMemo<AiGenerationContextValue>(
    () => ({
      generating,
      generatedModelId,
      statusMessage,
      error,
      activeTaskId,
      startGeneration,
      setGeneratedModelId,
      clearError,
      clearResult,
    }),
    [
      activeTaskId,
      clearError,
      clearResult,
      error,
      generatedModelId,
      generating,
      setGeneratedModelId,
      startGeneration,
      statusMessage,
    ],
  );

  return <AiGenerationContext.Provider value={value}>{children}</AiGenerationContext.Provider>;
}

export function useAiGeneration() {
  const context = useContext(AiGenerationContext);
  if (!context) {
    throw new Error('useAiGeneration must be used inside AiGenerationProvider');
  }
  return context;
}
