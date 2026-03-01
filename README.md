# KanDo!

Holochain hApp for collaborative KanBan boards.

Real-time colloaboration delivered by [syn](https://github.com/holochain/syn).

## Android

### Environment Setup

This app supports android using p2p-shipyard.

To setup the android development environment:


1. Enter the android development nix shell:

```bash
nix develop .#androidDev
npm install
```

2. Create an android signing key, following these [instructions](https://developer.android.com/studio/publish/app-signing#generate-key)

3. Copy `src-tauri/gen/android/key.properties.example` to `src-tauri/gen/android/key.properties` and fill in values with the previously generated signing key info.

### Run

```bash
nix develop .#androidDev
npm run start:android
```

## Environment Setup

> PREREQUISITE: set up the [holochain development environment](https://developer.holochain.org/docs/install/).

Outside of nix shell you will need rust installed:

https://www.rust-lang.org/tools/install or https://rustup.rs/

Enter the nix shell by running this in the root folder of the repository: 

```bash
nix develop
npm install
```

**Run all the other instructions in this README from inside this nix-shell, otherwise they won't work**.

## Running 2 agents
 
```bash
npm start
```

This will create a network of 2 nodes connected to each other and their respective UIs.
It will also bring up the Holochain Playground for advanced introspection of the conductors.

## Running solo dev environment

```bash
npm run dev
```

This will not launch a UI, you will have to open a browser window and navigate to the Local address provided by VITE. It can take a moment for the UI to come up after visiting the URL, let it load. 

## Running the backend tests

```bash
npm test
```

## Bootstrapping a network

Create a custom network of nodes connected to each other and their respective UIs with:

```bash
AGENTS=3 npm run network
```

Substitute the "3" for the number of nodes that you want to bootstrap in your network.
This will also bring up the Holochain Playground for advanced introspection of the conductors.

## Tauri Desktop Development

### Running 2 tauri agents

```bash
npm run start:tauri
```

This launches 2 tauri desktop instances connected via a local bootstrap server, each with its own holochain data directory (`~/.cache/kando/holochain-0/`, `holochain-1/`, etc.).

### Running tauri alongside Android

```bash
npm run network:android
```

Launches 1 tauri desktop instance and 1 Android device/emulator on the same local network.

### Network Configuration

In tauri mode, bootstrap and relay server URLs can be configured per-instance via Settings > Advanced Network Options. Changes are persisted to a `user-network-config.json` file and require an app restart to take effect.

- **Dev mode**: config stored per-instance at `~/.cache/kando/holochain-N/user-network-config.json`
- **Production**: config stored at `~/.local/share/kando/user-network-config.json` (Linux), `~/Library/Application Support/kando/` (macOS), or `%APPDATA%\kando\` (Windows)

User-configured URLs override all defaults, including the dev-mode local bootstrap.

## Packaging

To package the web happ:
```bash
npm run package
```

You'll have the `kando.webhapp` in `workdir`. This is what you should distribute so that the Holochain Launcher can install it.
You will also have its subcomponent `kando.happ` in the same folder.

## Versioning

There are three version numbers to keep in sync:

| Version | Location | Purpose |
|---------|----------|---------|
| `dnaVersion` | `ui/package.json` | hApp / DNA version (zome changes) |
| `version` | `ui/package.json` | UI + runtime version (app version shown in releases) |
| `version` | `src-tauri/tauri.conf.json` | Tauri bundle version (should match `ui/package.json` version) |

The `.happ-version` file (e.g. `happ-v0.17.0`) tells the runtime release workflow which hApp release to download and bundle.

## Release Process

Releases use two separate GitHub Actions workflows, triggered by git tags.

### 1. Release the hApp (when zomes change)

Bump `dnaVersion` in `ui/package.json`, then:

```bash
npm run release:happ
```

This pushes a `happ-v<dnaVersion>` tag, triggering `.github/workflows/release-happ.yaml` which builds and publishes the `.happ` as a draft GitHub release.

### 2. Release the runtimes (desktop + Android + webhapp)

1. Update `.happ-version` to point to the hApp release tag from step 1 (e.g. `happ-v0.17.0`)
2. Bump `version` in `ui/package.json` and `src-tauri/tauri.conf.json`
3. Then run:

```bash
npm run release:runtimes
```

This pushes a `v<version>` tag, triggering `.github/workflows/release-tauri-app.yaml` which:
- Downloads the hApp from the referenced hApp release
- Builds the webhapp and weave hash
- Builds desktop binaries for Linux, macOS, and Windows via `tauri-action`
- Builds an Android APK (aarch64)
- Uploads all artifacts to a draft GitHub release

After the workflow completes, review and publish the draft release on GitHub.

### Android Signing

The Android build requires signing secrets configured in GitHub Actions:
- `ANDROID_KEY_BASE64` - base64-encoded keystore file
- `ANDROID_KEY_ALIAS` - key alias
- `ANDROID_KEY_PASSWORD` - key/store password

## Documentation

This repository is using these tools:
- [NPM Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces/): npm v7's built-in monorepo capabilities.
- [hc](https://github.com/holochain/holochain/tree/develop/crates/hc): Holochain CLI to easily manage Holochain development instances.
- [@holochain/tryorama](https://www.npmjs.com/package/@holochain/tryorama): test framework.
- [@holochain/client](https://www.npmjs.com/package/@holochain/client): client library to connect to Holochain from the UI.
- [@holochain-playground/cli](https://www.npmjs.com/package/@holochain-playground/cli): introspection tooling to understand what's going on in the Holochain nodes.
- [tauri-plugin-holochain](https://github.com/darksoil-studio/tauri-plugin-holochain): Tauri plugin for running Holochain in desktop and mobile apps.


## License

[![License: CAL 1.0](https://img.shields.io/badge/License-CAL%201.0-blue.svg)](https://github.com/holochain/cryptographic-autonomy-license)

Copyright (C) 2023, Holochain Foundation

This program is free software: you can redistribute it and/or modify it under the terms of the license
provided in the LICENSE file (MIT). This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
