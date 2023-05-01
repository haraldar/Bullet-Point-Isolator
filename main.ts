import { test } from 'node:test';
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
		this.registerDomEvent(document, 'click', async (evt: MouseEvent) => {
			await this.isolateBulletPoint(evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	async isolateBulletPoint(evt: MouseEvent) {
		
		if (evt.altKey && evt.ctrlKey && this.getBulletPointNr(evt.target.parentNode)) {
			
			console.log("Bullet Point Isolator activated with Ctrl+Alt+Click.");

			// Get some metadata.
			const fileOrigin = this.app.workspace.activeEditor?.file;

			// Get all the bullet and subbullet points.
			const bulletPointsCount = this.countBulletPointLines(evt.target.parentNode);

			// Get current active line.
			const currentFocusLine = this.app.workspace.activeEditor?.editor?.getCursor().line;
			let rootLine = this.app.workspace.activeEditor?.editor?.getLine(currentFocusLine);

			// Get the root offset and normalize the first line.
			const rootOffset = rootLine?.match(/^\s*/)[0].length;
			if (rootOffset >= 1)
				rootLine = rootLine.substring(rootOffset);

			// Iterate through the lines affected by the click.
			let linesToIsolate = [rootLine];
			for (let i = 1; i < bulletPointsCount; i++) {

				// Get the line.
				let lineToIsolate = this.app.workspace.activeEditor?.editor?.getLine(currentFocusLine + i);
				
				// Normalize the leading spaces.
				if (rootOffset >= 1) {
					lineToIsolate = lineToIsolate?.substring(rootOffset);
				}

				// Push the line to the array.
				linesToIsolate.push(lineToIsolate);
			}
			

			// Join the lines to use them inside the create function later.
			let bulletPointsText = linesToIsolate.join("\n");

			// Add some frontmatter.
			const frontmatterJson = {
				"origin": this.app.workspace.activeEditor?.file?.path,
				"line": currentFocusLine
			}
			const frontmatter = this.convertJsonToFrontmatter(frontmatterJson);
			bulletPointsText = frontmatter + bulletPointsText;
			
			// Create the temporary file if it doesnt exist otherwise delete it first.
			const isolatedFileName = "isolated.md";
			const isolatedFileAbstract = this.app.vault.getAbstractFileByPath(isolatedFileName);
			if (isolatedFileAbstract)
				this.app.vault.delete(isolatedFileAbstract);
			
			// Write the bullets to the temporary file.
			const isolatedFile = await this.app.vault.create(isolatedFileName, bulletPointsText);

			// const metadata = { origin: fileOrigin }
			// const { content, data } = fm(isolatedFile)
			this.app.fileManager.processFrontMatter(isolatedFile, (res) => console.log(res));
			// let fileCache = this.app.metadataCache.getFileCache(isolatedFile);
			// console.log(fileCache);
			
			// Create new leaf and open a file there.
			await this.app.workspace.getLeaf().openFile(isolatedFile);
			
		}
	}

	getBulletPointNr(elem) {
		const match = elem.className.match(/HyperMD-list-line-(\d+)/);
		return match ? parseInt(match[1]) : null;
	}

	countBulletPointLines(elem) {

		// Set the passed element as initial sibling and het its offset number.
		let sibling = elem;
		const rootOffset = this.getBulletPointNr(sibling);

		let siblingCount = 1;
		while (sibling.nextSibling !== null) {


			// Set the sibling as its next sibling.
			sibling = sibling.nextSibling;
			
			// If the offset number is equal or less, break the loop.
			const siblingOffset = this.getBulletPointNr(sibling);
			if (rootOffset >= siblingOffset)
				break;

			// Increment the siblings count.
			siblingCount++;
		}

		return siblingCount;
	}

	convertJsonToFrontmatter(obj, pendingNewline: boolean = true) {
		let frontmatterArr = Object.keys(obj).map((key) => `${key}: ${obj[key]}`);
		frontmatterArr.push("---");
		frontmatterArr.unshift("---");
		let frontmatterText = frontmatterArr.join("\n")
		return pendingNewline
			? frontmatterText + "\n"
			: frontmatterText;
	}
	
	// openFileWithObsidianProtocol(vaultName, filePath) {
	// 	const fileURI = encodeURI(`obsidian://open?vault=${vaultName}&file=${filePath}`);
	// 	window.open(fileURI);
	// }

	// offsetClassNameNr(className, offset = -1) {
	// 	return className
	// 		.replace(
	// 			/HyperMD-list-line-(\d+)/,
	// 			(match, lineNumber) => {
	// 				const newLineNumber = parseInt(lineNumber) + offset;
	// 				// return `HyperMD-list-line-1`;
	// 				return `HyperMD-list-line-${newLineNumber}`;
	// 			}
	// 		);
	// }

	// offsetBulletPoint(elem: HTMLElement, offset: number = -1) {
	// 	const indentNr = this.getBulletPointNr(elem);
	// 	// const bufferElement = elem.querySelector('.cm-widgetBuffer');
	// 	// if (bufferElement) {
	// 	//   const remainingElements = Array.from(bufferElement.nextElementSibling.children);
	// 	//   elem.replaceChildren(...remainingElements);
	// 	// }
	// 	console.log(elem);
	// 	console.log(elem.textContent?.trim());
	// 	// return className
	// 	// 	.replace(
	// 	// 		/HyperMD-list-line-(\d+)/,
	// 	// 		(match, lineNumber) => {
	// 	// 			const newLineNumber = parseInt(lineNumber) + offset;
	// 	// 			return `HyperMD-list-line-1`;
	// 	// 			// return `HyperMD-list-line-${newLineNumber}`;
	// 	// 		}
	// 	// 	);
	// }


	// // Returns a list of div elements that are
	// findAllBulletPoints(elem) {

	// 	// Set the passed element as initial sibling and het its offset number.
	// 	let sibling = elem;
	// 	const rootOffset = this.getBulletPointNr(sibling);

	// 	// Iterate through all the next siblings as long as a next one exists.
	// 	let siblings = [{
	// 		offset: rootOffset,
	// 		bullet: sibling.textContent.trim(),
	// 		element: sibling
	// 	}];
	// 	while (sibling.nextSibling !== null) {


	// 		// Set the sibling as its next sibling.
	// 		sibling = sibling.nextSibling;
			
	// 		// If the offset number is equal or less, break the loop.
	// 		const siblingOffset = this.getBulletPointNr(sibling);
	// 		if (rootOffset >= siblingOffset)
	// 			break;

	// 		// Replace the offset number in the class name of the element if the rootOffset is not already 1.
	// 		if (rootOffset > 1) {
	// 			const newClasses = this.offsetClassNameNr(sibling.className);
	// 			sibling.classList.remove(...sibling.classList);
	// 			newClasses.split(" ").forEach(c => sibling.classList.add(c));
	// 		}

	// 		siblings.push({
	// 			offset: siblingOffset,
	// 			bullet: sibling.textContent.trim(),
	// 			element: sibling
	// 		});
	// 	}

	// 	return {
	// 		offset: rootOffset,
	// 		originalFile: this.app.workspace.getActiveFile()?.path,
	// 		lineNr: this.app.workspace.activeEditor?.editor,
	// 		elements: siblings
	// 	}
	// }

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
