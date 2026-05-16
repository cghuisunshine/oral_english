import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const html = readFileSync(new URL('./daily_speaking_practice.html', import.meta.url), 'utf8');
const questionBankMarkdown = readFileSync(new URL('./ielts_2025_sep_dec_question_bank.md', import.meta.url), 'utf8');
const modelAnswerManifestUrl = new URL('./audio/model_answer_audio_manifest.json', import.meta.url);
const modelAnswerManifestExists = existsSync(modelAnswerManifestUrl);
const modelAnswerAudioManifest = modelAnswerManifestExists
  ? JSON.parse(readFileSync(modelAnswerManifestUrl, 'utf8'))
  : null;
const audioGenerationScript = existsSync(new URL('./scripts/generate_model_answer_audio.mjs', import.meta.url))
  ? readFileSync(new URL('./scripts/generate_model_answer_audio.mjs', import.meta.url), 'utf8')
  : '';

const contentMatch = html.match(
  /<script\s+id="practice-content"\s+type="application\/json">([\s\S]*?)<\/script>/
);

assert.ok(contentMatch, 'IELTS content must be stored in a separate JSON script block');

const content = JSON.parse(contentMatch[1].trim());

assert.equal(content.examName, 'IELTS Speaking');
assert.ok(Array.isArray(content.parts), 'content.parts must be an array');
assert.equal(content.parts.length, 3, 'IELTS speaking practice should include Parts 1, 2, and 3');

const partNames = content.parts.map((part) => part.name);
assert.deepEqual(partNames, ['Part 1', 'Part 2', 'Part 3']);

