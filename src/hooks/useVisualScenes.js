import { useState, useRef, useCallback, useEffect } from 'react';
import { apiPost, ApiError } from '../api.js';
import { normalizeScenes } from '../utils/sceneNormalizer.js';

const MAX_CONCURRENT = 3;

/**
 * Custom hook for Visual Scene Agent orchestration.
 *
 * Manages:
 * - Generation identity (generationId) for stale-request protection
 * - AbortController for cancellation
 * - Scene normalization from raw script text
 * - Global visual profile generation (one AI call per script)
 * - Concurrency-limited queue (max 3 parallel requests)
 * - Per-scene status tracking (queued/generating/completed/failed/cancelled)
 * - Retry per scene
 * - Result caching in state
 */
export function useVisualScenes(token) {
  const [scenes, setScenes] = useState([]);
  const [sceneStates, setSceneStates] = useState({});
  const [globalProfile, setGlobalProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [visualSettings, setVisualSettings] = useState({
    visualStyle: 'cinematic_documentary',
    aspectRatio: '16:9',
    duration: 8,
    generationMode: 'ai_generated',
  });

  const generationIdRef = useRef(null);
  const abortControllerRef = useRef(null);
  const scriptIdRef = useRef(null);
  const tokenRef = useRef(token);

  // Keep tokenRef in sync so callbacks always have the latest token
  useEffect(() => { tokenRef.current = token; }, [token]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Update a single visual setting.
   */
  const updateSetting = useCallback((key, value) => {
    setVisualSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Update a single scene's status.
   */
  const updateSceneStatus = useCallback((sceneId, status, data = null, error = null) => {
    setSceneStates(prev => ({
      ...prev,
      [sceneId]: { status, data, error, lastUpdated: Date.now() },
    }));
  }, []);

  /**
   * Extract scenes from script and initialize states.
   * Returns the normalized scenes array.
   */
  const extractScenes = useCallback((scriptText) => {
    const genId = `gen-${crypto.randomUUID().slice(0, 8)}`;
    generationIdRef.current = genId;
    scriptIdRef.current = `script-${crypto.randomUUID().slice(0, 8)}`;

    const normalized = normalizeScenes(scriptText, genId);
    setScenes(normalized);

    // Initialize all scenes as 'queued'
    const initialStates = {};
    normalized.forEach(scene => {
      initialStates[scene.sceneId] = { status: 'queued', data: null, error: null };
    });
    setSceneStates(initialStates);

    return { scenes: normalized, generationId: genId };
  }, []);

  /**
   * Process a single scene — makes the API call.
   */
  const processScene = useCallback(async (scene, generationId, profile, signal) => {
    if (!tokenRef.current) throw new ApiError('Please sign in before generating visuals.', 401);
    const request = {
      generationId,
      scriptId: scriptIdRef.current,
      sceneId: scene.sceneId,
      sceneNumber: scene.sceneNumber,
      sceneTitle: scene.title,
      scriptText: scene.narration,
      globalVisualProfile: profile,
      userSettings: {
        aspectRatio: visualSettings.aspectRatio,
        duration: visualSettings.duration,
        generationMode: visualSettings.generationMode,
      },
    };

    const response = await apiPost('/visual-scene/generate', request, tokenRef.current, 'POST', { signal });
    return response;
  }, [visualSettings]);

  /**
   * Run the concurrency-limited queue.
   */
  const processSceneQueue = useCallback(async (scenesToProcess, generationId, profile, signal) => {
    let activeCount = 0;
    let queueIndex = 0;
    let authFailed = false;

    return new Promise((resolve) => {
      function tryStartNext() {
        // Stop if aborted or generation changed
        if (authFailed || signal.aborted || generationIdRef.current !== generationId) {
          resolve();
          return;
        }

        while (activeCount < MAX_CONCURRENT && queueIndex < scenesToProcess.length) {
          if (signal.aborted || generationIdRef.current !== generationId) {
            resolve();
            return;
          }

          const scene = scenesToProcess[queueIndex++];
          activeCount++;

          // Mark as generating
          if (generationIdRef.current === generationId) {
            updateSceneStatus(scene.sceneId, 'generating');
          }

          processScene(scene, generationId, profile, signal)
            .then(data => {
              // Only update if this is still the active generation
              if (!signal.aborted && !authFailed && generationIdRef.current === generationId) {
                updateSceneStatus(scene.sceneId, 'completed', data);
              }
            })
            .catch(err => {
              if (err.name === 'AbortError') return;
              if (generationIdRef.current === generationId) {
                if (err.status === 401 || err.status === 403) {
                  authFailed = true;
                  setError(err.message);
                  abortControllerRef.current?.abort();
                  setSceneStates(prev => Object.fromEntries(Object.entries(prev).map(([id, state]) =>
                    [id, ['queued', 'generating'].includes(state.status)
                      ? { ...state, status: 'failed', error: err.message } : state])));
                }
                updateSceneStatus(scene.sceneId, 'failed', null, err.message || 'Visual direction failed');
              }
            })
            .finally(() => {
              activeCount--;
              tryStartNext();
              if (activeCount === 0 && queueIndex >= scenesToProcess.length) {
                resolve();
              }
            });
        }

        // If nothing was started and nothing is active, resolve
        if (activeCount === 0 && queueIndex >= scenesToProcess.length) {
          resolve();
        }
      }

      tryStartNext();
    });
  }, [processScene, updateSceneStatus]);

  /**
   * Start visual generation for all scenes in a script.
   * Cancels any previous generation.
   */
  const startVisualGeneration = useCallback(async (scriptText, topic, category, videoFormat) => {
    // Cancel previous generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setError('');
    setGlobalProfile(null);
    if (!tokenRef.current) {
      generationIdRef.current = null;
      setError('Please sign in before generating visuals.');
      setIsProcessing(false);
      setIsProfileLoading(false);
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Extract and normalize scenes
    const { scenes: normalizedScenes, generationId } = extractScenes(scriptText);

    if (normalizedScenes.length === 0) {
      setIsProcessing(false);
      setIsProfileLoading(false);
      return;
    }

    setIsProcessing(true);

    // Step 1: Generate global visual profile (one AI call)
    setIsProfileLoading(true);
    let profile = null;
    try {
      const profileResponse = await apiPost('/visual-scene/profile', {
        topic: topic || '',
        category: category || '',
        videoFormat: videoFormat || '',
        visualStyle: visualSettings.visualStyle,
      }, tokenRef.current, 'POST', { signal: abortController.signal });
      if (abortController.signal.aborted || generationIdRef.current !== generationId) return;
      profile = profileResponse.globalVisualProfile || null;
      setGlobalProfile(profile);
    } catch (err) {
      if (abortController.signal.aborted || generationIdRef.current !== generationId) return;
      if (err.status === 401 || err.status === 403) {
        setError(err.message);
        normalizedScenes.forEach(scene => updateSceneStatus(scene.sceneId, 'failed', null, err.message));
        setIsProcessing(false);
        return;
      }
      // Use defaults if profile generation fails
      profile = {
        style: visualSettings.visualStyle.replace(/_/g, ' '),
        realismLevel: 'photorealistic',
        colorTreatment: 'natural tones',
        cinematicStyle: 'documentary realism',
        lightingStyle: 'natural lighting',
        cameraLanguage: 'steady cinematic movement',
        environmentStyle: 'realistic environments',
      };
      setGlobalProfile(profile);
    } finally {
      if (generationIdRef.current === generationId) setIsProfileLoading(false);
    }

    // Check if cancelled during profile generation
    if (abortController.signal.aborted || generationIdRef.current !== generationId) {
      if (generationIdRef.current === generationId) setIsProcessing(false);
      return;
    }

    // Step 2: Process scenes with concurrency queue
    await processSceneQueue(normalizedScenes, generationId, profile, abortController.signal);

    // Only update isProcessing if this is still the active generation
    if (generationIdRef.current === generationId) {
      setIsProcessing(false);
    }
  }, [visualSettings, extractScenes, processSceneQueue, updateSceneStatus]);

  /**
   * Retry a single failed scene.
   */
  const retryScene = useCallback(async (sceneId) => {
    const scene = scenes.find(s => s.sceneId === sceneId);
    if (!scene) return;

    const generationId = generationIdRef.current;
    setError('');
    updateSceneStatus(sceneId, 'generating');

    try {
      if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) {
        abortControllerRef.current = new AbortController();
      }
      const signal = abortControllerRef.current.signal;
      const data = await processScene(scene, generationId, globalProfile, signal);
      if (!signal.aborted && generationIdRef.current === generationId) {
        updateSceneStatus(sceneId, 'completed', data);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (generationIdRef.current === generationId) {
        if (err.status === 401 || err.status === 403) setError(err.message);
        updateSceneStatus(sceneId, 'failed', null, err.message || 'Retry failed');
      }
    }
  }, [scenes, globalProfile, processScene, updateSceneStatus]);

  /**
   * Regenerate visual direction for a single scene.
   */
  const regenerateScene = useCallback(async (sceneId) => {
    await retryScene(sceneId);
  }, [retryScene]);

  /**
   * Cancel all running visual generation.
   */
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsProcessing(false);
    setIsProfileLoading(false);

    // Mark all generating/queued scenes as cancelled
    setSceneStates(prev => {
      const updated = { ...prev };
      for (const [id, state] of Object.entries(updated)) {
        if (state.status === 'generating' || state.status === 'queued') {
          updated[id] = { ...state, status: 'cancelled' };
        }
      }
      return updated;
    });
  }, []);

  /**
   * Reset all visual scene state (e.g., when a new script is generated).
   */
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setScenes([]);
    setSceneStates({});
    setGlobalProfile(null);
    setError('');
    setIsProcessing(false);
    setIsProfileLoading(false);
    generationIdRef.current = null;
  }, []);

  return {
    // State
    scenes,
    sceneStates,
    globalProfile,
    isProfileLoading,
    isProcessing,
    error,
    visualSettings,

    // Actions
    updateSetting,
    startVisualGeneration,
    retryScene,
    regenerateScene,
    cancelGeneration,
    reset,
  };
}
