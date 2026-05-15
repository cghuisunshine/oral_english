import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT_DIR = fileURLToPath(new URL('../', import.meta.url));
const HTML_PATH = join(ROOT_DIR, 'daily_speaking_practice.html');
const MARKDOWN_PATH = join(ROOT_DIR, 'ielts_2025_sep_dec_question_bank.md');
const AUDIO_DIR = join(ROOT_DIR, 'audio', 'model-answers');
const MANIFEST_PATH = join(ROOT_DIR, 'audio', 'model_answer_audio_manifest.json');
const DEFAULT_VOICE = 'en-US-AriaNeural';
const GENERATOR = 'edge-tts';

const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const dryRun = args.has('--dry-run');
const voice = process.env.MODEL_ANSWER_VOICE || DEFAULT_VOICE;

function getModelAnswerAudioKey(partName, question, answer) {
  const source = `${partName}\n${question}\n${answer}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index++) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `answer-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function countWords(value) {
  return String(value || '').match(/\b[\w'-]+\b/g)?.length || 0;
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function readEmbeddedPracticeContent() {
  const html = readFileSync(HTML_PATH, 'utf8');
  const match = html.match(/<script\s+id="practice-content"\s+type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error('Could not find embedded practice-content JSON in daily_speaking_practice.html');
  }
  return JSON.parse(match[1].trim());
}

function collectEmbeddedModelAnswers() {
  const content = readEmbeddedPracticeContent();
  const prompts = [];

  for (const part of content.parts || []) {
    for (const prompt of part.prompts || []) {
      const answer = normalizeText(prompt.answer);
      if (!answer) {
        continue;
      }
      prompts.push({
        source: 'embedded-html',
        partName: part.name,
        question: normalizeText(prompt.question),
        answer
      });
    }
  }

  return prompts;
}

function collectMarkdownModelAnswers() {
  const markdown = readFileSync(MARKDOWN_PATH, 'utf8').replace(/\r\n?/g, '\n');
  const lines = markdown.split('\n');
  const prompts = [];
  let section = '';
  let currentQuestion = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^##\s+Part 1 Quick Interview Bank/i.test(trimmed)) {
      section = 'part1';
      currentQuestion = '';
      continue;
    }
    if (/^##\s+Part 2 And Part 3 Cue-Card Bank/i.test(trimmed)) {
      section = 'part23';
      currentQuestion = '';
      continue;
    }
    if (section && /^##\s+/i.test(trimmed)) {
      break;
    }
    if (!section) {
      continue;
    }

    if (section === 'part1') {
      const part1QuestionMatch = trimmed.match(/^Question:\s*(.+)$/i);
      if (part1QuestionMatch) {
        currentQuestion = normalizeText(part1QuestionMatch[1]);
        continue;
      }

      const part1AnswerMatch = trimmed.match(/^Answer:\s*(.+)$/i);
      if (part1AnswerMatch && currentQuestion) {
        prompts.push({
          source: 'markdown-bank',
          partName: 'Part 1',
          question: currentQuestion,
          answer: normalizeText(part1AnswerMatch[1])
        });
      }
      continue;
    }

    const questionMatch = trimmed.match(/^\d+\.\s*(.+)$/);
    if (questionMatch) {
      currentQuestion = '';
      continue;
    }

    const cueCardMatch = trimmed.match(/^Cue card:\s*(.+)$/i);
    if (cueCardMatch) {
      currentQuestion = normalizeText(cueCardMatch[1]);
      continue;
    }

    const part2AnswerMatch = trimmed.match(/^Model answer:\s*(.+)$/i);
    if (part2AnswerMatch && currentQuestion) {
      prompts.push({
        source: 'markdown-bank',
        partName: 'Part 2',
        question: currentQuestion,
        answer: normalizeText(part2AnswerMatch[1])
      });
      continue;
    }

    const part3QuestionMatch = trimmed.match(/^Part 3:\s*(.+)$/i);
    if (part3QuestionMatch) {
      currentQuestion = normalizeText(part3QuestionMatch[1]);
      continue;
    }

    const part3AnswerMatch = trimmed.match(/^Answer:\s*(.+)$/i);
    if (part3AnswerMatch && currentQuestion) {
      prompts.push({
        source: 'markdown-bank',
        partName: 'Part 3',
        question: currentQuestion,
        answer: normalizeText(part3AnswerMatch[1])
      });
    }
  }

  return prompts;
}

function dedupePrompts(prompts) {
  const byKey = new Map();

  for (const prompt of prompts) {
    const key = getModelAnswerAudioKey(prompt.partName, prompt.question, prompt.answer);
    if (!byKey.has(key)) {
      byKey.set(key, { ...prompt, key, words: countWords(prompt.answer) });
    }
  }

  return [...byKey.values()].sort((left, right) => left.key.localeCompare(right.key));
}

function resolveEdgeTtsCommand() {
  const configuredCommand = process.env.EDGE_TTS_COMMAND;
  if (configuredCommand) {
    return configuredCommand.split(/\s+/).filter(Boolean);
  }

  const localPython = join(ROOT_DIR, '.venv', 'bin', 'python');
  if (existsSync(localPython)) {
    const localModuleCheck = spawnSync(localPython, ['-m', 'edge_tts', '--help'], { encoding: 'utf8' });
    if (localModuleCheck.status === 0) {
      return [localPython, '-m', 'edge_tts'];
    }
  }

  const pythonModuleCheck = spawnSync('python3', ['-m', 'edge_tts', '--help'], { encoding: 'utf8' });
  if (pythonModuleCheck.status === 0) {
    return ['python3', '-m', 'edge_tts'];
  }

  const cliCheck = spawnSync('edge-tts', ['--help'], { encoding: 'utf8' });
  if (cliCheck.status === 0) {
    return ['edge-tts'];
  }

  throw new Error(
    'edge-tts is not installed. Install it with "python3 -m pip install --user edge-tts", then rerun this script.'
  );
}

function generateAudioFile(command, prompt, outputPath) {
  const [bin, ...baseArgs] = command;
  const result = spawnSync(
    bin,
    [
      ...baseArgs,
      '--voice',
      voice,
      '--text',
      prompt.answer,
      '--write-media',
      outputPath
    ],
    { encoding: 'utf8' }
  );

  if (result.status !== 0) {
    throw new Error(
      `Failed to generate ${prompt.key}: ${result.stderr || result.stdout || `${bin} exited with ${result.status}`}`
    );
  }
}

function buildManifest(prompts) {
  const entries = {};
  const items = [];

  for (const prompt of prompts) {
    const relativePath = `audio/model-answers/${prompt.key}.mp3`;
    entries[prompt.key] = relativePath;
    items.push({
      key: prompt.key,
      partName: prompt.partName,
      question: prompt.question,
      words: prompt.words,
      audio: relativePath,
      source: prompt.source
    });
  }

  return {
    voice,
    generator: GENERATOR,
    generatedAt: new Date().toISOString(),
    entries,
    items
  };
}

function writeEmbeddedManifest(manifest) {
  const html = readFileSync(HTML_PATH, 'utf8');
  const manifestJson = JSON.stringify(manifest, null, 2);
  const block = `  <script id="model-answer-audio-manifest" type="application/json">\n${manifestJson}\n  </script>`;
  const existingBlockPattern = /  <script id="model-answer-audio-manifest" type="application\/json">[\s\S]*?  <\/script>/;

  if (existingBlockPattern.test(html)) {
    writeFileSync(HTML_PATH, html.replace(existingBlockPattern, block));
    return;
  }

  const practiceContentEnd = '  </script>\n\n  <header>';
  if (!html.includes(practiceContentEnd)) {
    throw new Error('Could not find a place to embed the model-answer audio manifest.');
  }

  writeFileSync(HTML_PATH, html.replace(practiceContentEnd, `  </script>\n\n${block}\n\n  <header>`));
}

const prompts = dedupePrompts([
  ...collectEmbeddedModelAnswers(),
  ...collectMarkdownModelAnswers()
]);

if (!dryRun) {
  mkdirSync(AUDIO_DIR, { recursive: true });
}

const command = dryRun ? null : resolveEdgeTtsCommand();
for (const prompt of prompts) {
  const outputPath = join(AUDIO_DIR, `${prompt.key}.mp3`);
  if (!force && !dryRun && existsSync(outputPath) && statSync(outputPath).size > 0) {
    continue;
  }
  if (dryRun) {
    continue;
  }
  generateAudioFile(command, prompt, outputPath);
}

const manifest = buildManifest(prompts);
if (!dryRun) {
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  writeEmbeddedManifest(manifest);
}

console.log(`${dryRun ? 'Found' : 'Generated manifest for'} ${prompts.length} Part 1/Part 2/Part 3 model-answer audio items.`);
