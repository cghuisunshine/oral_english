import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('./daily_speaking_practice.html', import.meta.url), 'utf8');

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

for (const part of content.parts) {
  assert.ok(part.focus, `${part.name} needs a practice focus`);
  assert.ok(Array.isArray(part.prompts), `${part.name} prompts must be an array`);
  assert.ok(part.prompts.length >= 4, `${part.name} needs at least four prompts`);
}

assert.match(html, /JSON\.parse\(document\.getElementById\('practice-content'\)\.textContent\)/);
assert.match(html, /renderExamContent\(\)/);
assert.doesNotMatch(html, /const\s+prompts\s*=\s*\[/, 'prompts should not be hard-coded in framework logic');

assert.match(html, /id="questionBankImport"/, 'page should include a Markdown question-bank import input');
assert.match(html, /id="questionBankUrl"/, 'page should include a GitHub Markdown URL input');
assert.match(html, /id="questionBankUrlOptions"/, 'page should include a dropdown for sibling GitHub Markdown files');
assert.match(html, /id="questionBankUrlImport"/, 'page should include a GitHub Markdown URL import button');
assert.match(html, /function\s+parseQuestionBankMarkdown\(/, 'page should parse imported Markdown question banks');
assert.match(html, /function\s+handleQuestionBankImport\(/, 'page should handle imported Markdown files');
assert.match(html, /function\s+normalizeQuestionBankUrl\(/, 'page should normalize GitHub question-bank links');
assert.match(html, /function\s+getGitHubMarkdownDirectory\(/, 'page should derive the GitHub directory for sibling Markdown discovery');
assert.match(html, /function\s+renderQuestionBankUrlOptions\(/, 'page should render sibling GitHub Markdown files into the dropdown');
assert.match(html, /function\s+handleQuestionBankUrlImport\(/, 'page should import Markdown question banks from URLs');

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
const getGitHubMarkdownDirectory = Function(`${extractNamedFunction(html, 'getGitHubMarkdownDirectory')}; return getGitHubMarkdownDirectory;`)();
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
  ${extractNamedFunction(html, 'renderQuestionBankUrlOptions')}
  return { renderQuestionBankUrlOptions, select };
`)();
const importedBank = parseQuestionBankMarkdown(`
## Part 1 Quick Interview Bank

1. **Study or work**
   Question: Do you work or are you a student?
   Answer: I am a student, and I practise English every day.

## Part 2 And Part 3 Cue-Card Bank

### People

1. **A friend who is good at music or singing**
   Cue card: Describe a friend who is good at music or singing.
   Model answer: My friend sings beautifully and practises every week.
   Part 3: Why do people enjoy music?
   Answer: Music helps people relax and share emotions.
`);

assert.equal(importedBank.parts.length, 3, 'imported Markdown should preserve three IELTS parts');
assert.deepEqual(importedBank.parts.map((part) => part.name), ['Part 1', 'Part 2', 'Part 3']);
assert.equal(importedBank.parts[0].prompts[0].question, 'Do you work or are you a student?');
assert.equal(importedBank.parts[0].prompts[0].answer, 'I am a student, and I practise English every day.');
assert.equal(importedBank.parts[1].prompts[0].question, 'Describe a friend who is good at music or singing.');
assert.equal(importedBank.parts[1].prompts[0].answer, 'My friend sings beautifully and practises every week.');
assert.equal(importedBank.parts[2].prompts[0].question, 'Why do people enjoy music?');
assert.equal(importedBank.parts[2].prompts[0].answer, 'Music helps people relax and share emotions.');

assert.equal(
  normalizeQuestionBankUrl('https://github.com/example/oral_english/blob/main/ielts_2025_sep_dec_question_bank.md'),
  'https://raw.githubusercontent.com/example/oral_english/main/ielts_2025_sep_dec_question_bank.md'
);
assert.equal(
  normalizeQuestionBankUrl('https://raw.githubusercontent.com/example/oral_english/main/ielts_2025_sep_dec_question_bank.md'),
  'https://raw.githubusercontent.com/example/oral_english/main/ielts_2025_sep_dec_question_bank.md'
);

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
