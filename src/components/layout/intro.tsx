import { siteConfig } from '../../core/config';

type FormState = {
  searchString: string;
};

type TProps = {
  formState: FormState;
  setFormState: (field: string, value: unknown) => void;
  generateRipgrepCommand: (showToast?: boolean) => void;
};

export function Intro(props: TProps) {
  return (
    <>
      <h1>{siteConfig.name}</h1>
      <p class="subtitle">{siteConfig.description}</p>
      <p class="subtitle">{siteConfig['additional-info']}</p>

      <div class="shortcuts-info">
        <span class="shortcut-item">
          Press <kbd class="keyboard-shortcut">{siteConfig.shortcuts.focus}</kbd> to focus
        </span>
        <span class="shortcut-item">
          Press <kbd class="keyboard-shortcut">{siteConfig.shortcuts.generate}</kbd> to generate
        </span>
      </div>

      <div class="form-container">
        <div class="form-group" id="search-section">
          <label>
            Search String
            <span class="shortcut-label">Alt+1</span>
          </label>
          <div class="search-input-wrapper">
            <input
              id="search-string"
              type="text"
              value={props.formState.searchString}
              onInput={(e: Event) => {
                props.setFormState('searchString', (e.currentTarget as HTMLInputElement).value);
                props.generateRipgrepCommand(false);
              }}
              placeholder="Enter search term..."
            />
          </div>
        </div>
      </div>
    </>
  );
}