function countWords(value) {
  return String(value || '').match(/\b[\w'-]+\b/g)?.length || 0;
}

for (const part of content.parts) {
  assert.ok(part.focus, `${part.name} needs a practice focus`);
  assert.ok(Array.isArray(part.prompts), `${part.name} prompts must be an array`);
  assert.ok(part.prompts.length >= 4, `${part.name} needs at least four prompts`);
  for (const prompt of part.prompts) {
    assert.equal(typeof prompt, 'object', `${part.name} prompts should be structured practice items`);
    assert.ok(prompt.question, `${part.name} prompt needs a question`);
    assert.ok(prompt.answer, `${part.name} prompt needs a model answer`);
    assert.ok(Array.isArray(prompt.cuePoints), `${part.name} prompt needs cue-card points`);
    assert.ok(prompt.cuePoints.length >= 3, `${part.name} prompt needs at least three cue-card points`);
    if (part.name === 'Part 2') {
      assert.ok(countWords(prompt.answer) >= 120, `${part.name} model answer should support a 1-2 minute response`);
    }
    if (part.name === 'Part 3') {
      assert.ok(countWords(prompt.answer) >= 150, `${part.name} model answer should support extended discussion practice`);
    }
  }
}

assert.match(html, /JSON\.parse\(document\.getElementById\('practice-content'\)\.textContent\)/);
assert.match(html, /renderExamContent\(\)/);
assert.doesNotMatch(html, /const\s+prompts\s*=\s*\[/, 'prompts should not be hard-coded in framework logic');
assert.doesNotMatch(html, /<h2>Practice Timer<\/h2>/, 'practice timer section should be removed');
assert.doesNotMatch(html, /id="timer"/, 'standalone timer display should be removed');
assert.doesNotMatch(html, /function\s+startTimer\(/, 'standalone timer start logic should be removed');
assert.doesNotMatch(html, /function\s+resetTimer\(/, 'standalone timer reset logic should be removed');

const questionBankLines = questionBankMarkdown.replace(/\r\n?/g, '\n').split('\n');
let questionBankAnswerCount = 0;
for (let index = 0; index < questionBankLines.length; index++) {
  if (/^\s*(?:Answer|Model answer):/i.test(questionBankLines[index])) {
    questionBankAnswerCount++;
    const nextContentLine = questionBankLines.slice(index + 1).find((line) => line.trim());
    assert.match(
      nextContentLine || '',
      /^\s*Keywords:\s*[^;]+;\s*[^;]+;\s*[^;]+/,
      'each question-bank answer should have at least three curated keyword phrases on the next content line'
    );
  }
}
assert.equal(questionBankAnswerCount, 201, 'question bank should still contain all answer entries');
assert.doesNotMatch(
  questionBankMarkdown,
  /I think this question is connected to everyday choices because it depends on people's habits, values, and circumstances/,
  'Part 3 Markdown answers should not reuse the old generic boilerplate'
);
assert.doesNotMatch(
  html,
  /I think this question is connected to everyday choices because it depends on people's habits, values, and circumstances/,
  'embedded Part 3 answers should not reuse the old generic boilerplate'
);
assert.doesNotMatch(
  questionBankMarkdown,
  /For that reason, I would answer this question by comparing different groups/,
  'Part 3 Markdown answers should have concrete endings instead of generic answer advice'
);

assert.match(html, /id="questionBankImport"/, 'page should include a Markdown question-bank import input');
assert.match(html, /id="questionBankUrl"/, 'page should include a GitHub Markdown URL input');
assert.match(html, /id="questionBankUrlOptions"/, 'page should include a dropdown for sibling GitHub Markdown files');
assert.match(html, /id="questionBankUrlImport"/, 'page should include a GitHub Markdown URL import button');
assert.match(html, /id="recordPromptButton"/, 'page should include an icon button for recording the current prompt');
assert.match(html, /id="playPromptRecordingButton"/, 'page should include an icon button for playing the current prompt recording');
assert.match(html, /id="recordingStatus"/, 'page should include recording status text');
assert.doesNotMatch(html, /id="mobilePromptScroll"/, 'page should not include the removed mobile prompt scroll control');
assert.match(html, /function\s+parseQuestionBankMarkdown\(/, 'page should parse imported Markdown question banks');
assert.match(html, /function\s+handleQuestionBankImport\(/, 'page should handle imported Markdown files');
assert.match(html, /function\s+normalizeQuestionBankUrl\(/, 'page should normalize GitHub question-bank links');
assert.match(html, /function\s+getQuestionBankSourceName\(/, 'page should shorten import status sources to filenames');
assert.match(html, /SAVED_QUESTION_BANK_STORAGE_KEY/, 'page should define one localStorage key for saved imports');
assert.match(html, /function\s+saveImportedQuestionBank\(/, 'page should save successful imports to localStorage');
assert.match(html, /function\s+loadSavedQuestionBank\(/, 'page should automatically load the latest saved import');
assert.match(html, /function\s+getCurrentPromptRecordingKey\(/, 'page should key recordings to the current prompt');
assert.match(html, /MODEL_ANSWER_AUDIO_MANIFEST_URL/, 'page should know where generated model-answer audio is stored');
assert.match(html, /function\s+getModelAnswerAudioKey\(/, 'page should derive stable model-answer audio keys');
assert.match(html, /id="model-answer-audio-manifest"/, 'page should embed generated model-answer audio manifest for direct file use');
assert.match(html, /function\s+getEmbeddedModelAnswerAudioManifest\(/, 'page should read the embedded model-answer audio manifest');
assert.match(html, /function\s+loadModelAnswerAudioManifest\(/, 'page should load the generated model-answer audio manifest');
assert.match(html, /function\s+playGeneratedModelAnswerAudio\(/, 'page should try generated audio before browser speech synthesis');
assert.match(html, /function\s+splitModelAnswerSentences\(/, 'page should split model answers into highlightable sentences');
assert.match(html, /function\s+renderModelAnswerText\(/, 'page should render model answers as sentence spans');
assert.match(html, /function\s+highlightModelAnswerSentence\(/, 'page should highlight the sentence currently being read');
assert.match(html, /function\s+getModelAnswerSentenceIndexAtTime\(/, 'page should estimate the current generated-audio sentence from playback time');
assert.match(html, /\.model-answer-sentence\.is-reading/, 'page should style the sentence currently being read');
assert.match(html, /function\s+getPromptCuePoints\(/, 'page should read cue-card points from the selected prompt');
assert.match(html, /function\s+getCueCardNotesText\(/, 'page should format cue cards for the keyword notes box');
assert.match(html, /function\s+fillCueCardNotesTextarea\(/, 'page should fill the keyword notes box with cue-card content');
assert.match(html, /function\s+resetNotesTextarea\(/, 'page should reset notes when moving to a different prompt');
assert.match(html, /function\s+getModelAnswerKeywordNotesText\(/, 'page should format model answers into keyword notes');
assert.match(html, /function\s+getPromptKeywordNotesText\(/, 'page should prefer curated Markdown keywords when available');
assert.match(html, /function\s+fillModelAnswerKeywordNotesTextarea\(/, 'page should fill the keyword notes box with model-answer keywords');
assert.match(html, /function\s+togglePromptRecording\(/, 'page should toggle recording for the current prompt');
assert.match(html, /function\s+playPromptRecording\(/, 'page should play the current prompt recording');
assert.match(html, /id="readModelAnswerButton"/, 'model answer section should include a dedicated read-aloud button');
assert.match(html, /function\s+getCurrentPromptModelAnswer\(/, 'page should read the current prompt model answer');
assert.match(html, /function\s+readModelAnswerAloud\(/, 'page should read model answers aloud');
assert.match(html, /function\s+renderRecordingControls\(/, 'page should update recording control state per prompt');
assert.match(html, /function\s+formatRecordingElapsedTime\(/, 'page should format elapsed recording time');
assert.match(html, /function\s+getCurrentRecordingTargetSeconds\(/, 'page should choose a recording target for each IELTS part');
assert.match(html, /function\s+updateRecordingElapsedTime\(/, 'page should update elapsed recording time while recording');
assert.match(html, /function\s+selectPromptFromBank\(/, 'page should let users select a prompt from the question bank');
assert.doesNotMatch(html, /function\s+movePromptByStep\(/, 'removed mobile prompt stepper should not remain');
assert.doesNotMatch(html, /function\s+handleMobilePromptScroll\(/, 'removed mobile prompt scroll handler should not remain');
assert.doesNotMatch(html, /function\s+handleMobilePromptTouchMove\(/, 'removed mobile prompt touch handler should not remain');
assert.match(html, /CURRENT_GITHUB_REPOSITORY/, 'page should know the current GitHub repository');
assert.match(html, /function\s+getCurrentGitHubMarkdownSearch\(/, 'page should search the current GitHub repository for Markdown files');
assert.match(html, /function\s+renderCurrentGitHubMarkdownOptions\(/, 'page should render Markdown files from the current GitHub repository');
assert.match(html, /function\s+getGitHubMarkdownDirectory\(/, 'page should derive the GitHub directory for sibling Markdown discovery');
assert.match(html, /function\s+renderQuestionBankUrlOptions\(/, 'page should render sibling GitHub Markdown files into the dropdown');
assert.match(html, /function\s+autoLoadSingleMarkdownOption\(/, 'page should automatically load a single discovered Markdown file');
assert.match(html, /function\s+handleQuestionBankUrlImport\(/, 'page should import Markdown question banks from URLs');
assert.match(
  html,
  /\.prompt-list\s*\{[\s\S]*?max-height:\s*min\(42vh,\s*360px\);[\s\S]*?overflow-y:\s*auto;/,
  'question bank list should scroll inside the IELTS prompt section'
);
assert.doesNotMatch(html, /\.mobile-prompt-scroll/, 'removed mobile prompt scroll CSS should not remain');
assert.match(html, /\.icon-button/, 'recording controls should use icon button styling');
assert.match(html, /\.record-icon/, 'record button should use a record icon');
assert.match(html, /\.play-icon/, 'play button should use a play icon');
assert.ok(modelAnswerManifestExists, 'generated model-answer audio manifest should exist');
assert.ok(modelAnswerAudioManifest && typeof modelAnswerAudioManifest === 'object', 'generated model-answer audio manifest should be JSON');
assert.equal(modelAnswerAudioManifest.voice, 'en-US-AriaNeural', 'generated audio should use the planned free TTS voice');
assert.ok(modelAnswerAudioManifest.entries && typeof modelAnswerAudioManifest.entries === 'object', 'manifest should store audio entries by generated key');
assert.match(audioGenerationScript, /writeEmbeddedManifest/, 'audio generation script should keep the embedded HTML manifest in sync');
assert.match(audioGenerationScript, /edge-tts/, 'audio generation script should use edge-tts');
assert.match(audioGenerationScript, /en-US-AriaNeural/, 'audio generation script should default to en-US-AriaNeural');
assert.match(audioGenerationScript, /Part 1/, 'audio generation script should include Part 1 model answers');
assert.match(audioGenerationScript, /Part 2|part\.name === 'Part 2'/, 'audio generation script should include Part 2 model answers');
assert.match(audioGenerationScript, /Part 3|part\.name === 'Part 3'/, 'audio generation script should include Part 3 model answers');

function extractNamedFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} function should be readable by tests`);

  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index++) {
    if (source[index] === '{') {
      depth++;
    }
    if (source[index] === '}') {
      depth--;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  assert.fail(`${name} function should have a complete body`);
}

const parseQuestionBankMarkdown = Function(`${extractNamedFunction(html, 'parseQuestionBankMarkdown')}; return parseQuestionBankMarkdown;`)();
const normalizeQuestionBankUrl = Function(`${extractNamedFunction(html, 'normalizeQuestionBankUrl')}; return normalizeQuestionBankUrl;`)();
const getQuestionBankSourceName = Function(`${extractNamedFunction(html, 'getQuestionBankSourceName')}; return getQuestionBankSourceName;`)();
const getModelAnswerAudioKey = Function(`${extractNamedFunction(html, 'getModelAnswerAudioKey')}; return getModelAnswerAudioKey;`)();
const storageKeyMatch = html.match(/const SAVED_QUESTION_BANK_STORAGE_KEY = '([^']+)'/);
assert.ok(storageKeyMatch, 'saved question bank storage key should be readable by tests');
assert.equal(storageKeyMatch[1], 'dailySpeakingPractice.latestQuestionBank');
const currentRepositoryMatch = html.match(/const CURRENT_GITHUB_REPOSITORY = (\{[\s\S]*?\});/);
assert.ok(currentRepositoryMatch, 'current GitHub repository config should be readable by tests');
const currentRepository = Function(`return (${currentRepositoryMatch[1]});`)();
const getCurrentGitHubMarkdownSearch = Function(`
  const CURRENT_GITHUB_REPOSITORY = ${currentRepositoryMatch[1]};
  ${extractNamedFunction(html, 'getCurrentGitHubMarkdownSearch')}
  return getCurrentGitHubMarkdownSearch;
`)();
const getGitHubMarkdownDirectory = Function(`${extractNamedFunction(html, 'getGitHubMarkdownDirectory')}; return getGitHubMarkdownDirectory;`)();
const getCueCardNotesText = Function(`${extractNamedFunction(html, 'getCueCardNotesText')}; return getCueCardNotesText;`)();
const getModelAnswerKeywordNotesText = Function(`${extractNamedFunction(html, 'getModelAnswerKeywordNotesText')}; return getModelAnswerKeywordNotesText;`)();
const splitModelAnswerSentences = Function(`${extractNamedFunction(html, 'splitModelAnswerSentences')}; return splitModelAnswerSentences;`)();
const getModelAnswerSentenceIndexAtTime = Function(`${extractNamedFunction(html, 'getModelAnswerSentenceIndexAtTime')}; return getModelAnswerSentenceIndexAtTime;`)();
const getPromptKeywordNotesText = Function(`
  ${extractNamedFunction(html, 'getModelAnswerKeywordNotesText')}
  ${extractNamedFunction(html, 'getPromptAnswer')}
  ${extractNamedFunction(html, 'getPromptKeywordNotesText')}
  return getPromptKeywordNotesText;
`)();
const renderQuestionBankUrlOptions = Function(`
  const select = {
    hidden: true,
    disabled: false,
    innerHTML: '',
    value: ''
  };
  const document = {
    getElementById(id) {
      if (id !== 'questionBankUrlOptions') {
        throw new Error('Unexpected element id ' + id);
      }
      return select;
    }
  };
  ${extractNamedFunction(html, 'normalizeQuestionBankUrl')}
  ${extractNamedFunction(html, 'getMarkdownItemUrl')}
  ${extractNamedFunction(html, 'renderQuestionBankUrlOptions')}
  return { renderQuestionBankUrlOptions, select };
`)();
const renderCurrentGitHubMarkdownOptions = Function(`
  const select = {
    hidden: true,
    disabled: false,
    innerHTML: '',
    value: ''
  };
  const document = {
    getElementById(id) {
      if (id !== 'questionBankUrlOptions') {
        throw new Error('Unexpected element id ' + id);
      }
      return select;
    }
  };
  const CURRENT_GITHUB_REPOSITORY = ${currentRepositoryMatch[1]};
  ${extractNamedFunction(html, 'normalizeQuestionBankUrl')}
  ${extractNamedFunction(html, 'getMarkdownItemUrl')}
  ${extractNamedFunction(html, 'renderQuestionBankUrlOptions')}
  ${extractNamedFunction(html, 'renderCurrentGitHubMarkdownOptions')}
  return { renderCurrentGitHubMarkdownOptions, select };
`)();
const autoLoadSingleMarkdownOption = Function(`
  const imported = [];
  const document = {
    elements: {
      questionBankUrl: { value: '' },
      importStatus: { textContent: '' }
    },
    getElementById(id) {
      return this.elements[id];
    }
  };
  async function importQuestionBankFromUrl(url, sourceLabel) {
    imported.push({ url, sourceLabel });
  }
  ${extractNamedFunction(html, 'normalizeQuestionBankUrl')}
  ${extractNamedFunction(html, 'getMarkdownItemUrl')}
  ${extractNamedFunction(html, 'autoLoadSingleMarkdownOption')}
  return { autoLoadSingleMarkdownOption, document, imported };
`)();
const importedBank = parseQuestionBankMarkdown(`
## Part 1 Quick Interview Bank

1. **Study or work**
   Question: Do you work or are you a student?
   Answer: I am a student, and I practise English every day.
   Keywords: student role; daily English practice; steady routine

## Part 2 And Part 3 Cue-Card Bank

### People

1. **A friend who is good at music or singing**
   Cue card: Describe a friend who is good at music or singing.
   Model answer: My friend sings beautifully and practises every week.
   Keywords: musical friend; beautiful singing; weekly practice
   Part 3: Why do people enjoy music?
   Answer: Music helps people relax and share emotions.
   Keywords: emotional expression; relaxation; shared feelings
`);

const realImportedBank = parseQuestionBankMarkdown(questionBankMarkdown);
const firstPart1ImportedPrompt = realImportedBank.parts[0].prompts[0];
const firstPart1ImportedAudioKey = getModelAnswerAudioKey(
  'Part 1',
  firstPart1ImportedPrompt.question,
  firstPart1ImportedPrompt.answer
);
const firstPart2ImportedPrompt = realImportedBank.parts[1].prompts[0];
const firstPart2ImportedAudioKey = getModelAnswerAudioKey(
  'Part 2',
  firstPart2ImportedPrompt.question,
  firstPart2ImportedPrompt.answer
);
assert.ok(
  modelAnswerAudioManifest.items.some((item) => item.partName === 'Part 1'),
  'generated model-answer audio manifest should include Part 1 items'
);
assert.ok(
  modelAnswerAudioManifest.entries[firstPart1ImportedAudioKey],
  'generated model-answer audio manifest should include imported Part 1 answers'
);
assert.ok(
  modelAnswerAudioManifest.entries[firstPart2ImportedAudioKey],
  'generated model-answer audio manifest should include imported Part 2 cue-card questions'
);
for (const part of realImportedBank.parts) {
  for (const prompt of part.prompts) {
    assert.ok(Array.isArray(prompt.keywords), `${part.name} imported prompt should include curated keywords`);
    assert.ok(prompt.keywords.length >= 3, `${part.name} imported prompt should include at least three curated keywords`);
    if (part.name === 'Part 2') {
      assert.ok(countWords(prompt.answer) >= 120, `${part.name} imported model answer should support a 1-2 minute response`);
    }
    if (part.name === 'Part 3') {
      assert.ok(countWords(prompt.answer) >= 150, `${part.name} imported model answer should support extended discussion practice`);
    }
  }
}

assert.equal(importedBank.parts.length, 3, 'imported Markdown should preserve three IELTS parts');
assert.deepEqual(importedBank.parts.map((part) => part.name), ['Part 1', 'Part 2', 'Part 3']);
assert.equal(importedBank.parts[0].prompts[0].question, 'Do you work or are you a student?');
assert.equal(importedBank.parts[0].prompts[0].answer, 'I am a student, and I practise English every day.');
assert.deepEqual(importedBank.parts[0].prompts[0].keywords, ['student role', 'daily English practice', 'steady routine']);
assert.deepEqual(importedBank.parts[0].prompts[0].cuePoints, ['your direct answer', 'one reason or detail', 'a short example']);
assert.equal(importedBank.parts[1].prompts[0].question, 'Describe a friend who is good at music or singing.');
assert.equal(importedBank.parts[1].prompts[0].answer, 'My friend sings beautifully and practises every week.');
assert.deepEqual(importedBank.parts[1].prompts[0].keywords, ['musical friend', 'beautiful singing', 'weekly practice']);
assert.deepEqual(importedBank.parts[1].prompts[0].cuePoints, ['what it was', 'when and where it happened', 'who was involved', 'why it was important to you']);
assert.equal(importedBank.parts[2].prompts[0].question, 'Why do people enjoy music?');
assert.equal(importedBank.parts[2].prompts[0].answer, 'Music helps people relax and share emotions.');
assert.deepEqual(importedBank.parts[2].prompts[0].keywords, ['emotional expression', 'relaxation', 'shared feelings']);
assert.deepEqual(importedBank.parts[2].prompts[0].cuePoints, ['your opinion', 'one reason', 'an example or comparison']);

assert.match(
  extractNamedFunction(html, 'renderPrompt'),
  /getPromptCuePoints\(prompt, part\)/,
  'cue card should be built from the selected prompt'
);
assert.match(
  html,
  /<div class="answer-box" id="answerBox" hidden>[\s\S]*?<div class="cue-card" id="cueCard" hidden>[\s\S]*?<p id="cueCardQuestion"><\/p>[\s\S]*?<div class="answer-heading">[\s\S]*?<h3>Model answer<\/h3>[\s\S]*?id="readModelAnswerButton"/,
  'the revealed answer box should include the matching cue card and a read button beside the model answer heading'
);
assert.match(
  extractNamedFunction(html, 'renderPrompt'),
  /document\.getElementById\('cueCardQuestion'\)\.textContent = getPromptQuestion\(prompt\)/,
  'cue card should show the selected prompt question'
);
assert.match(
  extractNamedFunction(html, 'renderPrompt'),
  /cueCard\.hidden = !answer \|\| !state\.answerVisible \|\| promptCuePoints\.length === 0/,
  'cue card should be revealed together with the model answer'
);
assert.equal(
  getCueCardNotesText('Describe a useful skill you learned.', ['what the skill is', 'how you learned it']),
  'Cue card:\nDescribe a useful skill you learned.\n\nYou should say:\n- what the skill is\n- how you learned it',
  'cue card notes should be formatted for speaking preparation'
);
assert.equal(
  getModelAnswerKeywordNotesText('I usually study English in the library after class because it is quiet and helps me focus.'),
  'Model answer keywords:\n- usually study English\n- library after class\n- quiet\n- helps me focus',
  'model answer keywords should be concise phrases rather than a full answer'
);
assert.equal(
  getPromptKeywordNotesText({
    answer: 'I usually study English in the library after class because it is quiet and helps me focus.',
    keywords: ['library study routine', 'quiet focus', 'after-class practice']
  }),
  'Model answer keywords:\n- library study routine\n- quiet focus\n- after-class practice',
  'curated Markdown keywords should be used before fallback keyword extraction'
);
assert.equal(
  getPromptKeywordNotesText({
    answer: 'I usually study English in the library after class because it is quiet and helps me focus.'
  }),
  'Model answer keywords:\n- usually study English\n- library after class\n- quiet\n- helps me focus',
  'keyword notes should fall back to generated keywords when Markdown has none'
);
assert.match(
  extractNamedFunction(html, 'fillCueCardNotesTextarea'),
  /notes\.value === lastAutoFilledNotesText/,
  'cue card auto-fill should only replace the previous auto-filled notes'
);
assert.match(
  extractNamedFunction(html, 'fillCueCardNotesTextarea'),
  /!\s*notes\.value\.trim\(\)/,
  'cue card auto-fill should be allowed when the keyword notes box is empty'
);
assert.match(
  extractNamedFunction(html, 'resetNotesTextarea'),
  /notes\.value = ''/,
  'resetting notes should clear the notes box'
);
assert.match(
  extractNamedFunction(html, 'resetNotesTextarea'),
  /lastAutoFilledNotesText = ''/,
  'resetting notes should clear the auto-fill sentinel'
);
assert.match(
  extractNamedFunction(html, 'newPrompt'),
  /resetNotesTextarea\(\);[\s\S]*renderPrompt\(\);/,
  'new prompt should clear notes before rendering the next prompt'
);
assert.match(
  extractNamedFunction(html, 'toggleModelAnswer'),
  /if \(state\.answerVisible\) \{[\s\S]*fillModelAnswerKeywordNotesTextarea\(\);[\s\S]*\}/,
  'showing the model answer should put model-answer keywords in the notes box'
);

const renderQuestionBankSource = extractNamedFunction(html, 'renderQuestionBank');
assert.match(renderQuestionBankSource, /<button type="button"/, 'question bank prompts should render as buttons');
assert.match(renderQuestionBankSource, /onclick="selectPromptFromBank\(\$\{index\}\)"/, 'question bank buttons should select the matching prompt index');
assert.match(renderQuestionBankSource, /aria-pressed="\$\{pressed\}"/, 'selected question bank prompt should be exposed with aria-pressed');
assert.match(
  extractNamedFunction(html, 'getCurrentPromptRecordingKey'),
  /`\$\{part\.name\}:\$\{getPromptQuestion\(prompt\)\}`/,
  'recordings should be keyed by part and prompt text'
);
assert.match(
  extractNamedFunction(html, 'togglePromptRecording'),
  /navigator\.mediaDevices\.getUserMedia\(\{ audio: true \}\)/,
  'recording should request microphone audio'
);
assert.match(
  extractNamedFunction(html, 'togglePromptRecording'),
  /new MediaRecorder\(stream\)/,
  'recording should use MediaRecorder'
);
assert.match(
  extractNamedFunction(html, 'formatRecordingElapsedTime'),
  /String\(minutes\)\.padStart\(2, '0'\)/,
  'recording elapsed time should use a stable mm:ss format'
);
assert.match(
  extractNamedFunction(html, 'updateRecordingElapsedTime'),
  /Recording \$\{formatRecordingElapsedTime\(elapsedSeconds\)\} · \$\{formatRecordingElapsedTime\(remainingSeconds\)\} left/,
  'recording status should include elapsed and remaining time'
);
assert.match(
  extractNamedFunction(html, 'getCurrentRecordingTargetSeconds'),
  /part\.name === 'Part 2' \? 120 : 300/,
  'recording remaining time should use two minutes for Part 2 and five minutes otherwise'
);
assert.match(
  extractNamedFunction(html, 'togglePromptRecording'),
  /setInterval\(updateRecordingElapsedTime, 1000\)/,
  'recording should refresh elapsed time every second'
);
assert.match(
  extractNamedFunction(html, 'playPromptRecording'),
  /new Audio\(recording\.url\)/,
  'playback should use the current prompt recording URL'
);
assert.match(
  extractNamedFunction(html, 'playPromptRecording'),
  /clearModelAnswerSentenceHighlight\(\)/,
  'prompt recording playback should clear any model-answer sentence highlight'
);
assert.match(
  extractNamedFunction(html, 'readModelAnswerAloud'),
  /await playGeneratedModelAnswerAudio\(modelAnswer\)/,
  'model answer read button should try generated audio before browser speech synthesis'
);
assert.match(
  extractNamedFunction(html, 'readModelAnswerAloud'),
  /clearModelAnswerSentenceHighlight\(\)[\s\S]*?await playGeneratedModelAnswerAudio\(modelAnswer\)/,
  'model answer playback should reset any previous sentence highlight before starting'
);
assert.match(
  extractNamedFunction(html, 'playGeneratedModelAnswerAudio'),
  /new Audio\(audioPath\)/,
  'generated model-answer audio should play from the manifest path'
);
assert.match(
  extractNamedFunction(html, 'playGeneratedModelAnswerAudio'),
  /timeupdate[\s\S]*?highlightModelAnswerSentence/,
  'generated model-answer audio should update the highlighted sentence while playing'
);
assert.match(
  extractNamedFunction(html, 'playGeneratedModelAnswerAudio'),
  /ended[\s\S]*?clearModelAnswerSentenceHighlight/,
  'generated model-answer audio should clear the highlighted sentence when finished'
);
assert.match(
  extractNamedFunction(html, 'playGeneratedModelAnswerAudio'),
  /modelAnswerAudioManifest\.entries/,
  'generated model-answer audio should be looked up from the loaded manifest'
);
assert.match(
  extractNamedFunction(html, 'loadModelAnswerAudioManifest'),
  /window\.location\.protocol === 'file:'[\s\S]*?return/,
  'embedded generated audio manifest should be used when the page is opened directly from disk'
);
assert.match(
  extractNamedFunction(html, 'readModelAnswerAloud'),
  /new SpeechSynthesisUtterance\(modelAnswer\)/,
  'model answer read button should keep browser speech synthesis as fallback'
);
assert.match(
  extractNamedFunction(html, 'readModelAnswerAloud'),
  /speechSynthesis\.speak\(utterance\)/,
  'model answer read button should speak the model answer text'
);
assert.match(
  extractNamedFunction(html, 'readModelAnswerAloud'),
  /boundary[\s\S]*?highlightModelAnswerSentence/,
  'browser speech synthesis should highlight the sentence reported by boundary events'
);
assert.match(
  html,
  /readModelAnswerButton'\)\.addEventListener\('click', readModelAnswerAloud\)/,
  'model answer read button should call the read-aloud handler'
);
assert.deepEqual(
  splitModelAnswerSentences('First sentence. Second sentence? Third sentence!'),
  ['First sentence.', 'Second sentence?', 'Third sentence!'],
  'model answers should be split into sentence-sized highlight units'
);
assert.deepEqual(
  splitModelAnswerSentences('This answer has no final punctuation'),
  ['This answer has no final punctuation'],
  'sentence splitting should keep an unpunctuated final sentence'
);
assert.equal(
  getModelAnswerSentenceIndexAtTime(['Short sentence.', 'This sentence has many more words.'], 1, 4),
  0,
  'generated audio highlight should begin on the first sentence'
);
assert.equal(
  getModelAnswerSentenceIndexAtTime(['Short sentence.', 'This sentence has many more words.'], 3.7, 4),
  1,
  'generated audio highlight should move to later sentences by proportional reading time'
);
assert.equal(
  getModelAnswerAudioKey('Part 2', 'Describe a useful skill.', 'A useful skill I learned is organizing notes.'),
  getModelAnswerAudioKey('Part 2', 'Describe a useful skill.', 'A useful skill I learned is organizing notes.'),
  'model-answer audio keys should be deterministic'
);
assert.notEqual(
  getModelAnswerAudioKey('Part 2', 'Describe a useful skill.', 'A useful skill I learned is organizing notes.'),
  getModelAnswerAudioKey('Part 2', 'Describe a useful skill.', 'A different answer.'),
  'model-answer audio keys should change when answer text changes'
);

assert.equal(
  normalizeQuestionBankUrl('https://github.com/example/oral_english/blob/main/ielts_2025_sep_dec_question_bank.md'),
  'https://raw.githubusercontent.com/example/oral_english/main/ielts_2025_sep_dec_question_bank.md'
);
assert.equal(
  normalizeQuestionBankUrl('https://raw.githubusercontent.com/example/oral_english/main/ielts_2025_sep_dec_question_bank.md'),
  'https://raw.githubusercontent.com/example/oral_english/main/ielts_2025_sep_dec_question_bank.md'
);

assert.equal(
  getQuestionBankSourceName('https://raw.githubusercontent.com/example/oral_english/main/banks/ielts_2025_sep_dec_question_bank.md'),
  'ielts_2025_sep_dec_question_bank.md'
);
assert.equal(
  getQuestionBankSourceName('docs/extra_bank.md'),
  'extra_bank.md'
);
assert.equal(
  getQuestionBankSourceName('ielts_2025_sep_dec_question_bank.md'),
  'ielts_2025_sep_dec_question_bank.md'
);

assert.match(
  extractNamedFunction(html, 'saveImportedQuestionBank'),
  /localStorage\.setItem\(SAVED_QUESTION_BANK_STORAGE_KEY,\s*JSON\.stringify\(\{ markdown, sourceLabel \}\)\)/,
  'manual imports should save the raw Markdown and source label'
);
assert.match(
  extractNamedFunction(html, 'applyImportedQuestionBank'),
  /if \(importOptions\.save\) \{[\s\S]*?saveImportedQuestionBank\(markdown, sourceLabel\);[\s\S]*?\}/,
  'successful manual imports should persist by default'
);
assert.match(
  extractNamedFunction(html, 'loadSavedQuestionBank'),
  /applyImportedQuestionBank\(saved\.markdown,\s*saved\.sourceLabel,\s*\{ save: false, restored: true \}\)/,
  'startup restore should load the saved import without resaving it'
);
assert.match(
  html,
  /const savedQuestionBankLoaded = loadSavedQuestionBank\(\);[\s\S]*?discoverCurrentGitHubMarkdownOptions\(\{ preserveStatus: savedQuestionBankLoaded \}\);/,
  'page should load the saved bank during startup and preserve its status during GitHub discovery'
);

assert.deepEqual(currentRepository, {
  owner: 'cghuisunshine',
  repo: 'oral_english',
  branch: 'main'
});

assert.deepEqual(getCurrentGitHubMarkdownSearch(), {
  apiUrl: 'https://api.github.com/repos/cghuisunshine/oral_english/git/trees/main?recursive=1'
});

assert.deepEqual(
  getGitHubMarkdownDirectory('https://github.com/example/oral_english/blob/main/banks/ielts_2025_sep_dec_question_bank.md'),
  {
    apiUrl: 'https://api.github.com/repos/example/oral_english/contents/banks?ref=main',
    directoryPath: 'banks'
  }
);

assert.deepEqual(
  getGitHubMarkdownDirectory('https://raw.githubusercontent.com/example/oral_english/main/ielts_2025_sep_dec_question_bank.md'),
  {
    apiUrl: 'https://api.github.com/repos/example/oral_english/contents?ref=main',
    directoryPath: ''
  }
);

renderQuestionBankUrlOptions.renderQuestionBankUrlOptions([
  {
    name: 'ielts_2025_sep_dec_question_bank.md',
    download_url: 'https://raw.githubusercontent.com/example/oral_english/main/ielts_2025_sep_dec_question_bank.md'
  },
  {
    name: 'notes.txt',
    download_url: 'https://raw.githubusercontent.com/example/oral_english/main/notes.txt'
  },
  {
    name: 'part_2.md',
    html_url: 'https://github.com/example/oral_english/blob/main/part_2.md'
  }
]);

assert.equal(renderQuestionBankUrlOptions.select.hidden, false, 'dropdown should be shown when sibling Markdown files exist');
assert.match(renderQuestionBankUrlOptions.select.innerHTML, /ielts_2025_sep_dec_question_bank\.md/);
assert.match(renderQuestionBankUrlOptions.select.innerHTML, /part_2\.md/);
assert.doesNotMatch(renderQuestionBankUrlOptions.select.innerHTML, /notes\.txt/);

renderCurrentGitHubMarkdownOptions.renderCurrentGitHubMarkdownOptions({
  tree: [
    { type: 'blob', path: 'ielts_2025_sep_dec_question_bank.md' },
    { type: 'blob', path: 'docs/extra_bank.md' },
    { type: 'blob', path: 'content.html' },
    { type: 'tree', path: 'docs' }
  ]
});

assert.equal(renderCurrentGitHubMarkdownOptions.select.hidden, false, 'default repo dropdown should be shown when Markdown files exist');
assert.match(renderCurrentGitHubMarkdownOptions.select.innerHTML, /ielts_2025_sep_dec_question_bank\.md/);
assert.match(renderCurrentGitHubMarkdownOptions.select.innerHTML, /docs\/extra_bank\.md/);
assert.match(
  renderCurrentGitHubMarkdownOptions.select.innerHTML,
  /https:\/\/raw\.githubusercontent\.com\/cghuisunshine\/oral_english\/main\/docs\/extra_bank\.md/
);
assert.doesNotMatch(renderCurrentGitHubMarkdownOptions.select.innerHTML, /content\.html/);
assert.equal(
  await autoLoadSingleMarkdownOption.autoLoadSingleMarkdownOption([
    {
      name: 'ielts_2025_sep_dec_question_bank.md',
      download_url: 'https://raw.githubusercontent.com/example/oral_english/main/ielts_2025_sep_dec_question_bank.md'
    }
  ]),
  true,
  'a single discovered Markdown file should be imported automatically'
);
assert.equal(
  autoLoadSingleMarkdownOption.document.elements.questionBankUrl.value,
  'https://raw.githubusercontent.com/example/oral_english/main/ielts_2025_sep_dec_question_bank.md'
);
assert.deepEqual(autoLoadSingleMarkdownOption.imported, [
  {
    url: 'https://raw.githubusercontent.com/example/oral_english/main/ielts_2025_sep_dec_question_bank.md',
    sourceLabel: 'ielts_2025_sep_dec_question_bank.md'
  }
]);
assert.equal(
  await autoLoadSingleMarkdownOption.autoLoadSingleMarkdownOption([
    { name: 'first.md', download_url: 'https://raw.githubusercontent.com/example/oral_english/main/first.md' },
    { name: 'second.md', download_url: 'https://raw.githubusercontent.com/example/oral_english/main/second.md' }
  ]),
  false,
  'multiple discovered Markdown files should not auto-import'
);
assert.match(html, /discoverCurrentGitHubMarkdownOptions\(\{ preserveStatus: savedQuestionBankLoaded \}\);/, 'page should search the current GitHub repository on startup');
