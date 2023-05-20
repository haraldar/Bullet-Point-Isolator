# Obsidian z

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