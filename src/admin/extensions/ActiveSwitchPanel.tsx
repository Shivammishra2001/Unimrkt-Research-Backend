import { Field, Flex, Toggle, Typography } from '@strapi/design-system';
import { useForm } from '@strapi/strapi/admin';

// Collections that carry the `isActive` switch (see the matching schemas under src/api).
const SWITCHABLE = new Set([
  'api::page.page',
  'api::industry.industry',
  'api::service.service',
  'api::blog.blog',
  'api::case-study.case-study',
]);

/**
 * Right-hand "Page visibility" panel of the Content Manager edit view: the primary ON/OFF switch for `isActive`. It edits the same form
 * field as the regular input, so saving/publishing works exactly as for any other field. OFF = the public URL answers 404.
 */
const ActiveSwitchPanel = ({ model }: { model: string }) => {
  const value = useForm<boolean | null | undefined>('ActiveSwitchPanel', (state) => (state.values as { isActive?: boolean | null }).isActive);
  const onChange = useForm<(name: string, value: unknown) => void>('ActiveSwitchPanel', (state) => state.onChange);

  if (!SWITCHABLE.has(model)) return null;
  // Entries saved before the field existed hold null — that counts as active.
  const active = value !== false;

  return {
    title: 'Page visibility',
    content: (
      <Flex direction="column" alignItems="stretch" gap={2} width="100%">
        <Field.Root name="isActive" hint={active ? 'Live — the page is reachable on the website.' : 'Hidden — visitors get a 404 page.'}>
          <Toggle
            onLabel="Active"
            offLabel="Inactive"
            checked={active}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('isActive', e.target.checked)}
          />
          <Field.Hint />
        </Field.Root>
        <Typography variant="pi" textColor="neutral600">
          Save (and publish) to apply. Preview still shows inactive pages.
        </Typography>
      </Flex>
    ),
  };
};

export default ActiveSwitchPanel;
