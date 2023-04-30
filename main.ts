import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
const fs = require('fs');
const path = require('path');


// Remember to rename these classes and interfaces!

interface BulletPointIsolatorSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: BulletPointIsolatorSettings = {
	mySetting: 'default'
}

export default class BulletPointIsolator extends Plugin {
	settings: BulletPointIsolatorSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'BulletPointIsolator Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice i guess!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new BulletPointIsolatorModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'BulletPointIsolator editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('BulletPointIsolator Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new BulletPointIsolatorModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new BulletPointIsolatorSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {

			if (evt.altKey && evt.ctrlKey && this.getBulletPointNr(evt.target.parentNode)){

				// Get all the bullet and subbullet points.
				console.log("Bullet Point Isolator activated with Ctrl+Alt+Click.");
				const bulletPoints = this.findAllBulletPoints(evt.target.parentNode);

				// Create the text from the bullet.
				const mainOffset = bulletPoints[0].offset;
				const bulletPointContents = bulletPoints.map(bp => "\t".repeat(bp.offset - mainOffset) + bp.bullet);
				const bulletPointsText = bulletPointContents.join("\n");

				// Create the temporary file if it doesnt exist.
				const isolatedFileName = "isolated.md";
				const isolatedFileAbstract = this.app.vault.getAbstractFileByPath(isolatedFileName);
				if (isolatedFileAbstract)
					this.app.vault.delete(isolatedFileAbstract);

				// Write the bullets to the temporary file.
				this.app.vault.create(isolatedFileName, bulletPointsText);


				// Open the file in Obsidian editor using the obsidian://open protocol.
				const vaultName = this.app.vault.getName();
				const fileURI = encodeURI(`obsidian://open?vault=${vaultName}&file=${isolatedFileName}`);
				window.open(fileURI);
			}
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	getBulletPointNr(elem) {
		const match = elem.className.match(/HyperMD-list-line-(\d+)/);
		return match ? match[1] : null;
	}

	// Returns a list of div elements that are
	findAllBulletPoints(elem) {
		let sibling = elem;
		const origListNr = this.getBulletPointNr(sibling);
		let siblings = [{
			offset: origListNr,
			bullet: sibling.textContent.trim(),
			element: sibling
		}];
		while (sibling.nextSibling !== null && origListNr < this.getBulletPointNr(sibling.nextSibling)) {
			sibling = sibling.nextSibling;
			siblings.push({
				offset: this.getBulletPointNr(sibling),
				bullet: sibling.textContent.trim(),
				element: sibling
			});
		}
		console.log("siblings", siblings);
		return siblings;
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class BulletPointIsolatorModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class BulletPointIsolatorSettingTab extends PluginSettingTab {
	plugin: BulletPointIsolator;

	constructor(app: App, plugin: BulletPointIsolator) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
