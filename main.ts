import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, EditorPosition, TextFileView, TFile, TAbstractFile } from 'obsidian';


// Remember to rename these classes and interfaces!

interface BulletPointIsolatorSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: BulletPointIsolatorSettings = {
	mySetting: 'default'
}

let needsWriteBackUnloadEvent = true;
let lastOpenFilePath;

const ISOLATION_FILE_PATH = "isolation.md";

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

		// Set the on file-open event that checks if we want to write back the bullet point.
		this.app.workspace.on("file-open", async (openedFile) => {

			// Set the last opened file to the current file.
			if (!lastOpenFilePath)
				lastOpenFilePath = openedFile?.path;
			console.log("Before", openedFile?.path);
			
			// Check if this part of the event is currently blocked.
			if (needsWriteBackUnloadEvent) {

				// Checks that we just switched from the isolation file to another file.
				if (lastOpenFilePath === ISOLATION_FILE_PATH && openedFile?.path !== ISOLATION_FILE_PATH) {

					// Check that the isolation file exists.
					const isolationFile = this.app.vault.getFiles().find(file => file.path === ISOLATION_FILE_PATH);
					if (isolationFile) {

						// First open the isolation file in the editor and write back.
						// needsWriteBackUnloadEvent = false;
						await this.app.workspace.getLeaf().openFile(isolationFile);
						// needsWriteBackUnloadEvent = true;
						// await this.openFileWithoutEvent(isolationFile);
						// await this.writeBackModifiedBulletPoint(null);
						this
							.writeBackModifiedBulletPoint(null)
							.then(async () => await this.app.workspace.getLeaf().openFile(openedFile));

						// // Open the file started from back open.
						// console.log("File before", openedFile);
						// // await this.openFileWithoutEvent(openedFile);
						// await this.app.workspace.getLeaf().openFile(openedFile);
						// console.log("File after", openedFile);
						console.log("After", openedFile?.path);

					}

				}
			}

			// Skiii
			lastOpenFilePath = openedFile?.path;
		});

		// Register a DOM onclick event for if isolate or write back a bullet point.
		this.registerDomEvent(document, 'click', async (evt: MouseEvent) => {
			if (evt.altKey && evt.ctrlKey && this.getBulletPointNr(evt.target.parentNode)) {

				// Get some infos about the file in focus.
				const fileOriginPath = this.app.workspace.activeEditor?.file.path;

				// Check if the file is defined or not.
				if (fileOriginPath === null || fileOriginPath === undefined) {
					this.showNotice("file origin is either null or undefined", true);
				}
				else {

					this.showNotice("Bullet Point Isolator activated.");

					// Check if the file origin is any file or the isolation file.
					fileOriginPath === ISOLATION_FILE_PATH
						? await this.writeBackModifiedBulletPoint(evt)
						: await this.isolateBulletPoint(evt);
				}

			}
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}
	

	async openFileWithoutEvent(file: TFile | TAbstractFile) {
		needsWriteBackUnloadEvent = false;
		await this.app.workspace.getLeaf().openFile(file);
		needsWriteBackUnloadEvent = true;
	}

	async isolateBulletPoint(evt: MouseEvent) {

		const currentFocusLine = this.app.workspace.activeEditor?.editor?.getCursor().line;

		// A selected line is required.
		if (currentFocusLine === undefined || currentFocusLine === null) {
			this.showNotice("no line in focus", true);
			return;
		}

		// The selected file must contain a bullet point.
		const isBulletPoint = this.getBulletPointNr(evt.target.parentNode);
		if (isBulletPoint === null) {
			this.showNotice("line in focus doesn't have bullet point", true);
			return;
		}
		// Get all the bullet and subbullet points.
		const bulletPointsCount = this.countBulletPointLines(evt.target.parentNode);

		// Get current active line.
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

			// Normalize the leading spaces and if it is a space then replace it with tabs.
			if (rootOffset >= 1) {
				lineToIsolate = lineToIsolate?.substring(rootOffset);
			}

			// Push the line to the array.
			linesToIsolate.push(lineToIsolate);
		}

		// Join the lines to use them inside the create function later.
		let bulletPointsText = linesToIsolate.join("\n");

		// Add some frontmatter to the bulletpoint to copy.
		const frontmatterJson = {
			"origin": this.app.workspace.activeEditor?.file?.path,
			"startLine": currentFocusLine,
			"endLine": currentFocusLine + bulletPointsCount - 1,
			"offset": rootOffset
		}
		const frontmatter = this.convertJsonToFrontmatter(frontmatterJson);
		bulletPointsText = frontmatter + bulletPointsText;

		// Create the temporary file if it doesnt exist otherwise delete it first.
		const isolatedFileAbstract = this.app.vault.getAbstractFileByPath(ISOLATION_FILE_PATH);
		if (isolatedFileAbstract)
			this.app.vault.delete(isolatedFileAbstract);

		// Write the bullets to the temporary file.
		const isolatedFile = await this.app.vault.create(ISOLATION_FILE_PATH, bulletPointsText);

		// Create new leaf and open a file there.
		await this.app.workspace.getLeaf().openFile(isolatedFile);

		// this.setIsolationFileUnloadEvent();

	}

	async writeBackModifiedBulletPoint(evt: MouseEvent | null | undefined) {

		const fileOrigin = this.app.workspace.activeEditor?.file;

		// The selected file must contain a bullet point.
		if (evt) {
			const bulletPointNr = this.getBulletPointNr(evt.target.parentNode);
			if (bulletPointNr === null) {
				this.showNotice("line in focus doesn't have bullet point", true);
				return;
			}
			else if ( bulletPointNr !== 1) {
				this.showNotice("line in focus isn't root bullet point", true);
				return;
			}
		}

		// Process the frontmatter, then modify the files using those as input.
		let fm;
		await this.app.fileManager.processFrontMatter(fileOrigin, (frontmatter) => fm = frontmatter);
		// await this.app.fileManager.processFrontMatter(fileOrigin, async (fm) => {
		if (fm) {
			// Get the amount of lines we need to write.
			const fmLength = Object.keys(fm).length + 2;
			const isolationFileLineCount = this.app.workspace.activeEditor?.editor?.lineCount();
			const isolatedFileAbstract = this.app.workspace.activeEditor?.file;

			// Read the lines to transfer.
			let linesToWrite = [];
			for (let lineNr = fmLength; lineNr < isolationFileLineCount; lineNr++) {
				linesToWrite.push(this.app.workspace.activeEditor?.editor?.getLine(lineNr));
			}
			const linesToWriteCount = linesToWrite.length;

			// Open the origin file and get the editor.
			needsWriteBackUnloadEvent = false;
			const originFileAbstract = this.app.vault.getAbstractFileByPath(fm.origin);
			// await this.openFileWithoutEvent(originFileAbstract);
			console.log("Opening file in heree");
			await this.app.workspace.getLeaf().openFile(originFileAbstract);
			const currentEditor = this.app.workspace.activeEditor?.editor;

			// Free up the space in the origin file.
			for (let lineNr = fm.startLine; lineNr < fm.endLine; lineNr++) {
				currentEditor?.setLine(lineNr, "");
			}
			// TODO Check what if less lines.
			if (linesToWriteCount > ((fm.endLine - fm.startLine) + 1)) {
				// Set the last line to
				const spacers = "\n".repeat(linesToWriteCount - ((fm.endLine - fm.startLine) + 1));
				currentEditor?.setLine(fm.endLine, spacers);
			}
			else {
				// Set the last line of the range to write to a simple space.
				currentEditor?.setLine(fm.endLine, "");
			}

			// Transfer the lines from isolation to the new place.
			for (let i = 0; i < linesToWriteCount; i++) {
				const lineToWrite = fm.startLine + i;
				currentEditor?.setLine(lineToWrite, "\t".repeat(fm.offset) + linesToWrite[i]);
			}

			// Delete the isolation file.
			await this.app.vault.delete(isolatedFileAbstract);

			needsWriteBackUnloadEvent = true;
		// });
		}
	}

	showNotice(msg, isFail: boolean = false) {
		new Notice(isFail ? `BulletPointIsolation failed: ${msg}.` : msg);
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
