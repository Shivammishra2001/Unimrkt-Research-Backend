import { factories } from '@strapi/strapi';

/**
 * Plain core CRUD controller — never fetched directly by the frontend.
 * The merge endpoint in the `city` API's city-service controller is the
 * only public read surface for override data.
 */
export default factories.createCoreController(
  'api::city-service-override.city-service-override'
);
