import { Combobox } from '@base-ui/react/combobox';
import { useId, useMemo, useState } from 'react';

export type AutocompleteOption = {
  value: string;
  label: string;
  imageUrl?: string;
};

type AutocompleteProps = {
  label: string;
  value: string | null;
  inputValue: string;
  options: AutocompleteOption[];
  onValueChange: (value: AutocompleteOption | null) => void;
  onInputValueChange: (value: string) => void;
  onBlur?: () => void;
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

export function Autocomplete({
  label,
  value,
  inputValue,
  options,
  onValueChange,
  onInputValueChange,
  onBlur,
  loading = false,
  error,
  emptyMessage = 'Aucun résultat.',
  placeholder,
  disabled = false,
  invalid = false,
  describedBy,
}: AutocompleteProps) {
  const [open, setOpen] = useState(false);
  const inputId = useId();
  const items = useMemo(() => {
    if (!value || options.some((option) => option.value === value)) return options;
    return [...options, { value, label: inputValue }];
  }, [inputValue, options, value]);

  return (
    <Combobox.Root
      items={Combobox.createItems(items, {
        getValue: (option) => option.value,
        getLabel: (option) => option.label,
      })}
      filteredItems={options}
      value={value}
      inputValue={inputValue}
      open={open}
      onOpenChange={setOpen}
      onValueChange={(nextValue) =>
        onValueChange(options.find((option) => option.value === nextValue) ?? null)
      }
      onInputValueChange={(nextValue, details) => {
        if (details.reason === 'input-change' || details.reason === 'input-clear') {
          onInputValueChange(nextValue);
          setOpen(nextValue.length > 0);
        }
      }}
    >
      <label className="autocomplete-label" htmlFor={inputId}>
        {label}
      </label>
      <Combobox.Input
        id={inputId}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={onBlur}
      />
      <Combobox.Portal>
        <Combobox.Positioner className="autocomplete-positioner" sideOffset={4}>
          <Combobox.Popup className="autocomplete-popup">
            {loading && (
              <Combobox.Status className="autocomplete-status">Recherche…</Combobox.Status>
            )}
            {error && <p className="autocomplete-status form-message">{error}</p>}
            <Combobox.List className="autocomplete-list">
              {(option) => (
                <Combobox.Item
                  key={option.value}
                  value={option.value}
                  className="autocomplete-option"
                >
                  {option.imageUrl && (
                    <img className="autocomplete-image" src={option.imageUrl} alt="" />
                  )}
                  <span>{option.label}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
            {!loading && !error && options.length === 0 && inputValue.length >= 3 && (
              <Combobox.Empty className="autocomplete-status">{emptyMessage}</Combobox.Empty>
            )}
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
