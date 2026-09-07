import { buildServicePopulate } from '../../service/services/service';
import { buildOverridePopulate } from '../../city-service-override/services/city-service-override';

/**
 * NOT a controller for the `city` content type itself — this backs the
 * two custom endpoints registered in routes/city-service.ts:
 * GET /services-by-location and GET /services-by-location/combinations.
 */
export default {
  /**
   * GET /services-by-location?city=:citySlug&service=:serviceSlug
   *
   * Looks for a city-service-override row first (one round trip returns
   * city, master service, and override together); falls back to two
   * independent, parallel city/service lookups when no override exists.
   * Merging override-over-master is explicitly a frontend concern, not
   * done here — `override` is `null` when no row exists, which is the
   * normal case, not an error.
   */
  async findByLocation(ctx) {
    const { city: citySlug, service: serviceSlug } = ctx.query;

    if (!citySlug || typeof citySlug !== 'string') {
      return ctx.badRequest('Missing "city" query param');
    }
    if (!serviceSlug || typeof serviceSlug !== 'string') {
      return ctx.badRequest('Missing "service" query param');
    }

    const isDraft = ctx.query.status === 'draft';
    const status = isDraft ? 'draft' : 'published';

    const [overrideEntry] = await strapi
      .documents('api::city-service-override.city-service-override')
      .findMany({
        filters: { city: { slug: citySlug }, service: { slug: serviceSlug } },
        status,
        populate: buildOverridePopulate(),
        limit: 1,
      });

    let city;
    let service;
    let override = null;

    if (overrideEntry) {
      const { city: overrideCity, service: overrideService, ...rest } = overrideEntry;
      city = overrideCity;
      service = overrideService;
      override = rest;
    } else {
      [city, service] = await Promise.all([
        strapi
          .documents('api::city.city')
          .findMany({
            filters: { slug: citySlug },
            status,
            populate: { localMeta: { populate: ['shareImage'] } },
            limit: 1,
          })
          .then((entries) => entries[0] ?? null),
        strapi
          .documents('api::service.service')
          .findMany({
            filters: { slug: serviceSlug },
            status,
            populate: buildServicePopulate(),
            limit: 1,
          })
          .then((entries) => entries[0] ?? null),
      ]);
    }

    if (!city) {
      return ctx.notFound(`City "${citySlug}" not found`);
    }
    if (!service) {
      return ctx.notFound(`Service "${serviceSlug}" not found`);
    }

    const [sanitizedCity, sanitizedService, sanitizedOverride] = await Promise.all([
      strapi.contentAPI.sanitize.output(city, strapi.getModel('api::city.city'), {
        auth: ctx.state.auth,
      }),
      strapi.contentAPI.sanitize.output(service, strapi.getModel('api::service.service'), {
        auth: ctx.state.auth,
      }),
      override
        ? strapi.contentAPI.sanitize.output(
            override,
            strapi.getModel('api::city-service-override.city-service-override'),
            { auth: ctx.state.auth }
          )
        : null,
    ]);

    ctx.set(
      'Cache-Control',
      isDraft ? 'no-store' : 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
    );

    return {
      data: { city: sanitizedCity, service: sanitizedService, override: sanitizedOverride },
      meta: {},
    };
  },

  /**
   * GET /services-by-location/combinations
   *
   * Backs generateStaticParams() on the frontend: the full cross-product
   * of every city with every service. An override is optional, not what
   * makes a pair "exist" — a city page for an un-overridden service
   * still renders from the master.
   */
  async findCombinations(ctx) {
    const isDraft = ctx.query.status === 'draft';
    const status = isDraft ? 'draft' : 'published';

    const [cities, services] = await Promise.all([
      strapi.documents('api::city.city').findMany({ status, fields: ['slug'] }),
      strapi.documents('api::service.service').findMany({ status, fields: ['slug'] }),
    ]);

    const combinations = cities.flatMap((city) =>
      services.map((service) => ({ citySlug: city.slug, serviceSlug: service.slug }))
    );

    ctx.set('Cache-Control', isDraft ? 'no-store' : 'public, max-age=0, s-maxage=3600');

    return { data: combinations, meta: {} };
  },
};
