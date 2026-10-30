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
    image: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
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
    media: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
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
    background: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
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
    background: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
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
    icon: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
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
    media: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
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
    background: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
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
    description: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    image: Schema.Attribute.Media<'images' | 'videos' | 'files'> &
      Schema.Attribute.Required;
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
    media: Schema.Attribute.Media<'images' | 'videos' | 'files'> &
      Schema.Attribute.Required;
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
    icon: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
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
    background: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
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
    ctaLabel: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    description: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    headline: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    href: Schema.Attribute.String & Schema.Attribute.Required;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    tag: Schema.Attribute.String &
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
    description: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 240;
      }>;
    image: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
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
    image: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
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

export interface IndustriesPageAbout extends Struct.ComponentSchema {
  collectionName: 'components_industries_page_about';
  info: {
    description: '"About Our Services" copy.';
    displayName: 'About Our Services';
  };
  attributes: {
    body: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 2400;
      }>;
    eyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    heading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
  };
}

export interface IndustriesPageBand extends Struct.ComponentSchema {
  collectionName: 'components_industries_page_band';
  info: {
    description: '"Have a Question? Let\u2019s Find the Answer." red band with the couple cut-out and button.';
    displayName: 'Have a Question? (Question Band)';
  };
  attributes: {
    backgroundImage: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
    body: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 320;
      }>;
    cta: Schema.Attribute.Component<'shared.link', false>;
    heading: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    personImage: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
  };
}

export interface IndustriesPageBeyond extends Struct.ComponentSchema {
  collectionName: 'components_industries_page_beyond';
  info: {
    description: '"One Research Partner. Multiple Industries." heading with its six cards.';
    displayName: 'Beyond Industries';
  };
  attributes: {
    body: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 1200;
      }>;
    cards: Schema.Attribute.Component<'page-content.industries-card', true>;
    eyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    heading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
  };
}

export interface IndustriesPageCases extends Struct.ComponentSchema {
  collectionName: 'components_industries_page_cases';
  info: {
    description: '"From Business Questions to Meaningful Outcomes" heading with its three cards.';
    displayName: 'Featured Case Studies';
  };
  attributes: {
    body: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 1200;
      }>;
    cards: Schema.Attribute.Component<'page-content.industries-card', true>;
    eyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    heading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
  };
}

export interface IndustriesPageFaq extends Struct.ComponentSchema {
  collectionName: 'components_industries_page_faq';
  info: {
    description: 'Latest-blogs button, FAQ heading and the questions.';
    displayName: 'Frequently Asked Questions';
  };
  attributes: {
    cta: Schema.Attribute.Component<'shared.link', false>;
    heading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    items: Schema.Attribute.Component<'blocks.faq-item', true>;
  };
}

export interface IndustriesPageFinalCta extends Struct.ComponentSchema {
  collectionName: 'components_industries_page_final_cta';
  info: {
    description: 'Closing "Start Your Research Journey" banner.';
    displayName: 'Start Your Research Journey';
  };
  attributes: {
    action: Schema.Attribute.Component<'shared.link', false>;
    body: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 320;
      }>;
    heading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    image: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
  };
}

export interface IndustriesPageGrid extends Struct.ComponentSchema {
  collectionName: 'components_industries_page_grid';
  info: {
    description: '"Deep Expertise Across Diverse Industries" heading over the industry card grid (cards come from the Industries collection).';
    displayName: 'Industries';
  };
  attributes: {
    backgroundImage: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
    body: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 1200;
      }>;
    cardFallbackImage: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
    eyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    heading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
  };
}

export interface IndustriesPageHero extends Struct.ComponentSchema {
  collectionName: 'components_industries_page_hero';
  info: {
    description: 'Top banner: pill, 2-line title, subtitle, hero photo and the two buttons.';
    displayName: 'Industries We Serve';
  };
  attributes: {
    eyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    heading: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    image: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
    primaryCta: Schema.Attribute.Component<'shared.link', false>;
    secondaryCta: Schema.Attribute.Component<'shared.link', false>;
    subheading: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 320;
      }>;
  };
}

export interface IndustriesPageInsights extends Struct.ComponentSchema {
  collectionName: 'components_industries_page_insights';
  info: {
    description: 'Heading, woman cut-out panel and the accordion rows.';
    displayName: 'What We Help You Understand';
  };
  attributes: {
    backgroundImage: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
    body: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 1200;
      }>;
    cutoutImage: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
    eyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    heading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    items: Schema.Attribute.Component<'page-content.industries-card', true>;
  };
}

export interface IndustriesPageIntro extends Struct.ComponentSchema {
  collectionName: 'components_industries_page_intro';
  info: {
    description: '"Understanding Industries" copy with the worker cut-out illustration.';
    displayName: 'Our Industries';
  };
  attributes: {
    body: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 2400;
      }>;
    eyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    heading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    image: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
  };
}

