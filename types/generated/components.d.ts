import type { Schema, Struct } from '@strapi/strapi';

export interface BlocksBlogPostItem extends Struct.ComponentSchema {
  collectionName: 'components_blocks_blog_post_items';
  info: {
    displayName: 'Blog Post Item';
    icon: 'quote';
  };
  attributes: {
    excerpt: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 240;
      }>;
    href: Schema.Attribute.String & Schema.Attribute.Required;
    image: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
  };
}

export interface BlocksBlogTeaser extends Struct.ComponentSchema {
  collectionName: 'components_blocks_blog_teasers';
  info: {
    displayName: 'Blog Teaser';
    icon: 'quote';
  };
  attributes: {
    actions: Schema.Attribute.Component<'shared.link', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 2;
        },
        number
      >;
    anchorId: Schema.Attribute.String;
    eyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    heading: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    posts: Schema.Attribute.Component<'blocks.blog-post-item', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 12;
          min: 1;
        },
        number
      >;
  };
}

export interface BlocksContent extends Struct.ComponentSchema {
  collectionName: 'components_blocks_contents';
  info: {
    displayName: 'Content';
    icon: 'align-left';
  };
  attributes: {
    anchorId: Schema.Attribute.String;
    body: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 2000;
      }>;
    contactEmail: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    contactPrompt: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    heading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    media: Schema.Attribute.Media<'images'>;
    mediaAlignment: Schema.Attribute.Enumeration<
      ['left', 'right', 'below', 'none']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'none'>;
    theme: Schema.Attribute.Enumeration<['light', 'dark', 'accent']> &
      Schema.Attribute.DefaultTo<'light'>;
  };
}

export interface BlocksCta extends Struct.ComponentSchema {
  collectionName: 'components_blocks_ctas';
  info: {
    displayName: 'CTA';
    icon: 'bell';
  };
  attributes: {
    actions: Schema.Attribute.Component<'shared.link', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 2;
          min: 1;
        },
        number
      >;
    anchorId: Schema.Attribute.String;
    background: Schema.Attribute.Media<'images'>;
    backgroundColor: Schema.Attribute.String;
    body: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 240;
      }>;
    heading: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    theme: Schema.Attribute.Enumeration<['light', 'dark', 'accent']> &
      Schema.Attribute.DefaultTo<'accent'>;
  };
}

export interface BlocksFaq extends Struct.ComponentSchema {
  collectionName: 'components_blocks_faqs';
  info: {
    displayName: 'FAQ';
    icon: 'question';
  };
  attributes: {
    anchorId: Schema.Attribute.String;
    background: Schema.Attribute.Media<'images'>;
    cta: Schema.Attribute.Component<'shared.link', false>;
    heading: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    items: Schema.Attribute.Component<'blocks.faq-item', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 20;
          min: 1;
        },
        number
      >;
  };
}

export interface BlocksFaqItem extends Struct.ComponentSchema {
  collectionName: 'components_blocks_faq_items';
  info: {
    displayName: 'FAQ Item';
    icon: 'question';
  };
  attributes: {
    answer: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 600;
      }>;
    question: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
  };
}

export interface BlocksFeatureGrid extends Struct.ComponentSchema {
  collectionName: 'components_blocks_feature_grids';
  info: {
    displayName: 'Feature Grid';
    icon: 'grid';
  };
  attributes: {
    anchorId: Schema.Attribute.String;
    columns: Schema.Attribute.Enumeration<['2', '3', '4']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'3'>;
    heading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    items: Schema.Attribute.Component<'blocks.feature-item', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 12;
          min: 2;
        },
        number
      >;
    subheading: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 280;
      }>;
    theme: Schema.Attribute.Enumeration<['light', 'dark']> &
      Schema.Attribute.DefaultTo<'light'>;
  };
}

export interface BlocksFeatureItem extends Struct.ComponentSchema {
  collectionName: 'components_blocks_feature_items';
  info: {
    displayName: 'Feature Item';
    icon: 'check';
  };
  attributes: {
    description: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 240;
      }>;
    icon: Schema.Attribute.Media<'images'>;
    iconIdentifier: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    link: Schema.Attribute.Component<'shared.link', false>;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    statLabel: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    statValue: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
  };
}

