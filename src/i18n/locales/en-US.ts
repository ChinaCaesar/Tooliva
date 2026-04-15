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
    backToHome: "Back to Home",
    save: "Save",
    noData: "No Data",
    active: "Active",
    history: "History"
  },
  pages: {
    home: {
      topBar: {
        appName: "Toolbox",
        searchPlaceholder: "Search tools...",
        userName: "Username",
        userRole: "VIP Member"
      },
      sections: {
        coreTools: {
          title: "Core Tools",
          description: "Professional toolkits that improve your workflow efficiency"
        },
        recentUsage: {
          title: "Recent Usage"
        },
        usageStats: {
          title: "Usage Stats"
        },
        quickActions: {
          title: "Quick Actions"
        }
      },
      tools: {
        imageCompress: {
          title: "Image Compression",
          description: "Fast and lossless compression"
        },
        videoConvert: {
          title: "Video Format Convert",
          shortTitle: "Video Convert",
          description: "Support multiple formats"
        },
        imageUpscale: {
          title: "Image Upscale",
          shortTitle: "Image Enhance",
          description: "AI-powered enhancement"
        },
        comingSoon: "More tools coming soon"
      },
      membership: {
        title: "VIP Member",
        currentLevelLabel: "Current Level",
        currentLevelValue: "Gold Member",
        expiryLabel: "Expiry Date",
        renewButton: "Renew & Upgrade"
      },
      stats: {
        filesToday: "Files processed today",
        storage: "Storage"
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
        versionPrefix: "Version",
        feedback: "Feedback",
        helpCenter: "Help Center"
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
      title: "Application Settings",
      languageSection: "Language Settings"
    },
    membership: {
      title: "Membership Center",
      description: "Authorization and membership capabilities can be added later."
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
    }
  }
} as const;
