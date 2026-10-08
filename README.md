# Bit by Bit

An interactive learning website for Year 9 Computer Science.

The website is available at [y9cslab.skylarp520.workers.dev](https://y9cslab.skylarp520.workers.dev).
## Purpose

This was built to teach Year 9 students and to make core Computer Science concepts easier to understand. Each idea comes with a working model students can change, so they can see the result for themselves.

## Features

- **Explanations first.** Each concept is introduced in short, plain-language paragraphs before any interaction.
- **Interactive labs.** Switches, sliders and buttons that update the result instantly.
- **Experiments.** Suggested things to try, with a "Check your thinking" answer that can be revealed.
- **Challenges.** A quiz at the end of each topic with randomly generated questions, two attempts per question and the working shown afterwards. Five correct answers complete a topic.
- **Progress tracking.** Completed topics are marked in the navigation bar and remembered in the browser.
- **Responsive design.** Works on desktop, tablet and phone.
- **Light and dark mode.** Follows the device setting automatically.

## Content

| Topic | What students learn | What students do |
|---|---|---|
| **1. Number Systems** | Binary, denary and hexadecimal, why each is used, and how to convert between them | Flip bits to build a number, follow conversions step by step, mix a colour from hex codes |
| **2. Data Representation** | How text, images and sound are stored as binary; resolution, colour depth, sampling rate and bit depth | Paint a bitmap, change image quality and watch the file size, sample a sound wave and listen to it |
| **3. Error Checking** | How errors occur during transmission; parity checks, checksums and check digits | Send data through a noisy cable, set a parity bit, find a flipped bit in a parity block, test an ISBN |
| **4. Logic Gates** | AND, OR, NOT, NAND, NOR and XOR; truth tables; logic circuits | Switch gate inputs on and off, complete truth tables, trace a signal through a circuit |
| **5. Computer Architecture** | CPU, ALU, control unit, registers, memory and the fetch–decode–execute cycle | Step through a running program and watch the registers, buses and memory change |

## Technologies

- **HTML5** for structure and content
- **CSS3** for layout and design (custom properties, Grid, Flexbox, media queries)
- **JavaScript (ES6)** for all interactivity, with no frameworks or libraries
- **SVG** for logic gate symbols and circuit diagrams
- **Canvas API** for the image and sound-wave labs
- **Web Audio API** for sound playback
- **localStorage** for saving challenge progress
- **Google Fonts** (Schibsted Grotesk, Atkinson Hyperlegible Next, Atkinson Hyperlegible Mono)

## Project structure

```
bit-by-bit/
├── index.html        Page content for all five topics
├── css/
│   └── style.css     Design, responsive layout, dark mode
└── js/
    ├── core.js       Shared code: bit switches, quiz, navigation, progress
    ├── numbers.js    Topic 1: Number Systems
    ├── data.js       Topic 2: Data Representation
    ├── errors.js     Topic 3: Error Checking
    ├── logic.js      Topic 4: Logic Gates
    ├── cpu.js        Topic 5: Computer Architecture
    └── main.js       Start-up code
```

## Notes

- The fonts are loaded from Google Fonts. Without an internet connection the site will use the device's default fonts
- Progress is saved only in the browser being used. It does not sync between devices.
- Some models are simplified for teaching. The CPU simulator has 16 memory locations and 8 instructions, and the checksum is a simple sum with the remainder after dividing by 256.
- The script files must load in the order listed in `index.html`, with `core.js` first and `main.js` last.
