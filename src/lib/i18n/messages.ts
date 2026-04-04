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
    testRuns: string;
    settings: string;
    admin: string;
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
}
