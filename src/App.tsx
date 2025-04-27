import { createSignal, createEffect, onMount, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import "./index.css";

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
  const [generatedCommand, setGeneratedCommand] = createSignal("");

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

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  // Save state to localStorage whenever it changes
  createEffect(() => {
    localStorage.setItem("ripgrepHelperState", JSON.stringify(formState));
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    // Focus search input on '/'
    if (e.key === "/" && !isInputFocused()) {
      e.preventDefault();
      const searchInput = document.getElementById("search-string");
      if (searchInput) searchInput.focus();
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

    // Generate command on Enter if not in a textarea
    if (e.key === "Enter" && !isTextareaFocused()) {
      e.preventDefault();
      generateRipgrepCommand();
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
  };

  const generateRipgrepCommand = () => {
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
        command += ` -g "*.${ext}"`;
      });
    }

    // File extensions to exclude
    if (formState.excludedExtensions.length > 0) {
      formState.excludedExtensions.forEach(ext => {
        command += ` -g "!*.${ext}"`;
      });
    }

    // Ignored directories
    if (formState.ignoredDirectories.length > 0) {
      formState.ignoredDirectories.forEach(dir => {
        command += ` -g "!${dir}/**"`;
      });
    }

    // Max days ago (file modification time)
    if (formState.maxDaysAgo !== null && formState.maxDaysAgo > 0) {
      const date = new Date();
      date.setDate(date.getDate() - formState.maxDaysAgo);
      const formattedDate = date.toISOString().split('T')[0];
      command += ` --newer "${formattedDate}"`;
    }

    // File size constraints
    if (formState.minFileSize !== null && formState.minFileSize > 0) {
      command += ` --min-filesize ${formState.minFileSize}`;
    }
    if (formState.maxFileSize !== null && formState.maxFileSize > 0) {
      command += ` --max-filesize ${formState.maxFileSize}`;
    }

    // Search string
    if (formState.searchString) {
      command += ` "${formState.searchString}"`;
    } else {
      command += ` ""`;
    }

    // Search location
    if (formState.searchLocation === "folder") {
      command += " -l"; // Only print filenames
    } else if (formState.searchLocation === "file") {
      command += ""; // Default behavior searches file contents
    } else {
      // Both - no special flags needed
    }

    // Copy to clipboard
    navigator.clipboard.writeText(command).then(() => {
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 3000);
    });

    setGeneratedCommand(command);
    return command;
  };

  return (
    <div class="app">
      <header>
        <h1>Ripgrep Helper</h1>
        <p>Build your ripgrep command with a user-friendly interface</p>
      </header>

      <main>
        <section class="form-container">
          <div class="form-group" id="search-section">
            <label for="search-string">
              Search String <span class="shortcut">(Alt+1, /)</span>
            </label>
            <input
              id="search-string"
              type="text"
              value={formState.searchString}
              onInput={(e) => setFormState("searchString", e.target.value)}
              placeholder="Enter text to search for..."
              autofocus
            />
          </div>

          <div class="form-group" id="search-location-section">
            <label for="search-location">
              Search Location <span class="shortcut">(Alt+2)</span>
            </label>
            <select
              id="search-location"
              value={formState.searchLocation}
              onChange={(e) => setFormState("searchLocation", e.target.value as any)}
            >
              <option value="both">Both (folder names and file contents)</option>
              <option value="folder">Folder names only</option>
              <option value="file">File contents only</option>
            </select>
          </div>

          <div class="form-group" id="match-type-section">
            <label for="match-type">
              Match Type <span class="shortcut">(Alt+3)</span>
            </label>
            <select
              id="match-type"
              value={formState.matchType}
              onChange={(e) => setFormState("matchType", e.target.value as any)}
            >
              <option value="contains">Contains (regex)</option>
              <option value="exact">Exact match</option>
            </select>
          </div>

          <div class="form-group" id="file-size-section">
            <div class="form-row">
              <div class="form-col">
                <label for="min-file-size">
                  Min File Size (KB) <span class="shortcut">(Alt+4)</span>
                </label>
                <input
                  id="min-file-size"
                  type="number"
                  min="0"
                  value={formState.minFileSize ?? ""}
                  onInput={(e) => setFormState("minFileSize", e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="No minimum"
                />
              </div>
              <div class="form-col">
                <label for="max-file-size">
                  Max File Size (KB) <span class="shortcut">(Alt+5)</span>
                </label>
                <input
                  id="max-file-size"
                  type="number"
                  min="0"
                  value={formState.maxFileSize ?? ""}
                  onInput={(e) => setFormState("maxFileSize", e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="No maximum"
                />
              </div>
            </div>
          </div>

          <div class="form-group" id="days-ago-section">
            <label for="max-days-ago">
              Max Days Since Modified <span class="shortcut">(Alt+6)</span>
            </label>
            <input
              id="max-days-ago"
              type="number"
              min="0"
              value={formState.maxDaysAgo ?? ""}
              onInput={(e) => setFormState("maxDaysAgo", e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Any time"
            />
          </div>

          <div class="form-group" id="extensions-section">
            <label>
              File Extensions <span class="shortcut">(Alt+7)</span>
            </label>
            <div class="extensions-container">
              <div class="extensions-column">
                <h4>Include Extensions</h4>
                <div class="extension-buttons">
                  <For each={commonExtensions}>
                    {(ext) => (
                      <button
                        type="button"
                        classList={{
                          "extension-btn": true,
                          "selected": formState.includedExtensions.includes(ext)
                        }}
                        onClick={() => toggleExtension(ext, "include")}
                      >
                        {ext}
                      </button>
                    )}
                  </For>
                </div>
              </div>
              <div class="extensions-column">
                <h4>Exclude Extensions</h4>
                <div class="extension-buttons">
                  <For each={commonExtensions}>
                    {(ext) => (
                      <button
                        type="button"
                        classList={{
                          "extension-btn": true,
                          "exclude-selected": formState.excludedExtensions.includes(ext)
                        }}
                        onClick={() => toggleExtension(ext, "exclude")}
                      >
                        {ext}
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </div>
          </div>

          <div class="form-group" id="ignored-dirs-section">
            <label>
              Ignored Directories <span class="shortcut">(Alt+8)</span>
            </label>
            <div class="ignored-dirs-container">
              <For each={defaultIgnoredDirs}>
                {(dir) => (
                  <button
                    type="button"
                    classList={{
                      "dir-btn": true,
                      "selected": formState.ignoredDirectories.includes(dir)
                    }}
                    onClick={() => toggleIgnoredDirectory(dir)}
                  >
                    {dir}
                  </button>
                )}
              </For>
            </div>
          </div>

          <div class="form-group" id="templates-section">
            <label>
              Preset Templates <span class="shortcut">(Alt+9)</span>
            </label>
            <div class="templates-container">
              <For each={presetTemplates}>
                {(template, index) => (
                  <button
                    type="button"
                    class="template-btn"
                    onClick={() => applyTemplate(index())}
                  >
                    {template.name}
                  </button>
                )}
              </For>
            </div>
          </div>

          <div class="form-actions">
            <button
              type="button"
              class="generate-btn"
              onClick={generateRipgrepCommand}
            >
              Generate Command (Enter)
            </button>
          </div>
        </section>

        <Show when={generatedCommand()}>
          <section class="result-section">
            <h3>Generated Command:</h3>
            <div class="command-display">
              <code>{generatedCommand()}</code>
            </div>
            <div class="copy-message" classList={{ "visible": showCopiedMessage() }}>
              Command copied to clipboard!
            </div>
          </section>
        </Show>
      </main>

      <footer>
        <p>Keyboard Shortcuts: Press / to focus search, Alt+1-9 for form sections, Enter to generate</p>
      </footer>
    </div>
  );
}
