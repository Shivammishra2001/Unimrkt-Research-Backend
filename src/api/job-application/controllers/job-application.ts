import { factories } from '@strapi/strapi';

interface FormidableFile {
  filepath: string;
  originalFilename?: string | null;
  newFilename?: string;
  mimetype?: string | null;
  size: number;
}

/**
 * Custom `create` — the base factory controller's `create()` (see
 * @strapi/core's collection-type controller) only ever reads
 * `ctx.request.body.data` and never touches `ctx.request.files` at all,
 * so it cannot handle this endpoint's multipart "data" + "files.resume"
 * submission (Figma node 924:23856's Resume/CV upload) out of the box.
 * Two fixes layered on top of the base behaviour:
 *
 * 1. koa-body's multipart parser (formidable v2, pinned by this
 *    project's @strapi/core) never JSON.parses the "data" field for a
 *    multipart request the way it does for a plain application/json
 *    body — it arrives as a raw string — so it's parsed by hand here
 *    before validating/sanitizing it, exactly as the base controller
 *    would if this were a JSON request.
 * 2. The uploaded resume is persisted via the upload plugin's own
 *    internal service (never a public /api/upload endpoint — that
 *    would let an anonymous caller attach files to arbitrary
 *    ref/refId/field combinations on ANY content type, a materially
 *    bigger public surface than this task asked for) and its resulting
 *    media id is merged into the entry's `data.resume` before creating
 *    it — the same "upload first, reference by id" flow the Strapi
 *    admin panel itself uses for every media field.
 */
export default factories.createCoreController('api::job-application.job-application', ({ strapi }) => ({
  async create(ctx) {
    const rawBody = ctx.request.body as { data?: unknown } | undefined;
    let parsedData: Record<string, unknown>;
    try {
      parsedData = typeof rawBody?.data === 'string' ? JSON.parse(rawBody.data) : ((rawBody?.data as Record<string, unknown>) ?? {});
    } catch {
      return ctx.badRequest('Invalid JSON in "data" field.');
    }
    if (typeof parsedData !== 'object' || parsedData === null) {
      return ctx.badRequest('Missing "data" payload in the request body.');
    }

    const files = (ctx.request as unknown as { files?: Record<string, FormidableFile | FormidableFile[]> }).files;
    const resumeFile = files?.['files.resume'];
    if (!resumeFile || Array.isArray(resumeFile)) {
      return ctx.badRequest('A single "files.resume" upload is required.');
    }

    const [uploadedFile] = await strapi.plugin('upload').service('upload').upload({
      data: {},
      files: {
        filepath: resumeFile.filepath,
        originalFilename: resumeFile.originalFilename ?? resumeFile.newFilename ?? 'resume',
        mimetype: resumeFile.mimetype ?? 'application/octet-stream',
        size: resumeFile.size,
      },
    });

    (ctx.request.body as { data: Record<string, unknown> }).data = { ...parsedData, resume: uploadedFile.id };

    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);
    const { body = {} } = ctx.request as { body?: { data?: unknown } };
    await this.validateInput(body.data, ctx);
    const sanitizedInputData = await this.sanitizeInput(body.data, ctx);
    // Matches @strapi/core's own collection-type create() exactly (see
    // node_modules/@strapi/core/dist/core-api/controller/collection-type.js)
    // — strapi.service(uid), not strapi.documents(uid), is what the base
    // controller actually calls.
    const entity = await strapi.service('api::job-application.job-application').create({
      ...sanitizedQuery,
      data: sanitizedInputData,
    });
    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    ctx.status = 201;
    return this.transformResponse(sanitizedEntity);
  },
}));
