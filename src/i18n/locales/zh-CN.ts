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
    },
    videoConvert: {
      title: "视频格式转换",
      searchPlaceholder: "搜索转换记录...",
      upload: {
        title: "上传视频文件",
        desc: "支持MP4、AVI、MOV、MKV、WMV、FLV等常见视频格式",
        dropTitle: "拖拽视频文件到这里或点击上传",
        dropDesc: "最大支持2GB，建议使用1080p及以下分辨率",
        button: "选择文件"
      },
      outputFormatTitle: "选择输出格式",
      convertSettingsTitle: "转换参数设置",
      convertSettings: {
        resolution: "分辨率",
        bitrate: "视频码率",
        frameRate: "帧率",
        audioQuality: "音频质量",
        bitrateValue: "8000 kbps",
        bitrateLow: "低",
        bitrateHigh: "高",
        frameRateValue: "30 fps",
        audioQualityValue: "192 kbps",
        resolution4k: "4K (3840x2160)",
        resolution1080: "1080p (1920x1080)",
        resolution720: "720p (1280x720)",
        resolution480: "480p (854x480)"
      },
      outputFormat: {
        mp4: "H.264编码",
        avi: "通用格式",
        mov: "QuickTime",
        mkv: "高清容器",
        wmv: "Windows",
        flv: "流媒体"
      },
      startConvert: "开始转换",
      quickPreset: {
        title: "快速设置",
        high: { title: "高质量", desc: "最佳画质" },
        standard: { title: "标准质量", desc: "平衡选择" },
        small: { title: "小文件", desc: "节省空间" }
      },
      history: {
        title: "转换历史",
        viewAll: "查看全部"
      },
      tips: {
        title: "转换小贴士",
        item1: "MP4格式兼容性最好",
        item2: "1080p适合大多数场景",
        item3: "码率越高画质越好",
        item4: "建议保持原始帧率"
      },
      progress: {
        title: "转换进度",
        status: "处理中...",
        done: "65% 完成",
        remaining: "预计剩余 2分15秒",
        fileName: "sample_video.avi → sample_video.mp4",
        speed: "转换速度: 1.2x",
        time: "已用时间: 3分45秒",
        size: "文件大小: 245MB → 预估 180MB"
      },
      footer: {
        left: "© 2024 工具箱",
        version: "版本 v1.0.0",
        formatGuide: "格式说明",
        advanced: "高级设置"
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
    }
  }
} as const;
