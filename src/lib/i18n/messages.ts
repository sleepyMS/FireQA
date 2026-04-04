export type Locale = "ko" | "en";

export interface Messages {
  nav: {
    dashboard: string;
    projects: string;
    generate: string;
    diagrams: string;
    wireframes: string;
    improve: string;
    history: string;
    activity: string;
    analytics: string;
    templates: string;
    guide: string;
    settings: string;
  };
  common: {
    save: string;
    saving: string;
    cancel: string;
    delete: string;
    edit: string;
    loading: string;
    logout: string;
    search: string;
    close: string;
    confirm: string;
    upgrade: string;
    create: string;
    add: string;
    noData: string;
  };
  settings: {
    title: string;
    description: string;
    tabs: {
      general: string;
      members: string;
      billing: string;
      webhooks: string;
    };
    locale: {
      label: string;
      ko: string;
      en: string;
    };
  };
  generation: {
    stages: {
      connecting: string;
      parsing: string;
      preparing: string;
      generating: string;
      sanitizing: string;
      saving: string;
      fixing: string;
      improving: string;
    };
    elapsed: string;
    kbReceived: string;
    chunk: string;
    pageTitle: string;
    pageDescription: string;
    streamingDescription: string;
    step1: string;
    step2: string;
    step3: string;
    modeAuto: string;
    modeAutoDesc: string;
    modeTemplate: string;
    modeTemplateDesc: string;
    noTemplates: string;
    goCreateTemplate: string;
    generateAuto: string;
    generateTemplate: string;
    docPreviewTitle: string;
    docPreviewEmpty: string;
  };
}
