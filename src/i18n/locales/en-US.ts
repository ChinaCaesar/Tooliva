export const enUS = {
  app: {
    title: "Tooliva"
  },
  nav: {
    home: "Home",
    tools: "Tools",
    favorites: "Favorites",
    tasks: "Tasks",
    settings: "Settings",
    membership: "Membership"
  },
  auth: {
    websiteAccountLogin: "Sign in with website account",
    websiteLoginTitle: "Authorization page opened",
    websiteLoginMessage: "Complete sign-in and authorization in your browser. You will return to the desktop app automatically.",
    websiteLoginFailedTitle: "Could not open browser",
    websiteLoginFailedMessage: "Check that a system browser is available, then try again.",
    websiteOpenFailedTitle: "Could not open website",
    websiteOpenFailedMessage: "Check that a system browser is available, then try again.",
    loggedInVia: "Signed in via {provider}",
    logout: "Sign out",
    provider: {
      wechat: "WeChat",
      google: "Google",
      github: "GitHub",
      email: "Email"
    },
    membership: {
      noExpiry: "No expiry",
      expiresAt: "Expires {date}"
    },
    userProfile: {
      title: "Account",
      signInAria: "Sign in",
      viewAccountAria: "View account",
      close: "Close",
      accountIdLabel: "Account ID",
      emailLabel: "Email",
      providerLabel: "Sign-in",
      membershipLabel: "Membership",
      expiryLabel: "Expires",
      noMembership: "No membership",
      notProvided: "Not provided",
      unknownProvider: "Unknown",
      manageAccount: "Manage account"
    }
  },
  common: {
    language: "Language",
    theme: "Theme",
    outputDirectory: "Default Output Directory",
    back: "Back",
    backToHome: "Back to Home",
    save: "Save",
    noData: "No Data",
    active: "Active",
    history: "History",
    total: "Total",
    success: "Success",
    failed: "Failed",
    elapsed: "Elapsed",
    taskCompleteTitle: "Task completed",
    taskCompleteMessage: "{tool} finished processing {total} item(s): {success} succeeded, {failed} failed, elapsed {elapsed}.",
    sourceDirectoryReady: "Folder selected. Matching files will be scanned when you start the task.",
    sourceDirectoryNoMatch: "No files supported by the current task were found in the selected folder.",
    sourceDirectoryNoNewFiles: "Folder scan finished, but no new supported files were found.",
    outputMode: "Output mode",
    outputModes: {
      source: "Source folder",
      custom: "Custom folder",
      overwrite: "Overwrite original"
    },
    entitlement: {
      needLogin: "Your free quota is exhausted. Upgrade membership to continue using this feature. Go to Membership now?",
      noEntitlement: "Your free quota is exhausted. Upgrade membership to continue using this feature. Go to Membership now?",
      serviceError: "Your free quota is exhausted. Upgrade membership to continue using this feature. Go to Membership now?",
      loginDialogTitle: "Sign-in required",
      loginDialogConfirm: "Sign in",
      loginDialogCancel: "Close",
      upgradeDialogTitle: "Export entitlement required",
      upgradeDialogMessage: "Your free quota is exhausted. Upgrade membership to continue using this feature. Go to Membership now?",
      upgradeConfirm: "Upgrade now",
      upgradeCancel: "Later"
    }
  },
  aiEnhancement: {
    panelTitle: "AI component status",
    simpleStatus: {
      installed: "AI enhancement runtime installed",
      notInstalled: "AI enhancement runtime not installed"
    },
    runtimeStatus: {
      DISABLED: "AI enhancement runtime is disabled",
      NOT_INSTALLED: "AI enhancement runtime not installed",
      CHECKING: "Checking AI environment",
      ENV_NOT_SUPPORTED: "This device does not meet AI install requirements",
      READY_TO_INSTALL: "AI enhancement runtime can be installed",
      DOWNLOADING: "Downloading AI enhancement runtime",
      VERIFYING: "Verifying AI enhancement runtime",
      INSTALLING: "Installing AI enhancement runtime",
      INSTALLED: "AI enhancement runtime installed",
      UPDATE_AVAILABLE: "AI enhancement runtime update available",
      FAILED: "AI enhancement runtime operation failed"
    },
    installHintDefault:
      "Import a local AI runtime package first, or place the offline files in the app data directory.",
    requirements:
      "Requires {os}, at least {memory} GB free RAM, and {disk} GB free disk space.",
    requirementsOs: "Windows 10/11 64-bit",
    modelStatus: {
      ready: "LaMA model ready",
      notImported: "LaMA model not imported"
    },
    actions: {
      installRuntime: "Install AI enhancement runtime",
      upgradeRuntime: "Upgrade AI runtime",
      retry: "Retry",
      importModel: "Import LaMA model",
      importingModel: "Importing model..."
    },
    installProgress: {
      preparing: "Preparing AI runtime…",
      extracting: "Extracting runtime files…",
      organizing: "Organizing dependencies…",
      largePackage: "Large package—installation still in progress…"
    },
    overlay: {
      processingTitle: "Processing AI enhancement runtime",
      patienceHint: "This may take a while for large tasks. Please wait.",
      replacingRuntime: "Replacing AI enhancement runtime…"
    },
    errors: {
      modelMissing: "LaMA model not found. Import big-lama.pt first. Target folder: {path}",
      notReady: "AI enhancement runtime is not ready. Install or upgrade first.",
      selectPackageFirst: "Select a local AI runtime package (.zip) before importing.",
      envNotSupported: "This device does not meet AI install requirements."
    },
    dialog: {
      runtimePackage: "AI Runtime Package",
      lamaModel: "LaMA Model"
    },
    engine: {
      fastLocal: "Local fast repair",
      aiEnhanced: "AI enhanced repair"
    }
  },
  layout: {
    appShell: {
      sidebarAria: "Main navigation",
      primaryNavAria: "Features",
      secondaryNavAria: "Account and system",
      placeholderTitle: "Notice",
      windowControlsAria: "Window controls",
      minimizeAria: "Minimize window",
      maximizeAria: "Maximize or restore window",
      closeAria: "Close window",
      collapseSidebar: "Collapse sidebar",
      expandSidebar: "Expand sidebar",
      nav: {
        backToPrevious: "Go back",
        home: "Home",
        allTools: "All tools",
        categoryImage: "Image",
        categoryVideo: "Video",
        categoryAudio: "Audio",
        categoryCopy: "Copywriting",
        categoryFile: "Files",
        categoryEfficiency: "Productivity",
        moreTools: "More tools",
        membership: "Membership",
        membershipSubtitle: "Unlock all premium features",
        settings: "Settings"
      },
      placeholders: {
        allTools: "The full tools directory will arrive in a future release.",
        audio: "Audio tools are not available yet.",
        copywriting: "Copywriting tools are not available yet.",
        file: "File utilities are not available yet.",
        efficiency: "Productivity tools are not available yet.",
        moreTools: "More tools will be available in a future release."
      },
      externalNav: {
        opening: "Opening browser…"
      }
    }
  },
  pages: {
    watermarkRemoval: {
      mode: {
        title: "Processing mode",
        ariaLabel: "Processing mode",
        fast: "Fast mode",
        ai: "AI enhanced mode",
        fastHintImage:
          "Fast mode needs no AI download. All processing stays on-device—best for simple backgrounds, solid colors, corner marks, and small areas.",
        fastHintVideo:
          "No AI download required—best for simple backgrounds, solid colors, corner marks, and small areas.",
        aiHintImage:
          "Install the local AI runtime for complex backgrounds and more natural results. Large one-time download; files never leave your device.",
        aiHintVideo:
          "Best for complex backgrounds and more natural results. Install once; files never leave your device."
      },
      aiComponentStatus: "AI component status"
    },
    home: {
      greeting: {
        morning: "Good morning, creator!",
        afternoon: "Good afternoon, creator!",
        evening: "Good evening, creator!",
        night: "It's late — get some rest."
      },
      dialogs: {
        placeholderTitle: "Notice"
      },
      featured: {
        useNow: "Use now"
      },
      topBar: {
        appName: "Tooliva",
        tagline: "Your helper for creator workflows",
        searchPlaceholder: "Search tools (e.g. image compress, video to GIF)",
        searchShortcut: "Ctrl K",
        searchShortcutMac: "⌘ K",
        memberCta: "Go premium",
        settingsAria: "Open settings",
        userName: "Username",
        userRole: "VIP Member"
      },
      sections: {
        coreTools: {
          title: "Core Tools",
          description: "Professional toolkits that improve your workflow efficiency"
        },
        greeting: {
          subtitle: "Start with the right tool and create efficiently."
        },
        valueProps: {
          title: "All-local processing, safe and efficient"
        },
        recentUsage: {
          title: "Recent usage",
          viewAll: "View all"
        },
        usageStats: {
          title: "Usage Stats"
        },
        quickActions: {
          title: "Quick Actions"
        },
        sidebar: {
          security: {
            title: "Local processing, safe and efficient",
            points: {
              local: "All tools run locally on your device",
              files: "Files and data are never uploaded",
              privacy: "Processing and export stay on your computer",
              offline: "Sign-in is required, with no offline mode",
              fast: "Local processing keeps it simple and safe"
            }
          },
          membership: {
            title: "Member benefits",
            learnMore: "Learn more",
            cta: "Go premium",
            points: {
              unlimited: "Unlimited access to core tools and premium features",
              batch: "Monthly, yearly, and lifetime plans share core rights",
              noAds: "Higher quotas for frequent tools",
              support: "Batch workflows and AI features keep improving",
              futureFree: "Sign in to sync membership rights"
            }
          },
          changelog: {
            title: "Changelog",
            viewAll: "View all",
            v100: {
              date: "2024-05-20",
              summary: "Tooliva initial release."
            },
            v090: {
              date: "2024-05-15",
              summary: "UX improvements and bug fixes."
            }
          }
        }
      },
      placeholders: {
        toolUnavailable: "This tool is not available yet.",
        viewAllRecent: "Full history will live in the task center."
      },
      tools: {
        imageCompress: {
          title: "Image compress",
          shortTitle: "Image compress",
          description: "Batch compress images\nwhile keeping clarity"
        },
        gifCompress: {
          title: "GIF compress",
          shortTitle: "GIF compress",
          description: "Batch shrink GIFs\nlighter files"
        },
        videoToGif: {
          title: "Video to GIF",
          shortTitle: "Video to GIF",
          description: "Trim a clip\nexport an animated GIF"
        },
        removedTool: {
          shortTitle: "History (removed tool)"
        },
        imageUpscale: {
          title: "Image upscale",
          shortTitle: "Image upscale",
          description: "Sharper detail locally\noffline-friendly workflow"
        },
        imageWatermark: {
          title: "Image watermark",
          shortTitle: "Image watermark",
          description: "Batch add text or\nlogo watermark"
        },
        imageWatermarkRemoval: {
          title: "Remove image watermark",
          shortTitle: "Image watermark removal",
          description: "Detect and soften watermarks in still images locally (planned)"
        },
        videoWatermarkRemoval: {
          title: "Remove video watermark",
          shortTitle: "Video watermark removal",
          description: "Detect and soften watermarks in video files locally (planned)"
        }
      },
      membership: {
        title: "VIP Member",
        currentLevelLabel: "Current Level",
        currentLevelValue: "Gold Member",
        expiryLabel: "Expiry Date",
        renewButton: "Renew & Upgrade"
      },
      stats: {
        totalUsageCount: "Total usage count",
        todayUsageCount: "Today's usage count",
        totalSavedMinutes: "Total time saved",
        todaySavedMinutes: "Today's time saved"
      },
      recent: {
        justNow: "Just now",
        usedJustNow: "Just now",
        usedYesterday: "Yesterday",
        usedTwoDaysAgo: "2 days ago",
        emptyStateTitle: "No recent activity",
        emptyStateHint: "Try any tool above and your usage will appear here."
      },
      quickActions: {
        history: "History",
        favorites: "Favorite Tools",
        documentManager: "Document Manager"
      },
      relativeTime: {
        twoMinutesAgo: "2 minutes ago",
        fifteenMinutesAgo: "15 minutes ago",
        oneHourAgo: "1 hour ago",
        twoDaysAgo: "2 days ago"
      },
      footer: {
        copyright: "© 2024 Tooliva",
        versionPrefix: "Current version",
        slogan: "Make creation more efficient, make life simpler",
        feedback: "Feedback",
        helpCenter: "Help Center"
      },
      valueProps: {
        local: {
          title: "Runs locally",
          description: "Files and data are never uploaded"
        },
        privacy: {
          title: "Privacy first",
          description: "Processing and export stay on your computer"
        },
        offline: {
          title: "Secure authorization",
          description: "Sign-in is required, with no offline mode"
        },
        speed: {
          title: "Local processing",
          description: "No cloud transfer, safer by design"
        },
        updates: {
          title: "Continuous updates",
          description: "Membership features and tools keep improving"
        }
      }
    },
    tools: {
      title: "Tool List"
    },
    favorites: {
      title: "Favorite Tools"
    },
    tasks: {
      title: "Task Center",
      createDemoTask: "Create Demo Task",
      demoMessage: "Processing"
    },
    settings: {
      title: "Settings Center",
      languageSection: "Language Settings",
      headerTitle: "Settings Center",
      searchPlaceholder: "Search settings...",
      userName: "Username",
      userRole: "VIP Member",
      restartTipTitle: "Tip",
      restartTipDesc: "Some changes require an app restart to take effect",
      restartApp: "Restart App",
      aboutDesc: "A professional multi-tool platform.",
      currentVersion: "Current Version",
      checkUpdates: "Check Updates",
      menu: {
        general: "General Settings",
        tools: "Tool Settings",
        account: "Account Settings",
        notifications: "Notification Settings",
        privacy: "Privacy Settings",
        about: "About"
      },
      actions: {
        simplifiedChinese: "Simplified Chinese",
        on: "On",
        off: "Off",
        browse: "Browse",
        change: "Change",
        replace: "Replace",
        every5Minutes: "Every 5 minutes",
        standard: "Standard",
        concurrency4: "4 concurrent",
        dailyOnce: "Daily",
        scale100: "100%",
        updatePassword: "Update Password",
        manageBindings: "Manage Bindings"
      },
      general: {
        languageTitle: "Language Selection",
        languageDesc: "Choose your preferred language",
        windowSizeTitle: "App Window Size",
        windowSizeDesc: "The selected size is saved instantly and restored automatically the next time the app opens.",
        windowSizeSmallTitle: "Small",
        windowSizeSmallDesc: "Best for compact laptop screens",
        windowSizeMediumTitle: "Medium",
        windowSizeMediumDesc: "Default and the most balanced option",
        windowSizeLargeTitle: "Large",
        windowSizeLargeDesc: "Best for large displays and wider workspaces",
        darkModeTitle: "Dark Mode",
        darkModeDesc: "Switch to a dark theme for eye comfort",
        autoLaunchTitle: "Launch on Startup",
        autoLaunchDesc: "Automatically run when the system starts",
        scaleTitle: "Interface Scale",
        scaleDesc: "Adjust the UI display scale",
        defaultSaveTitle: "Default Save Location",
        defaultSaveDesc: String.raw`C:\Users\Username\Documents\ToolBox`
      },
      tools: {
        outputPathTitle: "Default Output Path",
        outputPathDesc: String.raw`C:\Users\Username\Documents\ToolBox\Output`,
        autoSaveTitle: "Auto Save",
        autoSaveDesc: "Automatically save processing results on a timer",
        qualityTitle: "Quality Level",
        qualityDesc: "Balance processing speed and output quality",
        concurrentTitle: "Concurrent Tasks",
        concurrentDesc: "Number of files processed at the same time",
        cleanupTitle: "Temporary Cleanup",
        cleanupDesc: "Automatically clear temporary files generated in processing"
      },
      account: {
        profileTitle: "Profile",
        profileDesc: "Edit nickname, email, and avatar",
        passwordTitle: "Change Password",
        passwordDesc: "Update your current account password",
        bindingTitle: "Account Binding",
        bindingDesc: "Manage WeChat, Apple ID, QQ and other bindings"
      },
      notifications: {
        taskDoneTitle: "Task Completion Alert",
        taskDoneDesc: "Send notifications after processing is complete",
        errorTitle: "Error Alert",
        errorDesc: "Send warnings when processing fails",
        updateTitle: "Update Notification",
        updateDesc: "Notify when a new app version is available",
        mailTitle: "Email Notification",
        mailDesc: "Receive product updates and activity news"
      },
      aiModules: {
        sectionTitle: "AI enhancement",
        runtimeTitle: "AI runtime",
        runtimeEmptyHint: "AI runtime is not installed. Use “Replace” to import a zip package.",
        modelTitle: "LaMA model",
        modelEmptyHint: "LaMA model is not imported. Use “Replace” to select big-lama.pt.",
        notInstalled: "Not installed",
        replaceRuntimeConfirmTitle: "Replace AI runtime",
        replaceRuntimeConfirmBody:
          "This removes the current AI runtime and imports the package you select. This cannot be undone. Continue?",
        replaceModelConfirmTitle: "Replace LaMA model",
        replaceModelConfirmBody:
          "This removes the current LaMA model file and imports the file you select. This cannot be undone. Continue?",
        replaceFailedTitle: "Replace failed"
      },
      privacy: {
        usageTitle: "Usage Data Collection",
        usageDesc: "Help us improve product experience",
        crashTitle: "Crash Report Sending",
        crashDesc: "Automatically send crash and error reports",
        autoDeleteTitle: "Auto Delete Files",
        autoDeleteDesc: "Automatically delete source files after completion"
      },
      path: {
        webNoPicker: "Directory picker is unavailable in the browser preview. Please use the desktop app.",
        webOpenUnavailable: "Opening folders in Explorer is unavailable in the browser. Please use the desktop app."
      },
      dashboard: {
        subtitle: "Manage language, theme, output folders, updates, and privacy preferences.",
        sectionGeneral: "General",
        sectionOutput: "Output",
        sectionCache: "Cache",
        sectionUpdates: "Updates",
        themeTitle: "Theme",
        themeDesc: "Choose light, dark, or follow the system appearance.",
        themeFollowSystem: "Follow system",
        themeLight: "Light",
        themeDark: "Dark",
        minimizeTrayTitle: "Minimize to tray",
        minimizeTrayDesc: "Keep a tray icon after closing the main window (preference placeholder until wired).",
        confirmCloseTitle: "Confirm before closing",
        confirmCloseDesc: "Ask for confirmation when closing to avoid accidents (preference placeholder until wired).",
        namingRuleTitle: "File naming rule",
        namingRuleDesc: "Default naming strategy for exported files.",
        namingOriginal: "Keep original file name",
        namingTimestamp: "Timestamp prefix",
        outputEmptyHint: "Choose a default output folder with “Change” first.",
        cacheDirTitle: "Cache directory",
        cacheDirDesc: "Location for temporary and preview cache files.",
        cacheSizeTitle: "Cache size",
        cacheSizeDesc: "Estimated about 256.8 MB (illustrative; real stats later).",
        clearCache: "Clear cache",
        clearCacheHint: "Cache cleanup will be wired in a future release. This is a placeholder notice.",
        pathNotSet: "Not set",
        openFolder: "Open",
        pathHintTitle: "Path",
        updateMethodTitle: "Update channel",
        updateMethodDesc: "Stable or preview update source.",
        updateStable: "Stable",
        updateBeta: "Preview",
        checkFrequencyTitle: "Check frequency",
        checkFrequencyDesc: "How often to check for updates automatically.",
        freqStartup: "On startup",
        freqDaily: "Daily",
        freqWeekly: "Weekly",
        clearDataTitle: "Clear local data",
        clearDataDesc: "Clears on-device usage history (including recent tools) and resets all preferences to defaults. Does not delete exported files.",
        clearData: "Clear local data",
        clearDataModalTitle: "Clear local data?",
        clearDataModalBody:
          "This removes on-device recent tool usage and resets all preferences (language, theme, paths, task options, etc.) to their defaults. This cannot be undone. Exported files are not deleted.",
        clearDataModalAck: "I understand and want to continue",
        clearDataModalCancel: "Cancel",
        clearDataModalConfirm: "Clear data",
        cacheEmptyHint: "Choose a cache folder with “Change” first.",
        checkUpdatesHint: "Update checks compare your current version with the latest release before showing update actions.",
        updateProgressTitle: "Checking for updates",
        updateCheckProgressStart: "Preparing the current version information…",
        updateCheckProgressNetwork: "Connecting to the update service…",
        updateCheckProgressCompare: "Comparing your version with the latest release…",
        updateCheckProgressDone: "Check finished. Preparing the result…",
        updateAvailableTitle: "Update available",
        updateAvailableMessage: "A newer version {version} is available for install.",
        updateAvailableDevMessage: "A newer version {version} is available. This development build only verifies the check result and will not install updates.",
        updateAvailableUnsupportedMessage: "A newer version {version} is available, but the current release metadata does not include a usable download URL. Try again later.",
        updateUpToDateTitle: "You're up to date",
        updateUpToDateMessage: "Current version {version} is already the latest release.",
        updateCheckFailedTitle: "Update check failed",
        updateCheckFailedMessage: "Unable to load update information right now. Try again later.",
        latestVersionLabel: "Latest version",
        releaseDateLabel: "Release date",
        updateNow: "Update Now",
        downloadUpdateNow: "Download Update",
        closeModal: "Close",
        updateInstallProgressPrepare: "Preparing updater environment…",
        updateInstallProgressOpenLink: "Preparing the update installer…",
        updateInstallProgressDownload: "Downloading update package…",
        updateInstallProgressApply: "Installing update…",
        updateInstallProgressDone: "Installer started. The update will begin shortly…",
        autoUpdatePromptTitle: "Update Available",
        autoUpdatePromptBody: "Version {version} is available. Download and install it now?",
        updateDownloadStartedTitle: "Update Download Started",
        updateDownloadStartedMessage: "The installer has started. The app will close and continue the update flow.",
        updateInstallFailedTitle: "Update Installation Failed",
        updateInstallBlockedByActiveTasks: "There are active tasks running. Please install the update after they complete.",
        updateInstallError: {
          dev_environment: "This development build only supports checking for updates and will not install them.",
          not_tauri: "This environment does not support desktop update installation.",
          missing_download_url: "The update metadata is missing a download URL. Try again later.",
          permission_denied: "Updater permission is not available in current environment.",
          network_error: "Failed to download update. Please check your network and try again.",
          metadata_invalid: "Update metadata is invalid or signature verification failed.",
          download_corrupt: "The downloaded installer is invalid or corrupted. Please retry or use manual download.",
          no_update: "No installable update is currently available.",
          install_failed: "Update installation failed. Please retry or use manual installer."
        },
        terms: "Terms of use",
        privacyPolicy: "Privacy policy",
        termsPlaceholder: "Terms content will be linked or embedded in a future release.",
        privacyPlaceholder: "Privacy policy content will be linked or embedded in a future release.",
        copyright: "© Tooliva"
      }
    },
    membership: {
      title: "Membership Center",
      description: "Authorization and membership capabilities can be added later.",
      backToHome: "Back to Home",
      hero: {
        title: "Membership Center",
        subtitle: "Go premium to unlock every advanced feature",
        benefit1: "Unlimited use of all tools",
        benefit2: "More efficient batch processing",
        benefit3: "Remove ads across tools",
        benefit4: "Priority support from dedicated customer service",
        benefit5: "Early access to new features",
        benefit6: "More exclusive member benefits",
        visualAlt: "Decorative illustration placeholder: crown and creator tools"
      },
      userCard: {
        notLoggedIn: "Not signed in",
        syncHint: "Sign in to sync your membership benefits",
        loginCta: "Sign in",
        loginPlaceholderTitle: "Notice",
        loginPlaceholder: "Sign-in will ship in a future release. This is a preview."
      },
      plans: {
        sectionTitle: "Choose a plan",
        badgeRecommended: "Popular",
        badgeSave16: "Save 16%",
        badgeSave46: "Save 46%",
        badgeValue: "Best value",
        monthly: "Monthly",
        quarterly: "Quarterly",
        annual: "Annual",
        lifetime: "Lifetime",
        monthlySub: "Best for short-term use",
        quarterlySub: "Best for quarterly use",
        annualSub: "Best for long-term use",
        lifetimeSub: "One-time purchase, use forever",
        priceMonthly: "¥ 19.90",
        priceQuarterly: "¥ 49.90",
        priceAnnual: "¥ 129.90",
        priceLifetime: "¥ 299.00",
        cycleMonth: "/ month",
        cycleQuarter: "/ quarter",
        cycleYear: "/ year",
        monthlySecondary: "¥19.90 billed monthly (auto-renew)",
        quarterlySecondary: "¥16.63 / month equivalent",
        annualSecondary: "¥10.83 / month equivalent",
        lifetimeSecondary: "No renewals — one-time purchase",
        cta: "Subscribe"
      },
      compare: {
        title: "Compare benefits",
        colFeature: "Features",
        colFree: "Free",
        colMember: "Member",
        colLifetime: "Lifetime",
        rows: {
          unlimited: "Unlimited usage",
          batch: "Batch processing",
          ads: "Ad-free",
          support: "Priority support",
          early: "Early access",
          exclusive: "Exclusive features"
        },
        free: {
          limited: "Daily quota",
          partial: "Small batches only",
          withAds: "Includes promotions",
          standard: "Standard queue"
        },
        member: {
          partialExclusive: "Partial access"
        },
        dash: "—",
        included: "Included",
        viewFull: "View full comparison",
        viewFullAria: "Open full membership comparison in browser"
      },
      aside: {
        ariaLabel: "Membership supplements",
        faqTitle: "FAQ",
        faqViewAll: "View all",
        faqExpand: "Show answer"
      },
      faq: {
        q1: {
          q: "Is subscription auto-renewing?",
          a: "You will manage renewals and invoices in Account settings in a future release—this page is a preview."
        },
        q2: {
          q: "Which payment methods are supported?",
          a: "We plan to support major local methods—subject to what ships at launch."
        },
        q3: {
          q: "How many devices can I use?",
          a: "Device limits and licensing will be announced when accounts go live."
        },
        q4: {
          q: "Can I get a refund?",
          a: "Refunds follow processor and platform policies shown on the order page."
        }
      }
    },
    membershipDesktop: {
      eyebrow: "Desktop membership",
      title: "Current membership information",
      subtitle: "Review your current membership status, available packages, and benefit comparison.",
      refresh: "Refresh",
      statusLabel: "Current status",
      expiryLabel: "Expires on",
      purchaseLabel: "Purchase",
      buyNow: "Buy",
      loginHint: "Sign in to load your current membership status from the account service.",
      loginCta: "Sign in",
      benefitsTitle: "How membership works",
      planSectionTitle: "Membership packages",
      planSectionSubtitle: "All paid packages unlock the same core paid-member rights. The difference is mainly billing mode.",
      viewFullPricing: "View full pricing",
      compareTitle: "Membership benefit comparison",
      compareSubtitle: "Free membership includes daily limits. Paid membership unlocks unlimited core tool usage.",
      compareHeaders: {
        feature: "Feature",
        free: "Free membership",
        paid: "Paid membership",
        cycle: "Billing cycles"
      },
      compareRows: {
        imageCompress: { name: "Image compression", free: "true", cycle: "Monthly / Yearly / Lifetime" },
        gifCompress: { name: "GIF compression", free: "Limited", cycle: "Monthly / Yearly / Lifetime" },
        videoToGif: { name: "Video to GIF", free: "false", cycle: "Monthly / Yearly / Lifetime" },
        imageWatermarkRemoval: { name: "Image watermark removal", free: "false", cycle: "Monthly / Yearly / Lifetime" },
        videoWatermarkRemoval: { name: "Video watermark removal", free: "false", cycle: "Monthly / Yearly / Lifetime" },
        imageUpscale: { name: "Image upscale", free: "false", cycle: "Monthly / Yearly / Lifetime" },
        unlimitedBatch: { name: "Unlimited batch tasks", free: "false", cycle: "Monthly / Yearly / Lifetime" },
        aiEnhanced: { name: "AI-enhanced processing", free: "true", cycle: "Monthly / Yearly / Lifetime" },
        paidRights: { name: "Paid rights consistency", free: "N/A", cycle: "Same rights across paid cycles" }
      },
      summary: {
        guestTitle: "Not signed in",
        guestDescription: "Sign in to sync your membership status. You can also choose a package and purchase directly.",
        freeTitle: "Free membership",
        freeDescription: "Free members can use the product with daily limits. Upgrade to paid membership when you need unlimited usage.",
        paidTitle: "Paid membership active",
        paidDescription: "Your account currently has active paid-member rights and can use core tools without daily limits.",
        lifetimeTitle: "Lifetime membership active",
        lifetimeDescription: "Your account already has lifetime paid-member rights."
      },
      status: {
        guest: "Guest",
        free: "Free member",
        paid: "Paid member",
        lifetime: "Lifetime member"
      },
      plans: {
        currentPlan: "Current plan"
      },
      planNames: {
        trial_monthly: "Trial package",
        monthly: "Monthly paid membership",
        yearly: "Yearly paid membership",
        lifetime: "Lifetime membership"
      },
      planSubtitles: {
        trial_monthly: "Try paid features and the full desktop workflow first.",
        monthly: "Best for users who want flexible monthly billing.",
        yearly: "Best for long-term creators who want a lower yearly cost.",
        lifetime: "One purchase for long-term paid-member access."
      },
      planFeatures: {
        trial_monthly: {
          feature1: "Try core paid features",
          feature2: "Evaluate the full workflow first",
          feature3: "Upgrade after the trial when needed"
        },
        monthly: {
          feature1: "Unlimited core usage",
          feature2: "Great for frequent monthly workflows",
          feature3: "Flexible recurring billing"
        },
        yearly: {
          feature1: "Unlimited core usage",
          feature2: "Better value for long-term work",
          feature3: "Ideal for stable yearly production"
        },
        lifetime: {
          feature1: "Unlimited core usage",
          feature2: "No recurring renewal needed",
          feature3: "Best for long-term ownership"
        }
      },
      purchaseReasons: {
        already_lifetime: "Lifetime membership is already active on this account.",
        trial_already_used: "The trial package has already been used.",
        subscription_active_only_lifetime: "An active subscription already exists. Manage the current subscription before switching packages.",
        current_plan: "This package is already active on your account.",
        plan_not_purchasable: "This package is temporarily unavailable."
      },
      period: {
        monthly: "Monthly",
        yearly: "Yearly",
        lifetime: "Lifetime",
        trial_monthly: "Trial",
        one_time: "One-time"
      },
      errors: {
        planFetchFailed: "Unable to load package information right now. Please try again later.",
        membershipFetchFailed: "Unable to load current membership status right now. Please try again later.",
        networkError: "Network connection failed. Please check your network and try again.",
        sessionExpired: "Your session has expired. Please sign in again to view membership details."
      }
    },
    imageCompress: {
      title: "Image Compression",
      description: "Supports batch import, quality tuning and format output. Default output is /compress/ under source folders.",
      fileListTitle: "Image list",
      clearList: "Clear list",
      remove: "Remove",
      removeAria: "Remove from list",
      list: {
        title: "Image list",
        deleteSelected: "Delete selected",
        emptyTitle: "No images yet",
        emptyDesc: "Add images to start batch compression."
      },
      start: "Start compression",
      processing: "Compressing...",
      taskRunning: "Compressing image",
      taskDone: "Done",
      listOverflowTip: "Only first 200 items are displayed. Remaining {count} items will continue processing in background.",
      source: {
        title: "Input source",
        pickImages: "Add Images",
        pickDirectory: "Choose Folder",
        dragHint: "You can drag images or folders into the area below.",
        directoryNotSelected: "No folder selected; you can drag images directly"
      },
      output: {
        title: "Output directory",
        pickDirectory: "Specify output folder",
        hint: "Defaults to /compress/ under each source file directory.",
        defaultDirectory: "Default output is /compress/ under each source image directory"
      },
      footer: {
        saveTo: "Save to:",
        changeOutput: "Change",
        customOutput: "Custom output folder",
        defaultOutput: "Each file's source folder /compress/"
      },
      settings: {
        title: "Compression settings",
        quality: "Quality",
        qualityLow: "Smaller file",
        qualityHigh: "Higher quality",
        format: "Output format",
        formatAuto: "Original",
        tip: "Higher quality preserves detail but increases file size. Start with JPG 80 or WEBP 80."
      },
      advanced: {
        title: "Advanced",
        resolution: "Resolution",
        resolutionOriginal: "Keep original size",
        resolutionBounded: "Cap max output pixels",
        maxWidth: "Max width",
        maxHeight: "Max height",
        noLimit: "No limit",
        sharpen: "Sharpen",
        sharpenHint: "Light sharpening can improve perceived sharpness after compression.",
        exif: "Keep EXIF",
        exifHint: "Keep capture time, device and other metadata.",
        notWired: "Not supported by the backend in this version; control is disabled.",
        reset: "Reset settings"
      },
      upload: {
        dropTitle: "Drag images here or click to add",
        dropDesc: "PNG / JPG / JPEG / WEBP / BMP supported, auto dedupe with serial processing"
      },
      table: {
        selectAll: "Select all visible rows",
        selectRow: "Select this row",
        fileName: "Filename",
        originalSize: "Original size",
        resolution: "Resolution",
        compressedSize: "Compressed size",
        status: "Status",
        operation: "Action",
        progress: "Progress",
        dash: "—"
      },
      hints: {
        dragNoPath: "No valid local paths from drag-and-drop. Use Add images or drag inside the desktop window.",
        unsupportedFormat: "Only PNG / JPG / JPEG / WEBP / BMP are supported",
        duplicateFiles: "Selected files are already in the task list"
      },
      errors: {
        pickImagesFailed: "Failed to pick images: {message}",
        pickImagesDialog: "Could not open the image picker",
        scanDirectoryFailed: "Failed to scan folder: {message}",
        scanDirectory: "Failed to scan folder",
        genericFailed: "Processing failed"
      },
      status: {
        idle: "Pending",
        running: "Processing",
        completed: "Completed",
        failed: "Failed"
      },
      result: {
        title: "Execution result",
        total: "Total",
        success: "Success",
        failed: "Failed",
        elapsed: "Elapsed",
        ratio: "Overall compression",
        sizeChange: "Size change"
      }
    },
    gifCompress: {
      title: "GIF Compression",
      description: "Batch compress animated GIFs locally. Heavy work runs off the UI thread.",
      listTitle: "File list",
      addFiles: "Add files",
      clearList: "Clear list",
      clearListAria: "Clear the file list",
      maxFilesHint: "Batch add supported, up to {n} files at a time",
      formatHint: "Supported: .gif",
      sizeHint: "Recommended under {mb} MB per file",
      totalFiles: "{n} files total",
      totalSize: "Total size: {size}",
      dropTitle: "Drag GIF files here or click to add",
      dropTitlePrefix: "Drag GIF files here, or ",
      dropTitleAction: "click to add",
      emptyPreviewTitle: "Add a GIF to start preview",
      emptyPreviewDesc: "Preview playback with a side-by-side size comparison",
      previewTitle: "Preview",
      previewDisclaimer: "Preview may show a subset of frames; export is authoritative.",
      originalPreview: "Original",
      compressedPreview: "Compressed (estimate)",
      originalWithSize: "Original ({size})",
      compressedEstimate: "Estimated ({size})",
      reductionBadge: "↓ {pct}%",
      sizeArrow: "{from} → {to}",
      savings: "Estimated savings {size} ({pct}%)",
      savingsShort: "Estimated savings: {v}",
      originalSizeShort: "Original size",
      compressedSizeShort: "Compressed size",
      savingsEmpty: "Estimated savings: --",
      statusCompressing: "Compressing…",
      estimateNote: "Estimated output updates when you change parameters",
      estimateDisclaimer: "Estimates are indicative; actual size depends on content.",
      targetSizePlaceholder: "e.g. 2",
      targetSizeDisabled: "Target-size pass is not available yet",
      settingsTitle: "Compression settings",
      restoreDefaults: "Restore defaults",
      basicSettings: "Basic",
      advancedSettings: "Advanced",
      mode: "Mode",
      modeLight: "Light",
      modeRecommended: "Recommended",
      modeExtreme: "Extreme",
      resize: "Output size",
      resizeKeep: "Original",
      resizeP80: "80%",
      resizeP60: "60%",
      resizeP50: "50%",
      resizeCustom: "Custom width",
      customWidthLabel: "Width (px)",
      fps: "Smoothness (FPS)",
      fpsSmooth: "Smooth (15fps)",
      fpsStandard: "Standard (12fps)",
      fpsCompact: "Smaller (10fps)",
      fpsTiny: "Tiny (8fps)",
      fpsSource: "Keep source FPS",
      colors: "Colors",
      quality: "Quality",
      qualityLow: "Low",
      qualityMedium: "Medium",
      qualityHigh: "High",
      removeDup: "Remove duplicate frames",
      targetSize: "Target size (optional)",
      targetSizeMb: "MB",
      estimatedOutSize: "Estimated size: {v}",
      dither: "Dithering",
      ditherOff: "Off",
      ditherLow: "Low (smaller)",
      ditherMedium: "Medium (balanced)",
      ditherHigh: "High (quality)",
      loop: "Looping",
      loopPreserve: "Keep source loop",
      loopForce: "Force looping",
      loopNone: "No loop",
      transparency: "Keep transparency",
      concurrency: "Concurrency",
      concurrencyAuto: "Auto",
      filenameRule: "Filename pattern",
      filenameEn: "name_COMPRESSED",
      filenameZh: "name_压缩",
      outputDir: "Output folder",
      outputSame: "Next to source file",
      outputSubfolder: "gif_compress_output under source folder",
      outputCustom: "Custom folder",
      pickOutputDir: "Choose output folder",
      fastMode: "Fast mode (skip some optimizations)",
      statusReady: "Ready",
      statusPending: "Pending",
      statusProcessing: "Compressing…",
      statusSaving: "Saving…",
      statusDone: "Done",
      statusFailed: "Failed",
      bottomOverall: "Overall progress",
      bottomNoTask: "No active task",
      bottomProcessing: "Processing {cur} / {total} files",
      bottomEta: "ETA: {eta}",
      start: "Start compression",
      stop: "Stop task",
      openOutput: "Open output folder",
      startAria: "Start compression",
      stopAria: "Stop current task",
      openOutputAria: "Open output folder in file manager",
      removeFileAria: "Remove this file from the list",
      cannotStartEmpty: "Add at least one GIF",
      cannotStartRunning: "A task is already running",
      pickFailed: "Failed to pick files: {message}",
      hints: {
        unsupportedFormat: "Only .gif files are supported",
        dragNoPath: "No valid local paths from drag-and-drop. Use Add files or drop inside the desktop window."
      },
      errors: {
        generic: "Something went wrong"
      }
    },
    imageUpscale: {
      title: "Image Upscale",
      description: "Batch import images and run local offline 2x / 3x / 4x upscaling with format output controls.",
      fileListTitle: "Upscale tasks",
      clearList: "Clear list",
      deleteSelected: "Delete selected",
      remove: "Delete",
      removeAria: "Remove from list",
      start: "Start upscale",
      processing: "Upscaling...",
      taskRunning: "Upscaling image",
      taskDone: "Done",
      listOverflowTip: "Only first 200 items are displayed. Remaining {count} items will continue processing in background.",
      source: {
        title: "Input source",
        pickImages: "Add images",
        pickDirectory: "Choose folder",
        directoryNotSelected: "No folder selected; you can drag images directly"
      },
      output: {
        title: "Output folder",
        sourceDirectory: "Source folder",
        customDirectory: "Custom folder",
        pickDirectory: "Choose output folder",
        customNotSelected: "No custom output folder selected",
        defaultDirectory: "Defaults to /scale/ under the source image folder",
        openDirectoryUnavailable: "Add an image or choose a source folder before opening the output folder"
      },
      footer: {
        saveTo: "Save to:",
        sourceOutput: "Each file's source folder /scale/",
        changeOutput: "Change",
        openDirectory: "Open folder"
      },
      settings: {
        title: "Upscale settings",
        scale: "Scale",
        mode: "Upscale mode",
        outputFormat: "Output format",
        tip: "Fast is best for previews, Standard balances speed and quality, and High prioritizes edge detail."
      },
      advanced: {
        title: "Advanced",
        denoise: "Denoise",
        sharpen: "Sharpen",
        preserveAlpha: "Preserve transparent background",
        concurrency: "Concurrency",
        reset: "Reset settings"
      },
      options: {
        mode: {
          fast: "Fast",
          standard: "Standard",
          balanced: "Standard",
          quality: "High",
          high: "High"
        },
        format: {
          original: "Original",
          png: "PNG",
          jpg: "JPG",
          webp: "WEBP"
        },
        level: {
          off: "Off",
          low: "Low",
          medium: "Medium",
          high: "High"
        },
        concurrency: {
          auto: "Auto",
          1: "1",
          2: "2",
          4: "4"
        }
      },
      upload: {
        dropTitle: "Drag images here, or click the empty area to add",
        dropDesc: "PNG / JPG / JPEG / WEBP / BMP supported; mixed formats in one batch.",
        button: "Add images",
        addFolder: "Add folder"
      },
      empty: {
        title: "No images yet",
        desc: "Add images to start upscaling."
      },
      table: {
        selectAll: "Select all visible rows",
        selectRow: "Select this row",
        fileName: "Filename",
        originalSize: "Original size",
        outputSize: "Upscaled size",
        outputFormat: "Output format",
        preview: "Preview",
        status: "Status",
        operation: "Actions",
        progress: "Progress",
        dash: "—"
      },
      hints: {
        dragNoPath: "No valid local paths from drag-and-drop. Use Add images or drag inside the desktop window.",
        unsupportedFormat: "Only PNG / JPG / JPEG / WEBP / BMP are supported",
        duplicateFiles: "Selected files are already in the task list",
        noPendingItems: "No pending or failed tasks to retry"
      },
      errors: {
        pickImagesFailed: "Failed to pick images: {message}",
        pickImagesDialog: "Could not open the image picker",
        scanDirectoryFailed: "Failed to scan folder: {message}",
        scanDirectory: "Failed to scan folder",
        openDirectoryFailed: "Failed to open output folder: {message}",
        openDirectory: "Failed to open output folder",
        genericFailed: "Processing failed"
      },
      status: {
        idle: "Pending",
        running: "Processing",
        completed: "Completed",
        failed: "Failed"
      },
      result: {
        title: "Execution result",
        total: "Total",
        success: "Success",
        failed: "Failed",
        elapsed: "Elapsed"
      }
    },
    videoToGif: {
      title: "Video to GIF",
      description: "Quickly convert MP4 / MOV / WebM clips into crisp animated GIFs",
      safetyBadge: "Local · Private",
      themeToggleAria: "Toggle theme",
      brandTagline: "FFmpeg palettegen quality pipeline",
      upload: {
        dropTitle: "Drop a single video here, or click the button below",
        dropDesc: "One file at a time — MP4 / MOV / WebM and other common video formats",
        pickVideoCta: "Choose video file",
        maxFileNote: "Up to 500MB per file",
        tipTitle: "Tip",
        tipBody: "Shorter and cleaner clips produce the best GIF results."
      },
      emptyVideo: {
        title: "No video yet",
        desc: "Upload a single video to start the conversion."
      },
      preview: {
        playAria: "Play / Pause",
        viewportAria: "Video preview and safe area",
        rangeAria: "Selected range",
        playheadAria: "Playhead (drag to preview)",
        startLabel: "Start",
        endLabel: "End",
        currentLabel: "Current",
        durationLabel: "Duration",
        durationUnit: "s",
        timeSep: "→",
        replaceVideo: "Replace video",
        deleteVideo: "Remove video",
        deleteVideoModalTitle: "Remove this video?",
        deleteVideoModalBody:
          "The loaded video will be cleared from the preview. You can upload another file afterward.",
        deleteVideoModalCancel: "Cancel",
        deleteVideoModalConfirm: "Remove"
      },
      clips: {
        title: "GIF clips",
        countTpl: "{count} clip(s) added",
        addCurrent: "Add current selection",
        chipPrefix: "Clip",
        colClip: "Clip",
        colSize: "Size",
        colFps: "FPS",
        colStatusActions: "Status / actions",
        deleteAria: "Delete clip",
        openFolderAria: "Open folder containing this GIF",
        openFolderTip: "Open the folder that contains this GIF in your file manager",
        emptyTip: "Select a range above, then click \"Add current selection\" to add it to the list",
        emptyStateTitle: "No GIF clips yet",
        emptyStateDesc:
          "Adjust the selection on the timeline above, then tap \"Add current selection\" under the preview to add your first clip.",
        startCol: "Start",
        endCol: "End",
        durationCol: "Duration",
        sizeUnit: "{w} × {h}",
        fpsUnit: "{fps} fps"
      },
      settings: {
        title: "Export settings",
        collapseAria: "Collapse / expand settings",
        size: "Output size",
        sizeOriginal: "Original",
        sizeCustom: "Custom",
        width: "Width",
        height: "Height",
        aspectLockAria: "Lock aspect ratio",
        fps: "Frame rate (FPS)",
        fpsUnit: "{fps} fps",
        quality: "Quality",
        qualityLow: "Low",
        qualityMid: "Mid",
        qualityHigh: "High",
        speed: "Playback speed",
        speed05: "0.5x (slow)",
        speed10: "1.0x (normal)",
        speed20: "2.0x (fast)",
        loopMode: "Loop mode",
        loopInfinite: "Loop forever",
        loopOnce: "Play once",
        keepAspect: "Keep aspect",
        keepAspectHint: "Preserve the source aspect ratio",
        reduceSize: "Size optimization",
        reduceSizeHint: "Smart compression to shrink the GIF",
        smartCompressLabel: "Enable smart compression"
      },
      estimate: {
        title: "Output estimate",
        size: "Est. size",
        frames: "Est. frames",
        duration: "Duration",
        resolution: "Resolution",
        dash: "--",
        emptySize: "--",
        emptyFrames: "--",
        emptyDuration: "--",
        emptyResolution: "--",
        sizeSubtitle: "({count} clip(s))",
        framesSubtitle: "(total)",
        durationSubtitle: "(total)"
      },
      footer: {
        start: "Start conversion",
        processing: "Converting…",
        exportGif: "Export GIF",
        openFolder: "Open output folder",
        openDirectory: "Open folder"
      },
      hints: {
        dragNoPath: "No local path resolved. Use the upload button or drag into the desktop window.",
        unsupportedFormat: "Only common video extensions such as MP4 / WEBM / MKV / MOV / AVI / M4V / WMV",
        fileTooLarge: "Each file must be 500MB or smaller",
        rangeInvalid: "End time must be greater than start time",
        noClips: "Add at least one clip first",
        duplicateClip: "A clip with the same range and fps already exists"
      },
      errors: {
        pickVideosFailed: "Could not pick video: {message}",
        pickVideosDialog: "Could not open the file picker",
        loadVideoFailed: "Could not load video: {message}",
        loadVideoDialog: "Could not read video metadata",
        openDirectoryFailed: "Could not open folder: {message}",
        openDirectory: "No folder available to open yet",
        genericFailed: "Conversion failed"
      },
      status: {
        idle: "Pending",
        running: "Working",
        completed: "Done",
        failed: "Failed"
      },
      result: {
        title: "Summary",
        total: "Total",
        success: "Succeeded",
        failed: "Failed",
        elapsed: "Elapsed"
      },
      taskRunning: "Encoding GIF",
      taskDone: "GIF export finished"
    },
    imageWatermarkRemoval: {
      title: "Remove image watermark",
      description:
        "This tool will detect and process watermark regions in still images on-device. It does not remove watermarks from video files.",
      comingSoon: "Under development. Algorithms and batch jobs will arrive in a future update.",
      relatedVideoLink: "Need video instead? Open remove video watermark",
      list: {
        fileListTitle: "Files ({count})",
        addImages: "Add images",
        clearList: "Clear list",
        summaryCount: "{count} images",
        totalSize: "Total size: {size}"
      },
      drop: {
        titlePrefix: "Drag images here, or ",
        titleAction: "click to add",
        formatsHint: "JPG / PNG / BMP / WEBP supported",
        batchLabel: "Batch import supported",
        batchHint: "Add multiple images at once"
      },
      preview: {
        sectionTitle: "Markup & preview",
        hintWithImage:
          "Drag a rectangle over the watermark. Add multiple regions; delete from the corner handle.",
        hintNoImage: "Add an image first, then mark regions to remove.",
        tabOriginal: "Original",
        tabProcessed: "After",
        removeRegion: "Remove region",
        emptyTitle: "No image",
        emptyHint: "Add images from the left panel to begin.",
        footTip:
          "Tip: cover the watermark fully—slightly larger edges often produce better blends.",
        clearRegions: "Clear all regions"
      },
      settings: {
        title: "Removal settings",
        basics: "Basics",
        removalMode: "Removal mode",
        modeStandard: "Standard",
        modeQuality: "High quality",
        removalModeHint:
          "Standard repairs locally into the original image; high quality uses LaMA and is slower.",
        batchApply: "Apply marks to all",
        batchApplyHint: "Reuse the marked regions across every image",
        outputSection: "Output",
        outputFormat: "Output format",
        formatAuto: "Match source",
        outputFormatHint: "Keeps original format by default; PNG is lossless, JPG is smaller."
      },
      bottomBar: {
        overallProgress: "Overall progress",
        status: "Status",
        aiEngine: "AI engine",
        taskCount: "Items",
        taskCountValue: "{count} images",
        elapsed: "Elapsed",
        overallProgressDetail: "Progress",
        outputDirLabel: "Output:",
        pickOutputAria: "Choose output folder",
        outputDirTitle: "Output folder",
        start: "Remove watermarks",
        preparingModel: "Preparing model",
        stopTask: "Stop task",
        openOutput: "Open output"
      },
      progress: {
        noTask: "Idle",
        processing: "{current} / {total} images"
      },
      itemStatus: {
        pending: "Pending",
        processing: "Working",
        done: "Done",
        failed: "Failed"
      },
      hints: {
        unsupportedFormats:
          "Only JPG / PNG / BMP / WEBP images are supported",
        addImagesFirst: "Please add images first",
        selectRegionsFirst: "Draw regions on the watermark first",
        startTaskFailed: "Could not start AI removal",
        batchFailed: "AI removal failed"
      },
      model: {
        startingWorker: "Starting LaMA worker ({device})",
        detectingRuntime: "Detecting CUDA / CPU",
        downloadingFirstUse: "Downloading LaMA model (first run)",
        lamaReady: "LaMA model ready",
        downloading: "Downloading LaMA model",
        overlayTitle: "Preparing LaMA model",
        preparingFiles: "Preparing files",
        currentDevice: "Device: {device}",
        storePathLabel: "Stored at {path}",
        prepFailedTitle: "Model preparation failed",
        close: "Close"
      },
      output: {
        defaultDirectory: "D:\\Tooliva\\watermark-removal-output"
      },
      dialog: {
        imagesFilterName: "Images"
      },
      toastTip: "Tip: Draw watermark regions first, then click remove."
    },
    videoWatermarkRemoval: {
      title: "Remove video watermark",
      description:
        "This tool will detect and process watermark regions in video files on-device. It does not remove watermarks from still images.",
      comingSoon: "Under development. Algorithms and batch jobs will arrive in a future update.",
      relatedImageLink: "Need still images instead? Open remove image watermark",
      filePicker: {
        videoFilter: "Videos"
      },
      mode: {
        title: "Processing mode",
        ariaLabel: "Processing mode",
        fast: "Fast mode",
        ai: "AI enhanced mode",
        fastHint:
          "No AI download required—best for simple backgrounds, solid colors, corner marks, and small areas.",
        aiHint:
          "Best for complex backgrounds and more natural results. Install once; files never leave your device.",
        engineLabel: "Processing engine"
      },
      engine: {
        label: "FFmpeg streaming / automatic hardware encoding",
        fastLocal: "Local fast repair",
        aiEnhanced: "AI enhanced repair"
      },
      progressPanel: {
        idleTitle: "No active task",
        processingTitle: "Processing video {current} / {total}",
        aria: "Processing progress",
        taskCount: "Tasks",
        currentFile: "Current file",
        estimatedRemaining: "Est. remaining",
        elapsed: "Elapsed",
        engine: "Engine",
        overallProgress: "Overall progress"
      },
      status: {
        pending: "Pending",
        processing: "Working",
        done: "Done",
        failed: "Failed"
      },
      hints: {
        unsupportedFormats:
          "Only MP4 / MOV / WebM / MKV / AVI / M4V / WMV videos are supported",
        addVideoFirst: "Add at least one video first",
        selectRegionFirst:
          "Draw a rectangle on the preview to select the watermark area to remove",
        startTaskFailed: "Could not start the watermark removal task",
        taskFailed: "Watermark removal failed"
      },
      list: {
        title: "Files ({count})",
        addVideos: "Add videos",
        clearList: "Clear list",
        removeItem: "Remove from list",
        dropHint: "Drag videos here, or ",
        dropAddLink: "click to add videos",
        formatsLine: "Supports MP4 / MOV / WebM / MKV / AVI / M4V / WMV",
        batchImport: "Batch import supported",
        sharedRegionHint: "You can add multiple videos and process them in one run",
        totalVideos: "{count} videos",
        totalSize: "Total size: {size}"
      },
      preview: {
        aria: "Video preview and watermark region",
        titleFallback: "Video preview",
        instruction:
          "Drag on the preview to select the fixed watermark area to remove",
        clearRegions: "Clear selection",
        emptyTitle: "No video yet",
        emptyDesc: "Add a video to draw watermark regions here",
        controlsAria: "Preview controls",
        outputNote:
          "Output keeps the original format by default; multiple videos can share the same region when the watermark aligns.",
        regionsSelected: "{count} region(s) selected",
        footTipPause: "Preview is enlarged. Pause the video before drawing regions."
      },
      bottomBar: {
        overallProgress: "Overall progress",
        status: "Status",
        currentFile: "Current file",
        estimatedRemaining: "Est. remaining",
        elapsed: "Elapsed",
        progressDetail: "Progress detail",
        outputDirLabel: "Output folder",
        openOutput: "Open folder",
        stopTask: "Stop task",
        start: "Remove watermark"
      },
      output: {
        directoryLabel: "Output folder",
        openFolder: "Open folder",
        defaultDirectory: "D:\\Tooliva\\video-watermark-removal-output"
      },
      actions: {
        stop: "Stop",
        start: "Remove watermark"
      },
      tip: "Tip: select the watermark region on the preview before you start processing."
    },
    imageWatermark: {
      title: "Image Watermark",
      description: "Supports batch import and applies a unified text watermark or logo watermark to images.",
      fileListTitle: "Watermark Tasks",
      clearList: "Clear List",
      remove: "Remove",
      removeAria: "Remove from list",
      list: {
        title: "Image list",
        emptyTitle: "No images yet",
        emptyDesc: "Add images to start batch watermarking.",
        deleteSelected: "Delete selected",
        deleteSelectedHint: "Multi-select is not available yet. Remove items one by one or clear the list.",
        table: {
          fileName: "Filename",
          dimensions: "Dimensions",
          fileSize: "Size",
          fileSizeHint: "File size is not shown yet; column reserved for layout parity",
          watermarkType: "Watermark type",
          preview: "Preview",
          status: "Status",
          progress: "Progress",
          action: "Action"
        }
      },
      bottom: {
        outputLabel: "Output directory",
        changeOutput: "Change",
        namingLabel: "File naming",
        namingGoSettings: "Change in Settings"
      },
      start: "Start Watermark",
      processing: "Applying watermark...",
      listOverflowTip: "Only first 200 items are displayed. Remaining {count} items will continue processing in background.",
      source: {
        title: "Input Source",
        pickImages: "Add Images",
        pickDirectory: "Choose Folder",
        directoryNotSelected: "No folder selected, drag images directly is supported"
      },
      output: {
        title: "Output Directory",
        pickDirectory: "Specify Output Folder",
        defaultDirectory: "Default output is /water/ under the uploaded image directory",
        openDirectory: "Open Folder"
      },
      settings: {
        sidebarTitle: "Watermark settings",
        title: "Watermark Settings",
        sectionWatermarkType: "Watermark type",
        sectionContent: "Watermark content",
        sectionTypography: "Font & size",
        sectionWatermarkImage: "Watermark image",
        sectionAppearance: "Opacity",
        sectionLayout: "Position & spacing",
        fontFamilyLabel: "Font",
        fontFamilyValue: "Source Han Sans (default)",
        fontFamilyHint: "Uses the app default font for rendering",
        mode: "Watermark Mode",
        textMode: "Text Watermark",
        imageMode: "Image Watermark",
        text: "Watermark Text",
        textPlaceholder: "Enter watermark text",
        fontSize: "Font Size",
        textColor: "Text Color",
        imageFile: "Watermark Image",
        pickImageFile: "Choose Watermark Image",
        imageFileNotSelected: "No watermark image selected",
        imageScale: "Image Scale (%)",
        opacity: "Opacity",
        margin: "Margin (px)",
        rotation: "Rotation",
        position: "Position",
        tip: "The first release applies one shared config to all images. Use light text or a transparent PNG logo for best results.",
        defaultText: "Watermark"
      },
      positions: {
        topLeft: "Top Left",
        topCenter: "Top Center",
        topRight: "Top Right",
        middleLeft: "Middle Left",
        center: "Center",
        middleRight: "Middle Right",
        bottomLeft: "Bottom Left",
        bottomCenter: "Bottom Center",
        bottomRight: "Bottom Right",
        custom: "Custom"
      },
      preview: {
        resetPosition: "Reset Position",
        imagePlaceholder: "Choose a watermark image first",
        emptyTitle: "No Preview Image",
        emptyDesc: "Add an image to preview the watermark effect here.",
        noneSelected: "No image selected"
      },
      upload: {
        dropTitle: "Drag images here or click to add",
        dropDesc: "PNG / JPG / JPEG / WEBP / BMP supported, auto dedupe with serial processing",
        button: "Add Images"
      },
      hints: {
        pickImagesFailed: "Could not pick images: {message}",
        cannotOpenImagePicker: "Could not open the image picker",
        noOutputDirectory: "No output folder is available to open yet",
        openOutputDirectoryFailed: "Could not open output folder: {message}",
        watermarkImageUnsupportedFormats: "Watermark images must be PNG, WEBP, JPG, or JPEG",
        pickWatermarkImageFailed: "Could not pick watermark image: {message}",
        cannotOpenWatermarkPicker: "Could not open the watermark image picker",
        dragDropNoLocalPath: "Drag-and-drop did not provide a local path. Use \"{pickImages}\" to add files instead.",
        modeSwitchedReprocess: "Watermark mode changed; you can run the task again",
        enterWatermarkTextBeforeStart: "Enter watermark text before processing",
        unsupportedImageFormats: "Only PNG, JPG, JPEG, WEBP, and BMP are supported",
        fileAlreadyInQueue: "These files are already in the task list",
        scanSourceDirectoryFailed: "Could not scan folder: {message}"
      },
      alerts: {
        watermarkTextRequired: "Watermark text cannot be empty. Enter text and try again."
      },
      errors: {
        processFailed: "Processing failed",
        openOutputDirectoryFailed: "Could not open output folder",
        scanSourceDirectoryFailed: "Could not scan folder"
      },
      task: {
        running: "Applying watermark",
        completed: "Finished"
      },
      status: {
        idle: "Pending",
        running: "Processing",
        completed: "Completed",
        failed: "Failed"
      },
      result: {
        title: "Execution Result",
        total: "Total",
        success: "Success",
        failed: "Failed",
        elapsed: "Elapsed"
      }
    }
  },
  toolCategory: {
    image: "Image Tools",
    video: "Video Tools",
    document: "Document Tools",
    ocr: "OCR Tools"
  },
  tools: {
    imageResize: {
      name: "Image Resize",
      description: "Batch resize image dimensions."
    },
    imageUpscale: {
      name: "Image Upscale",
      description: "Planned: local clarity enhancement; no processing entry in this build."
    },
    imageWatermarkRemoval: {
      name: "Image watermark removal",
      description: "Planned: local watermark removal for still images only; no processing entry in this build."
    },
    videoWatermarkRemoval: {
      name: "Video watermark removal",
      description: "Planned: local watermark removal for video; no processing entry in this build."
    }
  }
} as const;
