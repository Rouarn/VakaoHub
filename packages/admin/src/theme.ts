import type { GlobalThemeOverrides } from 'naive-ui';

/**
 * 设计令牌的唯一来源是 packages/shared/design/tokens.css。
 * 这里运行时读取 CSS 变量构造 Naive UI 主题，避免在 JS 里再维护一套色值。
 */
function token(name: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!value) throw new Error(`设计令牌缺失：${name}`);
  return value;
}

export function createThemeOverrides(): GlobalThemeOverrides {
  const ink = token('--ink');
  const strong = token('--strong');
  const muted = token('--muted');
  const faint = token('--faint');
  const line = token('--line');
  const lineSoft = token('--line-soft');
  const lineStrong = token('--line-strong');
  const accent = token('--accent');
  const focusRing = token('--focus-ring');
  const paper = token('--paper');
  const raised = token('--raised');
  const tableHead = token('--table-head');
  const tableHeadText = token('--table-head-text');

  return {
    common: {
      primaryColor: ink,
      primaryColorHover: strong,
      primaryColorPressed: strong,
      primaryColorSuppl: ink,
      infoColor: accent,
      infoColorHover: accent,
      successColor: token('--success'),
      warningColor: token('--warning'),
      errorColor: token('--danger'),
      textColorBase: ink,
      textColor1: ink,
      textColor2: muted,
      textColor3: faint,
      borderColor: line,
      dividerColor: lineSoft,
      bodyColor: paper,
      cardColor: raised,
      modalColor: raised,
      popoverColor: raised,
      tableColor: raised,
      inputColor: raised,
      borderRadius: '10px',
      borderRadiusSmall: '8px',
      fontFamily: token('--body'),
      fontSize: '13px',
      fontSizeSmall: '12px',
    },
    Card: {
      borderRadius: '12px',
      color: raised,
      borderColor: line,
      titleFontSizeMedium: '14px',
      titleFontWeight: '650',
      paddingMedium: '18px 20px',
    },
    Button: {
      borderRadiusMedium: '6px',
      borderRadiusSmall: '5px',
      fontWeight: '600',
      heightMedium: '32px',
      heightSmall: '28px',
    },
    Input: {
      borderRadius: '6px',
      color: raised,
      border: `1px solid ${line}`,
      borderHover: `1px solid ${lineStrong}`,
      borderFocus: `1px solid ${accent}`,
      boxShadowFocus: `0 0 0 3px ${focusRing}`,
    },
    DataTable: {
      thColor: tableHead,
      thTextColor: tableHeadText,
      thFontWeight: '500',
      tdColor: raised,
      tdColorHover: tableHead,
      tdTextColor: ink,
      borderColor: lineSoft,
      borderRadius: '12px',
    },
    Tag: {
      borderRadius: '4px',
    },
    Modal: {
      color: raised,
    },
    Pagination: {
      itemBorderRadius: '5px',
    },
  };
}
