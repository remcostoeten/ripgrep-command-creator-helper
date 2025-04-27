import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-bash';
import 'prismjs/themes/prism-tomorrow.css';
import { createEffect, createSignal, For, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Footer } from './components/layout/footer';
import { Intro } from './components/layout/intro';
import './index.css';
import { FormState } from './core/types';
import {
  COMMON_EXTENSIONS,
  COMMON_FOLERS,
  DEFAULTR_IGNORED_DIRS,
  SECTIONS,
} from './core/constants';

const commonExtensions = COMMON_EXTENSIONS;
const presetTemplates = [
  {
    name: 'Source Code',
    searchLocation: 'folder' as const,
    includedExtensions: ['js', 'ts', 'jsx', 'tsx'],
    config: {
      searchLocation: 'folder' as 'folder' | 'file' | 'both',
      includedExtensions: ['js', 'ts', 'jsx', 'tsx'],
    },
  },
  {
    name: 'Documentation',
    searchLocation: 'file' as const,
    includedExtensions: ['md', 'txt', 'pdf'],
    config: {
      searchLocation: 'file' as 'folder' | 'file' | 'both',
      includedExtensions: ['md', 'txt', 'pdf'],
    },
  },
  {
    name: 'Configuration Files',
    searchLocation: 'folder' as const,
    includedExtensions: ['json', 'yaml', 'yml', 'toml'],
    config: {
      searchLocation: 'folder' as 'folder' | 'file' | 'both',
      includedExtensions: ['json', 'yaml', 'yml', 'toml'],
    },
  },
];
export default function App() {
  const [formState, setFormState] = createStore<FormState>({
    searchLocation: 'both',
    searchString: '',
    matchType: 'contains',
    includedExtensions: [],
    excludedExtensions: [],
    maxDaysAgo: null,
    maxFileSize: null,
    minFileSize: null,
    ignoredDirectories: [...DEFAULTR_IGNORED_DIRS],
    excludedFolders: [],
    caseSensitivity: 'smart',
    searchOptions: {
      hidden: false,
      binary: false,
      followSymlinks: false,
      multiline: false,
      wordMatch: false,
      invertMatch: false,
    },
    context: {
      before: 0,
      after: 0,
      lines: 0,
    },
  });
  const [isDarkTheme, setIsDarkTheme] = createSignal(true);
  const [showGeneratedMessage, setShowGeneratedMessage] = createSignal(false);
  const [toastMessage, setToastMessage] = createSignal('');
  const [generatedCommand, setGeneratedCommand] = createSignal('');
  const [highlightedCommand, setHighlightedCommand] = createSignal('');
  const [newFolderInput, setNewFolderInput] = createSignal('');
  const [showCommandDisplay, setShowCommandDisplay] = createSignal(false);
  const [setFocusedSection] = createSignal('');
  onMount(function () {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkTheme(savedTheme === 'dark');
      document.body.classList.toggle('light-theme', savedTheme === 'light');
    }
    const savedState = localStorage.getItem('ripgrepHelperState');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        setFormState(parsedState);
      } catch (e) {
        console.error('Failed to parse saved state:', e);
      }
    }
    document.querySelectorAll('.form-group').forEach(function (group) {
      const buttons = group.querySelectorAll('button:not([tabindex])');
      const inputs = group.querySelectorAll('input:not([tabindex])');
      const labels = group.querySelectorAll('label:not([tabindex])');
      buttons.forEach(function (button) {
        button.setAttribute('tabindex', '0');
      });
      inputs.forEach(function (input) {
        input.setAttribute('tabindex', '0');
      });
      labels.forEach(function (label) {
        if (label.querySelector('input')) {
          label.setAttribute('tabindex', '0');
        }
      });
    });
    window.addEventListener('keydown', handleKeyDown);
    const firstInput = document.getElementById('search-string');
    if (firstInput) {
      firstInput.focus();
    }
    generateRipgrepCommand();
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.5 }
    );
    SECTIONS.forEach(function (section) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });
    return function () {
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  function setActiveSection(sectionId: string): void {
    const prevFocused = document.querySelector('.form-group.focused');
    if (prevFocused) {
      prevFocused.classList.remove('focused');
    }
    const section = document.getElementById(sectionId);
    if (section) {
      const formGroup = section.closest('.form-group');
      if (formGroup) {
        formGroup.classList.add('focused');
        setTimeout(function () {
          formGroup.classList.remove('focused');
        }, 500);
      }
      section.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }

  createEffect(function () {
    localStorage.setItem('ripgrepHelperState', JSON.stringify(formState));
    const cmd = generatedCommand();
    if (cmd) {
      try {
        const highlighted = highlight(cmd, languages.bash, 'bash');
        setHighlightedCommand(highlighted);
      } catch (e) {
        console.error('Failed to highlight command:', e);
        setHighlightedCommand(`<span class="token">${cmd}</span>`);
      }
    }
  });

  function focusSection(sectionId: string): void {
    const prevFocused = document.querySelector('.form-group.focused');
    if (prevFocused) {
      prevFocused.classList.remove('focused');
    }
    const section = document.getElementById(sectionId);
    if (section) {
      const formGroup = section.closest('.form-group');
      if (formGroup) {
        formGroup.classList.add('focused');
        setTimeout(function () {
          formGroup.classList.remove('focused');
        }, 500);
      }
      section.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      const focusableElements = section.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
      setFocusedSection();
    }
  }
  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === '/' && !isInputFocused()) {
      e.preventDefault();
      focusSection('search-section');
    }
    if (e.key === 'Tab') {
      const currentSection = document.activeElement?.closest('.form-group');
      if (currentSection) {
        currentSection.classList.add('focused');
        setTimeout(function () {
          currentSection.classList.remove('focused');
        }, 500);
      }
    }
    if (e.key === 'Enter' && !isTextareaFocused()) {
      generateRipgrepCommand(true);
    }
    if (e.altKey) {
      let sectionId: string | undefined;
      switch (e.key.toLowerCase()) {
        case '1':
          sectionId = 'search-section';
          break;
        case '2':
          sectionId = 'search-location-section';
          break;
        case '3':
          sectionId = 'match-type-section';
          break;
        case '4':
          sectionId = 'file-size-section';
          break;
        case '5':
          sectionId = 'days-ago-section';
          break;
        case '6':
          sectionId = 'extensions-section';
          break;
        case '7':
          sectionId = 'ignored-dirs-section';
          break;
        case '8':
          sectionId = 'templates-section';
          break;
        case '9':
          sectionId = 'exclude-folders-section';
          break;
        case 'c':
          sectionId = 'case-sensitivity-section';
          break;
        case 'o':
          sectionId = 'search-options-section';
          break;
        case 'l':
          sectionId = 'context-lines-section';
          break;
      }
      if (sectionId) {
        e.preventDefault();
        focusSection(sectionId);
      }
    } // Remove focus class after animation

    document.activeElement instanceof HTMLInputElement ||
    document.activeElement instanceof HTMLSelectElement ||
    document.activeElement instanceof HTMLTextAreaElement
      ? document.activeElement.blur()
      : null;
  }
  function isInputFocused(): boolean {
    return document.activeElement instanceof HTMLInputElement;
  }
  function isTextareaFocused(): boolean {
    return document.activeElement instanceof HTMLTextAreaElement;
  }
  function applyTemplate(templateIndex: number): void {
    const template = presetTemplates[templateIndex];
    setFormState({
      searchLocation: template.config.searchLocation,
      includedExtensions: template.config.includedExtensions,
    });
    setTimeout(generateRipgrepCommand, 0);
  }

  function toggleExtension(ext: string, type: 'include' | 'exclude'): void {
    if (type === 'include') {
      const included = [...formState.includedExtensions];
      const index = included.indexOf(ext);
      if (index === -1) {
        included.push(ext);
      } else {
        included.splice(index, 1);
      }
      setFormState('includedExtensions', included);
      const excluded = [...formState.excludedExtensions];
      const excludedIndex = excluded.indexOf(ext);
      if (excludedIndex !== -1) {
        excluded.splice(excludedIndex, 1);
        setFormState('excludedExtensions', excluded);
      }
    } else {
      const excluded = [...formState.excludedExtensions];
      const index = excluded.indexOf(ext);
      if (index === -1) {
        excluded.push(ext);
      } else {
        excluded.splice(index, 1);
      }
      setFormState('excludedExtensions', excluded);
      const included = [...formState.includedExtensions];
      const includedIndex = included.indexOf(ext);
      if (includedIndex !== -1) {
        included.splice(includedIndex, 1);
        setFormState('includedExtensions', included);
      }
    }
  }
  function toggleAllExtensions(type: 'include' | 'exclude', select: boolean): void {
    if (type === 'include') {
      if (select) {
        setFormState('includedExtensions', [...COMMON_EXTENSIONS]);
        setFormState('excludedExtensions', []);
      } else {
        setFormState('includedExtensions', []);
      }
    } else {
      if (select) {
        setFormState('excludedExtensions', [...COMMON_EXTENSIONS]);
        setFormState('includedExtensions', []);
      } else {
        setFormState('excludedExtensions', []);
      }
    }
  }
  function toggleIgnoredDirectory(dir: string): void {
    const ignored = [...formState.ignoredDirectories];
    const index = ignored.indexOf(dir);
    if (index === -1) {
      ignored.push(dir);
    } else {
      ignored.splice(index, 1);
    }
    setFormState('ignoredDirectories', ignored);
  }
  function toggleFolder(folder: string): void {
    const excluded = [...formState.excludedFolders];
    const index = excluded.indexOf(folder);
    if (index === -1) {
      excluded.push(folder);
    } else {
      excluded.splice(index, 1);
    }
    setFormState('excludedFolders', excluded);
  }
  function addCustomFolder(e: Event): void {
    e.preventDefault();
    const folder = newFolderInput().trim();
    if (folder && !formState.excludedFolders.includes(folder)) {
      setFormState('excludedFolders', [...formState.excludedFolders, folder]);
      setNewFolderInput('');
      setTimeout(generateRipgrepCommand, 0);
    }
  }
  function toggleAllFolders(select: boolean): void {
    if (select) {
      setFormState('excludedFolders', [...COMMON_FOLERS]);
    } else {
      setFormState('excludedFolders', []);
    }
  }
  function showToast(message: string, duration = 3000): void {
    setToastMessage(message);
    setShowGeneratedMessage(true);
    setTimeout(function () {
      setShowGeneratedMessage(false);
    }, duration);
  }
  function generateRipgrepCommand(shouldShowToast = false): string {
    let command = 'rg';
    switch (formState.caseSensitivity) {
      case 'sensitive':
        command += ' -s';
        break;
      case 'insensitive':
        command += ' -i';
        break;
      case 'smart':
        command += ' -S';
        break;
    }
    if (formState.matchType === 'exact') {
      command += ' -F';
    } else if (formState.matchType === 'regex') {
      command += ' -e';
    }
    if (formState.searchOptions.hidden) command += ' --hidden';
    if (formState.searchOptions.binary) command += ' --text';
    if (formState.searchOptions.followSymlinks) command += ' --follow';
    if (formState.searchOptions.multiline) command += ' --multiline';
    if (formState.searchOptions.wordMatch) command += ' --word-regexp';
    if (formState.searchOptions.invertMatch) command += ' --invert-match';
    if (formState.context.before > 0) command += ` -B ${formState.context.before}`;
    if (formState.context.after > 0) command += ` -A ${formState.context.after}`;
    if (formState.context.lines > 0) command += ` -C ${formState.context.lines}`;
    if (formState.includedExtensions.length > 0) {
      formState.includedExtensions.forEach(function (ext) {
        command += ` -g '*.${ext}'`;
      });
    }
    if (formState.excludedExtensions.length > 0) {
      formState.excludedExtensions.forEach(function (ext) {
        command += ` -g '!*.${ext}'`;
      });
    }
    if (formState.ignoredDirectories.length > 0) {
      formState.ignoredDirectories.forEach(function (dir) {
        command += ` -g '!${dir}/**'`;
      });
    }
    if (formState.minFileSize !== null && formState.minFileSize > 0) {
      command += ` --max-filesize ${formState.minFileSize}`;
    }
    if (formState.maxFileSize !== null && formState.maxFileSize > 0) {
      command += ` --max-filesize ${formState.maxFileSize}`;
    }
    if (formState.maxDaysAgo !== null && formState.maxDaysAgo > 0) {
      command += ' --glob-case-insensitive';
      const daysInSeconds = formState.maxDaysAgo * 24 * 60 * 60;
      command += ` -g '!{**/,}*.[mt][ti][mm][ee]<${daysInSeconds}'`;
    }
    if (formState.searchString) {
      command += ` '${formState.searchString}'`;
    }
    command += " '.'";
    if (formState.searchLocation === 'folder') {
      command += ' -l';
    } else if (formState.searchLocation === 'file') {
      command += '';
    }
    if (formState.excludedFolders.length > 0) {
      formState.excludedFolders.forEach(function (folder) {
        command += ` -g '!${folder}/**'`;
      });
    }
    setGeneratedCommand(command);
    if (shouldShowToast) {
      navigator.clipboard.writeText(command).then(function () {
        showToast('Command generated and copied to clipboard! 🚀');
        setShowCommandDisplay(true);
        setTimeout(function () {
          setShowCommandDisplay(false);
        }, 5000);
      });
    }
    return command;
  }
  function handleGenerateClick(): void {
    generateRipgrepCommand(true);
  }
  function copyToClipboard(): void {
    navigator.clipboard.writeText(generatedCommand()).then(function () {
      showToast('Command copied to clipboard! 📋');
    });
  }
  function toggleTheme() {
    const newTheme = !isDarkTheme();
    setIsDarkTheme(newTheme);
    document.body.classList.toggle('light-theme', !newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  }
  return (
    <div class="app">
      <div class="form-container">
        <button
          class="theme-toggle"
          onClick={toggleTheme}
          title={isDarkTheme() ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDarkTheme() ? '☀️' : '🌙'}
        </button>
        <div class="command-display" classList={{ visible: showCommandDisplay() }}>
          <div class="command-display-inner">
            <div class="command-display-text">
              <div innerHTML={highlightedCommand()} />
            </div>
            <button class="command-display-copy" onClick={copyToClipboard}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </button>
          </div>
        </div>
        <Intro
          formState={formState}
          setFormState={setFormState}
          generateRipgrepCommand={generateRipgrepCommand}
        />
        <div class="form-groups" style={{ 'padding-bottom': '100px' }} />
        <div class="form-group" id="search-location-section">
          <label>
            Search Location
            <span class="shortcut-label">Alt+2</span>
          </label>
          <div class="radio-group">
            <label class="radio-option">
              <input
                type="radio"
                checked={formState.searchLocation === 'both'}
                onChange={function () {
                  setFormState('searchLocation', 'both');
                  generateRipgrepCommand(false);
                }}
              />
              Both
            </label>
            <label class="radio-option">
              <input
                type="radio"
                checked={formState.searchLocation === 'folder'}
                onChange={function () {
                  setFormState('searchLocation', 'folder');
                  generateRipgrepCommand(false);
                }}
              />
              Folder
            </label>
            <label class="radio-option">
              <input
                type="radio"
                checked={formState.searchLocation === 'file'}
                onChange={function () {
                  setFormState('searchLocation', 'file');
                  generateRipgrepCommand(false);
                }}
              />
              File
            </label>
          </div>
        </div>
        <div class="form-group" id="match-type-section">
          <label>
            Match Type
            <span class="shortcut-label">Alt+3</span>
          </label>
          <div class="radio-group">
            <label class="radio-option">
              <input
                type="radio"
                checked={formState.matchType === 'contains'}
                onChange={function () {
                  setFormState('matchType', 'contains');
                  generateRipgrepCommand(false);
                }}
              />
              Contains
            </label>
            <label class="radio-option">
              <input
                type="radio"
                checked={formState.matchType === 'exact'}
                onChange={function () {
                  setFormState('matchType', 'exact');
                  generateRipgrepCommand(false);
                }}
              />
              Exact
            </label>
            <label class="radio-option">
              <input
                type="radio"
                checked={formState.matchType === 'regex'}
                onChange={function () {
                  setFormState('matchType', 'regex');
                  generateRipgrepCommand(false);
                }}
              />
              Regex
            </label>
          </div>
        </div>
        <div class="form-group" id="file-size-section">
          <label>
            File Size
            <span class="shortcut-label">Alt+4</span>
          </label>
          <div class="file-size-inputs">
            <div class="input-group">
              <label>Min</label>
              <input
                type="number"
                min="0"
                value={formState.minFileSize || 0}
                onChange={function (e) {
                  setFormState('minFileSize', parseInt(e.target.value) || null);
                  generateRipgrepCommand(false);
                }}
              />
            </div>
            <div class="input-group">
              <label>Max</label>
              <input
                type="number"
                min="0"
                value={formState.maxFileSize || 0}
                onChange={function (e) {
                  setFormState('maxFileSize', parseInt(e.target.value) || null);
                  generateRipgrepCommand(false);
                }}
              />
            </div>
          </div>
        </div>
        <div class="form-group" id="days-ago-section">
          <label>
            Days Ago
            <span class="shortcut-label">Alt+5</span>
          </label>
          <div class="input-group">
            <input
              type="number"
              min="0"
              value={formState.maxDaysAgo || 0}
              onChange={function (e) {
                setFormState('maxDaysAgo', parseInt(e.target.value) || null);
                generateRipgrepCommand(false);
              }}
            />
          </div>
        </div>
        <div class="form-group" id="extensions-section">
          <label>
            Extensions
            <span class="shortcut-label">Alt+6</span>
          </label>
          <div class="extensions-controls">
            <button
              type="button"
              class="select-all-btn"
              onClick={function () {
                toggleAllExtensions('include', true);
              }}
            >
              Select All
            </button>
            <button
              type="button"
              class="clear-all-btn"
              onClick={function () {
                toggleAllExtensions('include', false);
              }}
            >
              Clear All
            </button>
          </div>
          <div class="extensions-grid">
            <For each={commonExtensions}>
              {function (ext) {
                return (
                  <button
                    type="button"
                    class="extension-btn"
                    classList={{ selected: formState.includedExtensions.includes(ext) }}
                    onClick={function () {
                      toggleExtension(ext, 'include');
                    }}
                  >
                    {ext}
                  </button>
                );
              }}
            </For>
          </div>
        </div>
        <div class="form-group" id="ignored-dirs-section">
          <label>
            Ignored Dirs
            <span class="shortcut-label">Alt+7</span>
          </label>
          <div class="extensions-controls">
            <button
              type="button"
              class="select-all-btn"
              onClick={function () {
                toggleAllExtensions('exclude', true);
              }}
            >
              Select All
            </button>
            <button
              type="button"
              class="clear-all-btn"
              onClick={function () {
                toggleAllExtensions('exclude', false);
              }}
            >
              Clear All
            </button>
          </div>
          <div class="extensions-grid">
            <For each={commonExtensions}>
              {function (ext) {
                return (
                  <button
                    type="button"
                    class="extension-btn"
                    classList={{ selected: formState.excludedExtensions.includes(ext) }}
                    onClick={function () {
                      toggleExtension(ext, 'exclude');
                    }}
                  >
                    {ext}
                  </button>
                );
              }}
            </For>
          </div>
        </div>
        <div class="form-group" id="templates-section">
          <label>
            Templates
            <span class="shortcut-label">Alt+8</span>
          </label>
          <div class="templates-controls">
            <button
              type="button"
              class="select-all-btn"
              onClick={function () {
                applyTemplate(0);
              }}
            >
              JavaScript/TypeScript
            </button>
            <button
              type="button"
              class="select-all-btn"
              onClick={function () {
                applyTemplate(1);
              }}
            >
              Documentation
            </button>
            <button
              type="button"
              class="select-all-btn"
              onClick={function () {
                applyTemplate(2);
              }}
            >
              Configuration Files
            </button>
          </div>
        </div>
        <div class="form-group" id="exclude-folders-section">
          <label>
            Exclude Folders
            <span class="shortcut-label">Alt+9</span>
          </label>
          <div class="extensions-controls">
            <button
              type="button"
              class="select-all-btn"
              onClick={function () {
                toggleAllFolders(true);
              }}
            >
              Select All
            </button>
            <button
              type="button"
              class="clear-all-btn"
              onClick={function () {
                toggleAllFolders(false);
              }}
            >
              Clear All
            </button>
          </div>
          <div class="folders-grid">
            <For each={COMMON_FOLERS}>
              {function (folder) {
                return (
                  <button
                    type="button"
                    class="folder-btn"
                    classList={{ selected: formState.excludedFolders.includes(folder) }}
                    onClick={function () {
                      toggleFolder(folder);
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    {folder}
                  </button>
                );
              }}
            </For>
          </div>
        </div>
        <div class="form-group" id="case-sensitivity-section">
          <label>
            Case Sensitivity
            <span class="shortcut-label">Alt+C</span>
          </label>
          <div class="radio-group">
            <label class="radio-option">
              <input
                type="radio"
                checked={formState.caseSensitivity === 'sensitive'}
                onChange={function () {
                  setFormState('caseSensitivity', 'sensitive');
                  generateRipgrepCommand(false);
                }}
              />
              Sensitive
            </label>
            <label class="radio-option">
              <input
                type="radio"
                checked={formState.caseSensitivity === 'insensitive'}
                onChange={function () {
                  setFormState('caseSensitivity', 'insensitive');
                  generateRipgrepCommand(false);
                }}
              />
              Ignore Case
            </label>
            <label class="radio-option">
              <input
                type="radio"
                checked={formState.caseSensitivity === 'smart'}
                onChange={function () {
                  setFormState('caseSensitivity', 'smart');
                  generateRipgrepCommand(false);
                }}
              />
              Smart Case
            </label>
          </div>
        </div>
        <div class="form-group" id="search-options-section">
          <label>
            Search Options
            <span class="shortcut-label">Alt+O</span>
          </label>
          <div class="checkbox-grid">
            <label class="checkbox-option">
              <input
                type="checkbox"
                checked={formState.searchOptions.hidden}
                onChange={(e) => {
                  setFormState('searchOptions', 'hidden', e.target.checked);
                  generateRipgrepCommand(false);
                }}
              />
              Search Hidden Files
            </label>
            <label class="checkbox-option">
              <input
                type="checkbox"
                checked={formState.searchOptions.binary}
                onChange={(e) => {
                  setFormState('searchOptions', 'binary', e.target.checked);
                  generateRipgrepCommand(false);
                }}
              />
              Search Binary Files
            </label>
            <label class="checkbox-option">
              <input
                type="checkbox"
                checked={formState.searchOptions.followSymlinks}
                onChange={(e) => {
                  setFormState('searchOptions', 'followSymlinks', e.target.checked);
                  generateRipgrepCommand(false);
                }}
              />
              Follow Symlinks
            </label>
            <label class="checkbox-option">
              <input
                type="checkbox"
                checked={formState.searchOptions.multiline}
                onChange={(e) => {
                  setFormState('searchOptions', 'multiline', e.target.checked);
                  generateRipgrepCommand(false);
                }}
              />
              Multiline Search
            </label>
            <label class="checkbox-option">
              <input
                type="checkbox"
                checked={formState.searchOptions.wordMatch}
                onChange={(e) => {
                  setFormState('searchOptions', 'wordMatch', e.target.checked);
                  generateRipgrepCommand(false);
                }}
              />
              Word Boundaries
            </label>
            <label class="checkbox-option">
              <input
                type="checkbox"
                checked={formState.searchOptions.invertMatch}
                onChange={(e) => {
                  setFormState('searchOptions', 'invertMatch', e.target.checked);
                  generateRipgrepCommand(false);
                }}
              />
              Invert Match
            </label>
          </div>
        </div>
        <div class="form-group" id="context-lines-section">
          <label>
            Context Lines
            <span class="shortcut-label">Alt+L</span>
          </label>
          <div class="context-inputs">
            <div class="input-group">
              <label>Before</label>
              <input
                type="number"
                min="0"
                value={formState.context.before}
                onChange={function (e) {
                  setFormState('context', 'before', parseInt(e.target.value) || 0);
                  generateRipgrepCommand(false);
                }}
              />
            </div>
            <div class="input-group">
              <label>After</label>
              <input
                type="number"
                min="0"
                value={formState.context.after}
                onChange={function (e) {
                  setFormState('context', 'after', parseInt(e.target.value) || 0);
                  generateRipgrepCommand(false);
                }}
              />
            </div>
            <div class="input-group">
              <label>Both</label>
              <input
                type="number"
                min="0"
                value={formState.context.lines}
                onChange={function (e) {
                  setFormState('context', 'lines', parseInt(e.target.value) || 0);
                  generateRipgrepCommand(false);
                }}
              />
            </div>
          </div>
        </div>
        <button class="generate-btn" onClick={handleGenerateClick}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M20 16.7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.3a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v7.4Z" />
          </svg>
          Generate Command
          <kbd class="generate-kbd">↵</kbd>
        </button>
        <Footer />
        <div class="toast" classList={{ visible: showGeneratedMessage() }}>
          {toastMessage()}
        </div>
      </div>
    </div>
  );
}
