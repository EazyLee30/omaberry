/* OmaBerry Vector Icon Library — Pure SVG, Zero Unicode Emojis
 * Designed specifically for Berry Browser / Q20 CJK font environment.
 */

'use strict';

window.OB = window.OB || {};

window.OB.Icons = {
  // Official Omarchy Logo block glyph
  omarchy: '<svg viewBox="0 0 16 16" class="icon-svg" style="color:var(--ob-accent-blue)"><path fill-rule="evenodd" clip-rule="evenodd" d="M1 1h14v14H1V1zm2 2v10h10V3H3zm2 2h6v6H5V5z" fill="currentColor"/></svg>',
  
  // Terminal >_
  terminal: '<svg viewBox="0 0 16 16" class="icon-svg"><path d="M2 3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2zm2 2.5 3 2.5-3 2.5V5.5zm5 4.5h3v1H9v-1z" fill="currentColor"/></svg>',

  // Folder
  folder: '<svg viewBox="0 0 16 16" class="icon-svg"><path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h3.764a1.5 1.5 0 0 1 1.06.44L8.707 3.824A.5.5 0 0 0 9.06 4H13.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z" fill="currentColor"/></svg>',

  // Document File
  file: '<svg viewBox="0 0 16 16" class="icon-svg"><path d="M4 1.5A1.5 1.5 0 0 0 2.5 3v10A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5V5.5L9.5 1.5H4zm5 1 3 3H9v-3zM4 3h4v3.5a.5.5 0 0 0 .5.5H12v6.5a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5z" fill="currentColor"/></svg>',

  // Web Browser / Globe
  browser: '<svg viewBox="0 0 16 16" class="icon-svg"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm5.93 7h-2.95a12.8 12.8 0 0 0-.82-4.13A6.98 6.98 0 0 1 13.93 7zM8 1.07c.83 1.2 1.5 2.8 1.83 4.93H6.17C6.5 3.87 7.17 2.27 8 1.07zM1.84 9h2.95c.18 1.5.49 2.91.89 4.13A6.98 6.98 0 0 1 1.84 9zm2.95-2H1.84a6.98 6.98 0 0 1 3.9-4.13c-.4 1.22-.71 2.63-.89 4.13zM8 14.93c-.83-1.2-1.5-2.8-1.83-4.93h3.66c-.33 2.13-1 3.73-1.83 4.93zm1.96-5.93H6.04A11.7 11.7 0 0 1 6 8c0-.34.01-.67.04-1h3.92c.03.33.04.66.04 1 0 .34-.01.67-.04 1zm.2 4.13c.4-1.22.71-2.63.89-4.13h2.95a6.98 6.98 0 0 1-3.84 4.13z" fill="currentColor"/></svg>',

  // Sysinfo / CPU
  sysinfo: '<svg viewBox="0 0 16 16" class="icon-svg"><path d="M5 0a1 1 0 0 1 1 1v1h4V1a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v1h1a1 1 0 1 1 0 2h-1v4h1a1 1 0 1 1 0 2h-1v1a2 2 0 0 1-2 2h-1v1a1 1 0 1 1-2 0v-1H6v1a1 1 0 1 1-2 0v-1H3a2 2 0 0 1-2-2v-1H0a1 1 0 1 1 0-2h1V7H0a1 1 0 0 1 0-2h1V4a2 2 0 0 1 2-2h1V1a1 1 0 0 1 1-1zm8 4H3v8h10V4zM5 6h6v4H5V6z" fill="currentColor"/></svg>',

  // Wi-Fi
  wifi: '<svg viewBox="0 0 16 16" class="icon-svg"><path d="M8 12.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm-3.5-3.04a4.95 4.95 0 0 1 7 0 .75.75 0 0 1-1.06 1.06 3.45 3.45 0 0 0-4.88 0 .75.75 0 0 1-1.06-1.06zm-2.83-2.83a8.95 8.95 0 0 1 12.66 0 .75.75 0 0 1-1.06 1.06 7.45 7.45 0 0 0-10.54 0 .75.75 0 0 1-1.06-1.06z" fill="currentColor"/></svg>',

  // Battery
  battery: '<svg viewBox="0 0 16 16" class="icon-svg"><path d="M2 4.5A1.5 1.5 0 0 0 .5 6v4A1.5 1.5 0 0 0 2 11.5h10a1.5 1.5 0 0 0 1.5-1.5V9.5h1a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1h-1V6A1.5 1.5 0 0 0 12 4.5H2zm0 1h10a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5H2a.5.5 0 0 1-.5-.5V6a.5.5 0 0 1 .5-.5zm1 1.5v3h6v-3H3z" fill="currentColor"/></svg>',

  // Search
  search: '<svg viewBox="0 0 16 16" class="icon-svg"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" fill="currentColor"/></svg>',

  // Controls / Settings
  settings: '<svg viewBox="0 0 16 16" class="icon-svg"><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" fill="currentColor"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z" fill="currentColor"/></svg>',

  // Agent / AI Spark
  agent: '<svg viewBox="0 0 16 16" class="icon-svg"><path d="M8 1.5a6.5 6.5 0 0 0-6.5 6.5c0 1.9.82 3.61 2.13 4.8.2.18.37.52.37.8v.9a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-.9c0-.28.17-.62.37-.8 1.31-1.19 2.13-2.9 2.13-4.8A6.5 6.5 0 0 0 8 1.5zM6 10h4v1H6v-1zm1-3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" fill="currentColor"/></svg>',

  // Lock / Security
  lock: '<svg viewBox="0 0 16 16" class="icon-svg"><path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1.5V4.5A3.5 3.5 0 0 0 8 1zm2 5H6V4.5a2 2 0 1 1 4 0V6z" fill="currentColor"/></svg>',

  // Refresh
  refresh: '<svg viewBox="0 0 16 16" class="icon-svg"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" fill="currentColor"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" fill="currentColor"/></svg>',

  // Package / qpkg
  package: '<svg viewBox="0 0 16 16" class="icon-svg"><path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5a.5.5 0 0 0-.346.47v7.06a.5.5 0 0 0 .346.47l5.968 2.387a.5.5 0 0 0 .372 0l5.968-2.387a.5.5 0 0 0 .346-.47V3.97a.5.5 0 0 0-.346-.47L8.186 1.113zM8 2.08l5.05 2.02L8 6.12 2.95 4.1 8 2.08zM2.5 5.08l5 2v6.64l-5-2V5.08zm6 8.64V7.08l5-2v6.64l-5 2z" fill="currentColor"/></svg>',

  // Git
  git: '<svg viewBox="0 0 16 16" class="icon-svg"><path fill-rule="evenodd" d="M11.75 8a1.75 1.75 0 1 0-2.35 1.65l-1.9 1.9a1.75 1.75 0 1 0 1.06 1.06l1.9-1.9c.38.16.8.25 1.29.25a1.75 1.75 0 0 0 0-3.5zm-7.5-6a1.75 1.75 0 1 0 1.25 2.97l2.44 2.44A1.75 1.75 0 0 0 8.5 8c.24 0 .47.05.68.13L7.75 9.56a1.75 1.75 0 0 0-1.25-.06L4.06 7.06A1.75 1.75 0 0 0 2.5 5.5a1.75 1.75 0 0 0 1.75-3.5z" fill="currentColor"/></svg>',

  // Up Chevron
  up: '<svg viewBox="0 0 16 16" class="icon-svg"><path fill-rule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z" fill="currentColor"/></svg>'
};
