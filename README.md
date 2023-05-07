# Obsidian Bullet Point Isolator

Increase your file content overview while editing drastically: Isolate MarkDown elements and its subcontent like headers, bullet points, tasks, etc. from the main file into an isolation file, edit them there and then automatically or manually write the changes back to the original file!


## Why?

A coworker demonstrated Logseq to me, which is different of a system in terms of note taking compared to Obsidian.
Although I don't feel any need to use Logseq, because it seems rather overwhelming, I did see a neat little feature that I thought was quite practical: isolation of bullet points.
I built a small version for myself and I found myself using it A LOT immediately, because it drastically increased my overview inside the files, since now all my bullet points don't have to be worked on in the same file, but can be edited in and written back from another file without much effort.
To me it became an indespensable tool, so I decided to make it into a full plugin and expand it further, since there is more goal to mine.


## How does it work?

1. Isolation
  - Manually: Select any markdown element with ```Ctrl+Alt+Click```.
  - Command: Click on a markdown element, ```Ctrl+P``` to open the command wheel and run the command ```Bullet Point Isolator: Isolate```.

2. Write Back
  - Manually: Select the root element with ```Ctrl+Alt+Click```.
  - Command: Click on a markdown element, ```Ctrl+P``` to open the command wheel and run the command ```Bullet Point Isolator: Write Back```.
  - Automatically: Just navigate away, close the file, whatever you wish to do. (Maybe not whatever, but you know what I mean.)


## Next Features

- more settings like change the hotkeys
- nested isolation from the isolation file
- support for more MD elements
- visual navigation using the keyboard up and down to "zoom the focus" on the lines around the current isolated element


---

## Releasing new releases

- Update your `manifest.json` with your new version number, such as `1.0.1`, and the minimum Obsidian version required for your latest release.
- Update your `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
- Create new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix `v`. See here for an example: https://github.com/obsidianmd/obsidian-sample-plugin/releases
- Upload the files `manifest.json`, `main.js`, `styles.css` as binary attachments. Note: The manifest.json file must be in two places, first the root path of your repository and also in the release.
- Publish the release.

> You can simplify the version bump process by running `npm version patch`, `npm version minor` or `npm version major` after updating `minAppVersion` manually in `manifest.json`.
> The command will bump version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`

## Adding your plugin to the community plugin list

- Check https://github.com/obsidianmd/obsidian-releases/blob/master/plugin-review.md
- Publish an initial version.
- Make sure you have a `README.md` file in the root of your repo.
- Make a pull request at https://github.com/obsidianmd/obsidian-releases to add your plugin.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

## Improve code quality with eslint (optional)
- [ESLint](https://eslint.org/) is a tool that analyzes your code to quickly find problems. You can run ESLint against your plugin to find common bugs and ways to improve your code. 
- To use eslint with this project, make sure to install eslint from terminal:
  - `npm install -g eslint`
- To use eslint to analyze this project use this command:
  - `eslint main.ts`
  - eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder:
  - `eslint .\src\`

## Funding URL

You can include funding URLs where people who use your plugin can financially support it.

The simple way is to set the `fundingUrl` field to your link in your `manifest.json` file:

```json
{
    "fundingUrl": "https://buymeacoffee.com"
}
```

If you have multiple URLs, you can also do:

```json
{
    "fundingUrl": {
        "Buy Me a Coffee": "https://buymeacoffee.com",
        "GitHub Sponsor": "https://github.com/sponsors",
        "Patreon": "https://www.patreon.com/"
    }
}
```

## API Documentation

See https://github.com/obsidianmd/obsidian-api
