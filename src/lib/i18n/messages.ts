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
  errors: {
    title: string;
    description: string;
    unknownError: string;
    details: string;
    retry: string;
    goHome: string;
    notFound: string;
    notFoundDescription: string;
  };
  history: {
    title: string;
    titleWithProject: string;
    descriptionAll: string;
    descriptionProject: string;
    emptyAll: string;
    emptyFiltered: string;
    loadMore: string;
    loadingMore: string;
    tokens: string;
    filterAll: string;
    filterTc: string;
    filterDiagrams: string;
    filterWireframes: string;
    filterSpecImprove: string;
    viewResult: string;
    editProjectName: string;
    editProjectNameDescription: string;
    projectNameLabel: string;
    projectNamePlaceholder: string;
    deleteTitle: string;
    deleteDescription: string;
    deleting: string;
  };
  activity: {
    actorSuffix: string;
    generationCompleted: string;
    generationCompletedType: string;
    generationFailed: string;
    generationFailedType: string;
    projectCreated: string;
    projectUpdated: string;
    projectArchived: string;
    projectUnarchived: string;
    projectDeleted: string;
    projectRestored: string;
    memberInvited: string;
    memberRoleChanged: string;
    memberRemoved: string;
    versionCreated: string;
    versionActivated: string;
  };
  jobStatus: {
    autoShowResult: string;
    generationFailed: string;
  };
}
