<script setup lang="ts">
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ROUTE_PATHS } from "@/config/constants";
import { useVideoConvertPageData } from "@/pages/video-convert/composables/useVideoConvertPageData";

const { t } = useI18n();
const router = useRouter();
const { pageConfig, assets, formatOptions, quickPresets, historyItems } = useVideoConvertPageData();

/**
 * 返回首页入口。
 */
function backToHome(): void {
  router.push(ROUTE_PATHS.home);
}
</script>

<template>
  <div class="video-convert-page">
    <header class="top-bar">
      <button type="button" class="back-entry" @click="backToHome">
        <div class="back-entry__icon-wrap"><img :src="assets.logo" alt="" class="back-entry__icon" /></div>
        <strong class="back-entry__text">{{ t("common.backToHome") }}</strong>
      </button>
      <div class="user-entry">
        <img :src="assets.avatar" alt="" class="user-entry__avatar" />
        <div>
          <div class="user-entry__name">{{ t("pages.home.topBar.userName") }}</div>
          <div class="user-entry__role">{{ t("pages.home.topBar.userRole") }}</div>
        </div>
        <button type="button" class="setting-btn">
          <img :src="assets.settings" alt="" class="setting-btn__icon" />
        </button>
      </div>
    </header>

    <section class="page-content">
      <main class="main-area">
        <section class="panel">
          <h2>{{ t(pageConfig.uploadSection.titleKey) }}</h2>
          <p class="desc">{{ t(pageConfig.uploadSection.descKey) }}</p>
          <div class="upload-zone">
            <img :src="assets.upload" alt="" class="upload-zone__icon" />
            <p class="upload-zone__title">{{ t(pageConfig.uploadSection.dropTitleKey) }}</p>
            <p class="upload-zone__desc">{{ t(pageConfig.uploadSection.dropDescKey) }}</p>
            <button type="button" class="primary-btn">{{ t(pageConfig.uploadSection.buttonKey) }}</button>
          </div>
        </section>

        <section class="panel">
          <h2>{{ t(pageConfig.sections.outputFormatTitleKey) }}</h2>
          <div class="format-grid">
            <article
              v-for="item in formatOptions"
              :key="item.id"
              class="format-card"
              :class="{ 'format-card--featured': item.featured }"
            >
              <h3>{{ item.title }}</h3>
              <p>{{ t(item.descriptionKey) }}</p>
            </article>
          </div>
        </section>

        <section class="panel panel--muted convert-settings-panel">
          <h2 class="convert-settings-panel__title">{{ t(pageConfig.sections.convertSettingsTitleKey) }}</h2>
          <div class="setting-row setting-row--top-label">
            <span class="setting-row__label">{{ t("pages.videoConvert.convertSettings.resolution") }}</span>
            <span class="setting-row__label setting-row__label--bitrate">{{ t("pages.videoConvert.convertSettings.bitrate") }}</span>
          </div>
          <div class="setting-row setting-row--gap setting-row--radio">
            <div class="resolution-col resolution-col--tight">
              <div class="radio"><span class="radio__dot" />{{ t("pages.videoConvert.convertSettings.resolution4k") }}</div>
              <div class="radio active"><img :src="assets.radioActive" alt="" />{{ t("pages.videoConvert.convertSettings.resolution1080") }}</div>
              <div class="radio"><span class="radio__dot" />{{ t("pages.videoConvert.convertSettings.resolution720") }}</div>
              <div class="radio"><span class="radio__dot" />{{ t("pages.videoConvert.convertSettings.resolution480") }}</div>
            </div>
            <div class="bitrate-col">
              <div class="mock-select mock-select--compact">{{ t("pages.videoConvert.convertSettings.bitrateValue") }} ▼</div>
              <div class="bitrate-slider"><div class="bitrate-slider__inner" /></div>
              <div class="bitrate-labels">
                <span>{{ t("pages.videoConvert.convertSettings.bitrateLow") }}</span>
                <span>{{ t("pages.videoConvert.convertSettings.bitrateHigh") }}</span>
              </div>
            </div>
          </div>
          <div class="setting-row setting-row--selectors">
            <div class="selector-group">
              <span>{{ t("pages.videoConvert.convertSettings.frameRate") }}</span>
              <div class="mock-select mock-select--compact">{{ t("pages.videoConvert.convertSettings.frameRateValue") }} ▼</div>
            </div>
            <div class="selector-group">
              <span>{{ t("pages.videoConvert.convertSettings.audioQuality") }}</span>
              <div class="mock-select mock-select--compact">{{ t("pages.videoConvert.convertSettings.audioQualityValue") }} ▼</div>
            </div>
          </div>
          <button type="button" class="primary-btn primary-btn--full">{{ t("pages.videoConvert.startConvert") }}</button>
        </section>
      </main>

      <aside class="side-area">
        <section class="panel side-panel side-panel--no-margin">
          <h3>{{ t("pages.videoConvert.quickPreset.title") }}</h3>
          <div v-for="preset in quickPresets" :key="preset.id" class="preset-item">
            <img :src="assets[preset.iconKey]" alt="" />
            <div>
              <div class="preset-item__title">{{ t(preset.titleKey) }}</div>
              <div class="preset-item__desc">{{ t(preset.descriptionKey) }}</div>
            </div>
          </div>
        </section>

        <section class="panel side-panel side-panel--no-margin">
          <h3>{{ t("pages.videoConvert.history.title") }}</h3>
          <div v-for="item in historyItems" :key="item.id" class="history-item">
            <img :src="assets[item.previewKey]" alt="" class="history-item__thumb" />
            <div>
              <div class="history-item__file">{{ item.fileName }}</div>
              <div class="history-item__meta">{{ item.transformText }}</div>
              <div class="history-item__time">
                <img :src="assets.time" alt="" />{{ t(item.relativeTimeKey) }}
              </div>
            </div>
          </div>
          <button type="button" class="history-all-btn">{{ t("pages.videoConvert.history.viewAll") }}</button>
        </section>

        <section class="tip-box">
          <div class="tip-box__title"><img :src="assets.tip" alt="" />{{ t("pages.videoConvert.tips.title") }}</div>
          <p>• {{ t("pages.videoConvert.tips.item1") }}</p>
          <p>• {{ t("pages.videoConvert.tips.item2") }}</p>
          <p>• {{ t("pages.videoConvert.tips.item3") }}</p>
          <p>• {{ t("pages.videoConvert.tips.item4") }}</p>
        </section>
      </aside>
    </section>

    <section class="panel progress-panel">
      <div class="progress-panel__header">
        <h2>{{ t(pageConfig.sections.progressTitleKey) }}</h2>
        <span>{{ t("pages.videoConvert.progress.status") }}</span>
      </div>
      <div class="progress-panel__file">
        <img :src="assets.progressIcon" alt="" />
        <div class="progress-panel__content">
          <div class="progress-panel__filename">{{ t("pages.videoConvert.progress.fileName") }}</div>
          <div class="progress-track"><div class="progress-track__inner" /></div>
          <div class="progress-panel__meta">
            <span>{{ t("pages.videoConvert.progress.done") }}</span>
            <span>{{ t("pages.videoConvert.progress.remaining") }}</span>
          </div>
        </div>
      </div>
      <div class="progress-stats">
        <span>{{ t("pages.videoConvert.progress.speed") }}</span>
        <span>{{ t("pages.videoConvert.progress.time") }}</span>
        <span>{{ t("pages.videoConvert.progress.size") }}</span>
      </div>
    </section>

    <footer class="footer">
      <div>{{ t(pageConfig.footer.leftKey) }} {{ t(pageConfig.footer.versionKey) }}</div>
      <div class="footer-links">
        <span><img :src="assets.footerFormat" alt="" />{{ t(pageConfig.footer.formatGuideKey) }}</span>
        <span><img :src="assets.footerAdvanced" alt="" />{{ t(pageConfig.footer.advancedKey) }}</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.video-convert-page { background: #fff; border-radius: 16px; overflow: hidden; min-height: calc(100vh - 48px); }
.side-panel--no-margin { margin: 0 !important; }
.top-bar { display: flex; align-items: center; border-bottom: 1px solid #e5e7eb; padding: 16px 24px; gap: 16px; }
.back-entry { border: none; background: transparent; padding: 0; display: inline-flex; align-items: center; gap: 12px; cursor: pointer; }
.back-entry__icon-wrap { width: 40px; height: 40px; border-radius: 8px; background: linear-gradient(135deg, #7c3aed 15%, #a855f7 85%); display: flex; align-items: center; justify-content: center; }
.back-entry__icon { width: 24px; height: 24px; transform: rotate(180deg); }
.back-entry__text { font-size: 24px; line-height: 32px; color: #111827; }
.user-entry { margin-left: auto; display: flex; align-items: center; gap: 12px; }
.user-entry__avatar { width: 44px; height: 44px; }
.user-entry__name { color: #111827; font-weight: 500; line-height: 20px; }
.user-entry__role { color: #6b7280; font-size: 12px; line-height: 16px; }
.setting-btn { border: 1px solid #e5e7eb; background: #f9fafb; border-radius: 8px; width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; }
.setting-btn__icon { width: 20px; height: 20px; }
.page-content { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 24px; padding: 24px; }
.panel { border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; background: #fff; }
.panel h2 { margin: 0; color: #111827; font-size: 20px; line-height: 28px; }
.desc { margin: 8px 0 0; color: #6b7280; line-height: 20px; }
.upload-zone { margin-top: 16px; border: 2px dashed #d1d5db; border-radius: 16px; background: #f9fafb; text-align: center; padding: 20px; }
.upload-zone__icon { width: 64px; height: 64px; }
.upload-zone__title { margin: 12px 0 0; font-size: 16px; font-weight: 500; line-height: 24px; }
.upload-zone__desc { margin: 0; color: #6b7280; line-height: 20px; }
.primary-btn { margin-top: 12px; border: none; border-radius: 8px; padding: 10px 24px; color: #fff; font-weight: 500; line-height: 20px; background: linear-gradient(90deg, #1d4ed8 0%, #1e3a8a 100%); }
.format-grid { margin-top: 16px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.format-card { border: 2px solid #e5e7eb; border-radius: 12px; padding: 18px; }
.format-card--featured { background: linear-gradient(135deg, #1d4ed8 15%, #1e3a8a 85%); color: #fff; border: none; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
.format-card h3 { margin: 0; font-size: 24px; line-height: 32px; }
.format-card p { margin: 8px 0 0; color: inherit; opacity: .8; }
.panel--muted { background: #f9fafb; }
.convert-settings-panel { padding: 25px; gap: 8px; }
.convert-settings-panel__title { margin: 0; color: #111827; font-size: 18px; font-weight: 700; line-height: 28px; }
.setting-row { margin-top: 16px; display: flex; justify-content: space-between; color: #111827; font-weight: 500; line-height: 20px; }
.setting-row--top-label { margin-top: 8px; }
.setting-row__label { color: #111827; font-weight: 500; line-height: 20px; }
.setting-row__label--bitrate { width: 56px; margin-right: 423px; }
.setting-row--gap { align-items: flex-start; gap: 24px; font-weight: 400; }
.setting-row--radio { margin-top: 4px; }
.resolution-col { min-width: 150px; }
.resolution-col--tight { display: flex; flex-direction: column; gap: 8px; }
.bitrate-col { width: 479px; }
.radio { margin-top: 8px; display: flex; align-items: center; gap: 8px; color: #374151; }
.radio__dot { width: 16px; height: 16px; border: 2px solid #d1d5db; border-radius: 9999px; margin-top: 1px; flex-shrink: 0; }
.radio img { width: 16px; height: 16px; }
.mock-select { border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; width: 100%; color: #111827; }
.mock-select--compact { padding: 10px 17px; line-height: 20px; display: flex; align-items: center; justify-content: space-between; }
.bitrate-slider { margin-top: 12px; width: 100%; height: 8px; border-radius: 999px; background: #d1d5db; overflow: hidden; }
.bitrate-slider__inner { width: 80%; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #3b82f6 0%, #1e40af 100%); }
.bitrate-labels { margin-top: 4px; display: flex; justify-content: space-between; color: #9ca3af; font-size: 12px; line-height: 16px; }
.setting-row--selectors { margin-top: 16px; gap: 24px; align-items: flex-start; font-weight: 400; }
.selector-group { width: 479px; }
.selector-group span { display: block; margin-bottom: 8px; color: #111827; font-weight: 500; }
.primary-btn--full { width: 100%; margin-top: 16px; padding: 12px 0; font-size: 16px; font-weight: 700; line-height: 24px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1); }
.side-area { width: 280px; display: flex; flex-direction: column; gap: 24px; }
.side-panel { padding: 25px; }
.side-panel h3 { margin: 0 0 16px; color: #111827; font-size: 16px; line-height: 24px; }
.preset-item { padding: 16px; border-radius: 8px; background: linear-gradient(90deg, #f9fafb 0%, #f3f4f6 100%); display: flex; gap: 12px; margin-top: 12px; }
.preset-item img { width: 20px; height: 20px; }
.preset-item__title { font-weight: 700; line-height: 20px; color: #111827; }
.preset-item__desc { margin-top: 4px; color: #6b7280; font-size: 12px; line-height: 16px; }
.history-item { display: flex; gap: 12px; margin-top: 12px; }
.history-item__thumb { width: 64px; height: 48px; border-radius: 8px; object-fit: cover; }
.history-item__file { color: #111827; font-size: 12px; font-weight: 500; line-height: 16px; }
.history-item__meta { color: #6b7280; font-size: 12px; line-height: 16px; }
.history-item__time { display: flex; align-items: center; gap: 4px; color: #6b7280; font-size: 12px; line-height: 16px; }
.history-item__time img { width: 12px; height: 12px; }
.history-all-btn { margin-top: 12px; width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; color: #1d4ed8; line-height: 20px; padding: 8px 0; }
.tip-box { border-radius: 16px; background: linear-gradient(135deg, #fef3c7 15%, #fde68a 85%); padding: 24px; color: #92400e; }
.tip-box__title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; line-height: 24px; }
.tip-box__title img { width: 20px; height: 20px; }
.tip-box p { margin: 4px 0 0; font-size: 12px; line-height: 16px; }
.progress-panel { margin: 0 24px 24px; padding: 25px; }
.progress-panel__header { display: flex; justify-content: space-between; color: #3b82f6; font-weight: 500; }
.progress-panel__file { margin-top: 12px; display: flex; gap: 16px; }
.progress-panel__file img { width: 40px; height: 40px; }
.progress-panel__content { flex: 1; }
.progress-panel__filename { color: #111827; font-weight: 500; line-height: 20px; }
.progress-track { margin-top: 8px; width: 100%; height: 8px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
.progress-track__inner { width: 65%; height: 100%; background: linear-gradient(90deg, #3b82f6 0%, #1e40af 100%); border-radius: 999px; }
.progress-panel__meta { margin-top: 4px; display: flex; justify-content: space-between; color: #6b7280; font-size: 12px; line-height: 16px; }
.progress-stats { margin-top: 16px; border-radius: 8px; background: #f9fafb; padding: 12px; display: flex; justify-content: space-between; color: #6b7280; line-height: 20px; }
.footer { border-top: 1px solid #e5e7eb; padding: 24px 48px; color: #6b7280; display: flex; justify-content: space-between; align-items: center; }
.footer-links { display: flex; align-items: center; gap: 16px; color: #6b7280; }
.footer-links span { display: inline-flex; align-items: center; gap: 8px; }
.footer-links img { width: 16px; height: 16px; }
@media (max-width: 1260px) {
  .page-content { grid-template-columns: 1fr; }
  .format-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
