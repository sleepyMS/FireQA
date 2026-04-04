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
  onboarding: {
    title: string;
    subtitle: string;
    nameLabel: string;
    namePlaceholder: string;
    orgNameLabel: string;
    orgNamePlaceholder: string;
    orgSlugLabel: string;
    slugHintKorean: string;
    slugInvalid: string;
    slugValid: string;
    submitting: string;
    start: string;
    or: string;
    joinByInvite: string;
    inviteTokenLabel: string;
    inviteTokenPlaceholder: string;
    acceptInvite: string;
    loginRequired: string;
    createTeamFailed: string;
    networkError: string;
  };
  invite: {
    orgInvite: string;
    loginAutoAccept: string;
    loginToAccept: string;
    signupToAccept: string;
    roleLabel: string;
    expiresLabel: string;
    accepting: string;
    joinOrgButton: string;
    joinedTitlePrefix: string;
    joinedTitleSuffix: string;
    fallbackOrg: string;
    memberAdded: string;
    goToDashboard: string;
    requestNewInvite: string;
    goHome: string;
    acceptFailed: string;
    noToken: string;
    invalidInvite: string;
    networkError: string;
  };
}