export interface BlocksHero extends Struct.ComponentSchema {
  collectionName: 'components_blocks_heroes';
  info: {
    displayName: 'Hero';
    icon: 'layout';
  };
  attributes: {
    actions: Schema.Attribute.Component<'shared.link', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 2;
        },
        number
      >;
    anchorId: Schema.Attribute.String;
    eyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    heading: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    headingSize: Schema.Attribute.Enumeration<['display', 'h2']> &
      Schema.Attribute.DefaultTo<'display'>;
    media: Schema.Attribute.Media<'images' | 'videos'>;
    mediaAlignment: Schema.Attribute.Enumeration<
      ['right', 'left', 'below', 'background']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'right'>;
    sideMenu: Schema.Attribute.Component<'blocks.service-band-item', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
        },
        number
      >;
    statLabel: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    statValue: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    subheading: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 280;
      }>;
    theme: Schema.Attribute.Enumeration<['light', 'dark']> &
      Schema.Attribute.DefaultTo<'light'>;
  };
}

export interface BlocksIndustryGrid extends Struct.ComponentSchema {
  collectionName: 'components_blocks_industry_grids';
  info: {
    displayName: 'Industry Grid';
    icon: 'globe';
  };
  attributes: {
    anchorId: Schema.Attribute.String;
    background: Schema.Attribute.Media<'images'>;
    cta: Schema.Attribute.Component<'shared.link', false>;
    heading: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    items: Schema.Attribute.Component<'blocks.industry-item', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 8;
          min: 1;
        },
        number
      >;
    subheading: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 280;
      }>;
  };
}

export interface BlocksIndustryItem extends Struct.ComponentSchema {
  collectionName: 'components_blocks_industry_items';
  info: {
    displayName: 'Industry Item';
    icon: 'globe';
  };
  attributes: {
    accentColor: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'#7f3856'>;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
  };
}

export interface BlocksMediaGallery extends Struct.ComponentSchema {
  collectionName: 'components_blocks_media_galleries';
  info: {
    displayName: 'Media Gallery';
    icon: 'play';
  };
  attributes: {
    actions: Schema.Attribute.Component<'shared.link', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 2;
        },
        number
      >;
    anchorId: Schema.Attribute.String;
    heading: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    items: Schema.Attribute.Component<'blocks.media-item', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 8;
          min: 1;
        },
        number
      >;
    subheading: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 280;
      }>;
  };
}

export interface BlocksMediaItem extends Struct.ComponentSchema {
  collectionName: 'components_blocks_media_items';
  info: {
    displayName: 'Media Item';
    icon: 'play';
  };
  attributes: {
    media: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    size: Schema.Attribute.Enumeration<['large', 'small']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'small'>;
    videoUrl: Schema.Attribute.String;
  };
}

export interface BlocksProcessStepItem extends Struct.ComponentSchema {
  collectionName: 'components_blocks_process_step_items';
  info: {
    displayName: 'Process Step Item';
    icon: 'list';
  };
  attributes: {
    description: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 240;
      }>;
    icon: Schema.Attribute.Media<'images'>;
    iconIdentifier: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    stepNumber: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 4;
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
  };
}

export interface BlocksProcessSteps extends Struct.ComponentSchema {
  collectionName: 'components_blocks_process_steps';
  info: {
    description: 'Numbered methodology/journey steps \u2014 Figma node 617:7561\'s "Our Research Ecosystem" / "From Question to Business Decision" section.';
    displayName: 'Process Steps';
    icon: 'arrow-right';
  };
  attributes: {
    anchorId: Schema.Attribute.String;
    eyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    heading: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    steps: Schema.Attribute.Component<'blocks.process-step-item', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 8;
          min: 2;
        },
        number
      >;
    subheading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 320;
      }>;
    theme: Schema.Attribute.Enumeration<['light', 'dark', 'accent']> &
      Schema.Attribute.DefaultTo<'light'>;
  };
}