export interface IndustriesPageProcess extends Struct.ComponentSchema {
  collectionName: 'components_industries_page_process';
  info: {
    description: '"Turning Research Into Impact" heading with its four steps.';
    displayName: 'Industry Research Process';
  };
  attributes: {
    body: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 1200;
      }>;
    eyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    heading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    steps: Schema.Attribute.Component<'page-content.industries-card', true>;
  };
}

export interface IndustriesPageReach extends Struct.ComponentSchema {
  collectionName: 'components_industries_page_reach';
  info: {
    description: '"Local Insight. Global Reach." heading with the four stat tiles.';
    displayName: 'Local Insight. Global Reach.';
  };
  attributes: {
    body: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 1200;
      }>;
    eyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    heading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    stats: Schema.Attribute.Component<'page-content.industries-stat', true>;
  };
}

export interface IndustriesPageTestimonials extends Struct.ComponentSchema {
  collectionName: 'components_industries_page_testimonials';
  info: {
    description: '"Trusted Research Partner" heading with the testimonial cards.';
    displayName: 'Client Success Stories';
  };
  attributes: {
    backgroundWavesImage: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
    eyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    heading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    items: Schema.Attribute.Component<
      'page-content.industries-testimonial',
      true
    >;
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
    icon: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
    iconIdentifier: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    image: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
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
    image: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
  };
}

export interface PageContentCaseStudy extends Struct.ComponentSchema {
  collectionName: 'components_page_content_case_studys';
  info: {
    description: "Every piece of template-level text/media on /case-study (Figma node 1023:45614) and the shared section chrome on /case-study/[slug] (Figma node 1107:49842) that is identical across every case study \u2014 section eyebrows, headings, body copy, the 'Our Approach'/'Testimonial'/'About Case Study' content o";
    displayName: 'Case Studies Overview';
  };
  attributes: {
    aboutBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 800;
      }>;
    aboutEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    aboutHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    allLabel: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    approachEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    approachHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    approachSteps: Schema.Attribute.Component<'industries.detail-card', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 4;
        },
        number
      >;
    bottomCtaAction: Schema.Attribute.Component<'shared.link', false>;
    bottomCtaBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 320;
      }>;
    bottomCtaHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    detailApproachEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    detailChallengeEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    detailChallengeNeedsLabel: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    detailFaqHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    detailImpactEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    detailRelatedBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 320;
      }>;
    detailRelatedEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    detailRelatedHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    detailResearchQuestionEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    detailTrustHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    detailUncoveredEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    explorerBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 320;
      }>;
    explorerEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    explorerHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    heroCta: Schema.Attribute.Component<'shared.link', false>;
    heroEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    heroHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    heroImage: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
    heroSubheading: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 320;
      }>;
    industriesLabel: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    listingFaqHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    listingFaqItems: Schema.Attribute.Component<'blocks.faq-item', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
        },
        number
      >;
    researchTypeLabel: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    testimonials: Schema.Attribute.Component<
      'case-study.testimonial-card',
      true
    > &
      Schema.Attribute.SetMinMax<
        {
          max: 3;
        },
        number
      >;
    testimonialsEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    testimonialsHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
  };
}

export interface PageContentContact extends Struct.ComponentSchema {
  collectionName: 'components_page_content_contacts';
  info: {
    description: "All editable content on /contact (Figma node 637:10433, file foaJFuv0vRX8nD43o0ylgB) \u2014 a dedicated singleType, not a `page` dynamiczone entry. The form's own fields (Name/Email/Phone/Company) are fixed UI chrome, never CMS content, same convention as every other lead form on this site.";
    displayName: 'Contact Us';
  };
  attributes: {
    faqItems: Schema.Attribute.Component<'blocks.faq-item', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
        },
        number
      >;
    formEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    formHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    formImage: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
    formSubheading: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 300;
      }>;
    heroCta: Schema.Attribute.Component<'shared.link', false>;
    heroEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    heroHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    heroImage: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
    heroSubheading: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 300;
      }>;
    officeEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    officeHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    offices: Schema.Attribute.Component<'contact.office-location', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 6;
        },
        number
      >;
    seo: Schema.Attribute.Component<'shared.seo', false>;
    stats: Schema.Attribute.Component<'services.stat-item', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 4;
        },
        number
      >;
    statsHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    workWithUsBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 300;
      }>;
    workWithUsCta: Schema.Attribute.Component<'shared.link', false>;
    workWithUsHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    workWithUsImage: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
  };
}

