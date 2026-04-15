export const zhCN = {
  app: {
    title: "桌面工具箱"
  },
  nav: {
    home: "首页",
    tools: "工具页",
    favorites: "收藏页",
    tasks: "任务中心",
    settings: "设置页",
    membership: "会员页"
  },
  common: {
    language: "语言",
    theme: "主题",
    outputDirectory: "默认输出目录",
    backToHome: "返回首页",
    save: "保存",
    noData: "暂无数据",
    active: "进行中",
    history: "历史"
  },
  pages: {
    home: {
      topBar: {
        appName: "工具箱",
        searchPlaceholder: "搜索工具...",
        userName: "用户名",
        userRole: "VIP会员"
      },
      sections: {
        coreTools: {
          title: "核心工具",
          description: "专业级工具集合，提升您的工作效率"
        },
        recentUsage: {
          title: "最近使用"
        },
        usageStats: {
          title: "使用统计"
        },
        quickActions: {
          title: "快捷操作"
        }
      },
      tools: {
        imageCompress: {
          title: "图片压缩",
          description: "快速无损压缩"
        },
        videoConvert: {
          title: "视频格式转换",
          shortTitle: "视频转换",
          description: "支持多种格式"
        },
        imageUpscale: {
          title: "图片高清放大",
          shortTitle: "图片放大",
          description: "AI智能增强"
        },
        comingSoon: "更多工具即将上线"
      },
      membership: {
        title: "VIP会员",
        currentLevelLabel: "当前等级",
        currentLevelValue: "黄金会员",
        expiryLabel: "到期时间",
        renewButton: "续费升级"
      },
      stats: {
        filesToday: "今日处理文件",
        storage: "存储空间"
      },
      quickActions: {
        history: "历史记录",
        favorites: "收藏工具",
        documentManager: "文档管理"
      },
      relativeTime: {
        twoMinutesAgo: "2分钟前",
        fifteenMinutesAgo: "15分钟前",
        oneHourAgo: "1小时前"
      },
      footer: {
        copyright: "© 2024 工具箱",
        versionPrefix: "版本",
        feedback: "意见反馈",
        helpCenter: "帮助中心"
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
      title: "应用设置",
      languageSection: "语言设置"
    },
    membership: {
      title: "会员中心",
      description: "后续可接入授权策略和会员能力。"
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
    }
  }
} as const;
