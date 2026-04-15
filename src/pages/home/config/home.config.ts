/**
 * 首页模块级配置，负责页面结构与可扩展能力开关。
 */
export const HOME_PAGE_CONFIG = {
  sections: {
    coreTools: {
      titleKey: "pages.home.sections.coreTools.title",
      descriptionKey: "pages.home.sections.coreTools.description"
    },
    recentUsage: {
      titleKey: "pages.home.sections.recentUsage.title"
    },
    usageStats: {
      titleKey: "pages.home.sections.usageStats.title"
    },
    quickActions: {
      titleKey: "pages.home.sections.quickActions.title"
    }
  },
  topBar: {
    appNameKey: "pages.home.topBar.appName",
    searchPlaceholderKey: "pages.home.topBar.searchPlaceholder",
    userNameKey: "pages.home.topBar.userName",
    userRoleKey: "pages.home.topBar.userRole"
  },
  footer: {
    copyrightKey: "pages.home.footer.copyright",
    versionPrefixKey: "pages.home.footer.versionPrefix",
    version: "v1.0.0"
  }
} as const;
