{
  description = "Template for Holochain app development";

  inputs = {
    p2p-shipyard.url = "github:mattyg/p2p-shipyard?rev=f3fc0d25bea41411d0347a5f381f91d5d3e9e572";
    versions.url  = "github:holochain/holochain?dir=versions/0_3";

    holochain-flake.url = "github:holochain/holochain";
    holochain-flake.inputs.versions.follows = "versions";

    nixpkgs.follows = "holochain-flake/nixpkgs";
    flake-parts.follows = "holochain-flake/flake-parts";
  };

  outputs = inputs:
    inputs.flake-parts.lib.mkFlake
      {
        inherit inputs;
      }
      {
        systems = builtins.attrNames inputs.holochain-flake.devShells;
        perSystem = 
          { config
          , pkgs
          , system
          , inputs'
          , ... 
          }: {
            devShells.default = pkgs.mkShell {
              inputsFrom = [
                inputs'.p2p-shipyard.devShells.holochainTauriDev
                inputs'.holochain-flake.devShells.holonix
              ];
              packages = [ pkgs.nodejs-18_x ];
            };
            devShells.androidDev = pkgs.mkShell {
              inputsFrom = [
                inputs'.p2p-shipyard.devShells.holochainTauriAndroidDev
                inputs'.holochain-flake.devShells.holonix
              ];
              packages = [ pkgs.nodejs-18_x ];
            };
          };
      };
}