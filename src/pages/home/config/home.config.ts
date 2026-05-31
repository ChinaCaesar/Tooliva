/**
 * 首页模块级配置，负责页面结构与可扩展能力开关。
 *
 * 所有展示文案均通过 i18n key 透传到组件，不在此处硬编码字符串。
 */
export const HOME_PAGE_CONFIG = {
  sections: {
    greeting: {
      subtitleKey: "pages.home.sections.greeting.subtitle"
    },
    valueProps: {
      titleKey: "pages.home.sections.valueProps.title"
    },
    recentUsage: {
      titleKey: "pages.home.sections.recentUsage.title",
      viewAllKey: "pages.home.sections.recentUsage.viewAll",
      emptyTitleKey: "pages.home.recent.emptyStateTitle",
      emptyHintKey: "pages.home.recent.emptyStateHint"
    },
    sidebar: {
      security: {
        titleKey: "pages.home.sections.sidebar.security.title"
      },
      membership: {
        titleKey: "pages.home.sections.sidebar.membership.title",
        learnMoreKey: "pages.home.sections.sidebar.membership.learnMore",
        ctaKey: "pages.home.sections.sidebar.membership.cta"
      },
      changelog: {
        titleKey: "pages.home.sections.sidebar.changelog.title",
        viewAllKey: "pages.home.sections.sidebar.changelog.viewAll"
      }
    }
  },
  topBar: {
    appNameKey: "pages.home.topBar.appName",
    taglineKey: "pages.home.topBar.tagline",
    searchPlaceholderKey: "pages.home.topBar.searchPlaceholder",
    searchShortcutKey: "pages.home.topBar.searchShortcut",
    searchShortcutMacKey: "pages.home.topBar.searchShortcutMac",
    memberCtaKey: "pages.home.topBar.memberCta",
    userNameKey: "pages.home.topBar.userName",
    userRoleKey: "pages.home.topBar.userRole"
  },
  footer: {
    sloganKey: "pages.home.footer.slogan",
    versionPrefixKey: "pages.home.footer.versionPrefix"
  }
} as const;
