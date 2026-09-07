import { factories } from '@strapi/strapi';

/**
 * Plain core CRUD controller — no overrides. Cities are never fetched
 * directly by slug from the frontend, only through the
 * /services-by-location merge endpoint (see controllers/city-service.ts).
 */
export default factories.createCoreController('api::city.city');
