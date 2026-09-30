import { useEffect, useMemo, useState } from 'react';
import type { OutboundMessageResult, Platform, PlatformStatus } from '@mstream/contracts';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';

type ComposerValues = {
  destinations: Platform[];
  message: string;
};

const validationSchema = yup.object({
  destinations: yup
    .array(yup.mixed<Platform>().oneOf(['twitch', 'kick']).required())
    .min(1, 'Sélectionnez une plateforme.')
    .required(),
  message: yup
    .string()
    .trim()
    .max(500, 'Le message est trop long.')
    .required('Saisissez un message.'),
});

export function MessageComposer({ statuses }: { statuses: PlatformStatus[] }) {
  const connected = useMemo(
    () =>
      statuses.filter((status) => status.state === 'connected').map((status) => status.platform),
    [statuses],
  );
  const connectedKey = connected.join(',');
  const [results, setResults] = useState<OutboundMessageResult[]>([]);
  const formik = useFormik<ComposerValues>({
    initialValues: { destinations: connected, message: '' },
    validationSchema,
    onSubmit: async (values, { setFieldValue, setFieldTouched }) => {
      const response = await fetch('/commands/messages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: values.message.trim(),
          destinations: values.destinations,
        }),
      });
      setResults((await response.json()) as OutboundMessageResult[]);
      await setFieldValue('message', '', false);
      await setFieldTouched('message', false, false);
    },
  });

  useEffect(() => {
    void formik.setFieldValue('destinations', connected, false);
  }, [connectedKey]);

  const messageError = formik.touched.message && formik.errors.message;
  const destinationsError = formik.touched.destinations && formik.errors.destinations;

  return (
    <form className="composer" onSubmit={formik.handleSubmit} aria-labelledby="composer-title">
      <h2 id="composer-title">Répondre</h2>
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
      <div className="composer-row">
        <label className="sr-only" htmlFor="message">
          Message
        </label>
        <Input
          id="message"
          name="message"
          value={formik.values.message}
          maxLength={500}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          aria-invalid={Boolean(messageError)}
          aria-describedby={messageError ? 'message-error' : undefined}
          placeholder="Écrire un message…"
        />
        <Button
          type="submit"
          disabled={
            !formik.values.message.trim() ||
            !formik.values.destinations.length ||
            formik.isSubmitting
          }
        >
          Envoyer
        </Button>
      </div>
      {messageError && (
        <p id="message-error" className="form-message" role="alert">
          {messageError}
        </p>
      )}
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
