import {
  App,
  MarkdownView,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
} from "obsidian";
import { format } from "prettier/standalone";
// @ts-ignore
import markdownParser from "prettier/parser-markdown";

interface PrettierSettings {
  options: string;
}

const DEFAULT_SETTINGS: PrettierSettings = {
  options: "{}",
};

export default class PrettierPlugin extends Plugin {
  settings: PrettierSettings;

  async onload() {
    console.log("Loading Prettier");

    await this.loadSettings();

    this.addRibbonIcon("dice", "Run Prettier All", async () => {
      await this.runPrettierAll();
    });

    this.addSettingTab(new PrettierSettingTab(this.app, this));

    this.addCommand({
      id: "prettier-run",
      name: "Run",
      callback: () => this.runPrettier(),
      hotkeys: [
        {
          modifiers: ["Mod", "Alt"],
          key: "l",
        },
      ],
    });
  }

  onunload() {
    console.log("Unloading Prettier");
  }

  runPrettier() {
    const view = this.app.workspace.activeLeaf.view;
    if (view instanceof MarkdownView) {
      // Do work here
      const editor = view.sourceMode.cmEditor;

      // Remember the cursor
      const cursor = editor.getCursor();

      editor.execCommand("selectAll");
      let text = editor.getSelection();

      try {
        const formatted = this.runFormat(text);
        new Notice("Prettier: formatted");
        editor.replaceSelection(formatted, "start");
        editor.setCursor(cursor);
      } catch (e) {
        console.error(e);
        if (e.message) {
          new Notice(e.message);
        }
      }
    }
  }

  runFormat(text: string) {
    return format(text, {
      ...JSON.parse(this.settings.options || "{}"),
      parser: "markdown",
      plugins: [markdownParser],
    });
  }

  async runPrettierAll() {
    for (const markdownFile of this.app.vault.getMarkdownFiles()) {
      const content = await this.app.vault.read(markdownFile);
      const formatted = this.runFormat(content);
      await this.app.vault.modify(markdownFile, formatted);
    }
  }

  async loadSettings() {
    this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class PrettierSettingTab extends PluginSettingTab {
  plugin: PrettierPlugin;

  constructor(app: App, plugin: PrettierPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Prettier Settings" });

    new Setting(containerEl)
      .setName("Prettier Options")
      .setDesc(this.newOptionsDoc())
      .addTextArea((text) => {
        text
          .setValue(this.plugin.settings.options || "{}")
          .onChange(async (value) => {
            this.plugin.settings.options = value;
            try {
              JSON.parse(this.plugin.settings.options);
              await this.plugin.saveSettings();
            } catch (e) {}
          });
        text.inputEl.rows = 8;
        text.inputEl.cols = 40;
      });
  }

  private newOptionsDoc(): DocumentFragment {
    const descEl = document.createDocumentFragment();
    descEl.appendText("See: ");
    const a = document.createElement("a");
    a.href = "https://prettier.io/docs/en/options.html";
    a.text = "Prettier Options";
    a.target = "_blank";
    descEl.appendChild(a);
    return descEl;
  }
}
