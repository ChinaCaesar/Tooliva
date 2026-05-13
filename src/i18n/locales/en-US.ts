export const enUS = {
  app: {
    title: "Desktop Toolbox"
  },
  nav: {
    home: "Home",
    tools: "Tools",
    favorites: "Favorites",
    tasks: "Tasks",
    settings: "Settings",
    membership: "Membership"
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
    sourceDirectoryNoNewFiles: "Folder scan finished, but no new supported files were found."
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
        history: "History",
        settings: "Settings"
      },
      placeholders: {
        allTools: "The full tools directory will arrive in a future release.",
        audio: "Audio tools are not available yet.",
        copywriting: "Copywriting tools are not available yet.",
        file: "File utilities are not available yet.",
        efficiency: "Productivity tools are not available yet.",
        moreTools: "More tools will be available in a future release.",
        history: "History center will be available in a future release."
      }
    }
  },
  pages: {
    home: {
      greeting: {
        morning: "Good morning, creator! 👋",
        afternoon: "Good afternoon, creator! 👋",
        evening: "Good evening, creator! 👋",
        night: "It's late — get some rest. 🌙"
      },
      dialogs: {
        placeholderTitle: "Notice"
      },
      featured: {
        useNow: "Use now"
      },
      topBar: {
        appName: "Toolbox",
        tagline: "Your helper for creator workflows",
        searchPlaceholder: "Search tools (e.g. image compress, video convert)",
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
          subtitle: "Create efficiently — start with the right tools."
        },
        valueProps: {
          title: "Local-first, private, and efficient"
        },
        recentUsage: {
          title: "Recent usage",
          viewAll: "View all >"
        },
        usageStats: {
          title: "Usage Stats"
        },
        quickActions: {
          title: "Quick Actions"
        },
        sidebar: {
          security: {
            title: "Local processing, safer workflow",
            points: {
              local: "Media tasks run locally by default — not uploaded to the cloud",
              files: "History and thumbnails stay in your local database",
              offline: "Core tools remain usable offline once installed",
              encryption: "Sensitive paths follow OS permissions and sandbox rules"
            }
          },
          membership: {
            title: "Member benefits",
            learnMore: "Learn more",
            cta: "Go premium",
            points: {
              priority: "Early access to new tools and templates",
              templates: "Unlock advanced presets and batch flows",
              batch: "Higher concurrency and queue priority (planned)",
              support: "Priority support (planned)"
            }
          },
          changelog: {
            title: "Changelog",
            viewAll: "View all",
            viewAllHint: "Full release notes will arrive in a future update.",
            v100: {
              date: "2026-05-01",
              summary: "Dashboard refresh with clearer local tool entry points."
            },
            v090: {
              date: "2026-04-12",
              summary: "Improved image compression and home entry experience."
            }
          }
        }
      },
      placeholders: {
        moreTools: "More tools are on the way.",
        viewAllRecent: "Full history will live in the task center."
      },
      tools: {
        imageCompress: {
          title: "Image Compression",
          description: "Fast and lossless compression"
        },
        removedTool: {
          shortTitle: "History (removed tool)"
        },
        imageUpscale: {
          title: "Image Upscale",
          shortTitle: "Image Enhance",
          description: "Local upscaling is planned; you can open this page for the current notice."
        },
        imageWatermark: {
          title: "Image Watermark",
          shortTitle: "Watermark",
          description: "Batch add text or logo watermark"
        },
        imageWatermarkRemoval: {
          title: "Remove watermark",
          shortTitle: "Remove watermark",
          description: "Detect and soften watermark regions locally (planned)"
        },
        moreTools: {
          title: "Explore more",
          description: "Coming soon",
          exploreTitle: "Explore more tools…",
          exploreSubtitle: "Stay tuned"
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
        usedJustNow: "Used just now",
        usedYesterday: "Yesterday",
        emptyStateTitle: "No recent usage yet",
        emptyStateHint: "Pick any tool below and run a task — your latest tools will show up here. Everything stays on your device."
      },
      quickActions: {
        history: "History",
        favorites: "Favorite Tools",
        documentManager: "Document Manager"
      },
      relativeTime: {
        twoMinutesAgo: "2 minutes ago",
        fifteenMinutesAgo: "15 minutes ago",
        oneHourAgo: "1 hour ago"
      },
      footer: {
        copyright: "© 2024 Toolbox",
        versionPrefix: "Current version",
        slogan: "Make creation more efficient, make life simpler",
        feedback: "Feedback",
        helpCenter: "Help Center"
      },
      valueProps: {
        local: {
          title: "Local processing",
          description: "Run media jobs offline by default"
        },
        privacy: {
          title: "Privacy-first",
          description: "Files stay within your machine"
        },
        offline: {
          title: "Offline friendly",
          description: "Core tools work without a network"
        },
        speed: {
          title: "Fast and stable",
          description: "Local compute, instant output"
        },
        updates: {
          title: "Continuous updates",
          description: "Tools and UX keep improving"
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
        checkUpdatesHint: "Online update checks are not connected yet.",
        terms: "Terms of use",
        privacyPolicy: "Privacy policy",
        termsPlaceholder: "Terms content will be linked or embedded in a future release.",
        privacyPlaceholder: "Privacy policy content will be linked or embedded in a future release.",
        copyright: "© Desktop Toolbox"
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
        cta: "Subscribe",
        subscribePlaceholderTitle: "Notice",
        subscribePlaceholder: "Plan: {plan}. Payments are not connected yet—no charge will be made."
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
        included: "Included"
      },
      aside: {
        ariaLabel: "Membership supplements",
        paymentTitle: "Secure payments",
        paymentBody: "Encrypted checkout with extra checks to keep every transaction safe.",
        faqTitle: "FAQ",
        faqViewAll: "View all",
        faqExpand: "Show answer",
        contactTitle: "Contact us",
        contactHours: "Support hours: weekdays 9:00–18:00",
        contactEmailLabel: "Email: ",
        contactEmail: "support@toolbox.com"
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
      },
      faqViewAllPlaceholder: "A full FAQ page will ship in a future release—this is a placeholder."
    },
    imageCompress: {
      title: "Image Compression",
      description: "Supports batch import, quality tuning and format output. Default output is /compress/ under source folders.",
      fileListTitle: "Compression tasks",
      clearList: "Clear list",
      deleteSelected: "Delete selected",
      remove: "Delete",
      start: "Start compression",
      processing: "Compressing...",
      taskRunning: "Compressing image",
      taskDone: "Done",
      listOverflowTip: "Only first 200 items are displayed. Remaining {count} items will continue processing in background.",
      source: {
        title: "Input source",
        pickImages: "Add images",
        pickDirectory: "Choose folder",
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
        dropTitle: "Drag images here, or click the empty area to add",
        dropDesc: "PNG / JPG / JPEG / WEBP / BMP supported; mixed formats in one batch.",
        formatsLine: "PNG / JPG / JPEG / WEBP / BMP — mixed formats supported",
        button: "Add images",
        addFolder: "Add folder"
      },
      empty: {
        title: "No images yet",
        desc: "Add images to start compression."
      },
      table: {
        selectAll: "Select all visible rows",
        selectRow: "Select this row",
        fileName: "Filename",
        originalSize: "Original size",
        resolution: "Resolution",
        compressedSize: "Compressed size",
        status: "Status",
        operation: "Actions",
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
    imageUpscale: {
      title: "Image Upscale",
      description:
        "This tool will offer offline-friendly image clarity improvements; the current release does not expose processing yet.",
      comingSoon: "Under development. Models and batch jobs will arrive in a future update."
    },
    imageWatermarkRemoval: {
      title: "Remove watermark",
      description:
        "This tool will detect and process watermark regions on-device; the current release does not expose processing yet.",
      comingSoon: "Under development. Algorithms and batch jobs will arrive in a future update."
    },
    login: {
      chromeAria: "Login page header actions",
      brandName: "Toolbox",
      brandTagline: "A helpful companion for self-media creators",
      heroTitlePrefix: "Create efficiently, ",
      heroTitleAccent: "stand out with ease",
      heroSubtitle: "One-stop self-media toolbox to help creators work faster",
      feature1Title: "Local processing",
      feature1Desc: "Files are not uploaded to servers",
      feature2Title: "Privacy first",
      feature2Desc: "Your data stays on this device",
      feature3Title: "Fast and stable",
      feature3Desc: "Quick processing with strong performance",
      cardTitle: "Welcome to Toolbox",
      cardSubtitle: "Sign in to sync membership benefits and unlock more features",
      tabsAria: "Sign-in method",
      tabSms: "SMS code",
      tabPassword: "Password",
      phoneLabel: "Phone number",
      phonePlaceholder: "Enter phone number",
      codeLabel: "Verification code",
      codePlaceholder: "Enter verification code",
      passwordLabel: "Password",
      passwordPlaceholder: "Enter password",
      getCode: "Get code",
      agreePrefix: "I have read and agree to the ",
      terms: "User Agreement",
      agreeMid: " and ",
      privacy: "Privacy Policy",
      agreeHint: "You must accept the agreement before tapping “Sign in now”.",
      submit: "Sign in now",
      otherMethods: "Other sign-in methods",
      wechatLogin: "WeChat",
      noAccount: "No account yet? ",
      registerNow: "Register",
      footerSafe: "All tools run locally — safe and reliable",
      errors: {
        phoneRequired: "Please enter your phone number",
        phoneInvalid: "Enter a valid 11-digit China mainland mobile number starting with 1",
        codeRequired: "Please enter the verification code",
        passwordRequired: "Please enter your password"
      },
      submitSuccessTitle: "Simulated sign-in",
      submitSuccessMessage: "Taking you home (no real auth yet — frontend simulation only).",
      otpPlaceholderTitle: "Verification code",
      otpPlaceholderMessage: "SMS verification is not available yet — coming in a future release.",
      wechatPlaceholderTitle: "WeChat sign-in",
      wechatPlaceholderMessage: "WeChat sign-in is not available yet.",
      registerPlaceholderTitle: "Registration",
      registerPlaceholderMessage: "Registration is not available yet.",
      termsPlaceholderTitle: "User Agreement",
      privacyPlaceholderTitle: "Privacy Policy",
      policyPlaceholderMessage: "Full policy links will be provided in a future release."
    },
    imageWatermark: {
      title: "Image Watermark",
      description: "Supports batch import and applies a unified text watermark or logo watermark to images.",
      fileListTitle: "Watermark Tasks",
      clearList: "Clear List",
      remove: "Remove",
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
        tip: "The first release applies one shared config to all images. Use light text or a transparent PNG logo for best results."
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
      name: "Remove watermark",
      description: "Planned: local watermark removal and repair; no processing entry in this build."
    }
  }
} as const;
