# 🔍 Ripgrep Helper UI

A modern, interactive web interface for building powerful ripgrep commands. Built with SolidJS and styled with a GitHub Dark-inspired theme.

![Ripgrep Helper UI](https://raw.githubusercontent.com/remcostoeten/ripgrep-helperr/main/src/assets/preview.png)

## ✨ Features

- 🎯 Interactive UI for building ripgrep commands
- 🎨 Beautiful GitHub Dark-inspired theme
- ⚡ Real-time command generation
- 🔥 Preset filters for common use cases:
  - Web Development (JS/TS, CSS, HTML)
  - Documentation (MD, TXT, RST)
  - Configuration Files (JSON, YAML, ENV)
  - Images (JPG, PNG, SVG)
  - Backend Code (Python, Ruby, Java)
- ⌨️ Keyboard shortcuts for quick navigation
- 💾 Automatic state persistence
- 📱 Responsive design for all screen sizes

## 🚀 Quick Start

1. Clone the repository:
```bash
git clone https://github.com/remcostoeten/ripgrep-helperr.git
cd ripgrep-helperr
```

2. Install dependencies:
```bash
pnpm install
```

3. Start the development server:
```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🛠️ Built With

- [SolidJS](https://www.solidjs.com/) - A declarative JavaScript library for building user interfaces
- [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling
- [PrismJS](https://prismjs.com/) - Syntax highlighting
- [TypeScript](https://www.typescriptlang.org/) - Type safety and better developer experience

## 📦 Production Build

To create a production build:

```bash
pnpm build
```

The build artifacts will be stored in the `dist/` directory.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```bash
$ npm install # or pnpm install or yarn install
```

### Learn more on the [Solid Website](https://solidjs.com) and come chat with us on our [Discord](https://discord.com/invite/solidjs)

## Available Scripts

In the project directory, you can run:

### `npm run dev` or `npm start`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>

### `npm run build`

Builds the app for production to the `dist` folder.<br>
It correctly bundles Solid in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

## Deployment

You can deploy the `dist` folder to any static host provider (netlify, surge, now, etc.)