export interface BlocksServiceBand extends Struct.ComponentSchema {
  collectionName: 'components_blocks_service_bands';
  info: {
    displayName: 'Service Band';
    icon: 'layer';
  };
  attributes: {
    anchorId: Schema.Attribute.String;
    background: Schema.Attribute.Media<'images'>;
    body: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 400;
      }>;
    cta: Schema.Attribute.Component<'shared.link', false>;
    heading: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    items: Schema.Attribute.Component<'blocks.service-band-item', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 6;
          min: 1;
        },
        number
      >;
  };
}

export interface BlocksServiceBandItem extends Struct.ComponentSchema {
  collectionName: 'components_blocks_service_band_items';
  info: {
    displayName: 'Service Band Item';
    icon: 'bulletList';
  };
  attributes: {
    description: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    href: Schema.Attribute.String & Schema.Attribute.Required;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
  };
}

export interface BlocksStatItem extends Struct.ComponentSchema {
  collectionName: 'components_blocks_stat_items';
  info: {
    displayName: 'Stat Item';
    icon: 'chart-bubble';
  };
  attributes: {
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    value: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
  };
}

export interface BlocksStatsBand extends Struct.ComponentSchema {
  collectionName: 'components_blocks_stats_bands';
  info: {
    displayName: 'Stats Band';
    icon: 'chart-bubble';
  };
  attributes: {
    anchorId: Schema.Attribute.String;
    heading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    items: Schema.Attribute.Component<'blocks.stat-item', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 6;
          min: 1;
        },
        number
      >;
    theme: Schema.Attribute.Enumeration<['light', 'dark']> &
      Schema.Attribute.DefaultTo<'light'>;
  };
}

export interface BlocksTestimonials extends Struct.ComponentSchema {
  collectionName: 'components_blocks_testimonials';
  info: {
    displayName: 'Testimonials';
    icon: 'quote';
  };
  attributes: {
    anchorId: Schema.Attribute.String;
    heading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    layout: Schema.Attribute.Enumeration<['grid', 'carousel', 'single']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'grid'>;
    subheading: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 280;
      }>;
    testimonials: Schema.Attribute.Relation<
      'oneToMany',
      'api::testimonial.testimonial'
    >;
    theme: Schema.Attribute.Enumeration<['light', 'dark']> &
      Schema.Attribute.DefaultTo<'light'>;
  };
}

export interface BlocksWhyChooseUs extends Struct.ComponentSchema {
  collectionName: 'components_blocks_why_choose_us';
  info: {
    description: 'Differentiator cards with an optional stat \u2014 Figma node 617:7561. Cards reuse blocks.feature-item (extended with statValue/statLabel/order) rather than a duplicate component.';
    displayName: 'Why Choose Us';
    icon: 'star';
  };
  attributes: {
    anchorId: Schema.Attribute.String;
    description: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 320;
      }>;
    eyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    heading: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    items: Schema.Attribute.Component<'blocks.feature-item', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 12;
          min: 2;
        },
        number
      >;
    subheading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    theme: Schema.Attribute.Enumeration<['light', 'dark', 'accent']> &
      Schema.Attribute.DefaultTo<'light'>;
  };
}

export interface CaseStudyTestimonialCard extends Struct.ComponentSchema {
  collectionName: 'components_case_study_testimonial_cards';
  info: {
    displayName: 'Case Study Testimonial Card';
    icon: 'quote';
  };
  attributes: {
    heading: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    orgLine: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    quote: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 400;
      }>;
    roleLine: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
  };
}

export interface ContactOfficeLocation extends Struct.ComponentSchema {
  collectionName: 'components_contact_office_locations';
  info: {
    displayName: 'Office Location';
    icon: 'pinMap';
  };
  attributes: {
    address: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 240;
      }>;
    email: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    featured: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    image: Schema.Attribute.Media<'images'>;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    phone: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    phoneLabel: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
  };
}

export interface IndustriesDetailCard extends Struct.ComponentSchema {
  collectionName: 'components_industries_detail_cards';
  info: {
    displayName: 'Industry Detail Card';
    icon: 'grid';
  };
  attributes: {
    description: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 240;
      }>;
    icon: Schema.Attribute.Media<'images'>;
    iconIdentifier: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    image: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
  };
}

