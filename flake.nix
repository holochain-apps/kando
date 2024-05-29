{
  description = "Template for Holochain app development";

  inputs = {
    holochain-nix-versions.url  = "github:holochain/holochain/holochain-0.4.0-dev.1/?dir=versions/weekly";
    holochain-flake = {
      url = "github:holochain/holochain/holochain-0.4.0-dev.1";
      inputs.holochain.url = "github:holochain/holochain/holochain-0.4.0-dev.1";
      inputs.versions.follows = "holochain-nix-versions";
    };

    nixpkgs.follows = "holochain-flake/nixpkgs";
    flake-parts.follows = "holochain-flake/flake-parts";
  };

  outputs = inputs @ { flake-parts, holochain-flake, ... }:
    flake-parts.lib.mkFlake
      {
        inherit inputs;
      }
      {
        systems = builtins.attrNames holochain-flake.devShells;
        perSystem =
          { config
          , pkgs
          , system
          , ...
          }: {
            devShells.default = pkgs.mkShell {
              inputsFrom = [ holochain-flake.devShells.${system}.holonix ];
              packages = [ pkgs.nodejs-18_x ];
            };
          };
      };
}   