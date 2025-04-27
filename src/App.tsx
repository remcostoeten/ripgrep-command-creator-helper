import { createSignal, createEffect, onMount, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import "./index.css";
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-bash";
import "prismjs/themes/prism-tomorrow.css";

// Define the form state type
type FormState = {
  searchLocation: "folder" | "file" | "both";
  searchString: string;
  matchType: "exact" | "contains";
  includedExtensions: string[];
  excludedExtensions: string[];
  maxDaysAgo: number | null;
  maxFileSize: number | null;
  minFileSize: number | null;
  ignoredDirectories: string[];
};

// Common file extensions
const commonExtensions = [
  "js", "ts", "jsx", "tsx", "css", "scss", "html", "md", "json", "yaml", "yml",
  "py", "rb", "go", "rs", "java", "php", "c", "cpp", "h", "sh", "txt"
];

// Default ignored directories
const defaultIgnoredDirs = [
  "node_modules", ".git", ".vite", ".next", "dist", ".dist",
  "generated", "cache", ".cache", "build", ".build", "target"
];

// Preset templates
const presetTemplates = [
  {
    name: "JavaScript/TypeScript",
    config: {
      searchLocation: "both" as const,
      includedExtensions: ["js", "ts", "jsx", "tsx"],
      excludedExtensions: [],
      ignoredDirectories: [...defaultIgnoredDirs]
    }
  },
  {
    name: "Documentation",
    config: {
      searchLocation: "file" as const,
      includedExtensions: ["md", "txt", "pdf"],
      excludedExtensions: [],
      ignoredDirectories: [...defaultIgnoredDirs]
    }
  },
  {
    name: "Configuration Files",
    config: {
      searchLocation: "folder" as const,
      includedExtensions: ["json", "yaml", "yml", "toml", "ini", "env"],
      excludedExtensions: [],
      ignoredDirectories: [...defaultIgnoredDirs]
    }
  }
];

// Add section definitions for quick navigation
const sections = [
  { id: "search-section", label: "Search", shortcut: "Alt+1" },
  { id: "search-location-section", label: "Location", shortcut: "Alt+2" },
  { id: "match-type-section", label: "Match Type", shortcut: "Alt+3" },
  { id: "file-size-section", label: "File Size", shortcut: "Alt+4" },
  { id: "days-ago-section", label: "Days Ago", shortcut: "Alt+5" },
  { id: "extensions-section", label: "Extensions", shortcut: "Alt+6" },
  { id: "ignored-dirs-section", label: "Ignored Dirs", shortcut: "Alt+7" },
  { id: "templates-section", label: "Templates", shortcut: "Alt+8" }
];

export default function App() {
  // Initialize form state with defaults
  const [formState, setFormState] = createStore<FormState>({
    searchLocation: "both",
    searchString: "",
    matchType: "contains",
    includedExtensions: [],
    excludedExtensions: [],
    maxDaysAgo: null,
    maxFileSize: null,
    minFileSize: null,
    ignoredDirectories: [...defaultIgnoredDirs]
  });

  const [showCopiedMessage, setShowCopiedMessage] = createSignal(false);
  const [showGeneratedMessage, setShowGeneratedMessage] = createSignal(false);
  const [toastMessage, setToastMessage] = createSignal("");
  const [generatedCommand, setGeneratedCommand] = createSignal("");
  const [highlightedCommand, setHighlightedCommand] = createSignal("");
  const [activeSection, setActiveSection] = createSignal("");

  // Load saved state from localStorage on mount
  onMount(() => {
    const savedState = localStorage.getItem("ripgrepHelperState");
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        setFormState(parsedState);
      } catch (e) {
        console.error("Failed to parse saved state:", e);
      }
    }

    // Set up keyboard shortcuts
    window.addEventListener("keydown", handleKeyDown);

    // Auto focus the first input
    const firstInput = document.getElementById("search-string");
    if (firstInput) {
      firstInput.focus();
    }
    
    // Generate command on initial load
    generateRipgrepCommand();

    // Add intersection observer to track visible sections
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, { threshold: 0.5 });

    sections.forEach(section => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  // Save state to localStorage whenever it changes
  createEffect(() => {
    localStorage.setItem("ripgrepHelperState", JSON.stringify(formState));
  });

  // Update highlighted command whenever generated command changes
  createEffect(() => {
    const cmd = generatedCommand();
    if (cmd) {
      try {
        const highlighted = highlight(cmd, languages.bash, 'bash');
        setHighlightedCommand(highlighted);
      } catch (e) {
        console.error("Failed to highlight command:", e);
        setHighlightedCommand(`<span class="token">${cmd}</span>`);
      }
    }
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    // Focus search input on '/'
    if (e.key === "/" && !isInputFocused()) {
      e.preventDefault();
      const searchInput = document.getElementById("search-string");
      if (searchInput) searchInput.focus();
    }

    // Generate command on Enter if not in a textarea or input
    if (e.key === "Enter" && !isTextareaFocused()) {
      e.preventDefault();
      generateRipgrepCommand(true);
    }

    // Alt + number shortcuts
    if (e.altKey && !isNaN(parseInt(e.key)) && parseInt(e.key) >= 1 && parseInt(e.key) <= 9) {
      e.preventDefault();
      const index = parseInt(e.key) - 1;
      const inputs = document.querySelectorAll("input, select");
      if (inputs[index]) {
        (inputs[index] as HTMLElement).focus();
      }
    }
  };

  const isInputFocused = () => {
    return document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLSelectElement ||
      document.activeElement instanceof HTMLTextAreaElement;
  };

  const isTextareaFocused = () => {
    return document.activeElement instanceof HTMLTextAreaElement;
  };

  const applyTemplate = (templateIndex: number) => {
    const template = presetTemplates[templateIndex];
    setFormState({
      ...formState,
      ...template.config
    });
    // Generate command after applying template
    setTimeout(generateRipgrepCommand, 0);
  };

  const toggleExtension = (ext: string, type: "include" | "exclude") => {
    if (type === "include") {
      const included = [...formState.includedExtensions];
      const index = included.indexOf(ext);

      if (index === -1) {
        included.push(ext);
      } else {
        included.splice(index, 1);
      }

      setFormState("includedExtensions", included);

      // Remove from excluded if it's being included
      if (index === -1) {
        const excluded = [...formState.excludedExtensions];
        const excludedIndex = excluded.indexOf(ext);
        if (excludedIndex !== -1) {
          excluded.splice(excludedIndex, 1);
          setFormState("excludedExtensions", excluded);
        }
      }
    } else {
      const excluded = [...formState.excludedExtensions];
      const index = excluded.indexOf(ext);

      if (index === -1) {
        excluded.push(ext);
      } else {
        excluded.splice(index, 1);
      }

      setFormState("excludedExtensions", excluded);

      // Remove from included if it's being excluded
      if (index === -1) {
        const included = [...formState.includedExtensions];
        const includedIndex = included.indexOf(ext);
        if (includedIndex !== -1) {
          included.splice(includedIndex, 1);
          setFormState("includedExtensions", included);
        }
      }
    }
    
    // Generate command after toggling extension
    setTimeout(generateRipgrepCommand, 0);
  };

  const toggleIgnoredDirectory = (dir: string) => {
    const ignored = [...formState.ignoredDirectories];
    const index = ignored.indexOf(dir);

    if (index === -1) {
      ignored.push(dir);
    } else {
      ignored.splice(index, 1);
    }

    setFormState("ignoredDirectories", ignored);
    
    // Generate command after toggling directory
    setTimeout(generateRipgrepCommand, 0);
  };

  const showToast = (message: string, duration = 3000) => {
    setToastMessage(message);
    setShowGeneratedMessage(true);
    setTimeout(() => setShowGeneratedMessage(false), duration);
  };

  const generateRipgrepCommand = (shouldShowToast = false) => {
    let command = "rg";

    // Search type
    if (formState.matchType === "exact") {
      command += " -F"; // Fixed strings, no regex
    }

    // Case sensitivity (default is case-sensitive)
    command += " -s";

    // File extensions to include
    if (formState.includedExtensions.length > 0) {
      formState.includedExtensions.forEach(ext => {
        command += ` -g '*.${ext}'`;
      });
    }

    // File extensions to exclude
    if (formState.excludedExtensions.length > 0) {
      formState.excludedExtensions.forEach(ext => {
        command += ` -g '!*.${ext}'`;
      });
    }

    // Ignored directories
    if (formState.ignoredDirectories.length > 0) {
      formState.ignoredDirectories.forEach(dir => {
        command += ` -g '!${dir}/**'`;
      });
    }

    // File size constraints - add these BEFORE the search pattern
    if (formState.minFileSize !== null && formState.minFileSize > 0) {
      command += ` --max-filesize ${formState.minFileSize}`;
    }
    if (formState.maxFileSize !== null && formState.maxFileSize > 0) {
      command += ` --max-filesize ${formState.maxFileSize}`;
    }

    // Max days ago (file modification time)
    if (formState.maxDaysAgo !== null && formState.maxDaysAgo > 0) {
      command += " --glob-case-insensitive";
      const daysInSeconds = formState.maxDaysAgo * 24 * 60 * 60;
      command += ` -g '!{**/,}*.[mt][ti][mm][ee]<${daysInSeconds}'`; // Removed semicolon
    }

    // Search string - must be the last argument
    if (formState.searchString) {
      command += ` '${formState.searchString}'`;
    } else {
      command += ` '.'`; // Use '.' as default pattern to match any character instead of empty string
    }

    // Search location
    if (formState.searchLocation === "folder") {
      command += " -l"; // Only print filenames
    } else if (formState.searchLocation === "file") {
      command += ""; // Default behavior searches file contents
    }

    setGeneratedCommand(command);
    
    if (shouldShowToast) {
      navigator.clipboard.writeText(command).then(() => {
        showToast("Command generated and copied to clipboard! 🚀");
      });
    }
    
    return command;
  };

  const handleGenerateClick = () => {
    generateRipgrepCommand(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCommand()).then(() => {
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 3000);
    });
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(sectionId);
    }
  };

  return (
    <div class="app">
      <h1>Ripgrep Helper</h1>
      <p class="subtitle">
        Build powerful ripgrep commands with this interactive UI. Press <kbd class="keyboard-shortcut">/</kbd> to focus search.
      </p>

      <div class="form-container">
        <div class="form-group">
          <label>
            Search String
            <span class="shortcut-label">Alt+1</span>
          </label>
          <div class="search-input-wrapper">
            <input
              id="search-string"
              type="text"
              value={formState.searchString}
              onInput={(e) => {
                setFormState("searchString", e.target.value);
                generateRipgrepCommand(false);
              }}
              placeholder="Enter search term..."
            />
          </div>
        </div>

        <div class="form-group">
          <label>
            Search Location
            <span class="shortcut-label">Alt+2</span>
          </label>
          <div class="radio-group">
            <label class="radio-option">
              <input
                type="radio"
                checked={formState.searchLocation === "both"}
                onChange={() => {
                  setFormState("searchLocation", "both");
                  generateRipgrepCommand(false);
                }}
              />
              Both
            </label>
            <label class="radio-option">
              <input
                type="radio"
                checked={formState.searchLocation === "folder"}
                onChange={() => {
                  setFormState("searchLocation", "folder");
                  generateRipgrepCommand(false);
                }}
              />
              Folder
            </label>
            <label class="radio-option">
              <input
                type="radio"
                checked={formState.searchLocation === "file"}
                onChange={() => {
                  setFormState("searchLocation", "file");
                  generateRipgrepCommand(false);
                }}
              />
              File
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>
            Match Type
            <span class="shortcut-label">Alt+3</span>
          </label>
          <div class="radio-group">
            <label class="radio-option">
              <input
                type="radio"
                checked={formState.matchType === "contains"}
                onChange={() => {
                  setFormState("matchType", "contains");
                  generateRipgrepCommand(false);
                }}
              />
              Contains
            </label>
            <label class="radio-option">
              <input
                type="radio"
                checked={formState.matchType === "exact"}
                onChange={() => {
                  setFormState("matchType", "exact");
                  generateRipgrepCommand(false);
                }}
              />
              Exact
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>
            Include Extensions
            <span class="shortcut-label">Alt+4</span>
          </label>
          <div class="extensions-grid">
            <For each={commonExtensions}>
              {(ext) => (
                <button
                  type="button"
                  class="extension-btn"
                  classList={{ selected: formState.includedExtensions.includes(ext) }}
                  onClick={() => toggleExtension(ext, "include")}
                >
                  {ext}
                </button>
              )}
            </For>
          </div>
        </div>

        <div class="form-group">
          <label>
            Exclude Extensions
            <span class="shortcut-label">Alt+5</span>
          </label>
          <div class="extensions-grid">
            <For each={commonExtensions}>
              {(ext) => (
                <button
                  type="button"
                  class="extension-btn"
                  classList={{ selected: formState.excludedExtensions.includes(ext) }}
                  onClick={() => toggleExtension(ext, "exclude")}
                >
                  {ext}
                </button>
              )}
            </For>
          </div>
        </div>

        <Show when={generatedCommand()}>
          <div class="command-output">
            <div innerHTML={highlightedCommand()}></div>
          </div>
        </Show>

        <button class="generate-btn" onClick={handleGenerateClick}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 16.7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.3a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v7.4Z"></path>
          </svg>
          Generate Command
        </button>

      <div class="keyboard-hint">
        Press <kbd>/</kbd> to focus search • Press <kbd>Enter</kbd> to generate
      <p>Built by <a href="https://github.com/remcostoeten">Remco Stoeten</a>Utilizing <kbd>Solid.JS</kbd>   </p>
      </div>
      </div>

      <div class="toast" classList={{ visible: showGeneratedMessage() }}>
        {toastMessage()}
      </div>
    </div>
  );
}