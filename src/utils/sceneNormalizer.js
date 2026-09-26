/**
 * Scene Normalizer — deterministic scene extraction from plain text scripts.
 *
 * The existing script generator produces plain text with markdown formatting
 * (bold headers, timestamps like (0s-5s), numbered sections). This normalizer
 * creates a parallel data structure WITHOUT modifying the original script.
 *
 * Heuristics for scene boundary detection:
 * 1. Bold text **Section Title** at the start of a block → new scene
 * 2. Numbered sections (1., 2., etc.) at block start → new scene
 * 3. Timestamp markers (0s-5s) → new scene
 * 4. Major paragraph gaps (double newlines) → potential boundary
 * 5. Fallback: ~150-word chunks if no boundaries detected
 */

const WORDS_PER_SECOND_NARRATION = 2.5; // ~150 words per minute
const MIN_SCENE_WORDS = 10;
const FALLBACK_CHUNK_WORDS = 150;

/**
 * Normalize a raw script into structured scenes.
 *
 * @param {string} scriptText - Raw script text from the generator
 * @param {string} generationId - Current generation ID for sceneId construction
 * @returns {Array<{sceneId: string, sceneNumber: number, title: string, narration: string, estimatedDuration: number}>}
 */
export function normalizeScenes(scriptText, generationId) {
  if (!scriptText || !scriptText.trim()) return [];

  // Split by double newlines into blocks
  const blocks = scriptText
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(b => b.length > 0);

  if (blocks.length === 0) return [];

  // Try to detect structured scene boundaries
  const scenes = detectSceneBoundaries(blocks);

  // If we found meaningful scenes, use them
  if (scenes.length >= 2) {
    return scenes.map((scene, idx) => buildScene(scene, idx, generationId));
  }

  // Fallback: chunk by word count
  return chunkByWordCount(scriptText, generationId);
}

/**
 * Detect scene boundaries using heuristics.
 * Returns an array of { title, narration } objects.
 */
function detectSceneBoundaries(blocks) {
  const scenes = [];
  let currentScene = { title: '', narrationBlocks: [] };

  for (const block of blocks) {
    const boundary = identifyBoundary(block);

    if (boundary.isNewScene && currentScene.narrationBlocks.length > 0) {
      // Save current scene and start new one
      scenes.push({
        title: currentScene.title,
        narration: currentScene.narrationBlocks.join('\n\n'),
      });
      currentScene = { title: boundary.title || '', narrationBlocks: [] };
      if (boundary.remainingText) {
        currentScene.narrationBlocks.push(boundary.remainingText);
      } else {
        currentScene.narrationBlocks.push(block);
      }
    } else {
      if (boundary.isNewScene && currentScene.narrationBlocks.length === 0) {
        // First scene — set title
        currentScene.title = boundary.title || '';
        if (boundary.remainingText) {
          currentScene.narrationBlocks.push(boundary.remainingText);
        } else {
          currentScene.narrationBlocks.push(block);
        }
      } else {
        // Continue current scene
        currentScene.narrationBlocks.push(block);
      }
    }
  }

  // Don't forget the last scene
  if (currentScene.narrationBlocks.length > 0) {
    scenes.push({
      title: currentScene.title,
      narration: currentScene.narrationBlocks.join('\n\n'),
    });
  }

  // Filter out scenes that are too short (likely metadata, not narration)
  return scenes.filter(s => countWords(s.narration) >= MIN_SCENE_WORDS);
}

/**
 * Identify if a block represents a scene boundary.
 */
function identifyBoundary(block) {
  // Pattern 1: Bold header **Title** at start
  const boldMatch = block.match(/^\*\*(.+?)\*\*\s*([\s\S]*)/);
  if (boldMatch) {
    return {
      isNewScene: true,
      title: boldMatch[1].trim(),
      remainingText: boldMatch[2]?.trim() || null,
    };
  }

  // Pattern 2: Markdown heading ## Title or # Title
  const headingMatch = block.match(/^#{1,6}\s+(.+?)(?:\n([\s\S]*))?$/);
  if (headingMatch) {
    return {
      isNewScene: true,
      title: headingMatch[1].trim(),
      remainingText: headingMatch[2]?.trim() || null,
    };
  }

  // Pattern 3: Timestamp at start (0s-5s) or (0:00 - 0:05)
  const timestampMatch = block.match(/^\((\d+s?[\s-]+\d+s?)\)\s*([\s\S]*)/);
  if (timestampMatch) {
    return {
      isNewScene: true,
      title: `Scene (${timestampMatch[1]})`,
      remainingText: timestampMatch[2]?.trim() || null,
    };
  }

  // Pattern 4: Numbered section "1." or "Scene 1:" at start
  const numberedMatch = block.match(/^(?:Scene\s+)?(\d+)[.:)]\s*(.+?)(?:\n([\s\S]*))?$/i);
  if (numberedMatch && parseInt(numberedMatch[1]) <= 30) {
    return {
      isNewScene: true,
      title: numberedMatch[2].trim().replace(/^\*\*|\*\*$/g, ''),
      remainingText: numberedMatch[3]?.trim() || null,
    };
  }

  return { isNewScene: false, title: null, remainingText: null };
}

/**
 * Fallback: split text into chunks of ~FALLBACK_CHUNK_WORDS words.
 */
function chunkByWordCount(scriptText, generationId) {
  const words = scriptText.split(/\s+/).filter(Boolean);
  const scenes = [];
  let chunkStart = 0;

  while (chunkStart < words.length) {
    const chunkEnd = Math.min(chunkStart + FALLBACK_CHUNK_WORDS, words.length);
    const narration = words.slice(chunkStart, chunkEnd).join(' ');

    if (countWords(narration) >= MIN_SCENE_WORDS) {
      scenes.push(buildScene(
        {
          title: `Scene ${scenes.length + 1}`,
          narration,
        },
        scenes.length,
        generationId
      ));
    }
    chunkStart = chunkEnd;
  }

  return scenes;
}

/**
 * Build a normalized scene object.
 */
function buildScene(sceneData, index, generationId) {
  const wordCount = countWords(sceneData.narration);
  const estimatedDuration = Math.max(5, Math.round(wordCount / WORDS_PER_SECOND_NARRATION));

  return {
    sceneId: `${generationId}-scene-${String(index + 1).padStart(2, '0')}`,
    sceneNumber: index + 1,
    title: sceneData.title || `Scene ${index + 1}`,
    narration: sceneData.narration,
    estimatedDuration: Math.min(estimatedDuration, 30), // Cap at 30 seconds
  };
}

function countWords(text) {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}
