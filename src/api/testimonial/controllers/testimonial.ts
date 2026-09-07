import { factories } from '@strapi/strapi';

/**
 * Unmodified core controller. Testimonials are read only indirectly via
 * the `blocks.testimonials` component's relation (populated as part of
 * page/service populate builders) — never fetched standalone by the
 * frontend.
 */
export default factories.createCoreController('api::testimonial.testimonial');
