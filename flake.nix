{
  description = "Flake for Holochain app development";

  # holonix main-0.7 supplies the Holochain toolchain. runtime-tauri supplies the
  # Tauri shells KanDo builds on: Rust with the wasm32 and Android targets, the
  # holonix tools, nix-provided webkit/GTK (a host webkit mixed with the nix
  # compiler fails to link), and for Android the SDK/NDK, JDK and cargo-ndk.
  #
  #   nix develop               zomes, UI and the desktop app  (npm run start:tauri)
  #   nix develop .#androidDev  the same plus Android           (npm run start:android)
  #   nix develop .#test        zomes, UI and tests only, no runtime-tauri (CI)
  inputs = {
    holonix.url = "github:holochain/holonix?ref=main-0.7";

    runtime-tauri = {
      # SSH while runtime-tauri is private; github:holochain/runtime-tauri once public.
      url = "git+ssh://git@github.com/holochain/runtime-tauri";
      inputs.holonix.follows = "holonix";
    };

    nixpkgs.follows = "holonix/nixpkgs";
    flake-parts.follows = "holonix/flake-parts";
  };

  outputs = inputs@{ flake-parts, ... }: flake-parts.lib.mkFlake { inherit inputs; } {
    systems = builtins.attrNames inputs.holonix.devShells;
    perSystem = { inputs', pkgs, ... }:
      let
        # Everything to build the zomes, pack the hApp, run the tryorama tests and
        # develop the UI, from holonix alone. CI's test job uses it on its own, so
        # it must not touch runtime-tauri (a private repo the runners can't fetch).
        testShell = pkgs.mkShell {
          inputsFrom = [ inputs'.holonix.devShells.default ];
          packages = (with inputs'.holonix.packages; [
            holochain
            bootstrap-srv
            lair-keystore
            hc
            hn-introspect
            rust # Rust with the wasm32 target, for zome builds
          ]) ++ (with pkgs; [
            nodejs_24 # For UI development
            binaryen # wasm-opt, used by scripts/wasm-opt-zomes.mjs
            typescript
          ]);
        };

        # The app shells are runtime-tauri's shells plus everything in testShell,
        # so a tool added there reaches every shell. The Tauri shell comes first in
        # inputsFrom so its Rust (with the Android and iOS targets) is the one on
        # PATH; holonix's Rust is only used by testShell. The Holochain binaries
        # are the same store paths in both, as runtime-tauri follows our holonix.
        mkTauriShell = base: prompt: pkgs.mkShell {
          inputsFrom = [ base testShell ];
          shellHook = ''
            export PS1='\[\033[1;34m\][${prompt}:\w]\$\[\033[0m\] '
          '';
        };
      in
      {
        formatter = pkgs.nixpkgs-fmt;

        devShells.test = testShell;
        devShells.default =
          mkTauriShell inputs'.runtime-tauri.devShells.tauriDev "kando";
        devShells.androidDev =
          mkTauriShell inputs'.runtime-tauri.devShells.tauriAndroidDev "kando-android";
      };
  };
}