export interface PageContentIndustriesCard extends Struct.ComponentSchema {
  collectionName: 'components_page_content_industries_cards';
  info: {
    description: 'Title + description card used by the /industries page sections (icons are fixed by position in the design).';
    displayName: 'Card';
  };
  attributes: {
    body: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 900;
      }>;
    icon: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
  };
}

export interface PageContentIndustriesStat extends Struct.ComponentSchema {
  collectionName: 'components_page_content_industries_stats';
  info: {
    description: 'Value + label tile in the /industries "Local Insight. Global Reach." band.';
    displayName: 'Stat';
  };
  attributes: {
    icon: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    value: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
  };
}

export interface PageContentIndustriesTestimonial
  extends Struct.ComponentSchema {
  collectionName: 'components_page_content_industries_testimonials';
  info: {
    description: 'Client success story card on /industries.';
    displayName: 'Testimonial';
  };
  attributes: {
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    quote: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 600;
      }>;
    role: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
  };
}

export interface PageContentOurCompany extends Struct.ComponentSchema {
  collectionName: 'components_page_content_our_companys';
  info: {
    description: "All editable content on /our-company (Figma node 617:7561, file foaJFuv0vRX8nD43o0ylgB) \u2014 a dedicated page, not the generic `page` dynamiczone. Latest Blogs, FAQ, and the bottom CTA reuse existing global content (blog posts, this singleType's own faqItems, and the site's shared bottom-CTA copy) rath";
    displayName: 'About Us / Our Company';
  };
  attributes: {
    aboutBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 2000;
      }>;
    aboutCompanyBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 2000;
      }>;
    aboutCompanyEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    aboutCompanyHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    aboutEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    aboutHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    aboutImage: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
    ecosystemCards: Schema.Attribute.Component<'industries.detail-card', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 4;
        },
        number
      >;
    ecosystemEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    ecosystemHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    ecosystemSubtext: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    faqItems: Schema.Attribute.Component<'blocks.faq-item', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
        },
        number
      >;
    heroCta: Schema.Attribute.Component<'shared.link', false>;
    heroEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    heroHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    heroImage: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
    heroSubheading: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 300;
      }>;
    industriesBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 400;
      }>;
    industriesCards: Schema.Attribute.Component<
      'industries.detail-card',
      true
    > &
      Schema.Attribute.SetMinMax<
        {
          max: 8;
        },
        number
      >;
    industriesEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    industriesHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    insightsBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 400;
      }>;
    insightsCards: Schema.Attribute.Component<'industries.detail-card', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 4;
        },
        number
      >;
    insightsEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    insightsHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    seo: Schema.Attribute.Component<'shared.seo', false>;
    stats: Schema.Attribute.Component<'services.stat-item', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 4;
        },
        number
      >;
    statsHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    valuesBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 400;
      }>;
    valuesCards: Schema.Attribute.Component<'industries.detail-card', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 8;
        },
        number
      >;
    valuesEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    valuesHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
  };
}

export interface PageContentOurTeam extends Struct.ComponentSchema {
  collectionName: 'components_page_content_our_teams';
  info: {
    description: "/our-team (Figma node 1126:54624, file foaJFuv0vRX8nD43o0ylgB). Every attribute maps 1:1 to a node actually drawn on this canvas, in top-to-bottom order \u2014 hero (eyebrow/heading/subheading/image), the 'People. Expertise. Impact.' heading above the member grid, and the bottom CTA band. The member card";
    displayName: 'Our Team';
  };
  attributes: {
    bottomCtaAction: Schema.Attribute.Component<'shared.link', false>;
    bottomCtaBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 320;
      }>;
    bottomCtaHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    heroEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    heroHeading: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    heroImage: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
    heroSubheading: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 320;
      }>;
    membersHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    seo: Schema.Attribute.Component<'shared.seo', false>;
  };
}

export interface PageContentPrivacyPolicy extends Struct.ComponentSchema {
  collectionName: 'components_page_content_privacy_policys';
  info: {
    description: "/privacy-policy (Figma node 1114:50556, file foaJFuv0vRX8nD43o0ylgB). Every attribute below maps 1:1 to a node that is actually drawn in 1114:50556, in the exact top-to-bottom sequence it appears on the canvas \u2014 hero, breadcrumb (global pattern, not stored here), the 'This Privacy Policy Defines and";
    displayName: 'Privacy Policy';
  };
  attributes: {
    heroEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    heroHeading: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    heroImage: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
    heroSubheading: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 320;
      }>;
    introBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 2000;
      }>;
    lawfulBasisIntro: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 600;
      }>;
    lawfulBasisList: Schema.Attribute.Component<
      'privacy-policy.list-item',
      true
    > &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
        },
        number
      >;
    lawfulClosing: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 1200;
      }>;
    lawfulHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    lawfulIntro: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 1200;
      }>;
    lawfulPurposesList: Schema.Attribute.Component<
      'privacy-policy.list-item',
      true
    > &
      Schema.Attribute.SetMinMax<
        {
          max: 20;
        },
        number
      >;
    legalBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 800;
      }>;
    legalHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    panelClosing: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 600;
      }>;
    panelDataSourcesList: Schema.Attribute.Component<
      'privacy-policy.list-item',
      true
    > &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
        },
        number
      >;
    panelHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    panelIntro: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 800;
      }>;
    qualifiesBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 1200;
      }>;
    qualifiesHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    registrationBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 800;
      }>;
    registrationHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    seo: Schema.Attribute.Component<'shared.seo', false>;
    tocHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    tocItems: Schema.Attribute.Component<'privacy-policy.toc-item', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 20;
        },
        number
      >;
  };
}

