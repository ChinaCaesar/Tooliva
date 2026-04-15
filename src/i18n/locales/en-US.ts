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
      }
    },
    membership: {
      title: "Membership Center",
      description: "Authorization and membership capabilities can be added later."
    },
    videoConvert: {
      title: "Video Format Convert",
      searchPlaceholder: "Search conversion history...",
      upload: {
        title: "Upload Video Files",
        dropTitle: "Drag video files here or click to upload",
        dropDesc: "Supports up to 2GB, 1080p and below is recommended",
        button: "Select File"
      },
      outputFormatTitle: "Choose Output Format",
      fileListTitle: "Conversion File List",
      saveAs: "Save As",
      saveAsTarget: "Save As Target",
      retry: "Retry",
      cancel: "Cancel",
      remove: "Remove",
      converting: "Converting...",
      outputMode: {
        groupLabel: "Output Directory Selection",
        sameAsInput: "Output to source directory",
        sameAsInputDesc: "Save each converted file next to its original input video.",
        globalDirectory: "Output to selected directory",
        globalDirectoryDesc: "Save all converted files in one central directory for easier management.",
        chooseDirectory: "Choose Directory",
        notSelected: "No output directory selected"
      },
      status: {
        idle: "Pending",
        running: "Converting",
        completed: "Completed",
        failed: "Failed",
        cancelled: "Cancelled"
      },
      convertSettingsTitle: "Conversion Settings",
      convertSettings: {
        resolution: "Resolution",
        bitrate: "Video Bitrate",
        frameRate: "Frame Rate",
        audioQuality: "Audio Quality",
        bitrateValue: "8000 kbps",
        bitrateLow: "Low",
        bitrateHigh: "High",
        frameRateValue: "30 fps",
        audioQualityValue: "192 kbps",
        resolution4k: "4K (3840x2160)",
        resolution1080: "1080p (1920x1080)",
        resolution720: "720p (1280x720)",
        resolution480: "480p (854x480)"
      },
      outputFormat: {
        mp4: "H.264 Encode",
        avi: "General Format",
        mov: "QuickTime",
        mkv: "HD Container",
        wmv: "Windows",
        flv: "Streaming"
      },
      startConvert: "Start Convert",
      quickPreset: {
        title: "Quick Presets",
        high: { title: "High Quality", desc: "Best visual quality" },
        standard: { title: "Standard", desc: "Balanced choice" },
        small: { title: "Small Size", desc: "Save storage space" }
      },
      history: {
        title: "Conversion History",
        viewAll: "View All"
      },
      tips: {
        title: "Conversion Tips",
        item1: "MP4 has the best compatibility",
        item2: "1080p fits most use cases",
        item3: "Higher bitrate means better quality",
        item4: "Keep original frame rate when possible"
      },
      progress: {
        title: "Conversion Progress",
        status: "Processing...",
        done: "65% done",
        remaining: "Estimated 2m 15s remaining",
        fileName: "sample_video.avi → sample_video.mp4",
        speed: "Convert Speed: 1.2x",
        time: "Elapsed: 3m 45s",
        size: "File Size: 245MB → Estimated 180MB"
      },
      footer: {
        left: "© 2024 Toolbox",
        version: "Version v1.0.0",
        formatGuide: "Format Guide",
        advanced: "Advanced Settings"
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
    }
  }
} as const;
