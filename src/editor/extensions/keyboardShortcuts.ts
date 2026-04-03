import { Extension } from '@tiptap/core';

export type ShortcutHandlers = {
  toggleSidebar: () => void;
  switchTab: (tab: string) => void;
  newDocument: () => void;
  openSwitcher: () => void;
  openExport: () => void;
  forceSave: () => void;
  openSettings: () => void;
  openLink: () => void;
  toggleStrikethrough: () => void;
  duplicateParagraph: () => void;
  moveParagraphUp: () => void;
  moveParagraphDown: () => void;
  showShortcutHelp: () => void;
  openFindReplace: () => void;
  toggleFullscreen: () => void;
};

export const KeyboardShortcuts = Extension.create<{ handlers: ShortcutHandlers }>({
  name: 'appKeyboardShortcuts',

  addOptions() {
    return {
      handlers: {
        toggleSidebar: () => {},
        switchTab: () => {},
        newDocument: () => {},
        openSwitcher: () => {},
        openExport: () => {},
        forceSave: () => {},
        openSettings: () => {},
        openLink: () => {},
        toggleStrikethrough: () => {},
        duplicateParagraph: () => {},
        moveParagraphUp: () => {},
        moveParagraphDown: () => {},
        showShortcutHelp: () => {},
        openFindReplace: () => {},
        toggleFullscreen: () => {},
      },
    };
  },

  addKeyboardShortcuts() {
    const h = this.options.handlers;
    return {
      'Mod-\\': () => {
        h.toggleSidebar();
        return true;
      },
      'Mod-Shift-r': () => {
        h.switchTab('research');
        return true;
      },
      'Mod-Shift-s': () => {
        h.switchTab('scaffold');
        return true;
      },
      'Mod-Shift-o': () => {
        h.switchTab('outline');
        return true;
      },
      'Mod-Shift-f': () => {
        h.switchTab('search');
        return true;
      },
      'Mod-Shift-n': () => {
        h.switchTab('notes');
        return true;
      },
      'Mod-n': () => {
        h.newDocument();
        return true;
      },
      'Mod-p': () => {
        h.openSwitcher();
        return true;
      },
      'Mod-Shift-e': () => {
        h.openExport();
        return true;
      },
      'Mod-s': () => {
        h.forceSave();
        return true;
      },
      'Mod-,': () => {
        h.openSettings();
        return true;
      },
      'Mod-k': () => {
        h.openLink();
        return true;
      },
      'Mod-Shift-x': () => {
        h.toggleStrikethrough();
        return true;
      },
      'Mod-d': () => {
        h.duplicateParagraph();
        return true;
      },
      'Mod-Shift-ArrowUp': () => {
        h.moveParagraphUp();
        return true;
      },
      'Mod-Shift-ArrowDown': () => {
        h.moveParagraphDown();
        return true;
      },
      'Mod-/': () => {
        h.showShortcutHelp();
        return true;
      },
      'Mod-f': () => {
        h.openFindReplace();
        return true;
      },
      'Mod-Shift-Enter': () => {
        h.toggleFullscreen();
        return true;
      },
    };
  },
});
