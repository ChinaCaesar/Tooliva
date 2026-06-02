export const zhCN = {
  app: {
    title: "Tooliva"
  },
  nav: {
    home: "首页",
    tools: "工具页",
    favorites: "收藏页",
    tasks: "任务中心",
    settings: "设置页",
    membership: "会员页"
  },
  auth: {
    websiteAccountLogin: "使用官网账号登录",
    websiteLoginTitle: "已在浏览器打开授权页",
    websiteLoginMessage: "请在浏览器中完成登录与授权，完成后将自动返回桌面端。",
    websiteLoginFailedTitle: "无法打开浏览器",
    websiteLoginFailedMessage: "请检查系统浏览器是否可用，或稍后重试。",
    websiteOpenFailedTitle: "无法打开官网",
    websiteOpenFailedMessage: "请检查系统浏览器是否可用，或稍后重试。",
    loggedInVia: "通过 {provider} 登录",
    logout: "退出登录",
    provider: {
      wechat: "微信",
      google: "Google",
      github: "GitHub",
      email: "邮箱"
    },
    membership: {
      noExpiry: "永久有效",
      expiresAt: "到期 {date}"
    },
    userProfile: {
      title: "账号信息",
      signInAria: "登录",
      viewAccountAria: "查看账号",
      close: "关闭",
      accountIdLabel: "账号 ID",
      emailLabel: "邮箱",
      providerLabel: "登录方式",
      membershipLabel: "会员等级",
      expiryLabel: "到期时间",
      noMembership: "暂无会员",
      notProvided: "未提供",
      unknownProvider: "未知方式",
      manageAccount: "管理账号"
    }
  },
  common: {
    language: "语言",
    theme: "主题",
    outputDirectory: "默认输出目录",
    back: "返回",
    backToHome: "返回首页",
    save: "保存",
    noData: "暂无数据",
    active: "进行中",
    history: "历史",
    total: "总数",
    success: "成功",
    failed: "失败",
    elapsed: "耗时",
    taskCompleteTitle: "任务已完成",
    taskCompleteMessage: "{tool}已处理完成，共 {total} 项，成功 {success} 项，失败 {failed} 项，用时 {elapsed}。",
    sourceDirectoryReady: "已选择目录，开始执行时将自动检索当前任务可处理的文件。",
    sourceDirectoryNoMatch: "所选目录中未找到当前任务可处理的文件。",
    sourceDirectoryNoNewFiles: "目录扫描完成，没有发现新的可处理文件。",
    outputMode: "输出模式",
    outputModes: {
      source: "源目录",
      custom: "自定义目录",
      overwrite: "覆盖原图"
    },
    entitlement: {
      needLogin: "当前免费额度已用完，升级会员后可继续使用该功能。是否前往会员中心？",
      noEntitlement: "当前免费额度已用完，升级会员后可继续使用该功能。是否前往会员中心？",
      serviceError: "当前免费额度已用完，升级会员后可继续使用该功能。是否前往会员中心？",
      loginDialogTitle: "需要登录",
      loginDialogConfirm: "去登录",
      loginDialogCancel: "关闭",
      upgradeDialogTitle: "导出权益不足",
      upgradeDialogMessage: "当前免费额度已用完，升级会员后可继续使用该功能。是否前往会员中心？",
      upgradeConfirm: "去升级",
      upgradeCancel: "稍后再说"
    }
  },
  aiEnhancement: {
    panelTitle: "AI 组件状态",
    simpleStatus: {
      installed: "AI 增强组件已安装",
      notInstalled: "AI 增强组件未安装"
    },
    runtimeStatus: {
      DISABLED: "AI 增强组件未启用",
      NOT_INSTALLED: "AI 增强组件未安装",
      CHECKING: "正在检查 AI 环境",
      ENV_NOT_SUPPORTED: "当前设备不满足 AI 安装条件",
      READY_TO_INSTALL: "可安装 AI 增强组件",
      DOWNLOADING: "正在准备 AI 增强组件包",
      VERIFYING: "正在校验 AI 增强组件",
      INSTALLING: "正在安装 AI 增强组件",
      INSTALLED: "AI 增强组件已安装",
      UPDATE_AVAILABLE: "AI 增强组件有可用更新",
      FAILED: "AI 增强组件操作失败"
    },
    installHintDefault: "请先导入本地 AI 组件包，或将离线文件放到应用数据目录。",
    requirements: "需要 {os}、至少 {memory} GB 可用内存，以及 {disk} GB 可用磁盘空间。",
    requirementsOs: "Windows 10/11 64 位",
    modelStatus: {
      ready: "LaMA 模型已就绪",
      notImported: "LaMA 模型未导入"
    },
    actions: {
      installRuntime: "安装 AI 增强组件",
      upgradeRuntime: "一键升级 AI 组件",
      retry: "重试",
      importModel: "导入 LaMA 模型",
      importingModel: "正在导入模型...",
      viewGuide: "查看官网教程"
    },
    installProgress: {
      preparing: "正在准备 AI 组件…",
      extracting: "正在解压运行时文件…",
      organizing: "正在整理依赖资源…",
      largePackage: "资源较大，仍在努力安装中…"
    },
    overlay: {
      processingTitle: "AI 增强组件处理中",
      patienceHint: "任务内容加大，请耐心等待",
      replacingRuntime: "正在更换 AI 增强组件…"
    },
    errors: {
      modelMissing: "未检测到 LaMA 模型，请先导入 big-lama.pt。目标目录：{path}",
      notReady: "AI 增强组件尚未就绪，请先安装或升级。",
      selectPackageFirst: "请选择本地 AI 组件包（zip）后再导入。",
      envNotSupported: "当前设备不满足 AI 增强组件安装条件。"
    },
    dialog: {
      runtimePackage: "AI Runtime Package",
      lamaModel: "LaMA Model"
    },
    engine: {
      fastLocal: "本地极速修复",
      aiEnhanced: "AI 增强修复"
    }
  },
  layout: {
    appShell: {
      sidebarAria: "应用主导航",
      primaryNavAria: "功能导航",
      secondaryNavAria: "账户与系统",
      placeholderTitle: "提示",
      windowControlsAria: "窗口控制",
      minimizeAria: "最小化窗口",
      maximizeAria: "最大化或还原窗口",
      closeAria: "关闭窗口",
      collapseSidebar: "收起侧栏",
      expandSidebar: "展开侧栏",
      nav: {
        backToPrevious: "返回上一级",
        home: "首页",
        allTools: "全部工具",
        categoryImage: "图片工具",
        categoryVideo: "视频工具",
        categoryAudio: "音频工具",
        categoryCopy: "文案工具",
        categoryFile: "文件工具",
        categoryEfficiency: "效率工具",
        moreTools: "更多工具",
        membership: "会员中心",
        membershipSubtitle: "尊享全部高级功能",
        settings: "设置"
      },
      placeholders: {
        allTools: "全部工具列表将在后续版本提供。",
        audio: "音频工具尚未接入，敬请期待。",
        copywriting: "文案工具尚未接入，敬请期待。",
        file: "文件工具尚未接入，敬请期待。",
        efficiency: "效率工具尚未接入，敬请期待。",
        moreTools: "更多工具入口将在后续版本开放。"
      },
      externalNav: {
        opening: "正在为您打开浏览器…"
      }
    }
  },
  pages: {
    watermarkRemoval: {
      mode: {
        title: "处理模式",
        ariaLabel: "处理模式",
        fast: "极速模式",
        ai: "AI 增强模式",
        fastHintImage:
          "极速模式无需下载 AI 组件，所有处理均在本地完成，适合简单背景、纯色背景、边角水印和小面积水印。",
        fastHintVideo: "无需下载 AI 组件，适合简单背景、纯色背景、边角水印和小面积水印。",
        aiHintImage:
          "AI 增强模式需要安装本地 AI 组件，适合复杂背景和更自然的修复效果。组件体积较大，仅需安装一次，文件不会上传服务器。",
        aiHintVideo: "适合复杂背景和更自然的修复效果。组件仅安装一次，文件不会上传服务器。"
      },
      aiComponentStatus: "AI 组件状态"
    },
    home: {
      greeting: {
        morning: "早上好，创作者！",
        afternoon: "下午好，创作者！",
        evening: "晚上好，创作者！",
        night: "夜深了，注意休息！"
      },
      dialogs: {
        placeholderTitle: "提示"
      },
      featured: {
        useNow: "立即使用"
      },
      topBar: {
        appName: "Tooliva",
        tagline: "自媒体创作好帮手",
        searchPlaceholder: "搜索工具（例如：图片压缩、视频转 GIF）",
        searchShortcut: "Ctrl K",
        searchShortcutMac: "⌘ K",
        memberCta: "开通会员",
        settingsAria: "打开设置",
        userName: "用户名",
        userRole: "VIP会员"
      },
      sections: {
        coreTools: {
          title: "核心工具",
          description: "专业级工具集合，提升您的工作效率"
        },
        greeting: {
          subtitle: "高效创作，从合适的工具开始"
        },
        valueProps: {
          title: "全本地处理，安全高效"
        },
        recentUsage: {
          title: "最近使用",
          viewAll: "查看全部"
        },
        usageStats: {
          title: "使用统计"
        },
        quickActions: {
          title: "快捷操作"
        },
        sidebar: {
          security: {
            title: "本地处理，安全高效",
            points: {
              local: "所有工具均在本地运行",
              files: "文件与数据不上传服务器",
              privacy: "处理与导出全程本地完成",
              offline: "需登录授权，不支持离线使用",
              fast: "本地处理更安心"
            }
          },
          membership: {
            title: "会员权益",
            learnMore: "了解更多",
            cta: "开通会员",
            points: {
              unlimited: "核心工具与高级功能不限次使用",
              batch: "月付、年付及终身会员共享核心权益",
              noAds: "高频工具支持更高配额",
              support: "批量处理与 AI 功能持续增强",
              futureFree: "登录后自动同步会员权益"
            }
          },
          changelog: {
            title: "更新日志",
            viewAll: "查看全部",
            v100: {
              date: "2024-05-20",
              summary: "Tooliva 新版本上线"
            },
            v090: {
              date: "2024-05-15",
              summary: "优化用户体验，修复已知问题"
            }
          }
        }
      },
      placeholders: {
        toolUnavailable: "该工具暂不可用。",
        viewAllRecent: "完整历史将在任务中心提供。"
      },
      tools: {
        imageCompress: {
          title: "图片压缩",
          shortTitle: "图片压缩",
          description: "批量压缩图片\n保持高清画质"
        },
        gifCompress: {
          title: "GIF 压缩",
          shortTitle: "GIF 压缩",
          description: "批量压缩动图\n减小体积"
        },
        videoToGif: {
          title: "视频转 GIF",
          shortTitle: "视频转 GIF",
          description: "截取片段\n导出动图"
        },
        removedTool: {
          shortTitle: "历史记录（已下线工具）"
        },
        imageUpscale: {
          title: "图片高清放大",
          shortTitle: "图片高清放大",
          description: "提升清晰度与细节\n本地离线处理"
        },
        imageWatermark: {
          title: "图片加水印",
          shortTitle: "图片加水印",
          description: "批量添加文字或\nLogo水印"
        },
        imageWatermarkRemoval: {
          title: "图片去水印",
          shortTitle: "图片去水印",
          description: "识别并弱化静态图片中的水印区域（规划中）"
        },
        videoWatermarkRemoval: {
          title: "视频去水印",
          shortTitle: "视频去水印",
          description: "识别并弱化视频画面中的水印区域（规划中）"
        }
      },
      membership: {
        title: "VIP会员",
        currentLevelLabel: "当前等级",
        currentLevelValue: "黄金会员",
        expiryLabel: "到期时间",
        renewButton: "续费升级"
      },
      stats: {
        totalUsageCount: "累计使用次数",
        todayUsageCount: "今日使用次数",
        totalSavedMinutes: "累计节省时间",
        todaySavedMinutes: "今日节省时间"
      },
      recent: {
        justNow: "刚刚",
        usedJustNow: "刚刚使用",
        usedYesterday: "昨天",
        usedTwoDaysAgo: "2天前",
        emptyStateTitle: "暂无最近使用",
        emptyStateHint: "试用上方任意工具，使用记录会显示在这里。"
      },
      quickActions: {
        history: "历史记录",
        favorites: "收藏工具",
        documentManager: "文档管理"
      },
      relativeTime: {
        twoMinutesAgo: "2分钟前",
        fifteenMinutesAgo: "15分钟前",
        oneHourAgo: "1小时前",
        twoDaysAgo: "2天前"
      },
      footer: {
        copyright: "© 2024 Tooliva",
        versionPrefix: "当前版本",
        slogan: "让创作更高效，让生活更简单",
        feedback: "意见反馈",
        helpCenter: "帮助中心"
      },
      valueProps: {
        local: {
          title: "本地运行",
          description: "文件与数据不上传服务器"
        },
        privacy: {
          title: "隐私优先",
          description: "处理与导出全程本地完成"
        },
        offline: {
          title: "安全授权",
          description: "需登录授权，不支持离线使用"
        },
        speed: {
          title: "本地处理",
          description: "不经云端，使用更安心"
        },
        updates: {
          title: "持续更新",
          description: "会员能力与工具功能持续增强"
        }
      }
    },
    tools: {
      title: "工具列表"
    },
    favorites: {
      title: "我的收藏"
    },
    tasks: {
      title: "任务中心",
      createDemoTask: "创建演示任务",
      demoMessage: "处理中"
    },
    settings: {
      title: "设置中心",
      languageSection: "语言设置",
      headerTitle: "设置中心",
      searchPlaceholder: "搜索设置项...",
      userName: "用户名",
      userRole: "VIP会员",
      restartTipTitle: "提示",
      restartTipDesc: "修改设置后部分功能需要重启应用才能生效",
      restartApp: "重启应用",
      aboutDesc: "专业的多功能工具平台",
      currentVersion: "当前版本",
      checkUpdates: "检查更新",
      menu: {
        general: "通用设置",
        tools: "工具设置",
        account: "账户设置",
        notifications: "通知设置",
        privacy: "隐私设置",
        about: "关于应用"
      },
      actions: {
        simplifiedChinese: "简体中文",
        on: "已开启",
        off: "已关闭",
        browse: "浏览",
        change: "修改",
        replace: "更换",
        chooseFolder: "选择目录",
        every5Minutes: "每 5 分钟",
        standard: "标准模式",
        concurrency4: "4 并发",
        dailyOnce: "每天一次",
        scale100: "100%",
        updatePassword: "更新密码",
        manageBindings: "管理绑定"
      },
      general: {
        languageTitle: "语言选择",
        languageDesc: "选择您的首选语言",
        windowSizeTitle: "应用窗口尺寸",
        windowSizeDesc: "切换后会立即保存，并在下次打开软件时自动恢复。",
        windowSizeSmallTitle: "小",
        windowSizeSmallDesc: "适合小屏笔记本",
        windowSizeMediumTitle: "中",
        windowSizeMediumDesc: "默认档，最均衡",
        windowSizeLargeTitle: "大",
        windowSizeLargeDesc: "适合大屏和更宽工作区",
        darkModeTitle: "深色模式",
        darkModeDesc: "切换到深色主题保护眼睛",
        autoLaunchTitle: "开机自动启动",
        autoLaunchDesc: "系统启动时自动运行应用",
        scaleTitle: "界面缩放",
        scaleDesc: "调整界面显示大小",
        defaultSaveTitle: "默认保存位置",
        defaultSaveDesc: String.raw`C:\Users\Username\Documents\ToolBox`
      },
      tools: {
        outputPathTitle: "默认输出路径",
        outputPathDesc: String.raw`C:\Users\Username\Documents\ToolBox\Output`,
        autoSaveTitle: "自动保存",
        autoSaveDesc: "定时自动保存处理结果",
        qualityTitle: "处理质量等级",
        qualityDesc: "选择处理速度与质量的平衡",
        concurrentTitle: "并发处理数量",
        concurrentDesc: "同时处理的文件数量",
        cleanupTitle: "临时文件清理",
        cleanupDesc: "自动清理处理过程中产生的临时文件"
      },
      account: {
        profileTitle: "个人资料",
        profileDesc: "修改昵称、邮箱和头像",
        passwordTitle: "修改密码",
        passwordDesc: "更新当前账户密码",
        bindingTitle: "账号绑定",
        bindingDesc: "管理微信、Apple ID、QQ 等绑定状态"
      },
      notifications: {
        taskDoneTitle: "任务完成提醒",
        taskDoneDesc: "处理完成后发送通知",
        errorTitle: "错误警告",
        errorDesc: "处理出错时发送警告",
        updateTitle: "更新通知",
        updateDesc: "应用有新版本时通知",
        mailTitle: "邮件通知",
        mailDesc: "接收产品更新和活动信息"
      },
      aiModules: {
        sectionTitle: "AI 增强组件",
        guideTitle: "官网教程",
        guideDesc: "查看 AI 增强组件安装、导入模型与使用说明。",
        guideAction: "打开教程",
        pathModeTitle: "存储位置模式",
        pathModeDefault: "安装目录下",
        pathModeCustom: "自定义目录",
        pathModeDefaultDesc: "默认将 AI 运行时和模型存放到当前软件安装目录下的 ToolivaAI 文件夹中。",
        pathModeCustomDesc: "可分别指定 AI 运行时和模型目录，请确保所选目录具备写入权限。",
        runtimeStorageRootTitle: "AI 运行时存储目录",
        runtimeStorageRootDesc: "用于保存已导入运行时的清单、版本目录和 current 副本。",
        runtimeStorageEmptyHint: "请选择 AI 运行时存储目录。",
        modelsStorageRootTitle: "AI 模型存储目录",
        modelsStorageRootDesc: "用于保存已导入模型文件和 Torch 缓存。",
        modelsStorageEmptyHint: "请选择 AI 模型存储目录。",
        defaultRuntimeRootLabel: "默认运行时目录：{path}",
        defaultModelsRootLabel: "默认模型目录：{path}",
        restoreDefaultTitle: "恢复默认目录",
        restoreDefaultDesc: "切回软件安装目录下的默认 AI 存储方案。",
        restoreDefaultAction: "恢复默认目录",
        runtimeTitle: "AI 运行时",
        runtimeEmptyHint: "尚未安装 AI 运行时，可点击「更换」导入 zip 安装包。",
        modelTitle: "LaMA 模型",
        modelEmptyHint: "尚未导入 LaMA 模型，可点击「更换」选择 big-lama.pt 文件。",
        notInstalled: "未安装",
        replaceRuntimeConfirmTitle: "更换 AI 运行时",
        replaceRuntimeConfirmBody: "将删除当前已安装的 AI 运行时，并导入您选择的新安装包。此操作不可撤销，是否继续？",
        replaceModelConfirmTitle: "更换 LaMA 模型",
        replaceModelConfirmBody: "将删除当前已导入的 LaMA 模型文件，并导入您选择的新模型。此操作不可撤销，是否继续？",
        replaceFailedTitle: "更换失败"
      },
      privacy: {
        usageTitle: "使用数据收集",
        usageDesc: "帮助我们改进产品体验",
        crashTitle: "错误报告发送",
        crashDesc: "自动发送崩溃和错误报告",
        autoDeleteTitle: "文件自动删除",
        autoDeleteDesc: "处理完成后自动删除原文件"
      },
      path: {
        webNoPicker: "当前为浏览器预览环境，无法调用系统目录选择器。请在桌面版中使用。",
        webOpenUnavailable: "浏览器环境无法在资源管理器中打开本地目录，请使用桌面版。"
      },
      dashboard: {
        subtitle: "管理语言、主题、输出目录、更新与隐私相关选项。",
        sectionGeneral: "常规设置",
        sectionOutput: "输出设置",
        sectionCache: "缓存设置",
        sectionUpdates: "更新设置",
        themeTitle: "主题模式",
        themeDesc: "选择浅色、深色或跟随系统。",
        themeFollowSystem: "跟随系统",
        themeLight: "浅色",
        themeDark: "深色",
        minimizeTrayTitle: "最小化到系统托盘",
        minimizeTrayDesc: "关闭主窗口后保留托盘图标，可从托盘恢复或退出。",
        confirmCloseTitle: "关闭前确认",
        confirmCloseDesc: "点击关闭时弹出确认，避免误关。",
        closeConfirmQuitTitle: "退出应用",
        closeConfirmQuitMessage: "确定要退出 Tooliva 吗？正在进行的任务可能会被中断。",
        closeConfirmQuitConfirm: "退出",
        closeConfirmTrayTitle: "最小化到托盘",
        closeConfirmTrayMessage: "关闭后应用将最小化到系统托盘，可从托盘图标恢复窗口。",
        closeConfirmTrayConfirm: "最小化到托盘",
        closeConfirmCancel: "取消",
        trayMenuShow: "显示主窗口",
        trayMenuQuit: "退出",
        trayTooltip: "Tooliva",
        namingRuleTitle: "文件命名规则",
        namingRuleDesc: "输出文件的默认命名策略。",
        namingOriginal: "保留原始文件名",
        namingTimestamp: "时间戳前缀",
        outputEmptyHint: "请先在上方点击「更改」选择默认输出目录。",
        cacheDirTitle: "缓存目录",
        cacheDirDesc: "临时文件与预览缓存存放位置。",
        cacheTitle: "缓存",
        cacheSizeTitle: "缓存占用",
        cacheSizeDesc: "当前估算约 256.8 MB（示意数据，后续可接入真实统计）。",
        clearCache: "清除缓存",
        clearCacheHint: "缓存清理能力将在后续版本接入，当前为占位提示。",
        pathNotSet: "未设置",
        openFolder: "打开",
        pathHintTitle: "路径提示",
        updateMethodTitle: "更新渠道",
        updateMethodDesc: "选择稳定版或预览版更新来源。",
        updateStable: "稳定版",
        updateBeta: "预览版",
        checkFrequencyTitle: "检查频率",
        checkFrequencyDesc: "自动检查更新的节奏。",
        freqStartup: "启动时",
        freqDaily: "每天一次",
        freqWeekly: "每周一次",
        clearDataTitle: "清除本地数据",
        clearDataDesc: "清除本机使用记录（含最近使用）并重置所有偏好为默认值；不会删除已导出的文件。",
        clearData: "清除本地数据",
        clearDataModalTitle: "确认清除本地数据",
        clearDataModalBody:
          "将删除本机保存的工具最近使用记录，并将语言、主题、路径与任务相关偏好等全部恢复为初始默认值。此操作无法撤销；不会删除您已导出的文件。",
        clearDataModalAck: "我已了解上述后果，确认继续清除",
        clearDataModalCancel: "取消",
        clearDataModalConfirm: "确认清除",
        cacheEmptyHint: "请先在上方点击「更改」选择缓存目录。",
        updateProgressTitle: "检查更新中",
        updateCheckProgressStart: "正在准备检查当前版本信息…",
        updateCheckProgressNetwork: "正在连接更新服务并获取最新版本…",
        updateCheckProgressCompare: "正在比对当前版本与最新版本…",
        updateCheckProgressDone: "检查完成，正在整理结果…",
        updateAvailableTitle: "发现新版本",
        updateAvailableMessage: "检测到新版本 {version}，可立即下载安装。",
        updateAvailableDevMessage: "检测到新版本 {version}。当前为开发环境，仅验证检查结果，不执行真实更新。",
        updateAvailableUnsupportedMessage: "检测到新版本 {version}，但当前发布信息缺少可用下载地址，请稍后再试。",
        updateUpToDateTitle: "已是最新版本",
        updateUpToDateMessage: "当前版本 {version} 已是最新，无需更新。",
        updateCheckFailedTitle: "检查更新失败",
        updateCheckFailedMessage: "暂时无法获取更新信息，请稍后重试。",
        latestVersionLabel: "最新版本",
        releaseDateLabel: "发布日期",
        updateNow: "立即更新",
        downloadUpdateNow: "下载更新包",
        closeModal: "关闭",
        updateInstallProgressPrepare: "正在准备更新环境…",
        updateInstallProgressOpenLink: "正在准备更新安装器…",
        updateInstallProgressDownload: "正在下载更新包…",
        updateInstallProgressApply: "正在安装更新…",
        updateInstallProgressDone: "更新安装器已启动，即将开始安装…",
        autoUpdatePromptTitle: "发现新版本",
        autoUpdatePromptBody: "检测到新版本 {version}。是否现在开始下载并安装更新？",
        updateDownloadStartedTitle: "更新下载已开始",
        updateDownloadStartedMessage: "更新安装器已启动，应用即将退出并进入安装流程。",
        updateInstallFailedTitle: "更新安装失败",
        updateInstallBlockedByActiveTasks: "当前仍有进行中的任务，请等待任务完成后再安装更新。",
        updateInstallError: {
          dev_environment: "当前为开发环境，仅支持检查更新，不执行真实更新。",
          not_tauri: "当前环境不支持桌面端更新安装。",
          missing_download_url: "更新信息缺少下载地址，请稍后重试。",
          permission_denied: "当前环境缺少更新权限，请稍后重试。",
          network_error: "下载更新失败，请检查网络后重试。",
          download_corrupt: "下载的安装包无效或已损坏，请稍后重试或手动下载安装。",
          metadata_invalid: "更新元数据无效或签名校验失败，请联系管理员。",
          no_update: "当前暂无可安装的更新版本。",
          install_failed: "安装失败，请稍后重试或使用手动下载安装。"
        },
        terms: "用户协议",
        privacyPolicy: "隐私政策",
        termsPlaceholder: "用户协议正文将在后续版本提供链接或内嵌页面。",
        privacyPlaceholder: "隐私政策正文将在后续版本提供链接或内嵌页面。",
        copyright: "© Tooliva"
      }
    },
    membership: {
      title: "会员中心",
      description: "后续可接入授权策略和会员能力。",
      backToHome: "返回首页",
      hero: {
        title: "会员中心",
        subtitle: "开通会员，尊享全部高级功能",
        benefit1: "无限制使用全部工具",
        benefit2: "批量处理更高效",
        benefit3: "去除所有工具广告",
        benefit4: "专属客服优先支持",
        benefit5: "新功能优先体验",
        benefit6: "更多会员专属权益",
        visualAlt: "会员权益主题插画占位：皇冠与创作工具元素"
      },
      userCard: {
        notLoggedIn: "未登录",
        syncHint: "登录后同步会员权益",
        loginCta: "立即登录",
        loginPlaceholderTitle: "提示",
        loginPlaceholder: "登录与账号体系将在后续版本接入，当前为示意。"
      },
      plans: {
        sectionTitle: "选择会员套餐",
        badgeRecommended: "推荐",
        badgeSave16: "省16%",
        badgeSave46: "省46%",
        badgeValue: "超值",
        monthly: "月度会员",
        quarterly: "季度会员",
        annual: "年度会员",
        lifetime: "永久会员",
        monthlySub: "适合短期使用",
        quarterlySub: "适合季度使用",
        annualSub: "适合长期使用",
        lifetimeSub: "一次购买，永久使用",
        priceMonthly: "¥ 19.90",
        priceQuarterly: "¥ 49.90",
        priceAnnual: "¥ 129.90",
        priceLifetime: "¥ 299.00",
        cycleMonth: "/ 月",
        cycleQuarter: "/ 季度",
        cycleYear: "/ 年",
        monthlySecondary: "¥19.90 每月自动续费",
        quarterlySecondary: "¥16.63 / 月",
        annualSecondary: "¥10.83 / 月",
        lifetimeSecondary: "无需续费，一次买断",
        cta: "立即开通"
      },
      compare: {
        title: "会员权益对比",
        colFeature: "功能特权",
        colFree: "免费版",
        colMember: "会员版",
        colLifetime: "终身会员",
        rows: {
          unlimited: "不限次数使用",
          batch: "批量处理",
          ads: "免广告",
          support: "优先客服",
          early: "抢先体验",
          exclusive: "专属功能"
        },
        free: {
          limited: "每日有限额度",
          partial: "单次少量",
          withAds: "含推广位",
          standard: "工单排队"
        },
        member: {
          partialExclusive: "部分开放"
        },
        dash: "—",
        included: "包含该项权益",
        viewFull: "查看完整对比",
        viewFullAria: "在浏览器中查看完整会员权益对比"
      },
      aside: {
        ariaLabel: "会员中心补充说明",
        faqTitle: "常见问题",
        faqViewAll: "查看全部问题",
        faqExpand: "展开说明"
      },
      faq: {
        q1: {
          q: "开通后是否自动续费？",
          a: "可在后续版本中在账户中心管理续费与发票；当前页面为展示示意。"
        },
        q2: {
          q: "支持哪些支付方式？",
          a: "计划支持微信、支付宝等主流渠道，以实际上线为准。"
        },
        q3: {
          q: "会员可以在几台设备上使用？",
          a: "具体设备数与授权策略将在账号体系上线后公布。"
        },
        q4: {
          q: "购买后可以退款吗？",
          a: "退款规则将遵循支付渠道与平台政策，请以订单页说明为准。"
        }
      }
    },
    membershipDesktop: {
      eyebrow: "桌面端会员",
      title: "当前会员信息",
      subtitle: "查看当前会员状态、可购买套餐与会员权益对比。",
      refresh: "刷新",
      statusLabel: "当前状态",
      expiryLabel: "到期时间",
      purchaseLabel: "购买入口",
      buyNow: "购买",
      loginHint: "登录后可从账号服务同步当前会员状态。",
      loginCta: "立即登录",
      benefitsTitle: "会员说明",
      planSectionTitle: "会员套餐",
      planSectionSubtitle: "所有付费套餐共享同一套核心付费会员权益，主要区别在购买周期。",
      viewFullPricing: "查看完整价格",
      compareTitle: "会员权益对比",
      compareSubtitle: "免费会员有每日额度限制，付费会员解锁核心工具的不限次使用能力。",
      compareHeaders: {
        feature: "功能",
        free: "免费会员",
        paid: "付费会员",
        cycle: "购买周期"
      },
      compareRows: {
        imageCompress: { name: "图片压缩", free: "true", cycle: "月付 / 年付 / 终身" },
        gifCompress: { name: "GIF 压缩", free: "限额", cycle: "月付 / 年付 / 终身" },
        videoToGif: { name: "视频转 GIF", free: "false", cycle: "月付 / 年付 / 终身" },
        imageWatermarkRemoval: { name: "图片去水印", free: "false", cycle: "月付 / 年付 / 终身" },
        videoWatermarkRemoval: { name: "视频去水印", free: "false", cycle: "月付 / 年付 / 终身" },
        imageUpscale: { name: "图片高清放大", free: "false", cycle: "月付 / 年付 / 终身" },
        unlimitedBatch: { name: "无限批量任务", free: "false", cycle: "月付 / 年付 / 终身" },
        aiEnhanced: { name: "AI 增强处理能力", free: "true", cycle: "月付 / 年付 / 终身" },
        paidRights: { name: "付费权益一致性", free: "不适用", cycle: "不同周期权益一致" }
      },
      summary: {
        guestTitle: "未登录",
        guestDescription: "登录后可同步你的会员状态；也可以直接选择套餐完成购买。",
        freeTitle: "免费会员",
        freeDescription: "免费会员可体验核心功能，但每天有使用限额；需要无限次使用时可升级为付费会员。",
        paidTitle: "付费会员已生效",
        activeTitle: "{plan}已生效",
        paidDescription: "你的账号当前已拥有付费会员权益，核心工具可不限次使用。",
        lifetimeTitle: "终身会员已生效",
        lifetimeDescription: "你的账号当前已拥有终身付费会员权益。"
      },
      status: {
        guest: "游客",
        free: "免费会员",
        paid: "付费会员",
        lifetime: "终身会员"
      },
      plans: {
        currentPlan: "当前套餐"
      },
      planNames: {
        trial_monthly: "试用套餐",
        monthly: "月付付费会员",
        yearly: "年付付费会员",
        lifetime: "终身会员"
      },
      planSubtitles: {
        trial_monthly: "适合首次体验付费权益与完整工作流。",
        monthly: "适合希望按月灵活订阅的用户。",
        yearly: "适合长期使用、希望整体成本更优的创作者。",
        lifetime: "一次购买，长期享受付费会员权益。"
      },
      planFeatures: {
        trial_monthly: {
          feature1: "体验核心付费功能",
          feature2: "适合首次评估完整流程",
          feature3: "试用后可升级为正式套餐"
        },
        monthly: {
          feature1: "核心功能不限次使用",
          feature2: "适合高频月度工作流",
          feature3: "购买周期更灵活"
        },
        yearly: {
          feature1: "核心功能不限次使用",
          feature2: "长期使用整体更划算",
          feature3: "适合稳定持续的年度工作"
        },
        lifetime: {
          feature1: "核心功能不限次使用",
          feature2: "无需持续续费",
          feature3: "适合长期持有与重度使用"
        }
      },
      purchaseReasons: {
        already_lifetime: "当前账号已经是终身会员。",
        trial_already_used: "试用套餐已使用。",
        subscription_active_only_lifetime: "当前已有生效订阅，如需切换请先处理当前订阅。",
        current_plan: "该套餐已在当前账号生效。",
        plan_not_purchasable: "该套餐暂时不可购买。"
      },
      period: {
        monthly: "月付",
        yearly: "年付",
        lifetime: "终身",
        trial_monthly: "试用",
        one_time: "一次性"
      },
      errors: {
        planFetchFailed: "暂时无法加载套餐信息，请稍后重试。",
        membershipFetchFailed: "暂时无法加载当前会员状态，请稍后重试。",
        networkError: "网络连接异常，请检查网络后重试。",
        sessionExpired: "登录状态已失效，请重新登录后查看会员信息。"
      }
    },
    imageCompress: {
      title: "图片压缩",
      description: "支持批量导入、质量调节与格式输出，默认输出到源目录下的 /compress/ 文件夹。",
      fileListTitle: "图片列表",
      clearList: "清空列表",
      remove: "移除",
      removeAria: "从列表移除",
      list: {
        title: "图片列表",
        deleteSelected: "删除选中",
        emptyTitle: "暂无图片",
        emptyDesc: "添加图片后即可开始批量压缩。"
      },
      start: "开始压缩",
      processing: "压缩处理中...",
      taskRunning: "图片压缩中",
      taskDone: "处理完成",
      listOverflowTip: "当前仅展示前 200 条，剩余 {count} 条将在后台继续处理。",
      source: {
        title: "输入来源",
        pickImages: "添加图片",
        pickDirectory: "选择目录夹",
        dragHint: "支持将图片或文件夹直接拖入下方区域。",
        directoryNotSelected: "未选择目录，支持直接拖入图片"
      },
      output: {
        title: "输出目录",
        pickDirectory: "指定输出目录",
        hint: "默认写入每个文件源目录下的 /compress/ 文件夹。",
        defaultDirectory: "默认输出到每个文件源目录下的 /compress/ 文件夹"
      },
      footer: {
        saveTo: "保存至：",
        changeOutput: "更改",
        customOutput: "已指定输出目录",
        defaultOutput: "各文件源目录 /compress/"
      },
      settings: {
        title: "压缩设置",
        quality: "压缩质量",
        qualityLow: "体积小",
        qualityHigh: "质量高",
        format: "输出格式",
        formatAuto: "原格式",
        tip: "质量越高画质越好但体积更大；建议先用 JPG 80 或 WEBP 80。"
      },
      advanced: {
        title: "高级设置",
        resolution: "分辨率调整",
        resolutionOriginal: "保持原始尺寸",
        resolutionBounded: "限制最大输出像素",
        maxWidth: "最大宽度",
        maxHeight: "最大高度",
        noLimit: "不限制",
        sharpen: "图片锐化",
        sharpenHint: "轻微锐化可在压缩后提升观感清晰度。",
        exif: "保留 EXIF 信息",
        exifHint: "保留拍摄时间、设备等信息。",
        notWired: "当前版本后端未开放此选项，控件已禁用。",
        reset: "重置设置"
      },
      upload: {
        dropTitle: "拖拽图片到此处，或点击添加",
        dropDesc: "支持 PNG / JPG / JPEG / WEBP / BMP，自动去重并串行处理"
      },
      table: {
        selectAll: "全选当前列表",
        selectRow: "选择该行",
        fileName: "文件名",
        originalSize: "原始大小",
        resolution: "分辨率",
        compressedSize: "压缩后大小",
        status: "状态",
        operation: "操作",
        progress: "进度",
        dash: "—"
      },
      hints: {
        dragNoPath: "拖拽未获取到有效本地路径，请使用「添加图片」或桌面端窗口内拖拽。",
        unsupportedFormat: "仅支持 PNG / JPG / JPEG / WEBP / BMP 格式",
        duplicateFiles: "所选文件已在任务列表中"
      },
      errors: {
        pickImagesFailed: "选择图片失败：{message}",
        pickImagesDialog: "无法打开图片选择器",
        scanDirectoryFailed: "扫描目录失败：{message}",
        scanDirectory: "扫描目录失败",
        genericFailed: "处理失败"
      },
      status: {
        idle: "待处理",
        running: "处理中",
        completed: "已完成",
        failed: "失败"
      },
      result: {
        title: "执行结果",
        total: "总数",
        success: "成功",
        failed: "失败",
        elapsed: "总用时",
        ratio: "总压缩比例",
        sizeChange: "体积变化"
      }
    },
    gifCompress: {
      title: "GIF 压缩",
      description: "批量压缩 GIF，在画质与体积之间取得平衡；处理在后台线程执行，不阻塞界面。",
      listTitle: "文件列表",
      addFiles: "添加文件",
      clearList: "清空列表",
      clearListAria: "清空文件列表",
      maxFilesHint: "支持批量添加，最多同时处理 {n} 个文件",
      formatHint: "支持格式：.gif",
      sizeHint: "建议单个文件小于 {mb} MB",
      totalFiles: "共 {n} 个文件",
      totalSize: "总大小：{size}",
      dropTitle: "拖拽 GIF 文件到此处，或点击添加",
      dropTitlePrefix: "拖拽 GIF 文件到此处，或",
      dropTitleAction: "点击添加",
      emptyPreviewTitle: "请添加 GIF 文件开始预览",
      emptyPreviewDesc: "支持预览播放，真实对比压缩效果",
      previewTitle: "预览对比",
      previewDisclaimer: "预览仅截取部分画面，导出结果以实际文件为准",
      originalPreview: "原图预览",
      compressedPreview: "压缩后预览",
      originalWithSize: "原图（{size}）",
      compressedEstimate: "压缩后预估（{size}）",
      reductionBadge: "↓ {pct}%",
      sizeArrow: "{from} → {to}",
      savings: "预计节省 {size}（{pct}%）",
      savingsShort: "预计节省: {v}",
      originalSizeShort: "原始大小",
      compressedSizeShort: "压缩后大小",
      savingsEmpty: "预计节省：--",
      statusCompressing: "正在压缩…",
      estimateNote: "参数调整后可实时预估压缩大小",
      estimateDisclaimer: "预估值仅供参考，实际压缩结果可能因内容复杂度略有差异",
      targetSizePlaceholder: "例如：2",
      targetSizeDisabled: "目标体积压缩即将推出",
      settingsTitle: "压缩设置",
      restoreDefaults: "恢复默认",
      basicSettings: "基础设置",
      advancedSettings: "高级设置",
      mode: "压缩模式",
      modeLight: "轻度",
      modeRecommended: "推荐",
      modeExtreme: "极限",
      resize: "输出尺寸",
      resizeKeep: "原尺寸",
      resizeP80: "80%",
      resizeP60: "60%",
      resizeP50: "50%",
      resizeCustom: "自定义宽度",
      customWidthLabel: "宽度（像素）",
      fps: "流畅度（帧率）",
      fpsSmooth: "流畅（15fps）",
      fpsStandard: "标准（12fps）",
      fpsCompact: "省空间（10fps）",
      fpsTiny: "极限（8fps）",
      fpsSource: "保持原帧率",
      colors: "颜色数量",
      quality: "压缩质量",
      qualityLow: "低",
      qualityMedium: "中",
      qualityHigh: "高",
      removeDup: "删除重复帧",
      targetSize: "目标大小（可选）",
      targetSizeMb: "MB",
      estimatedOutSize: "预计大小：{v}",
      dither: "抖动优化",
      ditherOff: "关闭",
      ditherLow: "低（偏体积）",
      ditherMedium: "中（平衡画质与体积）",
      ditherHigh: "高（偏画质）",
      loop: "循环设置",
      loopPreserve: "保持原循环次数",
      loopForce: "强制循环播放",
      loopNone: "不循环",
      transparency: "保留透明背景",
      concurrency: "并发数量",
      concurrencyAuto: "自动",
      filenameRule: "文件名命名规则",
      filenameEn: "原文件名_COMPRESSED",
      filenameZh: "原文件名_压缩",
      outputDir: "输出目录",
      outputSame: "原文件所在目录",
      outputSubfolder: "原目录下 gif_compress_output",
      outputCustom: "自定义目录",
      pickOutputDir: "选择输出目录",
      fastMode: "快速模式（跳过部分优化）",
      statusReady: "准备就绪",
      statusPending: "等待中",
      statusProcessing: "正在压缩…",
      statusSaving: "正在写入…",
      statusDone: "已完成",
      statusFailed: "失败",
      bottomOverall: "整体进度",
      bottomNoTask: "暂无任务",
      bottomProcessing: "正在处理 {cur} / {total} 个文件",
      bottomEta: "预计剩余时间：{eta}",
      start: "开始压缩",
      stop: "停止任务",
      openOutput: "打开输出目录",
      startAria: "开始压缩任务",
      stopAria: "停止当前任务",
      openOutputAria: "在文件管理器中打开输出目录",
      removeFileAria: "从列表移除该文件",
      cannotStartEmpty: "请先添加 GIF 文件",
      cannotStartRunning: "任务进行中",
      pickFailed: "选择文件失败：{message}",
      hints: {
        unsupportedFormat: "仅支持 .gif 文件",
        dragNoPath: "拖拽未获取到有效本地路径，请使用「添加文件」或在桌面端窗口内拖拽。"
      },
      errors: {
        generic: "操作失败"
      }
    },
    imageUpscale: {
      title: "图片高清放大",
      description: "支持批量导入图片，本地离线完成 2x / 3x / 4x 高清放大与格式输出。",
      fileListTitle: "放大任务列表",
      clearList: "清空列表",
      deleteSelected: "删除选中",
      remove: "删除",
      removeAria: "从列表移除",
      start: "开始放大",
      processing: "放大处理中...",
      taskRunning: "图片高清放大中",
      taskDone: "处理完成",
      listOverflowTip: "当前仅展示前 200 条，剩余 {count} 条将在后台继续处理。",
      source: {
        title: "输入来源",
        pickImages: "添加图片",
        pickDirectory: "选择文件夹",
        directoryNotSelected: "未选择目录，支持直接拖入图片"
      },
      output: {
        title: "输出目录",
        sourceDirectory: "原目录",
        customDirectory: "自定义目录",
        pickDirectory: "选择输出目录",
        customNotSelected: "未选择自定义输出目录",
        defaultDirectory: "默认输出到原图片所在目录下的 /scale/ 文件夹",
        openDirectoryUnavailable: "请先添加图片或选择来源目录后再打开输出目录"
      },
      footer: {
        saveTo: "保存至：",
        sourceOutput: "各文件源目录 /scale/",
        changeOutput: "更改",
        openDirectory: "打开目录"
      },
      settings: {
        title: "放大设置",
        scale: "放大倍率",
        mode: "放大模式",
        outputFormat: "输出格式",
        tip: "极速适合快速预览，标准平衡速度与质量，高清优先保留边缘细节。"
      },
      advanced: {
        title: "高级设置",
        denoise: "降噪",
        sharpen: "锐化",
        preserveAlpha: "保留透明背景",
        concurrency: "并发数量",
        reset: "重置设置"
      },
      options: {
        mode: {
          fast: "极速",
          standard: "标准",
          balanced: "标准",
          quality: "高清",
          high: "高清"
        },
        format: {
          original: "原始格式",
          png: "PNG",
          jpg: "JPG",
          webp: "WEBP"
        },
        level: {
          off: "关闭",
          low: "低",
          medium: "中",
          high: "高"
        },
        concurrency: {
          auto: "自动",
          1: "1",
          2: "2",
          4: "4"
        }
      },
      upload: {
        dropTitle: "拖拽图片到此处，或点击空白区域添加",
        dropDesc: "支持 PNG / JPG / JPEG / WEBP / BMP，多格式可混合批量处理。",
        button: "添加图片",
        addFolder: "添加文件夹"
      },
      empty: {
        title: "暂无图片",
        desc: "添加图片后即可开始高清放大。"
      },
      table: {
        selectAll: "全选当前列表",
        selectRow: "选择该行",
        fileName: "文件名",
        originalSize: "原始尺寸",
        outputSize: "放大后尺寸",
        outputFormat: "输出格式",
        preview: "预览",
        status: "状态",
        operation: "操作",
        progress: "进度",
        dash: "—"
      },
      hints: {
        dragNoPath: "拖拽未获取到有效本地路径，请使用「添加图片」或桌面端窗口内拖拽。",
        unsupportedFormat: "仅支持 PNG / JPG / JPEG / WEBP / BMP 格式",
        duplicateFiles: "所选文件已在任务列表中",
        noPendingItems: "暂无待处理或失败可重试的任务"
      },
      errors: {
        pickImagesFailed: "选择图片失败：{message}",
        pickImagesDialog: "无法打开图片选择器",
        scanDirectoryFailed: "扫描目录失败：{message}",
        scanDirectory: "扫描目录失败",
        openDirectoryFailed: "打开输出目录失败：{message}",
        openDirectory: "打开输出目录失败",
        genericFailed: "处理失败"
      },
      status: {
        idle: "待处理",
        running: "处理中",
        completed: "已完成",
        failed: "失败"
      },
      result: {
        title: "执行结果",
        total: "总数",
        success: "成功",
        failed: "失败",
        elapsed: "总用时"
      }
    },
    videoToGif: {
      title: "视频转GIF",
      description: "将 MP4、MOV、WebM 等视频快速转换为高清 GIF 动图",
      safetyBadge: "本地处理 / 隐私安全",
      themeToggleAria: "切换主题",
      brandTagline: "本地 FFmpeg / palettegen 高画质流水线",
      upload: {
        dropTitle: "拖拽单个视频到此处，或点击下方按钮上传",
        dropDesc: "仅支持单个视频文件上传，支持 MP4、MOV、WebM 等常见视频格式",
        pickVideoCta: "选择视频文件",
        maxFileNote: "单个文件最大 500MB",
        tipTitle: "小贴士",
        tipBody: "为获得最佳效果，建议上传时长较短、画面清晰的视频文件。"
      },
      emptyVideo: {
        title: "暂无视频文件",
        desc: "请上传单个视频文件开始转换"
      },
      preview: {
        playAria: "播放/暂停",
        viewportAria: "视频预览与安全区域",
        rangeAria: "选区时间",
        playheadAria: "播放头（拖动预览当前画面）",
        startLabel: "开始时间",
        endLabel: "结束时间",
        currentLabel: "当前位置",
        durationLabel: "时长",
        durationUnit: "秒",
        timeSep: "→",
        replaceVideo: "更换视频",
        deleteVideo: "删除视频",
        deleteVideoModalTitle: "确定删除视频？",
        deleteVideoModalBody: "将从预览区移除当前已加载的视频，之后可重新上传。",
        deleteVideoModalCancel: "取消",
        deleteVideoModalConfirm: "删除"
      },
      clips: {
        title: "GIF 片段列表",
        countTpl: "已添加 {count} 个片段",
        addCurrent: "添加当前选区",
        chipPrefix: "片段",
        colClip: "片段",
        colSize: "尺寸",
        colFps: "帧率",
        colStatusActions: "状态 / 操作",
        deleteAria: "删除片段",
        openFolderAria: "打开该 GIF 所在文件夹",
        openFolderTip: "在文件资源管理器中打开此 GIF 所在的文件夹",
        emptyTip: "在上方时间轴选择片段后，点击「添加当前选区」即可加入列表",
        emptyStateTitle: "暂无 GIF 片段",
        emptyStateDesc: "在上方时间轴调整选区后，点击预览区下方的「添加当前选区」即可加入列表。",
        startCol: "开始",
        endCol: "结束",
        durationCol: "时长",
        sizeUnit: "{w} × {h}",
        fpsUnit: "{fps} fps"
      },
      settings: {
        title: "导出设置",
        collapseAria: "收起/展开设置",
        size: "输出尺寸",
        sizeOriginal: "原始",
        sizeCustom: "自定义",
        width: "宽度",
        height: "高度",
        aspectLockAria: "锁定宽高比",
        fps: "帧率 (FPS)",
        fpsUnit: "{fps} fps",
        quality: "画质",
        qualityLow: "低",
        qualityMid: "中",
        qualityHigh: "高",
        speed: "播放速度",
        speed05: "0.5x（慢速）",
        speed10: "1.0x（正常）",
        speed20: "2.0x（快速）",
        loopMode: "循环方式",
        loopInfinite: "无限循环",
        loopOnce: "仅播放一次",
        keepAspect: "保持比例",
        keepAspectHint: "保持原视频宽高比",
        reduceSize: "减少体积优化",
        reduceSizeHint: "启用智能压缩优化，减小文件体积",
        smartCompressLabel: "启用智能压缩优化"
      },
      estimate: {
        title: "输出预估",
        size: "预计大小",
        frames: "预计帧数",
        duration: "输出时长",
        resolution: "分辨率",
        dash: "--",
        emptySize: "--",
        emptyFrames: "--",
        emptyDuration: "--",
        emptyResolution: "--",
        sizeSubtitle: "（{count} 个片段）",
        framesSubtitle: "（总计）",
        durationSubtitle: "（总计）"
      },
      footer: {
        start: "开始转换",
        processing: "转换中…",
        exportGif: "导出 GIF",
        openFolder: "打开输出文件夹",
        openDirectory: "打开目录"
      },
      hints: {
        dragNoPath: "未读取到本地视频路径，请使用按钮上传或在桌面端窗口内拖拽。",
        unsupportedFormat: "仅支持 MP4 / WEBM / MKV / MOV / AVI / M4V / WMV 等扩展名",
        fileTooLarge: "单个文件不能超过 500MB",
        rangeInvalid: "结束时间必须大于开始时间",
        noClips: "请先添加至少一个片段",
        duplicateClip: "已存在相同片段（起止与帧率一致）"
      },
      errors: {
        pickVideosFailed: "选择视频失败：{message}",
        pickVideosDialog: "无法打开文件选择器",
        loadVideoFailed: "加载视频失败：{message}",
        loadVideoDialog: "无法读取视频信息",
        openDirectoryFailed: "打开目录失败：{message}",
        openDirectory: "暂无可打开的目录",
        genericFailed: "转换失败"
      },
      status: {
        idle: "待处理",
        running: "处理中",
        completed: "已完成",
        failed: "失败"
      },
      result: {
        title: "执行结果",
        total: "总数",
        success: "成功",
        failed: "失败",
        elapsed: "总用时"
      },
      taskRunning: "正在转换为 GIF",
      taskDone: "GIF 导出完成"
    },
    imageWatermarkRemoval: {
      title: "图片去水印",
      description:
        "本工具将支持在本地识别并处理静态图片中的水印区域；当前版本尚未开放处理入口。不提供视频去水印能力。",
      comingSoon: "功能开发中，后续版本将接入算法与批量任务。",
      relatedVideoLink: "需要处理视频？前往视频去水印",
      list: {
        fileListTitle: "文件列表（{count}）",
        addImages: "添加图片",
        clearList: "清空列表",
        summaryCount: "共 {count} 张图片",
        totalSize: "总大小：{size}"
      },
      drop: {
        titlePrefix: "拖拽图片到此处，或",
        titleAction: "点击添加图片",
        formatsHint: "支持 JPG / PNG / BMP / WEBP 等格式",
        batchLabel: "支持批量导入",
        batchHint: "可同时添加多张图片进行处理"
      },
      preview: {
        sectionTitle: "图片标注与预览",
        hintWithImage: "在图片上拖拽矩形框选水印位置，可添加多个框，框右上角可删除",
        hintNoImage: "请先添加图片，并在图片上框选需要去除的水印区域",
        tabOriginal: "原图",
        tabProcessed: "处理后",
        removeRegion: "删除框选区域",
        emptyTitle: "暂无图片",
        emptyHint: "请从左侧添加图片开始处理",
        footTip:
          "提示：请尽量完整框选水印区域，边缘可稍大一些，效果更佳",
        clearRegions: "清除全部框选"
      },
      settings: {
        title: "去除设置",
        basics: "基础设置",
        removalMode: "去除模式",
        modeStandard: "标准",
        modeQuality: "高清",
        removalModeHint:
          "标准模式按原图局部修复并融合回原图；高清模式使用 LaMA，速度更慢",
        batchApply: "批量应用",
        batchApplyHint: "将当前标注区域应用到全部图片",
        outputSection: "输出设置",
        outputFormat: "输出格式",
        formatAuto: "原格式",
        outputFormatHint: "默认按原图格式输出；PNG 无损，JPG 体积更小"
      },
      bottomBar: {
        overallProgress: "整体进度",
        status: "状态",
        aiEngine: "AI 引擎",
        taskCount: "任务数量",
        taskCountValue: "共 {count} 张图片",
        elapsed: "已用时间",
        overallProgressDetail: "总体进度",
        outputDirLabel: "输出目录：",
        pickOutputAria: "选择输出目录",
        outputDirTitle: "输出目录",
        start: "开始去除",
        preparingModel: "模型准备中",
        stopTask: "停止任务",
        openOutput: "打开输出目录"
      },
      progress: {
        noTask: "暂无任务",
        processing: "正在处理 {current} / {total} 张图片"
      },
      itemStatus: {
        pending: "待处理",
        processing: "处理中",
        done: "已完成",
        failed: "失败"
      },
      hints: {
        unsupportedFormats: "仅支持 JPG / PNG / BMP / WEBP 格式图片",
        addImagesFirst: "请先添加图片",
        selectRegionsFirst: "请先在图片上框选需要去除的水印区域",
        startTaskFailed: "启动 AI 去水印任务失败",
        batchFailed: "AI 去水印任务失败"
      },
      model: {
        startingWorker: "正在启动 LaMA worker（{device}）",
        detectingRuntime: "正在检测 CUDA / CPU",
        downloadingFirstUse: "正在准备已导入的 LaMA 模型",
        lamaReady: "LaMA 模型已准备完成",
        downloading: "正在准备 LaMA 模型文件",
        overlayTitle: "正在准备 LaMA 修复模型",
        preparingFiles: "正在准备模型文件",
        currentDevice: "当前设备：{device}",
        storePathLabel: "模型保存位置：{path}",
        prepFailedTitle: "AI 模型准备失败",
        close: "关闭"
      },
      output: {
        defaultDirectory: "D:\\Tooliva\\去水印结果"
      },
      dialog: {
        imagesFilterName: "图片"
      },
      toastTip:
        "温馨提示：请先在图片上框选需要去除的水印区域，才能开始处理。"
    },
    videoWatermarkRemoval: {
      title: "视频去水印",
      description:
        "本工具将支持在本地识别并处理视频画面中的水印区域；当前版本尚未开放处理入口。不提供静态图片去水印能力。",
      comingSoon: "功能开发中，后续版本将接入算法与批量任务。",
      relatedImageLink: "需要处理静态图片？前往图片去水印",
      filePicker: {
        videoFilter: "视频"
      },
      mode: {
        title: "处理模式",
        ariaLabel: "处理模式",
        fast: "极速模式",
        ai: "AI 增强模式",
        fastHint: "无需下载 AI 组件，适合简单背景、纯色背景、边角水印和小面积水印。",
        aiHint: "适合复杂背景和更自然的修复效果。组件仅安装一次，文件不会上传服务器。",
        engineLabel: "处理引擎"
      },
      engine: {
        label: "FFmpeg 流式处理 / 自动硬件编码",
        fastLocal: "本地极速修复",
        aiEnhanced: "AI 增强修复"
      },
      progressPanel: {
        idleTitle: "暂无任务",
        processingTitle: "正在处理 {current} / {total} 个视频",
        aria: "处理进度",
        taskCount: "任务数量",
        currentFile: "当前文件",
        estimatedRemaining: "预计剩余",
        elapsed: "已用时间",
        engine: "处理引擎",
        overallProgress: "总体进度"
      },
      status: {
        pending: "待处理",
        processing: "处理中",
        done: "已完成",
        failed: "失败"
      },
      hints: {
        unsupportedFormats: "仅支持 MP4 / MOV / WebM / MKV / AVI / M4V / WMV 视频",
        addVideoFirst: "请先添加视频",
        selectRegionFirst: "请先在视频画面上框选需要去除的水印区域",
        startTaskFailed: "启动视频去水印任务失败",
        taskFailed: "视频去水印任务失败"
      },
      list: {
        title: "文件列表（{count}）",
        addVideos: "添加视频",
        clearList: "清空列表",
        removeItem: "从列表移除",
        dropHint: "拖拽视频到此处，或",
        dropAddLink: "点击添加视频",
        formatsLine: "支持 MP4 / MOV / WebM / MKV / AVI / M4V / WMV",
        batchImport: "支持批量导入",
        sharedRegionHint: "可同时添加多个视频进行处理",
        totalVideos: "共 {count} 个视频",
        totalSize: "总大小：{size}"
      },
      preview: {
        aria: "视频预览与框选区域",
        titleFallback: "视频预览",
        instruction: "在画面上拖拽框选需要去除的固定水印区域",
        clearRegions: "清除框选",
        emptyTitle: "暂无视频文件",
        emptyDesc: "添加视频后即可在这里框选水印区域",
        controlsAria: "视频预览控制",
        outputNote:
          "输出格式默认保持原视频格式；多视频水印位置一致时可共用当前框选区域。",
        regionsSelected: "已框选 {count} 个区域",
        footTipPause: "预览区已放大，建议先暂停视频再框选。"
      },
      bottomBar: {
        overallProgress: "总体进度",
        status: "状态",
        currentFile: "当前文件",
        estimatedRemaining: "预计剩余",
        elapsed: "已用时间",
        progressDetail: "进度详情",
        outputDirLabel: "输出目录",
        openOutput: "打开目录",
        stopTask: "停止任务",
        start: "开始去水印"
      },
      output: {
        directoryLabel: "输出目录",
        openFolder: "打开目录",
        defaultDirectory: "D:\\Tooliva\\视频去水印结果"
      },
      actions: {
        stop: "停止处理",
        start: "开始去水印"
      },
      tip: "温馨提示：请先在视频画面上框选需要去除的水印区域，再开始处理。"
    },
    imageWatermark: {
      title: "图片加水印",
      description: "支持批量导入，并为图片统一添加文字水印或品牌 Logo 水印。",
      fileListTitle: "水印任务列表",
      clearList: "清空列表",
      remove: "移除",
      removeAria: "从列表移除",
      list: {
        title: "图片列表",
        emptyTitle: "暂无图片",
        emptyDesc: "添加图片后即可开始批量加水印。",
        deleteSelected: "删除选中",
        deleteSelectedHint: "当前版本不支持多选，请逐条移除或使用清空列表",
        table: {
          fileName: "文件名",
          dimensions: "尺寸",
          fileSize: "大小",
          fileSizeHint: "文件体积暂未展示；列占位与效果图对齐",
          watermarkType: "水印类型",
          preview: "预览",
          status: "状态",
          progress: "进度",
          action: "操作"
        }
      },
      bottom: {
        outputLabel: "输出目录",
        changeOutput: "更改",
        namingLabel: "文件命名",
        namingGoSettings: "去设置修改"
      },
      start: "开始加水印",
      processing: "水印处理中...",
      listOverflowTip: "当前仅展示前 200 条，剩余 {count} 条将在后台继续处理。",
      source: {
        title: "输入来源",
        pickImages: "添加图片",
        pickDirectory: "选择目录夹",
        directoryNotSelected: "未选择目录，支持直接拖入图片"
      },
      output: {
        title: "输出目录",
        pickDirectory: "指定输出目录",
        defaultDirectory: "默认输出到上传图片所在目录下的 /water/ 文件夹",
        openDirectory: "打开目录"
      },
      settings: {
        sidebarTitle: "水印设置",
        title: "水印参数",
        sectionWatermarkType: "水印类型",
        sectionContent: "水印内容",
        sectionTypography: "字体与字号",
        sectionWatermarkImage: "水印图片",
        sectionAppearance: "透明度",
        sectionLayout: "位置与边距",
        fontFamilyLabel: "字体",
        fontFamilyValue: "思源黑体（默认）",
        fontFamilyHint: "当前使用应用默认字体渲染",
        mode: "水印模式",
        textMode: "文字水印",
        imageMode: "图片水印",
        text: "水印内容",
        textPlaceholder: "请输入水印文字",
        fontSize: "字号",
        textColor: "文字颜色",
        imageFile: "水印图片",
        pickImageFile: "选择水印图片",
        imageFileNotSelected: "未选择水印图片",
        imageScale: "图片缩放比例(%)",
        opacity: "透明度",
        margin: "边距",
        rotation: "旋转角度",
        position: "水印位置",
        tip: "首版支持统一参数批量处理。文字水印建议选择浅色，Logo 水印建议使用透明背景 PNG。",
        defaultText: "水印"
      },
      positions: {
        topLeft: "左上",
        topCenter: "上中",
        topRight: "右上",
        middleLeft: "左中",
        center: "居中",
        middleRight: "右中",
        bottomLeft: "左下",
        bottomCenter: "下中",
        bottomRight: "右下",
        custom: "自定义"
      },
      preview: {
        resetPosition: "重置位置",
        imagePlaceholder: "请先选择水印图片",
        emptyTitle: "暂无预览图片",
        emptyDesc: "添加图片后即可在这里预览水印效果。",
        noneSelected: "未选择图片"
      },
      upload: {
        dropTitle: "拖拽图片到此处，或点击添加",
        dropDesc: "支持 PNG / JPG / JPEG / WEBP / BMP，自动去重并串行处理",
        button: "添加图片"
      },
      hints: {
        pickImagesFailed: "选择图片失败：{message}",
        cannotOpenImagePicker: "无法打开图片选择器",
        noOutputDirectory: "当前暂无可打开的输出目录",
        openOutputDirectoryFailed: "打开输出目录失败：{message}",
        watermarkImageUnsupportedFormats: "水印素材仅支持 PNG/WEBP/JPG/JPEG",
        pickWatermarkImageFailed: "选择水印图片失败：{message}",
        cannotOpenWatermarkPicker: "无法打开水印图片选择器",
        dragDropNoLocalPath: "拖拽未获取到有效本地路径，请点击「{pickImages}」",
        modeSwitchedReprocess: "已切换水印模式，可重新执行当前任务",
        enterWatermarkTextBeforeStart: "请输入水印文字后再开始处理",
        unsupportedImageFormats: "仅支持 PNG/JPG/JPEG/WEBP/BMP 格式",
        fileAlreadyInQueue: "文件已在任务列表中",
        scanSourceDirectoryFailed: "扫描目录失败：{message}"
      },
      alerts: {
        watermarkTextRequired: "水印文字不能为空，请先输入内容。"
      },
      errors: {
        processFailed: "处理失败",
        openOutputDirectoryFailed: "打开输出目录失败",
        scanSourceDirectoryFailed: "扫描目录失败"
      },
      task: {
        running: "图片加水印中",
        completed: "处理完成"
      },
      status: {
        idle: "待处理",
        running: "处理中",
        completed: "已完成",
        failed: "失败"
      },
      result: {
        title: "执行结果",
        total: "总数",
        success: "成功",
        failed: "失败",
        elapsed: "总用时"
      }
    }
  },
  toolCategory: {
    image: "图片工具",
    video: "视频工具",
    document: "文档工具",
    ocr: "OCR 工具"
  },
  tools: {
    imageResize: {
      name: "图片尺寸调整",
      description: "批量调整图片尺寸。"
    },
    imageUpscale: {
      name: "图片高清放大",
      description: "规划中：本地清晰度提升，当前无可用处理入口。"
    },
    imageWatermarkRemoval: {
      name: "图片去水印",
      description: "规划中：仅针对静态图片的本地去水印与修复，当前无可用处理入口。"
    },
    videoWatermarkRemoval: {
      name: "视频去水印",
      description: "规划中：针对视频画面的本地去水印，当前无可用处理入口。"
    }
  }
} as const;
