import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  OutboundMessageResult,
  Platform,
  PlatformStatus,
  StreamMetadataResult,
} from '@mstream/contracts';
import { useFormik, type FormikErrors } from 'formik';
import * as yup from 'yup';
import { PlatformIcon } from '../../components/platform-icon';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';

type StreamDraft = { title: string; categoryId: string };
type StreamValues = { destinations: Platform[]; twitch: StreamDraft; kick: StreamDraft };

const draftSchema = yup.object({
  title: yup.string().trim().max(140, 'Le titre est trop long.'),
  categoryId: yup.string().trim(),
});
const validationSchema = yup.object({
  destinations: yup
    .array(yup.mixed<Platform>().oneOf(['twitch', 'kick']).required())
    .min(1, 'Sélectionnez une plateforme.')
    .required(),
  twitch: draftSchema,
  kick: draftSchema,
});

export function StreamSettings({ statuses }: { statuses: PlatformStatus[] }) {
  const [metadata, setMetadata] = useState<StreamMetadataResult[]>([]);
  const connected = useMemo(
    () =>
      (['twitch', 'kick'] as const).filter(
        (platform) =>
          statuses.some((status) => status.platform === platform && status.state === 'connected') ||
          metadata.some((item) => item.platform === platform && item.status === 'success'),
      ),
    [statuses, metadata],
  );
  const connectedKey = connected.join(',');
  const [selected, setSelected] = useState<Platform>('twitch');
  const [results, setResults] = useState<OutboundMessageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const edited = useRef(new Set<string>());
  const formik = useFormik<StreamValues>({
    initialValues: {
      destinations: connected,
      twitch: { title: '', categoryId: '' },
      kick: { title: '', categoryId: '' },
    },
    validationSchema,
    validate: (values) => {
      const errors: FormikErrors<StreamValues> = {};
      for (const platform of values.destinations) {
        const draft = values[platform];
        if (!draft.title.trim() && !draft.categoryId.trim())
          errors[platform] = { title: 'Renseignez un titre ou une catégorie.' };
      }
      return errors;
    },
    onSubmit: async (values) => {
      const updates = await Promise.all(
        values.destinations.map(async (platform): Promise<OutboundMessageResult> => {
          const draft = values[platform];
          try {
            const response = await fetch('/commands/stream', {
              method: 'PATCH',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: draft.title.trim() || undefined,
                categoryId: draft.categoryId.trim() || undefined,
                destinations: [platform],
              }),
            });
            if (!response.ok) throw new Error('Stream update failed');
            const body = (await response.json()) as OutboundMessageResult[];
            return body[0] ?? { platform, status: 'rejected', message: 'No update result' };
          } catch {
            return { platform, status: 'network-error', message: 'La mise à jour a échoué.' };
          }
        }),
      );
      setResults(updates);
    },
  });

  useEffect(() => {
    void formik.setFieldValue('destinations', connected, false);
    if (!connected.includes(selected)) setSelected(connected[0] ?? 'twitch');
  }, [connectedKey]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    void fetch('/commands/stream', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Stream metadata failed');
        return (await response.json()) as StreamMetadataResult[];
      })
      .then((items) => {
        if (!active) return;
        setMetadata(items);
        void formik.setValues((current) => {
          const next = { ...current };
          for (const item of items) {
            if (item.status !== 'success') continue;
            next[item.platform] = {
              title: edited.current.has(`${item.platform}.title`)
                ? current[item.platform].title
                : (item.title ?? ''),
              categoryId: edited.current.has(`${item.platform}.categoryId`)
                ? current[item.platform].categoryId
                : (item.categoryId ?? ''),
            };
          }
          return next;
        }, false);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedDraft = formik.values[selected];
  const titleError = formik.touched[selected]?.title && formik.errors[selected]?.title;
  const categoryError = formik.touched[selected]?.categoryId && formik.errors[selected]?.categoryId;
  const destinationsError = formik.touched.destinations && formik.errors.destinations;
  const selectedMetadata = metadata.find((item) => item.platform === selected);
  const canSubmit = formik.values.destinations.every((platform) => {
    const draft = formik.values[platform];
    return Boolean(draft.title.trim() || draft.categoryId.trim());
  });

  return (
    <form
      className="composer"
      onSubmit={formik.handleSubmit}
      aria-labelledby="stream-settings-title"
    >
      <h2 id="stream-settings-title">Paramètres du stream</h2>
      <div className="recipient-list" aria-label="Plateformes à mettre à jour">
        {(['twitch', 'kick'] as const).map((platform) => (
          <label
            key={platform}
            className={selected === platform ? 'stream-platform-active' : undefined}
          >
            <Checkbox
              aria-label={platform}
              checked={formik.values.destinations.includes(platform)}
              disabled={!connected.includes(platform) || formik.isSubmitting}
              onCheckedChange={(checked) => {
                const destinations = checked
                  ? [...formik.values.destinations, platform]
                  : formik.values.destinations.filter((value) => value !== platform);
                void formik.setFieldValue('destinations', destinations);
                void formik.setFieldTouched('destinations', true, false);
                setSelected(
                  checked || selected !== platform ? platform : (destinations[0] ?? platform),
                );
              }}
            />
            <PlatformIcon platform={platform} />
          </label>
        ))}
      </div>
      {loading && <p role="status">Chargement des paramètres actuels…</p>}
      {loadError && (
        <p role="alert" className="form-message">
          Impossible de charger les paramètres du stream.
        </p>
      )}
      {metadata
        .filter((item) => item.status !== 'success' && connected.includes(item.platform))
        .map((item) => (
          <p key={item.platform} role="alert" className="form-message">
            {item.platform === 'twitch' ? 'Twitch' : 'Kick'} :{' '}
            {item.message ?? 'Chargement impossible'}
          </p>
        ))}
      <div className="settings-fields">
        <label>
          Titre
          <Input
            name={`${selected}.title`}
            value={selectedDraft.title}
            maxLength={140}
            onChange={(event) => {
              edited.current.add(`${selected}.title`);
              formik.handleChange(event);
            }}
            onBlur={formik.handleBlur}
            aria-invalid={Boolean(titleError)}
            aria-describedby={titleError ? 'title-error' : undefined}
          />
          {titleError && (
            <span id="title-error" className="form-message" role="alert">
              {titleError}
            </span>
          )}
        </label>
        <label>
          Catégorie / ID
          <Input
            name={`${selected}.categoryId`}
            value={selectedDraft.categoryId}
            onChange={(event) => {
              edited.current.add(`${selected}.categoryId`);
              formik.handleChange(event);
            }}
            onBlur={formik.handleBlur}
            aria-invalid={Boolean(categoryError)}
            aria-describedby={categoryError ? 'category-error' : undefined}
          />
          {categoryError && (
            <span id="category-error" className="form-message" role="alert">
              {categoryError}
            </span>
          )}
        </label>
      </div>
      {selectedMetadata?.status === 'success' && selectedMetadata.categoryName && (
        <p>
          Catégorie actuelle : <strong>{selectedMetadata.categoryName}</strong>
        </p>
      )}
      {typeof destinationsError === 'string' && (
        <p className="form-message" role="alert">
          {destinationsError}
        </p>
      )}
      <Button
        type="submit"
        disabled={!formik.values.destinations.length || !canSubmit || formik.isSubmitting}
      >
        Mettre à jour
      </Button>
      {results.length > 0 && (
        <ul className="result-list" aria-live="polite">
          {results.map((result) => (
            <li key={result.platform}>
              <span className="result-platform" role="img" aria-label={result.platform}>
                <PlatformIcon platform={result.platform} />
              </span>
              <strong>{result.status}</strong>
              {result.message && <small>{result.message}</small>}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
