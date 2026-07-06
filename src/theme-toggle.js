/**
 * 暗色模式切换逻辑
 * 支持本地存储和自动恢复用户偏好
 */

const THEME_KEY = 'fitness-theme';
const THEME_LIGHT = 'light';
const THEME_DARK = 'dark';

/**
 * 获取当前主题
 */
function getCurrentTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored) return stored;

  // 检测系统偏好
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return THEME_DARK;
  }

  return THEME_LIGHT;
}

/**
 * 应用主题
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);

  // 更新切换按钮图标
  const toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.textContent = theme === THEME_DARK ? '☀️' : '🌙';
    toggle.setAttribute('aria-label', theme === THEME_DARK ? '切换到浅色模式' : '切换到暗色模式');
  }
}

/**
 * 切换主题
 */
function toggleTheme() {
  const current = getCurrentTheme();
  const next = current === THEME_LIGHT ? THEME_DARK : THEME_LIGHT;
  applyTheme(next);
}

/**
 * 初始化主题切换器
 */
function initThemeToggle() {
  // 应用初始主题
  const theme = getCurrentTheme();
  applyTheme(theme);

  // 创建切换按钮
  const toggle = document.createElement('button');
  toggle.className = 'theme-toggle';
  toggle.setAttribute('type', 'button');
  toggle.setAttribute('aria-label', theme === THEME_DARK ? '切换到浅色模式' : '切换到暗色模式');
  toggle.textContent = theme === THEME_DARK ? '☀️' : '🌙';
  toggle.addEventListener('click', toggleTheme);

  document.body.appendChild(toggle);

  // 监听系统主题变化
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(e.matches ? THEME_DARK : THEME_LIGHT);
      }
    });
  }
}

// 页面加载时初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeToggle);
} else {
  initThemeToggle();
}

export { getCurrentTheme, applyTheme, toggleTheme, initThemeToggle };
