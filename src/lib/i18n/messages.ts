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
  versions: {
    compare: string;
    compareTitle: string;
    baseLabel: string;
    compareLabel: string;
    sameVersionError: string;
    comparing: string;
    noData: string;
    noChanges: string;
    showChangedOnly: string;
    showUnchanged: string;
    statusLabel: string;
    current: string;
    diff: {
      same: string;
      added: string;
      removed: string;
      changed: string;
    };
    columns: {
      name: string;
      depth1: string;
      depth2: string;
      depth3: string;
      precondition: string;
      procedure: string;
      expected: string;
    };
    changeType: {
      initial: string;
      aiImprove: string;
      aiFix: string;
      manualEdit: string;
      revert: string;
    };
    stats: {
      added: string;
      removed: string;
      changed: string;
      same: string;
    };
  };
  specImprove: {
    improveSummaryTitle: string;
    totalSections: string;
    copied: string;
    copyMarkdown: string;
    downloadMd: string;
    compareOriginal: string;
    originalFileName: string;
    originalHint: string;
    improvedSpec: string;
  };
  diagrams: {
    pageTitle: string;
    pageDescription: string;
    streaming: string;
    step1: string;
    step2: string;
    generate: string;
    agentGenerate: string;
    agentMode: string;
    agentModeDesc: string;
    agentSubmitting: string;
    agentTaskError: string;
    networkError: string;
  };
  wireframes: {
    pageTitle: string;
    pageDescription: string;
    streaming: string;
    step1: string;
    step2: string;
    step3: string;
    screenType: string;
    screenTypes: {
      auto: string;
      autoDesc: string;
      mobile: string;
      mobileDesc: string;
      desktop: string;
      desktopDesc: string;
      mixed: string;
      mixedDesc: string;
    };
    generate: string;
    agentGenerate: string;
    agentMode: string;
    agentModeDesc: string;
    agentSubmitting: string;
    agentTaskError: string;
    networkError: string;
  };
  improve: {
    pageTitle: string;
    pageDescription: string;
    streaming: string;
    step1: string;
    step2: string;
    generate: string;
    agentGenerate: string;
    agentMode: string;
    agentModeDesc: string;
    agentSubmitting: string;
    agentTaskError: string;
    networkError: string;
  };
}
