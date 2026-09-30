import { useEffect, useMemo, useState } from 'react';
import type { OutboundMessageResult, Platform, PlatformStatus } from '@mstream/contracts';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';

type StreamValues = {
  destinations: Platform[];
  title: string;
  categoryId: string;
};

const validationSchema = yup.object({
  destinations: yup
    .array(yup.mixed<Platform>().oneOf(['twitch', 'kick']).required())
    .min(1, 'Sélectionnez une plateforme.')
    .required(),
  title: yup
    .string()
    .trim()
    .max(140, 'Le titre est trop long.')
    .test('title-or-category', 'Renseignez un titre ou une catégorie.', function (value) {
      return Boolean(value || this.parent.categoryId?.trim());
    }),
  categoryId: yup.string().trim(),
});

export function StreamSettings({ statuses }: { statuses: PlatformStatus[] }) {
  const connected = useMemo(
    () =>
      statuses.filter((status) => status.state === 'connected').map((status) => status.platform),
    [statuses],
  );
  const connectedKey = connected.join(',');
  const [results, setResults] = useState<OutboundMessageResult[]>([]);
  const formik = useFormik<StreamValues>({
    initialValues: { destinations: connected, title: '', categoryId: '' },
    validationSchema,
    onSubmit: async (values) => {
      const response = await fetch('/commands/stream', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.title.trim() || undefined,
          categoryId: values.categoryId.trim() || undefined,
          destinations: values.destinations,
        }),
      });
      setResults((await response.json()) as OutboundMessageResult[]);
    },
  });

  useEffect(() => {
    void formik.setFieldValue('destinations', connected, false);
  }, [connectedKey]);

  const titleError = formik.touched.title && formik.errors.title;
  const categoryError = formik.touched.categoryId && formik.errors.categoryId;
  const destinationsError = formik.touched.destinations && formik.errors.destinations;

  return (
    <form
      className="composer"
      onSubmit={formik.handleSubmit}
      aria-labelledby="stream-settings-title"
    >
      <h2 id="stream-settings-title">Paramètres du stream</h2>
      <div className="settings-fields">
        <label>
          Titre
          <Input
            name="title"
            value={formik.values.title}
            maxLength={140}
            onChange={formik.handleChange}
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
            name="categoryId"
            value={formik.values.categoryId}
            onChange={formik.handleChange}
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
      <div className="recipient-list">
        {(['twitch', 'kick'] as const).map((platform) => (
          <label key={platform}>
            <Checkbox
              checked={formik.values.destinations.includes(platform)}
              disabled={!connected.includes(platform) || formik.isSubmitting}
              onCheckedChange={(checked) => {
                const destinations = checked
                  ? [...formik.values.destinations, platform]
                  : formik.values.destinations.filter((value) => value !== platform);
                void formik.setFieldValue('destinations', destinations);
                void formik.setFieldTouched('destinations', true, false);
              }}
            />{' '}
            {platform}
          </label>
        ))}
      </div>
      {typeof destinationsError === 'string' && (
        <p className="form-message" role="alert">
          {destinationsError}
        </p>
      )}
      <Button
        type="submit"
        disabled={
          (!formik.values.title.trim() && !formik.values.categoryId.trim()) ||
          !formik.values.destinations.length ||
          formik.isSubmitting
        }
      >
        Mettre à jour
      </Button>
      {results.length > 0 && (
        <ul className="result-list" aria-live="polite">
          {results.map((result) => (
            <li key={result.platform}>
              <span>{result.platform}</span>
              <strong>{result.status}</strong>
              {result.message && <small>{result.message}</small>}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