export interface IndustriesTrustLogo extends Struct.ComponentSchema {
  collectionName: 'components_industries_trust_logos';
  info: {
    displayName: 'Trust Logo';
    icon: 'star';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
  };
}

export interface ServicesStatItem extends Struct.ComponentSchema {
  collectionName: 'components_services_stat_items';
  info: {
    displayName: 'Service Stat Item';
    icon: 'chart-pie';
  };
  attributes: {
    iconIdentifier: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    label: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    value: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
  };
}

export interface SharedFooterColumn extends Struct.ComponentSchema {
  collectionName: 'components_shared_footer_columns';
  info: {
    displayName: 'Footer Column';
    icon: 'bulletList';
  };
  attributes: {
    heading: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    links: Schema.Attribute.Component<'shared.link', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 8;
        },
        number
      >;
  };
}

export interface SharedLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_links';
  info: {
    displayName: 'Link';
    icon: 'link';
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    isExternal: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    variant: Schema.Attribute.Enumeration<
      ['primary', 'secondary', 'ghost', 'link']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'primary'>;
  };
}

export interface SharedNavChildItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_nav_child_items';
  info: {
    displayName: 'Nav Child Item';
    icon: 'bulletList';
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    isExternal: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
  };
}

export interface SharedNavItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_nav_items';
  info: {
    displayName: 'Nav Item';
    icon: 'bulletList';
  };
  attributes: {
    children: Schema.Attribute.Component<'shared.nav-child-item', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 8;
        },
        number
      >;
    href: Schema.Attribute.String & Schema.Attribute.Required;
    isExternal: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    showIndicator: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    displayName: 'SEO';
    icon: 'search';
  };
  attributes: {
    keywords: Schema.Attribute.String;
    metaDescription: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
        minLength: 50;
      }>;
    metaTitle: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    preventIndexing: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

export interface WorkWithUsJobListing extends Struct.ComponentSchema {
  collectionName: 'components_work_with_us_job_listings';
  info: {
    displayName: 'Job Listing';
    icon: 'briefcase';
  };
  attributes: {
    department: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    descriptionItems: Schema.Attribute.JSON;
    jobType: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    location: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    postedDate: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    qualificationsItems: Schema.Attribute.JSON;
    skillsItems: Schema.Attribute.JSON;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'blocks.blog-post-item': BlocksBlogPostItem;
      'blocks.blog-teaser': BlocksBlogTeaser;
      'blocks.content': BlocksContent;
      'blocks.cta': BlocksCta;
      'blocks.faq': BlocksFaq;
      'blocks.faq-item': BlocksFaqItem;
      'blocks.feature-grid': BlocksFeatureGrid;
      'blocks.feature-item': BlocksFeatureItem;
      'blocks.hero': BlocksHero;
      'blocks.industry-grid': BlocksIndustryGrid;
      'blocks.industry-item': BlocksIndustryItem;
      'blocks.media-gallery': BlocksMediaGallery;
      'blocks.media-item': BlocksMediaItem;
      'blocks.process-step-item': BlocksProcessStepItem;
      'blocks.process-steps': BlocksProcessSteps;
      'blocks.service-band': BlocksServiceBand;
      'blocks.service-band-item': BlocksServiceBandItem;
      'blocks.stat-item': BlocksStatItem;
      'blocks.stats-band': BlocksStatsBand;
      'blocks.testimonials': BlocksTestimonials;
      'blocks.why-choose-us': BlocksWhyChooseUs;
      'case-study.testimonial-card': CaseStudyTestimonialCard;
      'contact.office-location': ContactOfficeLocation;
      'industries.detail-card': IndustriesDetailCard;
      'industries.trust-logo': IndustriesTrustLogo;
      'services.stat-item': ServicesStatItem;
      'shared.footer-column': SharedFooterColumn;
      'shared.link': SharedLink;
      'shared.nav-child-item': SharedNavChildItem;
      'shared.nav-item': SharedNavItem;
      'shared.seo': SharedSeo;
      'work-with-us.job-listing': WorkWithUsJobListing;
    }
  }
}