export interface PageContentWorkWithUs extends Struct.ComponentSchema {
  collectionName: 'components_page_content_work_with_uss';
  info: {
    description: "All editable content on /work-with-us (Figma node 924:23216, file foaJFuv0vRX8nD43o0ylgB) \u2014 a dedicated singleType. The bottom CTA reuses the same sitewide 'Start Your Research Journey' copy every other page reuses, so it has no fields here.";
    displayName: 'Careers (Work With Us)';
  };
  attributes: {
    aboutCareersBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 800;
      }>;
    aboutCareersEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    aboutCareersHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    benefits: Schema.Attribute.Component<'industries.detail-card', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 8;
        },
        number
      >;
    benefitsBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 300;
      }>;
    benefitsEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    benefitsHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    benefitsImage: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
    benefitsLabel: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    disclaimerBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 2000;
      }>;
    disclaimerHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    faqItems: Schema.Attribute.Component<'blocks.faq-item', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
        },
        number
      >;
    heroCta: Schema.Attribute.Component<'shared.link', false>;
    heroEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    heroHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    heroImage: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
    heroSubheading: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 300;
      }>;
    jobs: Schema.Attribute.Component<'work-with-us.job-listing', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 20;
        },
        number
      >;
    jobsBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 300;
      }>;
    jobsEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    jobsHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    joinUsBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 800;
      }>;
    joinUsHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    journeyBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 300;
      }>;
    journeyEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    journeyHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    journeySteps: Schema.Attribute.Component<'industries.detail-card', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 6;
        },
        number
      >;
    seo: Schema.Attribute.Component<'shared.seo', false>;
    valuesBody: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 300;
      }>;
    valuesCards: Schema.Attribute.Component<'industries.detail-card', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 8;
        },
        number
      >;
    valuesEyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    valuesHeading: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
  };
}

export interface PrivacyPolicyListItem extends Struct.ComponentSchema {
  collectionName: 'components_privacy_policy_list_items';
  info: {
    displayName: 'Privacy Policy List Item';
    icon: 'bulletList';
  };
  attributes: {
    text: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 1200;
      }>;
  };
}

export interface PrivacyPolicyTocItem extends Struct.ComponentSchema {
  collectionName: 'components_privacy_policy_toc_items';
  info: {
    displayName: 'Privacy Policy TOC Item';
    icon: 'bulletList';
  };
  attributes: {
    anchor: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
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
    shareImage: Schema.Attribute.Media<'images' | 'videos' | 'files'>;
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
      'industries-page.about': IndustriesPageAbout;
      'industries-page.band': IndustriesPageBand;
      'industries-page.beyond': IndustriesPageBeyond;
      'industries-page.cases': IndustriesPageCases;
      'industries-page.faq': IndustriesPageFaq;
      'industries-page.final-cta': IndustriesPageFinalCta;
      'industries-page.grid': IndustriesPageGrid;
      'industries-page.hero': IndustriesPageHero;
      'industries-page.insights': IndustriesPageInsights;
      'industries-page.intro': IndustriesPageIntro;
      'industries-page.process': IndustriesPageProcess;
      'industries-page.reach': IndustriesPageReach;
      'industries-page.testimonials': IndustriesPageTestimonials;
      'industries.detail-card': IndustriesDetailCard;
      'industries.trust-logo': IndustriesTrustLogo;
      'page-content.case-study': PageContentCaseStudy;
      'page-content.contact': PageContentContact;
      'page-content.industries-card': PageContentIndustriesCard;
      'page-content.industries-stat': PageContentIndustriesStat;
      'page-content.industries-testimonial': PageContentIndustriesTestimonial;
      'page-content.our-company': PageContentOurCompany;
      'page-content.our-team': PageContentOurTeam;
      'page-content.privacy-policy': PageContentPrivacyPolicy;
      'page-content.work-with-us': PageContentWorkWithUs;
      'privacy-policy.list-item': PrivacyPolicyListItem;
      'privacy-policy.toc-item': PrivacyPolicyTocItem;
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
