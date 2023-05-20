import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, EditorPosition, TextFileView, DataWriteOptions, TFile, TAbstractFile, MarkdownFileInfo } from 'obsidian';
import { start } from 'repl';


// Remember to rename these classes and interfaces!

interface BulletPointIsolatorSettings {
	isolationFileName: string;
	isolationFileFolder: string;
	isolationFilePath: string;
}

const DEFAULT_SETTINGS: BulletPointIsolatorSettings = {
	isolationFileName: "isolation.md",
	isolationFileFolder: "/",
	isolationFilePath: "isolation.md"
}


let needsWriteBackUnloadEvent = true;
let lastOpenFilePath;

export default class BulletPointIsolator extends Plugin {
	
	settings: BulletPointIsolatorSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon("dice", "BulletPointIsolator Plugin", (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice("Bullet Point Isolator.");
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		// Triggers isolation.
		this.addCommand({
			id: "bullet-point-isolator-isolate",
			name: "Isolate",
			editorCallback: async (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {

				new Notice("Bullet Point Isolator: Isolation activated per command.");

				// Isolate.
				await this.isolateBulletPoint();
			}
		});

		// Triggers writing back.
		this.addCommand({
			id: "bullet-point-isolator-write-back",
			name: "Write Back",
			editorCallback: async (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
				
				// Check if this part of the event is currently blocked.
				if (needsWriteBackUnloadEvent) {

					// Checks that we just switched from the isolation file to another file.
					if (ctx.file?.path === this.settings.isolationFilePath) {

						new Notice("Bullet Point Isolator: Write Back activated per command.");

						// Write back.
						await this.writeBackModifiedBulletPoint(null, true);
					}
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
			
			// Check if this part of the event is currently blocked.
			if (needsWriteBackUnloadEvent) {

				// Checks that we just switched from the isolation file to another file.
				if (lastOpenFilePath === this.settings.isolationFilePath && openedFile?.path !== this.settings.isolationFilePath) {

					// Check that the isolation file exists.
					const isolationFile = this.app.vault.getFiles().find(file => file.path === this.settings.isolationFilePath);
					if (isolationFile) {

						new Notice("Bullet Point Isolator: Isolation activated automatically.");

						// Write back.
						await this.writeBackModifiedBulletPoint(null, false);

					}

				}
			}

			// Set the new last opened file path to the currently opened file.
			lastOpenFilePath = openedFile?.path;
			needsWriteBackUnloadEvent = true;
		});

		// Register a DOM onclick event for if isolate or write back a bullet point.
		this.registerDomEvent(document, 'click', async (evt: MouseEvent) => {

			// Get current file line.
			const currentEditor = this.app.workspace.activeEditor;
			const focusLine = currentEditor?.editor?.getCursor().line;
			const focusLineContent = currentEditor?.editor?.getLine(focusLine);

			if (evt.altKey && evt.ctrlKey && this.checkIsBulletPoint(focusLineContent)) {

				// Get some infos about the file in focus.
				const fileOriginPath = currentEditor?.file?.path;

				// Check if the file is defined or not.
				if (!fileOriginPath) {

					this.showFailNotice("File origin is either null or undefined.");
				
				}
				else {

					// Check if the file origin is any file or the isolation file.
					if (fileOriginPath === this.settings.isolationFilePath) {
						new Notice("Bullet Point Isolator: Write back activated manually.");
						await this.writeBackModifiedBulletPoint(evt, true);
					}
					else {
						new Notice("Bullet Point Isolator: Isolation activated manually.");
						await this.isolateBulletPoint();
					}
				}
			}

		});
	}
	

	async openFileWithoutEvent(file: TFile | TAbstractFile) {
		needsWriteBackUnloadEvent = false;
		await this.app.workspace.getLeaf().openFile(file);
		needsWriteBackUnloadEvent = true;
	}

	// // Here I need to find out what element type we are dealing with and return it or null.
	// checkMdElement(text: string) {

	// }

	checkIsBulletPoint(text: string): boolean {
		return text.trim().startsWith("- ");
	}

	extractBulletPoints(lines: string[], startLine: number, normalized: boolean) {
		
		// Remove the first number of lines from the main content
		lines.splice(0, startLine);		

		// Get the first line and its offset in terms of tabs.
		const firstLine = lines.shift();
		const firstOffset = firstLine?.match(/^\t*/)[0].length;

		// Go through all following lines until one in not a bullet point or starts with equal or less tabs.
		let bullets = [firstLine];
		for (let lineNr in lines) {
			const lineOffset = lines[lineNr].match(/^\t*/)[0].length;
			const isBulletPoint = lines[lineNr].trim().startsWith("- ");
			if (!isBulletPoint || lineOffset <= firstOffset) {
				break;
			}
			bullets.push(lines[lineNr]);
		}
		
		return {
			"bullets": normalized ? bullets.map(b => b.substring(firstOffset)) : bullets,
			"offset": firstOffset
		};
	}

	async isolateBulletPoint() {

		// const currentFocusLine = this.app.workspace.activeEditor?.editor?.getCursor().line;
		const focusFilePath = this.app.workspace.activeEditor?.file?.path;
		
		// A selected line is required.
		const focusLineNr = this.app.workspace.activeEditor?.editor?.getCursor().line;
		if (focusLineNr === undefined || focusLineNr < 0) {
			this.showFailNotice("No line in focus.");
			return;
		}
		
		// Check if line is a supported markdown element.
		const focusLineContent = this.app.workspace.activeEditor?.editor?.getLine(focusLineNr);
		const isBulletPoint = this.checkIsBulletPoint(focusLineContent);
		if (!isBulletPoint) {
			this.showFailNotice("Not a supported MarkDown element.");
			return;
		}

		// Get the focus file.
		const focusFile = this.app.vault.getFiles().find(file => file.path === focusFilePath);
		if (!focusFile) {
			this.showFailNotice("Focus file doesn't exist.");
			return;
		}

		// Get all the bullet and subbullet points.
		const focusFileContent = await this.app.vault.read(focusFile);
		const focusFileLines = focusFileContent.split("\n");
		const extractedBulletPoints = this.extractBulletPoints(focusFileLines, focusLineNr, true);

		// Create the frontmatter.
		const frontmatterLines = [
			"---",
			`origin: ${this.app.workspace.activeEditor?.file?.path}`,
			`startLine: ${focusLineNr}`,
			`endLine: ${focusLineNr + extractedBulletPoints.bullets.length - 1}`,
			`offset: ${extractedBulletPoints.offset}`,
			"---"
		]

		// Join the lines to use them inside the create function later.
		const contentToIsolate = [...frontmatterLines, ...extractedBulletPoints.bullets].join("\n");

		// Create the temporary file if it doesnt exist otherwise delete it first.
		const isolatedFileAbstract = this.app.vault.getAbstractFileByPath(this.settings.isolationFilePath);
		if (isolatedFileAbstract)
			this.app.vault.delete(isolatedFileAbstract);

		// Write the bullets to the temporary file.
		const isolatedFile = await this.app.vault.create(this.settings.isolationFilePath, contentToIsolate);

		// Create new leaf and open a file there.
		await this.app.workspace.getLeaf().openFile(isolatedFile);

	}

	async writeBackModifiedBulletPoint(evt: MouseEvent | null, openOriginFileAfter: boolean) {

		// Check the event target if an event is supplied.
		if (evt) {

			// If event then there must be a line in focus.
			const currentEditor = this.app.workspace.activeEditor?.editor;
			const focusLine = currentEditor?.getCursor().line;
			const focusLineContent = currentEditor?.getLine(focusLine);
			
			// To trigger a write back with a mouse event the user must click on a bullet point.
			const bulletPointNr = this.checkIsBulletPoint(focusLineContent);
			if (bulletPointNr === null) {
				this.showFailNotice("Line in focus doesn't have bullet point.");
				return;
			}
			else if (this.extractBulletPoints([focusLineContent], 0, true).offset !== 0) {
				this.showFailNotice("Line in focus isn't root bullet point.");
				return;
			}
			
		}

		// Check and find the isolation file and get its content.
		const isolationFile = this.app.vault.getFiles().find(file => file.path === this.settings.isolationFilePath);
		if (!isolationFile) {
			this.showFailNotice("No isolation file.");
			return;
		}
		const isolationFileContent = await this.app.vault.read(isolationFile);

		// Extract the frontmatter from the isolation file.
		let isolationFileFm;
		await this.app.fileManager
			.processFrontMatter(isolationFile, (frontmatter) => isolationFileFm = frontmatter)
			.catch(_ => this.showFailNotice("Processing frontmatter."));
		if (!isolationFileFm) {
			this.showFailNotice("Couldn't process frontmatter.");
			return;
		}

		// Extract the contents to write back from the isolation file.
		const frontmatterMatch = isolationFileContent.match(/^---\n([\s\S]*?)\n---\n/);
		if (!frontmatterMatch) {
			this.showFailNotice("No text to write back from the isolation file.");
			return;
		}
		const isolationFileText = isolationFileContent.replace(frontmatterMatch[0], "");
		const isolationFileLines = isolationFileText.split("\n");

		// Apply the offset.
		const offsetIsolationFileLines = isolationFileLines.map(line => "\t".repeat(isolationFileFm.offset) + line);

		// Check and get the origin file.
		const originFilePath = isolationFileFm.origin;
		const originFile = this.app.vault.getFiles().find(file => file.path === originFilePath);
		if (!originFile) {
			this.showFailNotice("Origin file doesn't exist.");
			// return;
		}
		
		// Write back the isolated content into the origin file.
		const originFileContent = await this.app.vault.read(originFile);
		const originFileLines = originFileContent.split("\n");
		const originLinesToRemoveRange = isolationFileFm.endLine + 1 - isolationFileFm.startLine;
		originFileLines.splice(isolationFileFm.startLine, originLinesToRemoveRange, ...offsetIsolationFileLines);
		const modifiedOriginContent = originFileLines.join("\n");

		// Apply the changes to the origin file.
		await this.app.vault.modify(originFile, modifiedOriginContent);

		// Open the origin file or the given file to open after.
		if (openOriginFileAfter) {
			needsWriteBackUnloadEvent = false;
			await this.app.workspace.getLeaf().openFile(originFile);
		}
		
		// Delete the isolation file.
		await this.app.vault.delete(this.app.vault.getAbstractFileByPath(this.settings.isolationFilePath));

	}

	showFailNotice(msg: string) {
		new Notice("BulletPointIsolation failed: " + msg);
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

	updateIsolationFilePath(): void {
		this.plugin.settings.isolationFilePath = 
			(this.plugin.settings.isolationFileFolder === "/")
				? this.plugin.settings.isolationFileName
				: this.plugin.settings.isolationFileFolder + this.plugin.settings.isolationFileName;
	}

	display(): void {

		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl("h2", {text: "Bullet Point Isolator Plugin - Settings"});

		new Setting(containerEl)
			.setName("Isolation file name")
			.setDesc("The name of the isolation file.")
			.addText(text => text
				.setPlaceholder("The name of the isolation file.")
				.setValue(this.plugin.settings.isolationFileName)
				.onChange(async (value) => {
					this.plugin.settings.isolationFileName = value;
					this.updateIsolationFilePath();
					console.log(this.plugin.settings);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Isolation file folder path")
			.setDesc("The path where the isolation file should be created.")
			.addDropdown(dropdown => {
				const folders = this.app.vault.getFiles().map(file => file.parent?.path).unique();
				folders.forEach(folder => dropdown.addOption(folder, folder));
				dropdown
					.setValue(this.plugin.settings.isolationFileFolder)
					.onChange(async (value) => {
						this.plugin.settings.isolationFileFolder = value;
						this.updateIsolationFilePath();
						console.log(this.plugin.settings);
						await this.plugin.saveSettings();
					})
			});

	}
}
